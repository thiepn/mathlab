import { useEffect, useMemo, useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

export const E2_CONTROLLED_OPERATIONS = new Set([
  'coordinate-transform','double-integral','triple-integral','scalar-line-integral','line-integral','surface-integral','flux-integral','green-theorem','gauss-theorem','stokes-theorem',
]);

export function isE2ControlledOperation(operation:string):boolean{return E2_CONTROLLED_OPERATIONS.has(operation);}

interface Props{
  operation:string;
  object:SemanticMathObject;
  running:boolean;
  onAction?:(operation:string,options?:Record<string,string|number|boolean>)=>void;
}

function dimensions(object:SemanticMathObject):string[]{return object.kind==='function'&&object.parameters.length?object.parameters:object.variables;}

export function E2OperationControls({operation,object,running,onAction}:Props){
  const parameters=dimensions(object);
  const dimension=parameters.length;
  const [coordinate,setCoordinate]=useState(dimension===2?'cartesian':'cartesian');
  const [innerVariable,setInnerVariable]=useState(parameters[0]??'x');
  const [middleVariable,setMiddleVariable]=useState(parameters[1]??'y');
  const [outerVariable,setOuterVariable]=useState(parameters[dimension-1]??'y');
  const [innerLower,setInnerLower]=useState('0');const [innerUpper,setInnerUpper]=useState('1');
  const [middleLower,setMiddleLower]=useState('0');const [middleUpper,setMiddleUpper]=useState('1');
  const [outerLower,setOuterLower]=useState('0');const [outerUpper,setOuterUpper]=useState('1');
  const [curve,setCurve]=useState(dimension===3?'[t, t^2, 0]':'[t, t^2]');const [curveParameter,setCurveParameter]=useState('t');const [curveLower,setCurveLower]=useState('0');const [curveUpper,setCurveUpper]=useState('1');
  const [surface,setSurface]=useState(`${parameters[2]??'z'} = 0`);const [xLower,setXLower]=useState('0');const [xUpper,setXUpper]=useState('1');const [yLower,setYLower]=useState('0');const [yUpper,setYUpper]=useState('1');const [zLower,setZLower]=useState('0');const [zUpper,setZUpper]=useState('1');
  const [orientation,setOrientation]=useState<'up'|'down'>('up');const [panels,setPanels]=useState(dimension===3?'8':'16');

  useEffect(()=>{
    setCoordinate('cartesian');setInnerVariable(parameters[0]??'x');setMiddleVariable(parameters[1]??'y');setOuterVariable(parameters[dimension-1]??'y');
    setInnerLower('0');setInnerUpper('1');setMiddleLower('0');setMiddleUpper('1');setOuterLower('0');setOuterUpper('1');
    setCurve(dimension===3?'[t, t^2, 0]':'[t, t^2]');setCurveParameter('t');setCurveLower('0');setCurveUpper('1');
    setSurface(`${parameters[2]??'z'} = 0`);setXLower('0');setXUpper('1');setYLower('0');setYUpper('1');setZLower('0');setZUpper('1');setOrientation('up');setPanels(dimension===3?'8':'16');
  },[object.id,object.source]);

  const panelNumber=useMemo(()=>Math.max(4,Math.min(dimension===3?20:48,Number(panels)||16)),[panels,dimension]);
  const validPanels=/^\d+$/.test(panels)&&panelNumber%2===0;
  if(!isE2ControlledOperation(operation))return null;

  if(operation==='coordinate-transform'){
    const options=dimension===2?['polar']:['cylindrical','spherical'];
    const chosen=coordinate==='cartesian'?options[0]:coordinate;
    return <div className="operation-control e2-operation-control"><label><span>Coordinate system</span><select value={chosen} onChange={(e)=>setCoordinate(e.target.value)}>{options.map((item)=><option key={item} value={item}>{item[0].toUpperCase()+item.slice(1)}</option>)}</select></label><small>The transformed integrand includes the coordinate Jacobian automatically.</small><button disabled={running} onClick={()=>onAction?.(operation,{coordinate:chosen})}>Build transformed integrand</button></div>;
  }

  if(operation==='double-integral'){
    const polar=coordinate==='polar';
    const available=parameters;
    const inferredOuter=available.find((item)=>item!==innerVariable)??available[1];
    return <div className="operation-control e2-operation-control">
      <label><span>Coordinates</span><select value={coordinate} onChange={(e)=>setCoordinate(e.target.value)}><option value="cartesian">Cartesian</option><option value="polar">Polar</option></select></label>
      {!polar&&<div className="e2-order-grid"><label><span>Inner variable</span><select value={innerVariable} onChange={(e)=>{setInnerVariable(e.target.value);setOuterVariable(available.find((item)=>item!==e.target.value)??inferredOuter);}}>{available.map((item)=><option key={item}>{item}</option>)}</select></label><label><span>Outer variable</span><select value={outerVariable} onChange={(e)=>setOuterVariable(e.target.value)}>{available.map((item)=><option key={item}>{item}</option>)}</select></label></div>}
      <div className="e2-bound-grid"><label><span>{polar?'r':'Inner'} lower</span><input value={innerLower} onChange={(e)=>setInnerLower(e.target.value)}/></label><label><span>{polar?'r':'Inner'} upper</span><input value={innerUpper} onChange={(e)=>setInnerUpper(e.target.value)}/></label><label><span>{polar?'theta':'Outer'} lower</span><input value={outerLower} onChange={(e)=>setOuterLower(e.target.value)}/></label><label><span>{polar?'theta':'Outer'} upper</span><input value={outerUpper} onChange={(e)=>setOuterUpper(e.target.value)} placeholder={polar?'2*pi':'1'}/></label></div>
      <label><span>Fallback Simpson panels / axis</span><input inputMode="numeric" value={panels} onChange={(e)=>setPanels(e.target.value)}/></label><small>Inner bounds may depend on the outer variable. Numerical fallback is used only for constant rectangles.</small>
      <button disabled={running||!innerLower.trim()||!innerUpper.trim()||!outerLower.trim()||!outerUpper.trim()||!validPanels} onClick={()=>onAction?.(operation,{coordinate,innerVariable,outerVariable,innerLower:innerLower.trim(),innerUpper:innerUpper.trim(),outerLower:outerLower.trim(),outerUpper:outerUpper.trim(),panels:panelNumber})}>Evaluate double integral</button>
    </div>;
  }

  if(operation==='triple-integral'){
    const transformed=coordinate!=='cartesian';
    const coordinateOptions=['cartesian','cylindrical','spherical'];
    return <div className="operation-control e2-operation-control">
      <label><span>Coordinates</span><select value={coordinate} onChange={(e)=>setCoordinate(e.target.value)}>{coordinateOptions.map((item)=><option key={item}>{item[0].toUpperCase()+item.slice(1)}</option>)}</select></label>
      {!transformed&&<div className="e2-order-grid three"><label><span>Inner</span><select value={innerVariable} onChange={(e)=>setInnerVariable(e.target.value)}>{parameters.map((item)=><option key={item}>{item}</option>)}</select></label><label><span>Middle</span><select value={middleVariable} onChange={(e)=>setMiddleVariable(e.target.value)}>{parameters.map((item)=><option key={item}>{item}</option>)}</select></label><label><span>Outer</span><select value={outerVariable} onChange={(e)=>setOuterVariable(e.target.value)}>{parameters.map((item)=><option key={item}>{item}</option>)}</select></label></div>}
      <div className="e2-bound-grid"><label><span>{coordinate==='spherical'?'rho':coordinate==='cylindrical'?'r':'Inner'} lower</span><input value={innerLower} onChange={(e)=>setInnerLower(e.target.value)}/></label><label><span>upper</span><input value={innerUpper} onChange={(e)=>setInnerUpper(e.target.value)}/></label><label><span>{coordinate==='spherical'?'phi':coordinate==='cylindrical'?'theta':'Middle'} lower</span><input value={middleLower} onChange={(e)=>setMiddleLower(e.target.value)}/></label><label><span>upper</span><input value={middleUpper} onChange={(e)=>setMiddleUpper(e.target.value)}/></label><label><span>{coordinate==='spherical'?'theta':coordinate==='cylindrical'?'z':'Outer'} lower</span><input value={outerLower} onChange={(e)=>setOuterLower(e.target.value)}/></label><label><span>upper</span><input value={outerUpper} onChange={(e)=>setOuterUpper(e.target.value)}/></label></div>
      <label><span>Fallback Simpson panels / axis</span><input inputMode="numeric" value={panels} onChange={(e)=>setPanels(e.target.value)}/></label>
      <button disabled={running||!validPanels} onClick={()=>onAction?.(operation,{coordinate,innerVariable,middleVariable,outerVariable,innerLower:innerLower.trim(),innerUpper:innerUpper.trim(),middleLower:middleLower.trim(),middleUpper:middleUpper.trim(),outerLower:outerLower.trim(),outerUpper:outerUpper.trim(),panels:panelNumber})}>Evaluate triple integral</button>
    </div>;
  }

  if(operation==='scalar-line-integral'||operation==='line-integral')return <div className="operation-control e2-operation-control"><label><span>Parameterized curve r({curveParameter})</span><input value={curve} onChange={(e)=>setCurve(e.target.value)} placeholder={dimension===3?'[t, t^2, 0]':'[t, t^2]'}/></label><label><span>Parameter symbol</span><input value={curveParameter} onChange={(e)=>setCurveParameter(e.target.value)} /></label><div className="e2-bound-grid"><label><span>Lower</span><input value={curveLower} onChange={(e)=>setCurveLower(e.target.value)}/></label><label><span>Upper</span><input value={curveUpper} onChange={(e)=>setCurveUpper(e.target.value)}/></label></div><label><span>Fallback Simpson panels</span><input value={panels} onChange={(e)=>setPanels(e.target.value)}/></label><button disabled={running||!curve.trim()||!curveParameter.trim()||!validPanels} onClick={()=>onAction?.(operation,{curve:curve.trim(),curveParameter:curveParameter.trim(),lower:curveLower.trim(),upper:curveUpper.trim(),panels:panelNumber})}>{operation==='line-integral'?'Evaluate work / circulation':'Evaluate scalar line integral'}</button></div>;

  const surfaceFields=<><label><span>Graph surface</span><input value={surface} onChange={(e)=>setSurface(e.target.value)} placeholder={`${parameters[2]??'z'} = x + y`}/></label><div className="e2-bound-grid"><label><span>{parameters[0]??'x'} lower</span><input value={xLower} onChange={(e)=>setXLower(e.target.value)}/></label><label><span>{parameters[0]??'x'} upper</span><input value={xUpper} onChange={(e)=>setXUpper(e.target.value)}/></label><label><span>{parameters[1]??'y'} lower</span><input value={yLower} onChange={(e)=>setYLower(e.target.value)}/></label><label><span>{parameters[1]??'y'} upper</span><input value={yUpper} onChange={(e)=>setYUpper(e.target.value)}/></label></div></>;

  if(operation==='surface-integral'||operation==='flux-integral')return <div className="operation-control e2-operation-control">{surfaceFields}{operation==='flux-integral'&&<label><span>Orientation</span><select value={orientation} onChange={(e)=>setOrientation(e.target.value as 'up'|'down')}><option value="up">Upward</option><option value="down">Downward</option></select></label>}<label><span>Fallback Simpson panels / axis</span><input value={panels} onChange={(e)=>setPanels(e.target.value)}/></label><button disabled={running||!surface.trim()||!validPanels} onClick={()=>onAction?.(operation,{surface:surface.trim(),xLower:xLower.trim(),xUpper:xUpper.trim(),yLower:yLower.trim(),yUpper:yUpper.trim(),orientation,panels:panelNumber})}>{operation==='flux-integral'?'Evaluate oriented flux':'Evaluate surface integral'}</button></div>;

  if(operation==='green-theorem')return <div className="operation-control e2-operation-control"><div className="e2-bound-grid"><label><span>{parameters[0]??'x'} lower</span><input value={xLower} onChange={(e)=>setXLower(e.target.value)}/></label><label><span>upper</span><input value={xUpper} onChange={(e)=>setXUpper(e.target.value)}/></label><label><span>{parameters[1]??'y'} lower</span><input value={yLower} onChange={(e)=>setYLower(e.target.value)}/></label><label><span>upper</span><input value={yUpper} onChange={(e)=>setYUpper(e.target.value)}/></label></div><small>Green verification uses the positively oriented rectangular boundary.</small><button disabled={running} onClick={()=>onAction?.(operation,{xLower,xUpper,yLower,yUpper,panels:panelNumber})}>Verify Green's theorem</button></div>;

  if(operation==='gauss-theorem')return <div className="operation-control e2-operation-control"><div className="e2-bound-grid"><label><span>{parameters[0]} lower</span><input value={xLower} onChange={(e)=>setXLower(e.target.value)}/></label><label><span>upper</span><input value={xUpper} onChange={(e)=>setXUpper(e.target.value)}/></label><label><span>{parameters[1]} lower</span><input value={yLower} onChange={(e)=>setYLower(e.target.value)}/></label><label><span>upper</span><input value={yUpper} onChange={(e)=>setYUpper(e.target.value)}/></label><label><span>{parameters[2]} lower</span><input value={zLower} onChange={(e)=>setZLower(e.target.value)}/></label><label><span>upper</span><input value={zUpper} onChange={(e)=>setZUpper(e.target.value)}/></label></div><small>Gauss verification compares outward flux on all six faces with the volume integral of divergence.</small><button disabled={running} onClick={()=>onAction?.(operation,{xLower,xUpper,yLower,yUpper,zLower,zUpper,panels:panelNumber})}>Verify divergence theorem</button></div>;

  return <div className="operation-control e2-operation-control">{surfaceFields}<label><span>Normal orientation</span><select value={orientation} onChange={(e)=>setOrientation(e.target.value as 'up'|'down')}><option value="up">Upward</option><option value="down">Downward</option></select></label><small>Stokes verification lifts the rectangular boundary to the graph and orients it by the right-hand rule.</small><button disabled={running||!surface.trim()} onClick={()=>onAction?.('stokes-theorem',{surface:surface.trim(),xLower,xUpper,yLower,yUpper,orientation,panels:panelNumber})}>Verify Stokes' theorem</button></div>;
}
