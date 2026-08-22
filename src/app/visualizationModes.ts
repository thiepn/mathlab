import type { SemanticMathObject } from '../lib/math/types';

export type VisualizationMode='cartesian'|'parametric'|'polar'|'implicit'|'contour'|'scalar-field'|'vector-field'|'gradient-field'|'phase-portrait'|'surface-3d'|'parametric-surface-3d';

export interface VisualizationModeInfo{ id:VisualizationMode; label:string; description:string; dimension:'2D'|'3D' }

export const VISUALIZATION_MODES:Record<VisualizationMode,VisualizationModeInfo>={
  cartesian:{id:'cartesian',label:'Cartesian',description:'Explicit y=f(x) plot with symbolic feature overlays.',dimension:'2D'},
  parametric:{id:'parametric',label:'Parametric curve',description:'Plot a two-component curve r(t)=[x(t),y(t)].',dimension:'2D'},
  polar:{id:'polar',label:'Polar',description:'Interpret a unary scalar function as r(θ).',dimension:'2D'},
  implicit:{id:'implicit',label:'Implicit curve',description:'Trace a two-variable equation F(x,y)=0 by marching squares.',dimension:'2D'},
  contour:{id:'contour',label:'Contours',description:'Trace configurable level sets of a scalar field f(x,y).',dimension:'2D'},
  'scalar-field':{id:'scalar-field',label:'Scalar field',description:'Render sampled scalar-field magnitude across a 2D region.',dimension:'2D'},
  'vector-field':{id:'vector-field',label:'Vector field',description:'Sample and normalize arrows for a 2D vector field F(x,y).',dimension:'2D'},
  'gradient-field':{id:'gradient-field',label:'Gradient field',description:'Visualize ∇f for a scalar field using E1 exact derivatives.',dimension:'2D'},
  'phase-portrait':{id:'phase-portrait',label:'Phase portrait',description:'Combine vector-field arrows with deterministic field trajectories.',dimension:'2D'},
  'surface-3d':{id:'surface-3d',label:'3D surface',description:'Project the sampled graph z=f(x,y) as a rotatable SVG mesh.',dimension:'3D'},
  'parametric-surface-3d':{id:'parametric-surface-3d',label:'Parametric surface',description:'Project a three-component surface S(u,v)=[x,y,z].',dimension:'3D'},
};

function matrixWidth(object:SemanticMathObject):number{
  const ast=object.valueAst.type==='definition'?object.valueAst.right:object.valueAst;
  return ast.type==='matrix'&&ast.rows.length===1?ast.rows[0].length:0;
}

export function visualizationVariables(object:SemanticMathObject):string[]{
  return object.kind==='function'?object.parameters:object.variables;
}

export function visualizationModesFor(object:SemanticMathObject):VisualizationMode[]{
  const vars=visualizationVariables(object);const width=matrixWidth(object);const scalar=width===0;
  const modes:VisualizationMode[]=[];
  if(scalar&&vars.length===1&&(object.kind==='function'||object.kind==='expression'))modes.push('cartesian','polar');
  if(width===2&&vars.length===1&&object.kind==='function')modes.push('parametric');
  if(object.kind==='equation'&&vars.length===2)modes.push('implicit');
  if(scalar&&vars.length===2&&(object.kind==='function'||object.kind==='expression'))modes.push('contour','scalar-field','gradient-field','surface-3d');
  if(width===2&&vars.length===2&&object.kind==='function')modes.push('vector-field','phase-portrait');
  if(width===3&&vars.length===2&&object.kind==='function')modes.push('parametric-surface-3d');
  return modes;
}

export function isVisualizable(object:SemanticMathObject):boolean{return visualizationModesFor(object).length>0;}

export const VISUAL_TOOL_TO_MODE:Record<string,VisualizationMode>={
  graph:'cartesian','parametric-plot':'parametric','polar-plot':'polar','implicit-plot':'implicit','contour-plot':'contour','scalar-field-plot':'scalar-field','vector-field-plot':'vector-field','gradient-field-plot':'gradient-field','phase-portrait':'phase-portrait','surface-3d':'surface-3d','parametric-surface-3d':'parametric-surface-3d',
};
