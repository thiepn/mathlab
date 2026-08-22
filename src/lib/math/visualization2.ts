import type { AstNode } from './ast';
import { criticalPointAnalysis, gradient } from './multivariable';

export interface View2D { xMin:number; xMax:number; yMin:number; yMax:number }
export interface Point2 { x:number; y:number }
export interface Point3 { x:number; y:number; z:number }
export interface Segment2 { a:Point2; b:Point2 }
export interface Polyline2 { points:Point2[] }
export interface Arrow2 { x:number; y:number; dx:number; dy:number; magnitude:number }
export interface ScalarCell { x:number; y:number; width:number; height:number; value:number; normalized:number }
export interface CriticalMarker { x:number; y:number; z?:number; classification:string }
export interface ScalarFieldModel { cells:ScalarCell[]; min:number; max:number; nx:number; ny:number }
export interface VectorFieldModel { arrows:Arrow2[]; maxMagnitude:number }
export interface ContourLevel { level:number; segments:Segment2[] }
export interface SurfaceMesh { rows:Point3[][]; bounds3:{xMin:number;xMax:number;yMin:number;yMax:number;zMin:number;zMax:number}; criticalPoints:CriticalMarker[] }
export interface ProjectedPoint { x:number; y:number; depth:number }
export interface Camera3D { azimuth:number; elevation:number; zoom:number }

const MAX_ABS=1e12;
function finite(value:number):number{return Number.isFinite(value)&&Math.abs(value)<=MAX_ABS?value:Number.NaN;}

export function evaluateNumericPoint(node:AstNode,values:Record<string,number>):number{
  switch(node.type){
    case 'number':return finite(Number(node.value));
    case 'symbol':{
      if(Object.prototype.hasOwnProperty.call(values,node.name))return finite(values[node.name]);
      if(node.name==='pi')return Math.PI;
      if(node.name==='e')return Math.E;
      if(node.name==='infinity')return Number.POSITIVE_INFINITY;
      return Number.NaN;
    }
    case 'unary':{const v=evaluateNumericPoint(node.operand,values);return finite(node.operator==='-'?-v:v);}
    case 'binary':{
      const left=evaluateNumericPoint(node.left,values);const right=evaluateNumericPoint(node.right,values);
      if(!Number.isFinite(left)||!Number.isFinite(right))return Number.NaN;
      if(node.operator==='+')return finite(left+right);
      if(node.operator==='-')return finite(left-right);
      if(node.operator==='*')return finite(left*right);
      if(node.operator==='/')return Math.abs(right)<=Number.EPSILON?Number.NaN:finite(left/right);
      return finite(Math.pow(left,right));
    }
    case 'call':{
      if(node.args.length!==1)return Number.NaN;
      const arg=evaluateNumericPoint(node.args[0],values);if(!Number.isFinite(arg))return Number.NaN;
      if(node.name==='sin')return finite(Math.sin(arg));
      if(node.name==='cos')return finite(Math.cos(arg));
      if(node.name==='tan')return finite(Math.tan(arg));
      if(node.name==='asin')return finite(Math.asin(arg));
      if(node.name==='acos')return finite(Math.acos(arg));
      if(node.name==='atan')return finite(Math.atan(arg));
      if(node.name==='sinh')return finite(Math.sinh(arg));
      if(node.name==='cosh')return finite(Math.cosh(arg));
      if(node.name==='tanh')return finite(Math.tanh(arg));
      if(node.name==='exp')return finite(Math.exp(arg));
      if(node.name==='ln')return finite(Math.log(arg));
      if(node.name==='log')return finite(Math.log10(arg));
      if(node.name==='sqrt')return finite(Math.sqrt(arg));
      if(node.name==='abs')return finite(Math.abs(arg));
      return Number.NaN;
    }
    case 'definition':return evaluateNumericPoint(node.right,values);
    case 'equation':return finite(evaluateNumericPoint(node.left,values)-evaluateNumericPoint(node.right,values));
    case 'comparison':case 'matrix':case 'system':case 'set':return Number.NaN;
  }
}

export function vectorComponents(node:AstNode,expected?:number):AstNode[]{
  const ast=node.type==='definition'?node.right:node;
  if(ast.type!=='matrix'||ast.rows.length!==1)throw new Error('Vector-valued visualization requires a one-row vector such as [cos(t), sin(t)].');
  const items=ast.rows[0];
  if(expected!==undefined&&items.length!==expected)throw new Error(`Expected a ${expected}-component vector.`);
  return items;
}

