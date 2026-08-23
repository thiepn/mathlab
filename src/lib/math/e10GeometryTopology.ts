import type { AstNode } from './ast';
import { simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import { add, mul, neg, rat, sub, ZERO, type Rational } from './rational';
import { averageRat, b, call, compareRat, cross3, dotRat, eqRat, exactIntegerVector, exactMatrix, exactRational, matrix, n, rationalAst, rationalRank, s, section, squareRat, vectorSub } from './e10Common';
import type { E10Transform } from './e10Types';

export function isE10GeometryConstructorCall(node:AstNode):boolean{return node.type==='call'&&['metricspace','topology','pointset','rectregion','paramcurve','graphsurface'].includes(node.name);}
export function e10GeometryIntrinsicSymbols(node:AstNode):string[]{
  if(node.type!=='call')return[];
  if(node.name==='paramcurve')return['t'];
  if(node.name==='graphsurface')return['x','y'];
  return[];
}
export function e10GeometryShapeInfo(node:AstNode):{family:string;size?:number;dimension?:number;opens?:number}|null{
  try{
    const q=simplifyAst(node);if(q.type!=='call')return null;
    if(q.name==='metricspace'){const d=exactMatrix(q.args[0],'Distance matrix');return{family:'metricspace',size:d.length};}
    if(q.name==='topology'){const inc=topologyIncidence(q.args[0]);return{family:'topology',size:inc.points,opens:inc.opens.length};}
    if(q.name==='pointset'){const pts=pointSet(q);return{family:'pointset',size:pts.length,dimension:pts[0].length};}
    if(q.name==='rectregion')return{family:'rectregion',dimension:2};
    if(q.name==='paramcurve'){const vec=vectorAst(q.args[0],'Curve coordinate vector');return{family:'paramcurve',dimension:vec.length};}
    if(q.name==='graphsurface')return{family:'graphsurface',dimension:3};
    return null;
  }catch{return null;}
}

// ---------------------------------------------------------------------------
// Finite metric spaces
// ---------------------------------------------------------------------------
interface MetricAnalysis{matrix:Rational[][];order:number;valid:boolean;reasons:string[];diameter:Rational;minSeparation:Rational|null}
function metricAnalysis(node:AstNode):MetricAnalysis{
  const q=simplifyAst(node);if(q.type!=='call'||q.name!=='metricspace'||q.args.length!==1)throw new Error('Finite metric spaces use metricspace(distanceMatrix).');
  const d=exactMatrix(q.args[0],'Distance matrix'),order=d.length;if(order<1||order>24||d.some(row=>row.length!==order))throw new Error('Distance matrix must be square of order 1–24.');
  const reasons:string[]=[];let diameter=ZERO,min:Rational|null=null;
  for(let i=0;i<order;i+=1)for(let j=0;j<order;j+=1){const value=d[i][j];
    if(compareRat(value,ZERO)<0)reasons.push(`d(${i+1},${j+1}) is negative.`);
    if((i===j)!==eqRat(value,ZERO))reasons.push(`Identity of indiscernibles fails at (${i+1},${j+1}).`);
    if(compareRat(value,diameter)>0)diameter=value;
    if(i!==j&&compareRat(value,ZERO)>0&&(min===null||compareRat(value,min)<0))min=value;
    if(!eqRat(value,d[j][i]))reasons.push(`Symmetry fails for points ${i+1},${j+1}.`);
  }
  outer:for(let i=0;i<order;i+=1)for(let j=0;j<order;j+=1)for(let k=0;k<order;k+=1)if(compareRat(d[i][k],add(d[i][j],d[j][k]))>0){reasons.push(`Triangle inequality fails for ${i+1},${j+1},${k+1}.`);break outer;}
  return{matrix:d,order,valid:reasons.length===0,reasons:[...new Set(reasons)].slice(0,8),diameter,minSeparation:min};
}
export function metricSpaceProfile(node:AstNode):E10Transform{
  const m=metricAnalysis(node);
  return{display:m.valid?`Finite metric space on ${m.order} points`:'Distance matrix is not a metric',exactness:'exact',warnings:[],steps:[],sections:[section('metric-axioms','Metric-space axioms',[{label:'Points',display:String(m.order)},{label:'Nonnegative / identity',display:m.reasons.some(x=>x.includes('negative')||x.includes('Identity'))?'No':'Yes'},{label:'Symmetric',display:m.reasons.some(x=>x.includes('Symmetry'))?'No':'Yes'},{label:'Triangle inequality',display:m.reasons.some(x=>x.includes('Triangle'))?'No':'Yes'},{label:'Metric',display:m.valid?'Yes':'No',tone:m.valid?'positive':'negative'}],m.reasons.join(' ')||'All metric axioms hold exactly.'),section('metric-finite','Finite metric consequences',[{label:'Diameter',display:m.valid?`${m.diameter.n}/${m.diameter.d}`.replace('/1',''):'Undefined',ast:m.valid?rationalAst(m.diameter):undefined},{label:'Minimum positive separation',display:m.valid?(m.minSeparation?`${m.minSeparation.n}/${m.minSeparation.d}`.replace('/1',''):'None'):'Undefined'},{label:'Compact',display:m.valid?'Yes — every finite metric space is compact':'Undefined'},{label:'Induced topology',display:m.valid?'Discrete':'Undefined'},{label:'Connected',display:m.valid?(m.order<=1?'Yes':'No'):'Undefined'}]) ]};
}
function parseExactRationalSource(source:string,label:string):Rational{const parsed=parseMath(source);if(!parsed.ast||parsed.diagnostics.some(d=>d.severity==='error'))throw new Error(`${label} could not be parsed.`);return exactRational(parsed.ast,label);}
export function metricBall(node:AstNode,center:number,radiusSource:string,closed:boolean):E10Transform{
  const m=metricAnalysis(node);if(!m.valid)throw new Error('Metric balls require a valid metric space.');if(!Number.isInteger(center)||center<1||center>m.order)throw new Error(`Center must lie in {1,…,${m.order}}.`);const radius=parseExactRationalSource(radiusSource,'Radius');if(compareRat(radius,ZERO)<0)throw new Error('Ball radius must be nonnegative.');
  const points=Array.from({length:m.order},(_v,i)=>i+1).filter(j=>closed?compareRat(m.matrix[center-1][j-1],radius)<=0:compareRat(m.matrix[center-1][j-1],radius)<0),ast=matrix([points.map(n)]);
  return{ast,display:`${closed?'Closed':'Open'} ball = {${points.join(', ')}}`,exactness:'exact',warnings:[],steps:[],sections:[section('metric-ball',closed?'Closed metric ball':'Open metric ball',[{label:'Center',display:String(center)},{label:'Radius',display:`${radius.n}/${radius.d}`.replace('/1','')},{label:'Points',display:`{${points.join(', ')}}`,ast}]) ]};
}

// ---------------------------------------------------------------------------
// Finite topological spaces via 0/1 open-set incidence rows
// ---------------------------------------------------------------------------
interface TopologyIncidence{points:number;opens:number[]}
function topologyIncidence(node:AstNode):TopologyIncidence{
  const rows=exactMatrix(node,'Topology incidence matrix');const points=rows[0].length;if(points<1||points>16||rows.length<2||rows.length>65536)throw new Error('Topology incidence matrix must represent 1–16 points and at least empty/full rows.');
  const opens=rows.map((row,i)=>{let mask=0;row.forEach((value,j)=>{if(value.d!==1n||(value.n!==0n&&value.n!==1n))throw new Error(`Topology incidence entry (${i+1},${j+1}) must be 0 or 1.`);if(value.n===1n)mask|=(1<<j);});return mask;});return{points,opens:[...new Set(opens)].sort((a,d)=>a-d)};
}
interface TopologyAnalysis extends TopologyIncidence{valid:boolean;reasons:string[];closed:number[];clopen:number[];t0:boolean;t1:boolean;connected:boolean;discrete:boolean;indiscrete:boolean}
function topologyAnalysis(node:AstNode):TopologyAnalysis{
  const q=simplifyAst(node);if(q.type!=='call'||q.name!=='topology'||q.args.length!==1)throw new Error('Finite topologies use topology(openSetIncidenceMatrix).');const inc=topologyIncidence(q.args[0]),full=(1<<inc.points)-1,O=new Set(inc.opens),reasons:string[]=[];
  if(!O.has(0))reasons.push('Empty set is missing from the open family.');if(!O.has(full))reasons.push('Whole space is missing from the open family.');
  outer:for(const a of inc.opens)for(const d of inc.opens){if(!O.has(a|d)){reasons.push('Open family is not closed under unions.');break outer;}if(!O.has(a&d)){reasons.push('Open family is not closed under finite intersections.');break outer;}}
  const closed=inc.opens.map(mask=>full^mask),C=new Set(closed),clopen=inc.opens.filter(mask=>C.has(mask)),connected=!clopen.some(mask=>mask!==0&&mask!==full),discrete=inc.opens.length===2**inc.points,indiscrete=inc.opens.length===2&&O.has(0)&&O.has(full);
  let t0=true;for(let i=0;i<inc.points;i+=1)for(let j=i+1;j<inc.points;j+=1)if(!inc.opens.some(mask=>Boolean(mask&(1<<i))!==Boolean(mask&(1<<j))))t0=false;
  let t1=true;for(let i=0;i<inc.points;i+=1)if(!C.has(1<<i))t1=false;
  return{...inc,valid:reasons.length===0,reasons,closed:[...new Set(closed)],clopen,t0,t1,connected,discrete,indiscrete};
}
function maskText(mask:number,points:number):string{const values=Array.from({length:points},(_v,i)=>i+1).filter(x=>mask&(1<<(x-1)));return`{${values.join(', ')}}`;}
export function topologyProfile(node:AstNode):E10Transform{
  const t=topologyAnalysis(node);
  return{display:t.valid?`Finite topology on ${t.points} points with ${t.opens.length} open sets`:'Open family is not a topology',exactness:'exact',warnings:[],steps:[],sections:[section('topology-axioms','Topology axioms',[{label:'Points',display:String(t.points)},{label:'Open sets represented',display:String(t.opens.length)},{label:'Topology',display:t.valid?'Yes':'No',tone:t.valid?'positive':'negative'}],t.reasons.join(' ')||'Empty/full sets are present and binary union/intersection closure certifies the finite topology axioms.'),section('topology-properties','Finite topology properties',[{label:'Discrete',display:t.valid&&t.discrete?'Yes':'No'},{label:'Indiscrete',display:t.valid&&t.indiscrete?'Yes':'No'},{label:'T0',display:t.valid&&t.t0?'Yes':'No'},{label:'T1',display:t.valid&&t.t1?'Yes':'No'},{label:'Connected',display:t.valid&&t.connected?'Yes':'No'},{label:'Compact',display:t.valid?'Yes — every finite topological space is compact':'Undefined'},{label:'Clopen sets',display:t.valid?t.clopen.map(mask=>maskText(mask,t.points)).join(', '):'Undefined'}]) ]};
}
function subsetMask(source:string,points:number):number{
  const parsed=parseMath(source);if(!parsed.ast||parsed.diagnostics.some(d=>d.severity==='error'))throw new Error('Subset must parse as set(1,2,...) or a 0/1 incidence vector.');const q=simplifyAst(parsed.ast);let labels:number[]=[];
  if(q.type==='call'&&q.name==='set'){labels=q.args.map((arg,i)=>{const v=exactRational(arg,`Subset label ${i+1}`);if(v.d!==1n)return NaN;return Number(v.n);});if(labels.some(x=>!Number.isInteger(x)||x<1||x>points))throw new Error(`Subset labels must lie in {1,…,${points}}.`);}
  else {const bits=exactIntegerVector(q,'Subset incidence vector');if(bits.length!==points||bits.some(v=>v!==0n&&v!==1n))throw new Error(`Subset incidence vector must contain exactly ${points} entries of 0 or 1.`);labels=bits.map((v,i)=>v===1n?i+1:0).filter(Boolean);}
  return labels.reduce((mask,label)=>mask|(1<<(label-1)),0);
}
export function topologySubsetProfile(node:AstNode,source:string):E10Transform{
  const t=topologyAnalysis(node);if(!t.valid)throw new Error('Subset topology analysis requires a valid finite topology.');const full=(1<<t.points)-1,S=subsetMask(source,t.points),O=new Set(t.opens),C=new Set(t.closed),interior=t.opens.filter(mask=>(mask&S)===mask).reduce((acc,mask)=>acc|mask,0);let closure=full;for(const mask of t.closed)if((mask&S)===S)closure&=mask;const boundary=closure&(~interior)&full;
  return{display:`${maskText(S,t.points)} · ${O.has(S)?'open':'not open'} · ${C.has(S)?'closed':'not closed'}`,exactness:'exact',warnings:[],steps:[],sections:[section('subset-topology','Subset topology',[{label:'Subset',display:maskText(S,t.points)},{label:'Open',display:O.has(S)?'Yes':'No'},{label:'Closed',display:C.has(S)?'Yes':'No'},{label:'Clopen',display:O.has(S)&&C.has(S)?'Yes':'No'},{label:'Interior',display:maskText(interior,t.points)},{label:'Closure',display:maskText(closure,t.points)},{label:'Boundary',display:maskText(boundary,t.points)}]) ]};
}

// ---------------------------------------------------------------------------
// Exact analytic geometry of finite point sets
// ---------------------------------------------------------------------------
function pointSet(node:AstNode):Rational[][]{
  const q=simplifyAst(node);if(q.type!=='call'||q.name!=='pointset'||q.args.length!==1)throw new Error('Point sets use pointset([[x1,y1,...],...]).');const pts=exactMatrix(q.args[0],'Point matrix');if(pts.length<1||pts.length>64||(pts[0].length!==2&&pts[0].length!==3))throw new Error('Point set must contain 1–64 points in R^2 or R^3.');return pts;
}
function pointAffineDimension(pts:Rational[][]):number{return pts.length<=1?0:rationalRank(pts.slice(1).map(point=>vectorSub(point,pts[0])));}
function ratText(value:Rational):string{return value.d===1n?String(value.n):`${value.n}/${value.d}`;}
export function pointSetProfile(node:AstNode):E10Transform{
  const pts=pointSet(node),dimension=pts[0].length,affine=pointAffineDimension(pts),centroid=Array.from({length:dimension},(_v,j)=>averageRat(pts.map(p=>p[j]))),mins=pts[0].map(x=>x),maxs=pts[0].map(x=>x);
  pts.forEach(p=>p.forEach((value,j)=>{if(compareRat(value,mins[j])<0)mins[j]=value;if(compareRat(value,maxs[j])>0)maxs[j]=value;}));const unique=new Set(pts.map(p=>p.map(ratText).join(','))).size;
  return{ast:matrix(centroid.map(rationalAst).length?[centroid.map(rationalAst)]:[]),display:`${pts.length} points in R^${dimension} · affine dimension ${affine}`,exactness:'exact',warnings:[],steps:[],sections:[section('pointset','Point-set geometry',[{label:'Points',display:String(pts.length)},{label:'Ambient dimension',display:String(dimension)},{label:'Affine dimension',display:String(affine)},{label:'Distinct points',display:String(unique)},{label:'Centroid',display:`(${centroid.map(ratText).join(', ')})`},{label:'Coordinate bounds',display:mins.map((value,j)=>`[${ratText(value)}, ${ratText(maxs[j])}]`).join(' × ')},{label:'Collinear',display:affine<=1?'Yes':'No'},{label:'Coplanar',display:dimension===3&&affine<=2?'Yes':dimension===2?'Automatically':'No'}]) ]};
}
export function pointDistanceMatrix(node:AstNode):E10Transform{
  const pts=pointSet(node),rows:AstNode[][]=pts.map((p,i)=>pts.map((q,j)=>{if(i===j)return n(0);const squared=vectorSub(p,q).map(squareRat).reduce((sum,value)=>add(sum,value),ZERO);return call('sqrt',rationalAst(squared));})),ast=matrix(rows);
  return{ast,display:astToPlainText(ast),exactness:'exact',warnings:[],steps:[],sections:[section('distance-matrix','Exact Euclidean distance matrix',[{label:'Distances',display:astToPlainText(ast),ast}],'Square roots remain symbolic when distances are irrational; no decimal approximation is introduced.')]};
}
function firstNonzeroDirection(pts:Rational[][]):Rational[]|null{for(let i=1;i<pts.length;i+=1){const d=vectorSub(pts[i],pts[0]);if(d.some(x=>x.n!==0n))return d;}return null;}
function equationAst(coeff:Rational[],constant:Rational,vars:string[]):AstNode{let left:AstNode=rationalAst(constant);coeff.forEach((value,i)=>{left=b('+',left,b('*',rationalAst(value),s(vars[i])));});return{type:'equation',left,right:n(0)};}
export function affineHullProfile(node:AstNode):E10Transform{
  const pts=pointSet(node),ambient=pts[0].length,dim=pointAffineDimension(pts),p0=pts[0];
  if(dim===0)return{ast:matrix([p0.map(rationalAst)]),display:`Affine hull is the point (${p0.map(ratText).join(', ')})`,exactness:'exact',warnings:[],steps:[],sections:[section('affine-hull','Affine hull',[{label:'Dimension',display:'0'},{label:'Hull',display:`{(${p0.map(ratText).join(', ')})}`}]) ]};
  if(dim===ambient)return{display:`Affine hull = R^${ambient}`,exactness:'exact',warnings:[],steps:[],sections:[section('affine-hull','Affine hull',[{label:'Dimension',display:String(dim)},{label:'Hull',display:`R^${ambient}`}]) ]};
  const direction=firstNonzeroDirection(pts)!;
  if(ambient===2&&dim===1){const coeff=[direction[1],neg(direction[0])],constant=neg(dotRat(coeff,p0)),ast=equationAst(coeff,constant,['x','y']);return{ast,display:astToPlainText(ast),exactness:'exact',warnings:[],steps:[],sections:[section('affine-hull','Affine line',[{label:'Dimension',display:'1'},{label:'Direction',display:`(${direction.map(ratText).join(', ')})`},{label:'Equation',display:astToPlainText(ast),ast}]) ]};}
  if(ambient===3&&dim===1)return{display:`r(t)=(${p0.map(ratText).join(', ')})+t(${direction.map(ratText).join(', ')})`,exactness:'exact',warnings:[],steps:[],sections:[section('affine-hull','Affine line',[{label:'Dimension',display:'1'},{label:'Point',display:`(${p0.map(ratText).join(', ')})`},{label:'Direction',display:`(${direction.map(ratText).join(', ')})`}]) ]};
  let second:Rational[]|null=null;for(let i=1;i<pts.length;i+=1){const candidate=vectorSub(pts[i],p0),cross=cross3(direction,candidate);if(cross.some(x=>x.n!==0n)){second=candidate;break;}}if(!second)throw new Error('Could not reconstruct a plane basis from the represented points.');const normal=cross3(direction,second),constant=neg(dotRat(normal,p0)),ast=equationAst(normal,constant,['x','y','z']);return{ast,display:astToPlainText(ast),exactness:'exact',warnings:[],steps:[],sections:[section('affine-hull','Affine plane',[{label:'Dimension',display:'2'},{label:'Normal',display:`(${normal.map(ratText).join(', ')})`},{label:'Equation',display:astToPlainText(ast),ast}]) ]};
}

// ---------------------------------------------------------------------------
// Shared geometry ownership for E2/E3-style objects
// ---------------------------------------------------------------------------
function vectorAst(node:AstNode,label:string):AstNode[]{const q=simplifyAst(node);if(q.type!=='matrix'||q.rows.length!==1||(q.rows[0].length!==2&&q.rows[0].length!==3))throw new Error(`${label} must be a 2D or 3D vector expression.`);return q.rows[0];}
function geometrySpec(node:AstNode):{family:'rectregion'|'paramcurve'|'graphsurface';dimension:number;facts:Array<{label:string;display:string;ast?:AstNode}>;ast?:AstNode}{
  const q=simplifyAst(node);if(q.type!=='call')throw new Error('Geometry object is invalid.');
  if(q.name==='rectregion'){if(q.args.length!==4)throw new Error('rectregion(x0,x1,y0,y1) requires four exact bounds.');const x0=exactRational(q.args[0],'x0'),x1=exactRational(q.args[1],'x1'),y0=exactRational(q.args[2],'y0'),y1=exactRational(q.args[3],'y1');if(compareRat(x0,x1)>=0||compareRat(y0,y1)>=0)throw new Error('Rectangle lower bounds must be strictly below upper bounds.');const area=mul(sub(x1,x0),sub(y1,y0));return{family:'rectregion',dimension:2,facts:[{label:'x interval',display:`[${ratText(x0)}, ${ratText(x1)}]`},{label:'y interval',display:`[${ratText(y0)}, ${ratText(y1)}]`},{label:'Exact area',display:ratText(area),ast:rationalAst(area)}],ast:rationalAst(area)};}
  if(q.name==='paramcurve'){if(q.args.length!==3)throw new Error('paramcurve([x(t),y(t)[,z(t)]],t0,t1) requires a coordinate vector and exact parameter interval.');const coords=vectorAst(q.args[0],'Curve coordinates'),t0=exactRational(q.args[1],'t0'),t1=exactRational(q.args[2],'t1');if(compareRat(t0,t1)>=0)throw new Error('Curve parameter lower bound must be below the upper bound.');return{family:'paramcurve',dimension:coords.length,facts:[{label:'Parameterization',display:astToPlainText(q.args[0]),ast:q.args[0]},{label:'Parameter',display:'t'},{label:'Interval',display:`[${ratText(t0)}, ${ratText(t1)}]`}],ast:q.args[0]};}
  if(q.name==='graphsurface'){if(q.args.length!==5)throw new Error('graphsurface(g(x,y),x0,x1,y0,y1) requires a height expression and rectangular base.');const x0=exactRational(q.args[1],'x0'),x1=exactRational(q.args[2],'x1'),y0=exactRational(q.args[3],'y0'),y1=exactRational(q.args[4],'y1');if(compareRat(x0,x1)>=0||compareRat(y0,y1)>=0)throw new Error('Surface base lower bounds must be strictly below upper bounds.');return{family:'graphsurface',dimension:3,facts:[{label:'Height',display:astToPlainText(q.args[0]),ast:q.args[0]},{label:'Parameterization',display:`r(x,y)=(x,y,${astToPlainText(q.args[0])})`},{label:'Base',display:`[${ratText(x0)}, ${ratText(x1)}] × [${ratText(y0)}, ${ratText(y1)}]`}],ast:q.args[0]};}
  throw new Error('Use rectregion(...), paramcurve(...), or graphsurface(...).');
}
export function geometryProfile(node:AstNode):E10Transform{
  const g=geometrySpec(node),label=g.family==='rectregion'?'Rectangular region':g.family==='paramcurve'?'Parameterized curve':'Graph surface';return{ast:g.ast,display:`${label} · dimension ${g.dimension}`,exactness:'exact',warnings:[],steps:[],sections:[section('geometry-object','Owned geometry object',[{label:'Family',display:label},{label:'Ambient dimension',display:String(g.dimension)},...g.facts],'This E10 object owns geometry and bounds in the semantic repository so later E2/E3 integrations do not need to reconstruct them from transient controls.')]};
}
