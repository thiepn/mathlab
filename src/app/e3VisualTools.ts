import type { ToolCatalogItem } from './toolCatalog';

export const E3_VISUAL_TOOLS: ToolCatalogItem[] = [
  {
    id:'parametric-plot',operation:'parametric-plot',label:'Parametric curve',category:'Visualization',phase:'E3',objectKinds:['function'],
    description:'Visualize a two-component unary function C(t)=[x(t),y(t)] over a configurable parameter interval.',
    example:'C(t) := [cos(t), sin(t)]',aliases:['parametric plot','parametric curve','parameterized curve','x(t) y(t)'],specialRoute:'visualize',
  },
  {
    id:'polar-plot',operation:'polar-plot',label:'Polar plot',category:'Visualization',phase:'E3',objectKinds:['expression','function'],
    description:'Interpret a unary scalar function as r(theta) and visualize the resulting polar curve.',
    example:'r(theta) := 1 + cos(theta)',aliases:['polar curve','r theta','polar coordinates'],specialRoute:'visualize',
  },
  {
    id:'implicit-plot',operation:'implicit-plot',label:'Implicit curve',category:'Visualization',phase:'E3',objectKinds:['equation'],
    description:'Trace a two-variable equation F(x,y)=0 numerically with deterministic marching squares.',
    example:'x^2 + y^2 = 1',aliases:['implicit plot','level zero','marching squares','implicit equation'],specialRoute:'visualize',
  },
  {
    id:'contour-plot',operation:'contour-plot',label:'Contour plot',category:'Visualization',phase:'E3',objectKinds:['expression','function'],
    description:'Visualize configurable level sets of a two-variable scalar field using marching-squares contours.',
    example:'f(x,y) := x^2 - y^2',aliases:['contours','level sets','isoline','topographic'],specialRoute:'visualize',
  },
  {
    id:'scalar-field-plot',operation:'scalar-field-plot',label:'Scalar field map',category:'Visualization',phase:'E3',objectKinds:['expression','function'],
    description:'Render a sampled two-dimensional scalar field with normalized value bands, optional contours, and exact E1 critical-point overlays.',
    example:'f(x,y) := x^2 + y^2 - 2*x + 4*y',aliases:['scalar field','heat map','field map','critical point map'],specialRoute:'visualize',
  },
  {
    id:'vector-field-plot',operation:'vector-field-plot',label:'Vector field',category:'Visualization',phase:'E3',objectKinds:['function'],
    description:'Render normalized direction arrows for a two-dimensional vector field while retaining sampled magnitudes.',
    example:'F(x,y) := [-y, x]',aliases:['vector field','direction field','arrow field','quiver'],specialRoute:'visualize',
  },
  {
    id:'gradient-field-plot',operation:'gradient-field-plot',label:'Gradient field',category:'Visualization',phase:'E3',objectKinds:['expression','function'],
    description:'Differentiate a scalar field with the exact E1 engine and visualize its gradient vector field.',
    example:'f(x,y) := x^2 + y^2',aliases:['gradient field','grad field','nabla field','steepest ascent'],specialRoute:'visualize',
  },
  {
    id:'phase-portrait',operation:'phase-portrait',label:'Phase portrait',category:'Visualization',phase:'E3',objectKinds:['function'],
    description:'Combine a two-dimensional autonomous vector field with deterministic forward/backward field trajectories.',
    example:'F(x,y) := [y, -x]',aliases:['phase plane','phase portrait','trajectories','dynamical system'],specialRoute:'visualize',
  },
  {
    id:'surface-3d',operation:'surface-3d',label:'3D graph surface',category:'Visualization',phase:'E3',objectKinds:['expression','function'],
    description:'Render z=f(x,y) as a rotatable sampled SVG mesh with wireframe and exact E1 critical-point markers when available.',
    example:'f(x,y) := sin(x)*cos(y)',aliases:['3d surface','surface plot','z=f(x,y)','mesh'],specialRoute:'visualize',
  },
  {
    id:'parametric-surface-3d',operation:'parametric-surface-3d',label:'3D parametric surface',category:'Visualization',phase:'E3',objectKinds:['function'],
    description:'Render a two-parameter three-component function S(u,v)=[x,y,z] as a projected SVG surface mesh.',
    example:'S(u,v) := [u, v, u*v]',aliases:['parametric surface','3d parametric','surface mesh','S(u,v)'],specialRoute:'visualize',
  },
];