function sampleRange(min:number,max:number,count:number):number[]{
  const n=Math.max(2,Math.floor(count));
  return Array.from({length:n},(_,i)=>min+(max-min)*i/(n-1));
}

function pushFinitePolyline(out:Polyline2[],current:Point2[]){if(current.length>1)out.push({points:current});}

export function sampleParametricCurve(node:AstNode,parameter:string,tMin:number,tMax:number,samples=720):Polyline2[]{
  const [xAst,yAst]=vectorComponents(node,2);const out:Polyline2[]=[];let current:Point2[]=[];
  for(const t of sampleRange(tMin,tMax,samples)){
    const x=evaluateNumericPoint(xAst,{[parameter]:t});const y=evaluateNumericPoint(yAst,{[parameter]:t});
    if(Number.isFinite(x)&&Number.isFinite(y)){current.push({x,y});}
    else{pushFinitePolyline(out,current);current=[];}
  }
  pushFinitePolyline(out,current);return out;
}

export function samplePolarCurve(node:AstNode,parameter:string,tMin:number,tMax:number,samples=720):Polyline2[]{
  const ast=node.type==='definition'?node.right:node;const out:Polyline2[]=[];let current:Point2[]=[];
  for(const theta of sampleRange(tMin,tMax,samples)){
    const r=evaluateNumericPoint(ast,{[parameter]:theta});
    const x=r*Math.cos(theta);const y=r*Math.sin(theta);
    if(Number.isFinite(r)&&Number.isFinite(x)&&Number.isFinite(y)){current.push({x,y});}
    else{pushFinitePolyline(out,current);current=[];}
  }
  pushFinitePolyline(out,current);return out;
}

function implicitAst(node:AstNode):AstNode{
  const ast=node.type==='definition'?node.right:node;
  if(ast.type==='equation')return{type:'binary',operator:'-',left:ast.left,right:ast.right};
  return ast;
}

function interpolate(a:Point2,va:number,b:Point2,vb:number,level:number):Point2{
  const denom=vb-va;const t=Math.abs(denom)<1e-15?0.5:Math.max(0,Math.min(1,(level-va)/denom));
  return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}

function marchingSegments(node:AstNode,variables:[string,string],view:View2D,level:number,nx:number,ny:number):Segment2[]{
  const ast=implicitAst(node);const xs=sampleRange(view.xMin,view.xMax,nx+1);const ys=sampleRange(view.yMin,view.yMax,ny+1);
  const values=ys.map((y)=>xs.map((x)=>evaluateNumericPoint(ast,{[variables[0]]:x,[variables[1]]:y})));
  const segments:Segment2[]=[];
  for(let j=0;j<ny;j+=1)for(let i=0;i<nx;i+=1){
    const p:[Point2,Point2,Point2,Point2]=[{x:xs[i],y:ys[j]},{x:xs[i+1],y:ys[j]},{x:xs[i+1],y:ys[j+1]},{x:xs[i],y:ys[j+1]}];
    const v:[number,number,number,number]=[values[j][i],values[j][i+1],values[j+1][i+1],values[j+1][i]];
    if(v.some((item)=>!Number.isFinite(item)))continue;
    const edges:Array<[number,number]>=[];
    const pairs:Array<[number,number]>=[[0,1],[1,2],[2,3],[3,0]];
    pairs.forEach(([a,b],edge)=>{const da=v[a]-level,db=v[b]-level;if(da===0||db===0||Math.sign(da)!==Math.sign(db))edges.push([edge,a]);});
    const points=edges.map(([edge])=>{const [a,b]=pairs[edge];return interpolate(p[a],v[a],p[b],v[b],level);});
    if(points.length===2)segments.push({a:points[0],b:points[1]});
    else if(points.length===4){
      const center=(v[0]+v[1]+v[2]+v[3])/4;
      if(center>=level){segments.push({a:points[0],b:points[1]},{a:points[2],b:points[3]});}
      else{segments.push({a:points[0],b:points[3]},{a:points[1],b:points[2]});}
    }
  }
  return segments;
}

export function sampleImplicitCurve(node:AstNode,variables:[string,string],view:View2D,cells=64):Segment2[]{
  return marchingSegments(node,variables,view,0,Math.max(16,cells),Math.max(16,cells));
}

export function sampleContours(node:AstNode,variables:[string,string],view:View2D,levels:number[],cells=52):ContourLevel[]{
  return levels.map((level)=>({level,segments:marchingSegments(node,variables,view,level,Math.max(16,cells),Math.max(16,cells))}));
}

