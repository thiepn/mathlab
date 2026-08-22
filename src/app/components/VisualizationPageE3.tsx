import { useEffect, useMemo, useRef, useState } from 'react';
import { substituteAst } from '../../lib/math/algebra';
import type { SemanticMathObject } from '../../lib/math/types';
import { buildGraphSeries, defaultGraphViewport, fitGraphViewport, zoomViewport, type GraphSeriesInput, type GraphViewport } from '../../lib/math/visualization';
import { criticalMarkers, sampleContours, sampleGradientField, sampleImplicitCurve, sampleParametricCurve, sampleParametricSurface, samplePhasePortrait, samplePolarCurve, sampleScalarField, sampleSurface, sampleVectorField, type Camera3D } from '../../lib/math/visualization2';
import { VISUALIZATION_MODES, VISUAL_TOOL_TO_MODE, isVisualizable, visualizationModesFor, visualizationVariables, type VisualizationMode } from '../visualizationModes';
import { GraphCanvas } from './GraphCanvas';
import { E3Canvas, type E3CanvasModel } from './E3Canvas';
import { MathValue } from './MathValue';

interface VisualizationPageProps{
  objects:SemanticMathObject[];
  activeObject:SemanticMathObject|null;
  onActivateObject:(id:string)=>void;
  onOpenObject:(id:string)=>void;
}

type RangeDraft={xMin:string;xMax:string;yMin:string;yMax:string};
const HOME:GraphViewport={xMin:-6,xMax:6,yMin:-5,yMax:5};
const DEFAULT_CAMERA:Camera3D={azimuth:38,elevation:28,zoom:1};

function variablesOf(object:SemanticMathObject):string[]{return visualizationVariables(object);}
function resolvedAst(object:SemanticMathObject,objects:SemanticMathObject[]){
  let ast=object.valueAst;const protectedNames=new Set(variablesOf(object));
  for(const binding of objects){
    if(!binding.name||binding.id===object.id||protectedNames.has(binding.name)||!['scalar','expression'].includes(binding.kind))continue;
    ast=substituteAst(ast,binding.name,binding.valueAst);
  }
  return ast;
}
function graphInput(object:SemanticMathObject,objects:SemanticMathObject[]):GraphSeriesInput{
  const variables=variablesOf(object);return{id:object.id,name:object.name??'expression',source:object.source,variable:variables[0],ast:resolvedAst(object,objects)};
}
function rangeDraft(view:GraphViewport):RangeDraft{return{xMin:String(view.xMin),xMax:String(view.xMax),yMin:String(view.yMin),yMax:String(view.yMax)};}
function parseRange(draft:RangeDraft):GraphViewport|null{
  const view={xMin:Number(draft.xMin),xMax:Number(draft.xMax),yMin:Number(draft.yMin),yMax:Number(draft.yMax)};
  return Object.values(view).every(Number.isFinite)&&view.xMin<view.xMax&&view.yMin<view.yMax?view:null;
}
function autoLevels(min:number,max:number,count:number):number[]{
  if(!Number.isFinite(min)||!Number.isFinite(max))return[0];if(Math.abs(max-min)<1e-12)return[min];
  const n=Math.max(2,Math.min(16,Math.floor(count)));return Array.from({length:n},(_,i)=>min+(max-min)*(i+1)/(n+1));
}
function exportSvgMarkup(svg:SVGSVGElement):string{
  const clone=svg.cloneNode(true) as SVGSVGElement;clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=`
  .graph-background,.e3-background{fill:#fff}.graph-plot-background,.e3-plot-background{fill:#fbfcfe}.graph-grid line,.e3-grid line{stroke:#e4e9f0}.graph-axes line,.e3-axes line{stroke:#758295;stroke-width:1.2}.graph-tick-labels,.e3-ticks{fill:#687586;font:11px sans-serif}.graph-series-line,.e3-curve,.e3-implicit-line{stroke:#1769e0;stroke-width:2.3;fill:none}.e3-contour line{stroke:#334155;stroke-width:1.15}.e3-vector-arrow line{stroke:#1769e0;stroke-width:1.4}.e3-vector-arrow polygon{fill:#1769e0}.e3-trajectory{stroke:#7a4cc2;stroke-width:1.5;fill:none}.e3-region-overlay{fill:#1769e0;fill-opacity:.08;stroke:#1769e0;stroke-dasharray:7 5}.e3-surface-wire{stroke:#334155;stroke-width:.55;opacity:.48}.e3-surface-face{stroke:none}.e3-critical circle,.e3-critical-3d circle{fill:#fff;stroke:#c44747;stroke-width:2}.e3-field-band-0{fill:#f4f7fb}.e3-field-band-1{fill:#e6edf8}.e3-field-band-2{fill:#d7e4f5}.e3-field-band-3{fill:#c4d8f0}.e3-field-band-4{fill:#aac8eb}.e3-field-band-5{fill:#8bb3e4}.e3-field-band-6{fill:#659bdc}.e3-field-band-7{fill:#4381ce}.e3-field-band-8{fill:#2869b8}.e3-field-band-9{fill:#194e8c}`;
  clone.insertBefore(style,clone.firstChild);return new XMLSerializer().serializeToString(clone);
}
function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),0);}

