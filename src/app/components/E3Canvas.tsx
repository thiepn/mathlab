import { forwardRef, useRef, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { niceTicks, panViewport, zoomViewport, type GraphViewport } from '../../lib/math/visualization';
import { projectPoint3, type Camera3D, type ContourLevel, type CriticalMarker, type Polyline2, type ScalarFieldModel, type Segment2, type SurfaceMesh, type VectorFieldModel } from '../../lib/math/visualization2';

export type E3CanvasModel=
  |{kind:'curves';polylines:Polyline2[];criticalPoints?:CriticalMarker[]}
  |{kind:'implicit';segments:Segment2[]}
  |{kind:'contours';contours:ContourLevel[];criticalPoints?:CriticalMarker[]}
  |{kind:'scalar-field';field:ScalarFieldModel;contours?:ContourLevel[];criticalPoints?:CriticalMarker[]}
  |{kind:'vector-field';field:VectorFieldModel;trajectories?:Polyline2[]}
  |{kind:'surface';mesh:SurfaceMesh};

interface E3CanvasProps{
  model:E3CanvasModel;
  viewport:GraphViewport;
  camera:Camera3D;
  onViewportChange?:(viewport:GraphViewport)=>void;
  showGrid?:boolean;
  showCritical?:boolean;
  showRegion?:boolean;
  region?:GraphViewport;
}

const WIDTH=960,HEIGHT=620,PAD={left:62,right:24,top:28,bottom:46};
interface DragState{pointerId:number;clientX:number;clientY:number;viewport:GraphViewport}

function scalarBand(value:number):number{return Math.max(0,Math.min(9,Math.floor(value*9.999)));}

export const E3Canvas=forwardRef<SVGSVGElement,E3CanvasProps>(function E3Canvas({model,viewport,camera,onViewportChange,showGrid=true,showCritical=true,showRegion=false,region},ref){
  const drag=useRef<DragState|null>(null);
  const plot={left:PAD.left,top:PAD.top,width:WIDTH-PAD.left-PAD.right,height:HEIGHT-PAD.top-PAD.bottom};
  const xToScreen=(x:number)=>plot.left+(x-viewport.xMin)/(viewport.xMax-viewport.xMin)*plot.width;
  const yToScreen=(y:number)=>plot.top+(viewport.yMax-y)/(viewport.yMax-viewport.yMin)*plot.height;
  const xTicks=niceTicks(viewport.xMin,viewport.xMax,9),yTicks=niceTicks(viewport.yMin,viewport.yMax,7);
  const twoD=model.kind!=='surface';

  const onPointerDown=(event:ReactPointerEvent<SVGSVGElement>)=>{
    if(!twoD||!onViewportChange||event.button!==0)return;
    event.currentTarget.setPointerCapture(event.pointerId);drag.current={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,viewport};
  };
  const onPointerMove=(event:ReactPointerEvent<SVGSVGElement>)=>{
    const state=drag.current;if(!state||state.pointerId!==event.pointerId||!onViewportChange)return;
    const dx=-(event.clientX-state.clientX)/plot.width*(state.viewport.xMax-state.viewport.xMin);
    const dy=(event.clientY-state.clientY)/plot.height*(state.viewport.yMax-state.viewport.yMin);
    onViewportChange(panViewport(state.viewport,dx,dy));
  };
  const stopDrag=(event:ReactPointerEvent<SVGSVGElement>)=>{if(drag.current?.pointerId===event.pointerId)drag.current=null;};
  const onWheel=(event:ReactWheelEvent<SVGSVGElement>)=>{
    if(!twoD||!onViewportChange)return;event.preventDefault();
    const rect=event.currentTarget.getBoundingClientRect();const sx=(event.clientX-rect.left)/rect.width*WIDTH,sy=(event.clientY-rect.top)/rect.height*HEIGHT;
    const x=viewport.xMin+(sx-plot.left)/plot.width*(viewport.xMax-viewport.xMin),y=viewport.yMax-(sy-plot.top)/plot.height*(viewport.yMax-viewport.yMin);
    onViewportChange(zoomViewport(viewport,event.deltaY>0?1.16:0.86,x,y));
  };

  const renderCritical=(items:CriticalMarker[]|undefined)=>showCritical&&items?.map((point,index)=><g key={`critical:${index}`} className={`e3-critical e3-critical-${point.classification.replace(/\s+/g,'-')}`}><circle cx={xToScreen(point.x)} cy={yToScreen(point.y)} r="6"/><title>{point.classification}</title></g>);

  const renderCurves=(polylines:Polyline2[],className='e3-curve')=>polylines.map((line,index)=><polyline key={`${className}:${index}`} className={className} points={line.points.map((p)=>`${xToScreen(p.x)},${yToScreen(p.y)}`).join(' ')} fill="none"/>);

  const renderVectorField=(field:VectorFieldModel)=>field.arrows.map((arrow,index)=>{
    const x1=xToScreen(arrow.x-arrow.dx/2),y1=yToScreen(arrow.y-arrow.dy/2),x2=xToScreen(arrow.x+arrow.dx/2),y2=yToScreen(arrow.y+arrow.dy/2);
    const angle=Math.atan2(y2-y1,x2-x1),head=5;const p1=`${x2},${y2}`,p2=`${x2-head*Math.cos(angle-0.55)},${y2-head*Math.sin(angle-0.55)}`,p3=`${x2-head*Math.cos(angle+0.55)},${y2-head*Math.sin(angle+0.55)}`;
    return <g key={`arrow:${index}`} className="e3-vector-arrow"><line x1={x1} y1={y1} x2={x2} y2={y2}/><polygon points={`${p1} ${p2} ${p3}`}/><title>{`|F| = ${arrow.magnitude.toPrecision(4)}`}</title></g>;
  });

  const surface=model.kind==='surface'?model.mesh:null;
  const quads=surface?surface.rows.flatMap((row,j)=>j>=surface.rows.length-1?[]:row.flatMap((point,i)=>{
    if(i>=row.length-1)return[];const points=[point,row[i+1],surface.rows[j+1][i+1],surface.rows[j+1][i]];
    if(points.some((p)=>!Number.isFinite(p.z)))return[];const projected=points.map((p)=>projectPoint3(p,surface.bounds3,camera,WIDTH,HEIGHT));const z=(points[0].z+points[1].z+points[2].z+points[3].z)/4;const span=Math.max(1e-12,surface.bounds3.zMax-surface.bounds3.zMin);return[{points:projected,depth:projected.reduce((sum,p)=>sum+p.depth,0)/4,band:scalarBand((z-surface.bounds3.zMin)/span)}];})) .sort((a,b)=>a.depth-b.depth):[];

  return <div className={`e3-canvas-shell ${twoD?'is-2d':'is-3d'}`}>
    <svg ref={ref} className="e3-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" tabIndex={0} aria-label={twoD?'Interactive MathLab 2D visualization. Drag to pan and use the wheel to zoom.':'MathLab 3D surface projection.'} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} onWheel={onWheel}>
      <defs><clipPath id="e3-plot-clip"><rect x={plot.left} y={plot.top} width={plot.width} height={plot.height}/></clipPath></defs>
      <rect className="e3-background" x="0" y="0" width={WIDTH} height={HEIGHT}/>
      {twoD&&<>
        <rect className="e3-plot-background" x={plot.left} y={plot.top} width={plot.width} height={plot.height}/>
        {showGrid&&<g className="e3-grid">{xTicks.map((tick)=><line key={`xg:${tick}`} x1={xToScreen(tick)} x2={xToScreen(tick)} y1={plot.top} y2={plot.top+plot.height}/>)}{yTicks.map((tick)=><line key={`yg:${tick}`} x1={plot.left} x2={plot.left+plot.width} y1={yToScreen(tick)} y2={yToScreen(tick)}/>)}</g>}
        <g className="e3-axes"><line x1={plot.left} x2={plot.left+plot.width} y1={yToScreen(Math.max(viewport.yMin,Math.min(viewport.yMax,0)))} y2={yToScreen(Math.max(viewport.yMin,Math.min(viewport.yMax,0)))}/><line x1={xToScreen(Math.max(viewport.xMin,Math.min(viewport.xMax,0)))} x2={xToScreen(Math.max(viewport.xMin,Math.min(viewport.xMax,0)))} y1={plot.top} y2={plot.top+plot.height}/></g>
        <g className="e3-ticks">{xTicks.map((tick)=><text key={`xt:${tick}`} x={xToScreen(tick)} y={plot.top+plot.height+25} textAnchor="middle">{Number(tick.toPrecision(5))}</text>)}{yTicks.map((tick)=><text key={`yt:${tick}`} x={plot.left-10} y={yToScreen(tick)+4} textAnchor="end">{Number(tick.toPrecision(5))}</text>)}</g>
        <g clipPath="url(#e3-plot-clip)">
          {showRegion&&region&&<rect className="e3-region-overlay" x={xToScreen(region.xMin)} y={yToScreen(region.yMax)} width={xToScreen(region.xMax)-xToScreen(region.xMin)} height={yToScreen(region.yMin)-yToScreen(region.yMax)}/>}          
          {model.kind==='scalar-field'&&model.field.cells.map((cell,index)=><rect key={`cell:${index}`} className={`e3-field-cell e3-field-band-${scalarBand(cell.normalized)}`} x={xToScreen(cell.x)} y={yToScreen(cell.y+cell.height)} width={Math.max(0.5,xToScreen(cell.x+cell.width)-xToScreen(cell.x))} height={Math.max(0.5,yToScreen(cell.y)-yToScreen(cell.y+cell.height))}><title>{cell.value.toPrecision(5)}</title></rect>)}
          {model.kind==='curves'&&renderCurves(model.polylines)}
          {model.kind==='implicit'&&model.segments.map((segment,index)=><line key={`implicit:${index}`} className="e3-implicit-line" x1={xToScreen(segment.a.x)} y1={yToScreen(segment.a.y)} x2={xToScreen(segment.b.x)} y2={yToScreen(segment.b.y)}/>)}
          {(model.kind==='contours'||model.kind==='scalar-field')&&(model.kind==='contours'?model.contours:model.contours??[]).map((contour,levelIndex)=><g key={`level:${contour.level}`} className={`e3-contour e3-contour-${levelIndex%6}`}>{contour.segments.map((segment,index)=><line key={index} x1={xToScreen(segment.a.x)} y1={yToScreen(segment.a.y)} x2={xToScreen(segment.b.x)} y2={yToScreen(segment.b.y)}/>)}</g>)}
          {model.kind==='vector-field'&&<>{renderVectorField(model.field)}{model.trajectories&&renderCurves(model.trajectories,'e3-trajectory')}</>}
          {model.kind==='curves'&&renderCritical(model.criticalPoints)}{model.kind==='contours'&&renderCritical(model.criticalPoints)}{model.kind==='scalar-field'&&renderCritical(model.criticalPoints)}
        </g>
      </>}
      {!twoD&&surface&&<g className="e3-surface-scene">
        {quads.map((quad,index)=><polygon key={`quad:${index}`} className={`e3-surface-face e3-field-band-${quad.band}`} points={quad.points.map((p)=>`${p.x},${p.y}`).join(' ')}/>) }
        {surface.rows.map((row,index)=><polyline key={`row:${index}`} className="e3-surface-wire" points={row.filter((p)=>Number.isFinite(p.z)).map((p)=>{const q=projectPoint3(p,surface.bounds3,camera,WIDTH,HEIGHT);return`${q.x},${q.y}`;}).join(' ')} fill="none"/>)}
        {surface.rows[0]?.map((_,column)=>{const points=surface.rows.map((row)=>row[column]).filter((p)=>p&&Number.isFinite(p.z)).map((p)=>projectPoint3(p,surface.bounds3,camera,WIDTH,HEIGHT));return<polyline key={`column:${column}`} className="e3-surface-wire" points={points.map((p)=>`${p.x},${p.y}`).join(' ')} fill="none"/>;})}
        {showCritical&&surface.criticalPoints.map((point,index)=>{if(point.z===undefined)return null;const p=projectPoint3({x:point.x,y:point.y,z:point.z},surface.bounds3,camera,WIDTH,HEIGHT);return<g key={`critical3:${index}`} className="e3-critical-3d"><circle cx={p.x} cy={p.y} r="6"/><title>{point.classification}</title></g>;})}
      </g>}
    </svg>
  </div>;
});