export function sampleScalarField(node:AstNode,variables:[string,string],view:View2D,nx=32,ny=24):ScalarFieldModel{
  const ast=node.type==='definition'?node.right:node;const cells:ScalarCell[]=[];let min=Number.POSITIVE_INFINITY,max=Number.NEGATIVE_INFINITY;
  const dx=(view.xMax-view.xMin)/nx,dy=(view.yMax-view.yMin)/ny;
  for(let j=0;j<ny;j+=1)for(let i=0;i<nx;i+=1){
    const x=view.xMin+(i+0.5)*dx,y=view.yMin+(j+0.5)*dy;const value=evaluateNumericPoint(ast,{[variables[0]]:x,[variables[1]]:y});
    if(!Number.isFinite(value))continue;min=Math.min(min,value);max=Math.max(max,value);cells.push({x:x-dx/2,y:y-dy/2,width:dx,height:dy,value,normalized:0});
  }
  if(!Number.isFinite(min)||!Number.isFinite(max)){min=0;max=0;}
  const span=Math.max(1e-12,max-min);for(const cell of cells)cell.normalized=(cell.value-min)/span;
  return{cells,min,max,nx,ny};
}

export function sampleVectorField(node:AstNode,variables:[string,string],view:View2D,density=15):VectorFieldModel{
  const [uAst,vAst]=vectorComponents(node,2);const arrows:Arrow2[]=[];let maxMagnitude=0;
  const nx=Math.max(5,Math.floor(density)),ny=Math.max(5,Math.floor(density*Math.max(0.55,(view.yMax-view.yMin)/(view.xMax-view.xMin))));
  const xs=sampleRange(view.xMin,view.xMax,nx),ys=sampleRange(view.yMin,view.yMax,ny);
  for(const y of ys)for(const x of xs){
    const values={[variables[0]]:x,[variables[1]]:y};const u=evaluateNumericPoint(uAst,values),v=evaluateNumericPoint(vAst,values);const magnitude=Math.hypot(u,v);
    if(!Number.isFinite(magnitude)||magnitude<1e-12)continue;maxMagnitude=Math.max(maxMagnitude,magnitude);arrows.push({x,y,dx:u,dy:v,magnitude});
  }
  const cell=Math.min((view.xMax-view.xMin)/Math.max(1,nx-1),(view.yMax-view.yMin)/Math.max(1,ny-1))*0.72;
  return{maxMagnitude,arrows:arrows.map((arrow)=>{const scale=cell/Math.max(arrow.magnitude,1e-12);return{...arrow,dx:arrow.dx*scale,dy:arrow.dy*scale};})};
}

export function sampleGradientField(node:AstNode,variables:[string,string],view:View2D,density=15):VectorFieldModel{
  const ast=node.type==='definition'?node.right:node;const grad=gradient(ast,variables).ast;
  return sampleVectorField(grad,variables,view,density);
}

function vectorAt(components:AstNode[],variables:[string,string],x:number,y:number):Point2|null{
  const values={[variables[0]]:x,[variables[1]]:y};const u=evaluateNumericPoint(components[0],values),v=evaluateNumericPoint(components[1],values);
  return Number.isFinite(u)&&Number.isFinite(v)?{x:u,y:v}:null;
}

function traceTrajectory(components:AstNode[],variables:[string,string],view:View2D,start:Point2,direction:1|-1,steps=180):Point2[]{
  const out=[start];let p={...start};const span=Math.min(view.xMax-view.xMin,view.yMax-view.yMin);
  for(let i=0;i<steps;i+=1){
    const f=vectorAt(components,variables,p.x,p.y);if(!f)break;const speed=Math.hypot(f.x,f.y);if(speed<1e-10)break;
    const h=direction*(0.028*span)/Math.max(1,speed);
    const mid={x:p.x+f.x*h/2,y:p.y+f.y*h/2};const fm=vectorAt(components,variables,mid.x,mid.y);if(!fm)break;
    const next={x:p.x+fm.x*h,y:p.y+fm.y*h};
    if(next.x<view.xMin||next.x>view.xMax||next.y<view.yMin||next.y>view.yMax)break;
    if(Math.hypot(next.x-p.x,next.y-p.y)<1e-9)break;out.push(next);p=next;
  }
  return out;
}