export function VisualizationPageE3({objects,activeObject,onActivateObject,onOpenObject}:VisualizationPageProps){
  const available=useMemo(()=>{const combined=activeObject&&!objects.some((item)=>item.id===activeObject.id)?[activeObject,...objects]:objects;return combined.filter(isVisualizable);},[objects,activeObject]);
  const [selectedId,setSelectedId]=useState('');
  const [mode,setMode]=useState<VisualizationMode>('cartesian');
  const [viewport,setViewport]=useState<GraphViewport>(HOME);
  const [draft,setDraft]=useState<RangeDraft>(()=>rangeDraft(HOME));
  const [parameterMin,setParameterMin]=useState('-3.141592653589793');
  const [parameterMax,setParameterMax]=useState('3.141592653589793');
  const [fieldDensity,setFieldDensity]=useState(15);
  const [contourCount,setContourCount]=useState(8);
  const [showGrid,setShowGrid]=useState(true);
  const [showCritical,setShowCritical]=useState(true);
  const [showContours,setShowContours]=useState(true);
  const [showRegion,setShowRegion]=useState(false);
  const [region,setRegion]=useState<GraphViewport>({xMin:-2,xMax:2,yMin:-2,yMax:2});
  const [camera,setCamera]=useState<Camera3D>(DEFAULT_CAMERA);
  const [cartesianIds,setCartesianIds]=useState<string[]>([]);
  const [message,setMessage]=useState('');
  const svgRef=useRef<SVGSVGElement>(null);
  const requestedMode=useMemo(()=>{
    const operation=typeof sessionStorage==='undefined'?null:sessionStorage.getItem('mathlab:e3-mode');if(operation)sessionStorage.removeItem('mathlab:e3-mode');
    return operation?VISUAL_TOOL_TO_MODE[operation]:undefined;
  },[]);

  useEffect(()=>{
    if(activeObject&&isVisualizable(activeObject)){setSelectedId(activeObject.id);return;}
    if(!selectedId||!available.some((item)=>item.id===selectedId))setSelectedId(available[0]?.id??'');
  },[activeObject?.id,available.length]);

  const selected=available.find((item)=>item.id===selectedId)??available[0]??null;
  const modes=selected?visualizationModesFor(selected):[];

  useEffect(()=>{
    if(!selected)return;const next=requestedMode&&modes.includes(requestedMode)?requestedMode:modes.includes(mode)?mode:modes[0];if(next&&next!==mode)setMode(next);
  },[selected?.id,modes.join('|')]);

  useEffect(()=>{setDraft(rangeDraft(viewport));},[viewport]);
  useEffect(()=>{
    if(mode!=='cartesian'||!selected)return;setCartesianIds((current)=>current.includes(selected.id)?current:[selected.id,...current].slice(0,6));
  },[mode,selected?.id]);

  const unaryScalars=available.filter((object)=>visualizationModesFor(object).includes('cartesian'));
  const cartesianInputs=cartesianIds.map((id)=>unaryScalars.find((item)=>item.id===id)).filter((item):item is SemanticMathObject=>Boolean(item)).map((item)=>graphInput(item,objects));
  const cartesianModels=useMemo(()=>cartesianInputs.map((input)=>buildGraphSeries(input,viewport)),[cartesianIds.join('|'),viewport.xMin,viewport.xMax,viewport.yMin,viewport.yMax,objects]);

  const advanced=useMemo<{model:E3CanvasModel|null;error:string;summary:string}>(()=>{
    if(!selected||mode==='cartesian')return{model:null,error:'',summary:''};
    try{
      const ast=resolvedAst(selected,objects);const vars=variablesOf(selected);const pMin=Number(parameterMin),pMax=Number(parameterMax);const safeMin=Number.isFinite(pMin)?pMin:-Math.PI,safeMax=Number.isFinite(pMax)&&pMax>safeMin?pMax:Math.PI;
      if(mode==='parametric'){const polylines=sampleParametricCurve(ast,vars[0],safeMin,safeMax);return{model:{kind:'curves',polylines},error:'',summary:`${polylines.reduce((sum,line)=>sum+line.points.length,0)} sampled curve points`};}
      if(mode==='polar'){const polylines=samplePolarCurve(ast,vars[0],safeMin,safeMax);return{model:{kind:'curves',polylines},error:'',summary:`${polylines.reduce((sum,line)=>sum+line.points.length,0)} polar samples`};}
      if(mode==='implicit'){const segments=sampleImplicitCurve(ast,[vars[0],vars[1]],viewport,72);return{model:{kind:'implicit',segments},error:'',summary:`${segments.length} marching-squares segments`};}
      if(mode==='contour'||mode==='scalar-field'){
        const field=sampleScalarField(ast,[vars[0],vars[1]],viewport,36,28);const levels=autoLevels(field.min,field.max,contourCount);const contours=sampleContours(ast,[vars[0],vars[1]],viewport,levels,58);const criticalPoints=criticalMarkers(ast,[vars[0],vars[1]]);
        if(mode==='contour')return{model:{kind:'contours',contours,criticalPoints},error:'',summary:`${contours.length} level sets · ${contours.reduce((sum,item)=>sum+item.segments.length,0)} segments`};
        return{model:{kind:'scalar-field',field,contours:showContours?contours:[],criticalPoints},error:'',summary:`${field.cells.length} scalar samples · range ${field.min.toPrecision(4)}…${field.max.toPrecision(4)}`};
      }
      if(mode==='vector-field'){const field=sampleVectorField(ast,[vars[0],vars[1]],viewport,fieldDensity);return{model:{kind:'vector-field',field},error:'',summary:`${field.arrows.length} normalized arrows`};}
      if(mode==='gradient-field'){const field=sampleGradientField(ast,[vars[0],vars[1]],viewport,fieldDensity);return{model:{kind:'vector-field',field},error:'',summary:`${field.arrows.length} exact-gradient samples`};}
      if(mode==='phase-portrait'){const portrait=samplePhasePortrait(ast,[vars[0],vars[1]],viewport,fieldDensity,4);return{model:{kind:'vector-field',field:portrait.field,trajectories:portrait.trajectories},error:'',summary:`${portrait.field.arrows.length} arrows · ${portrait.trajectories.length} trajectories`};}
      if(mode==='surface-3d'){const mesh=sampleSurface(ast,[vars[0],vars[1]],viewport,29);return{model:{kind:'surface',mesh},error:'',summary:`${mesh.rows.length}×${mesh.rows[0]?.length??0} surface mesh · ${mesh.criticalPoints.length} exact critical overlays`};}
      const mesh=sampleParametricSurface(ast,[vars[0],vars[1]],[safeMin,safeMax],[safeMin,safeMax],27);return{model:{kind:'surface',mesh},error:'',summary:`${mesh.rows.length}×${mesh.rows[0]?.length??0} parametric mesh`};
    }catch(error){return{model:null,error:error instanceof Error?error.message:'Could not construct this visualization.',summary:''};}
  },[selected?.id,mode,viewport.xMin,viewport.xMax,viewport.yMin,viewport.yMax,parameterMin,parameterMax,fieldDensity,contourCount,showContours,objects]);

  const applyRange=()=>{const parsed=parseRange(draft);if(parsed)setViewport(parsed);};
  const reset=()=>{setViewport(HOME);setCamera(DEFAULT_CAMERA);};
  const fitY=()=>{if(cartesianInputs.length)setViewport(fitGraphViewport(cartesianInputs,{xMin:viewport.xMin,xMax:viewport.xMax}));};
  const toggleCartesian=(id:string)=>setCartesianIds((current)=>current.includes(id)?current.filter((item)=>item!==id):current.length<6?[...current,id]:current);

  const exportSvg=()=>{if(!svgRef.current)return;downloadBlob(new Blob([exportSvgMarkup(svgRef.current)],{type:'image/svg+xml;charset=utf-8'}),'mathlab-visualization.svg');setMessage('SVG exported.');};
  const exportPng=()=>{
    if(!svgRef.current)return;const blob=new Blob([exportSvgMarkup(svgRef.current)],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const image=new Image();
    image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=Math.round(1600*(svgRef.current?.viewBox.baseVal.height??620)/(svgRef.current?.viewBox.baseVal.width??960));const context=canvas.getContext('2d');if(!context){URL.revokeObjectURL(url);return;}context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob((png)=>{if(png)downloadBlob(png,'mathlab-visualization.png');},'image/png');URL.revokeObjectURL(url);setMessage('PNG exported.');};image.src=url;
  };

  if(!selected)return <main className="e3-page"><section className="e3-empty"><span className="eyebrow">Visualization 2.0</span><h1>Create something visualizable in Workspace.</h1><p>E3 accepts unary scalar functions, parameterized curves, two-variable equations, scalar fields, 2D vector fields, graph surfaces and two-parameter 3D surfaces.</p></section></main>;

  return <main className="e3-page">
    <header className="e3-hero"><div><span className="eyebrow">E3 · Visualization 2.0</span><h1>See the mathematical object, not just its formula.</h1><p>Explicit curves, fields, level sets, trajectories and surfaces now share one deterministic visualization workspace.</p></div><div className="e3-hero-metrics"><strong>{available.length}</strong><span>visualizable objects</span><strong>{VISUALIZATION_MODES[mode].dimension}</strong><span>active renderer</span></div></header>

    <section className="e3-workbench">
      <aside className="e3-object-rail" aria-label="Visualizable objects">
        <div className="e3-rail-heading"><span className="section-kicker">Objects</span><strong>Visualization sources</strong></div>
        <div className="e3-object-list">{available.map((object)=>{const objectModes=visualizationModesFor(object);return <button key={object.id} className={selected.id===object.id?'is-active':''} onClick={()=>{setSelectedId(object.id);onActivateObject(object.id);}}><span><strong>{object.name??object.kind}</strong><small>{objectModes.length} mode{objectModes.length===1?'':'s'}</small></span><MathValue ast={object.valueAst} source={object.source} compact/></button>;})}</div>
        {mode==='cartesian'&&unaryScalars.length>1&&<div className="e3-overlay-sources"><span className="section-kicker">Cartesian overlays</span>{unaryScalars.map((object)=><label key={object.id}><input type="checkbox" checked={cartesianIds.includes(object.id)} onChange={()=>toggleCartesian(object.id)} disabled={!cartesianIds.includes(object.id)&&cartesianIds.length>=6}/><span>{object.name??object.source}</span></label>)}</div>}
      </aside>

      <div className="e3-stage">
        <div className="e3-mode-strip" role="tablist" aria-label="Visualization mode">{modes.map((item)=><button key={item} role="tab" aria-selected={mode===item} className={mode===item?'is-active':''} onClick={()=>setMode(item)}><span>{VISUALIZATION_MODES[item].label}</span><small>{VISUALIZATION_MODES[item].dimension}</small></button>)}</div>
        <div className="e3-toolbar">
          <div className="e3-toolbar-group"><button onClick={reset}>Home</button>{mode==='cartesian'&&<button onClick={fitY}>Fit Y</button>}<button onClick={()=>setViewport((v)=>zoomViewport(v,.76,(v.xMin+v.xMax)/2,(v.yMin+v.yMax)/2))}>Zoom +</button><button onClick={()=>setViewport((v)=>zoomViewport(v,1.3,(v.xMin+v.xMax)/2,(v.yMin+v.yMax)/2))}>Zoom −</button></div>
          <div className="e3-toolbar-group"><button className={showGrid?'is-on':''} onClick={()=>setShowGrid((v)=>!v)}>Grid</button><button className={showCritical?'is-on':''} onClick={()=>setShowCritical((v)=>!v)}>Critical</button><button className={showRegion?'is-on':''} onClick={()=>setShowRegion((v)=>!v)}>Region</button>{mode==='scalar-field'&&<button className={showContours?'is-on':''} onClick={()=>setShowContours((v)=>!v)}>Contours</button>}</div>
          <div className="e3-toolbar-group"><button onClick={exportSvg}>SVG</button><button onClick={exportPng}>PNG</button></div>
        </div>

        <div className="e3-canvas-frame">
          {mode==='cartesian'?<GraphCanvas ref={svgRef} series={cartesianModels} viewport={viewport} onViewportChange={setViewport} overlays={{grid:showGrid,zeros:true,extrema:showCritical,inflections:showCritical,asymptotes:true,trace:true}} onReset={reset}/>:advanced.model?<E3Canvas ref={svgRef} model={advanced.model} viewport={viewport} camera={camera} onViewportChange={setViewport} showGrid={showGrid} showCritical={showCritical} showRegion={showRegion} region={region}/>:<div className="e3-render-error"><strong>Could not render this object in {VISUALIZATION_MODES[mode].label} mode.</strong><p>{advanced.error}</p></div>}
        </div>

        <div className="e3-stage-footer"><span>{mode==='cartesian'?`${cartesianModels.length} explicit series · ${cartesianModels.reduce((sum,item)=>sum+item.segments.length,0)} branches`:advanced.summary}</span>{message&&<span>{message}</span>}</div>
      </div>

      <aside className="e3-inspector">
        <div className="e3-inspector-head"><span className="section-kicker">Inspector</span><strong>{VISUALIZATION_MODES[mode].label}</strong><p>{VISUALIZATION_MODES[mode].description}</p></div>
        <section><span className="section-kicker">Viewport / base domain</span><div className="e3-range-grid">{(['xMin','xMax','yMin','yMax'] as const).map((key)=><label key={key}><span>{key}</span><input value={draft[key]} onChange={(event)=>setDraft((current)=>({...current,[key]:event.target.value}))}/></label>)}</div><button className="e3-wide-button" disabled={!parseRange(draft)} onClick={applyRange}>Apply domain</button></section>
        {(mode==='parametric'||mode==='polar'||mode==='parametric-surface-3d')&&<section><span className="section-kicker">Parameter range</span><div className="e3-range-grid"><label><span>min</span><input value={parameterMin} onChange={(e)=>setParameterMin(e.target.value)}/></label><label><span>max</span><input value={parameterMax} onChange={(e)=>setParameterMax(e.target.value)}/></label></div></section>}
        {['vector-field','gradient-field','phase-portrait'].includes(mode)&&<section><span className="section-kicker">Field density</span><input type="range" min="7" max="25" value={fieldDensity} onChange={(e)=>setFieldDensity(Number(e.target.value))}/><strong>{fieldDensity}</strong></section>}
        {['contour','scalar-field'].includes(mode)&&<section><span className="section-kicker">Contour levels</span><input type="range" min="3" max="14" value={contourCount} onChange={(e)=>setContourCount(Number(e.target.value))}/><strong>{contourCount}</strong></section>}
        {VISUALIZATION_MODES[mode].dimension==='3D'&&<section><span className="section-kicker">3D camera</span><div className="e3-camera-grid"><button onClick={()=>setCamera((c)=>({...c,azimuth:c.azimuth-15}))}>↶ Rotate</button><button onClick={()=>setCamera((c)=>({...c,azimuth:c.azimuth+15}))}>Rotate ↷</button><button onClick={()=>setCamera((c)=>({...c,elevation:Math.min(80,c.elevation+10)}))}>Tilt +</button><button onClick={()=>setCamera((c)=>({...c,elevation:Math.max(-80,c.elevation-10)}))}>Tilt −</button><button onClick={()=>setCamera((c)=>({...c,zoom:Math.min(2,c.zoom*1.15)}))}>Closer</button><button onClick={()=>setCamera((c)=>({...c,zoom:Math.max(.45,c.zoom/1.15)}))}>Farther</button></div><small>Azimuth {camera.azimuth}° · elevation {camera.elevation}°</small></section>}
        {showRegion&&<section><span className="section-kicker">E2 rectangular region overlay</span><div className="e3-range-grid">{(['xMin','xMax','yMin','yMax'] as const).map((key)=><label key={key}><span>{key}</span><input value={region[key]} type="number" onChange={(event)=>setRegion((current)=>({...current,[key]:Number(event.target.value)}))}/></label>)}</div></section>}
        <section className="e3-object-summary"><span className="section-kicker">Source</span><MathValue ast={selected.valueAst} source={selected.source}/><small>Variables: {variablesOf(selected).join(', ')||'none'}</small><button className="e3-wide-button" onClick={()=>onOpenObject(selected.id)}>Open in Workspace</button></section>
      </aside>
    </section>
  </main>;
}