export function samplePhasePortrait(node:AstNode,variables:[string,string],view:View2D,density=13,seeds=4):{field:VectorFieldModel;trajectories:Polyline2[]}{
  const components=vectorComponents(node,2);const field=sampleVectorField(node,variables,view,density);const trajectories:Polyline2[]=[];
  const xs=sampleRange(view.xMin+(view.xMax-view.xMin)*0.12,view.xMax-(view.xMax-view.xMin)*0.12,seeds);
  const ys=sampleRange(view.yMin+(view.yMax-view.yMin)*0.12,view.yMax-(view.yMax-view.yMin)*0.12,seeds);
  for(const y of ys)for(const x of xs){
    const start={x,y};const backward=traceTrajectory(components,variables,view,start,-1).reverse();const forward=traceTrajectory(components,variables,view,start,1);
    const points=[...backward.slice(0,-1),...forward];if(points.length>2)trajectories.push({points});
  }
  return{field,trajectories};
}

export function criticalMarkers(node:AstNode,variables:[string,string]):CriticalMarker[]{
  const ast=node.type==='definition'?node.right:node;
  try{
    return criticalPointAnalysis(ast,variables).records.flatMap((record)=>{
      const x=evaluateNumericPoint(record.point[0],{}),y=evaluateNumericPoint(record.point[1],{}),z=evaluateNumericPoint(record.value,{});
      return Number.isFinite(x)&&Number.isFinite(y)?[{x,y,z:Number.isFinite(z)?z:undefined,classification:record.classification}]:[];
    });
  }catch{return[];}
}

function boundsFromRows(rows:Point3[][]):SurfaceMesh['bounds3']{
  const flat=rows.flat().filter((p)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));
  if(!flat.length)return{xMin:-1,xMax:1,yMin:-1,yMax:1,zMin:-1,zMax:1};
  return{xMin:Math.min(...flat.map((p)=>p.x)),xMax:Math.max(...flat.map((p)=>p.x)),yMin:Math.min(...flat.map((p)=>p.y)),yMax:Math.max(...flat.map((p)=>p.y)),zMin:Math.min(...flat.map((p)=>p.z)),zMax:Math.max(...flat.map((p)=>p.z))};
}

export function sampleSurface(node:AstNode,variables:[string,string],view:View2D,resolution=27):SurfaceMesh{
  const ast=node.type==='definition'?node.right:node;const xs=sampleRange(view.xMin,view.xMax,resolution),ys=sampleRange(view.yMin,view.yMax,resolution);
  const rows=ys.map((y)=>xs.map((x)=>({x,y,z:evaluateNumericPoint(ast,{[variables[0]]:x,[variables[1]]:y})})));const bounds3=boundsFromRows(rows);
  return{rows,bounds3,criticalPoints:criticalMarkers(ast,variables)};
}

export function sampleParametricSurface(node:AstNode,variables:[string,string],uRange:[number,number],vRange:[number,number],resolution=25):SurfaceMesh{
  const [xAst,yAst,zAst]=vectorComponents(node,3);const us=sampleRange(uRange[0],uRange[1],resolution),vs=sampleRange(vRange[0],vRange[1],resolution);
  const rows=vs.map((v)=>us.map((u)=>{const values={[variables[0]]:u,[variables[1]]:v};return{x:evaluateNumericPoint(xAst,values),y:evaluateNumericPoint(yAst,values),z:evaluateNumericPoint(zAst,values)};}));
  return{rows,bounds3:boundsFromRows(rows),criticalPoints:[]};
}

export function projectPoint3(point:Point3,bounds:SurfaceMesh['bounds3'],camera:Camera3D,width=900,height=560):ProjectedPoint{
  const cx=(bounds.xMin+bounds.xMax)/2,cy=(bounds.yMin+bounds.yMax)/2,cz=(bounds.zMin+bounds.zMax)/2;
  const span=Math.max(bounds.xMax-bounds.xMin,bounds.yMax-bounds.yMin,bounds.zMax-bounds.zMin,1e-9);
  let x=(point.x-cx)/span*2,y=(point.y-cy)/span*2,z=(point.z-cz)/span*2;
  const az=camera.azimuth*Math.PI/180,el=camera.elevation*Math.PI/180;
  const x1=x*Math.cos(az)-y*Math.sin(az),y1=x*Math.sin(az)+y*Math.cos(az);x=x1;y=y1;
  const y2=y*Math.cos(el)-z*Math.sin(el),z2=y*Math.sin(el)+z*Math.cos(el);y=y2;z=z2;
  const scale=Math.min(width,height)*0.31*camera.zoom;
  return{x:width/2+x*scale,y:height/2-y*scale,depth:z};
}
