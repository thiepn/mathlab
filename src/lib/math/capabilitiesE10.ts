import type { ObjectCapability } from './capabilities';
import type { SemanticMathObject } from './types';

type Seed=Omit<ObjectCapability,'applicable'|'available'|'reason'>;
const PDE:Seed[]=[
  {id:'pde-profile',label:'PDE classification',phase:'E10',group:'PDE foundations'},
  {id:'pde-separation-template',label:'Separation template',phase:'E10',group:'PDE foundations'},
  {id:'pde-modal-solution',label:'Canonical modal solution',phase:'E10',group:'PDE foundations'},
];
const GROUP:Seed[]=[
  {id:'finite-group-profile',label:'Finite group profile',phase:'E10',group:'Abstract algebra'},
  {id:'subgroup-check',label:'Check subgroup…',phase:'E10',group:'Abstract algebra'},
];
const RING:Seed={id:'finite-ring-profile',label:'Finite ring / field profile',phase:'E10',group:'Abstract algebra'};
const HOM:Seed={id:'group-homomorphism-profile',label:'Homomorphism / kernel / image',phase:'E10',group:'Abstract algebra'};
const METRIC:Seed[]=[
  {id:'metric-space-profile',label:'Metric-space profile',phase:'E10',group:'Geometry & topology'},
  {id:'metric-ball',label:'Metric ball…',phase:'E10',group:'Geometry & topology'},
];
const TOPOLOGY:Seed[]=[
  {id:'finite-topology-profile',label:'Finite topology profile',phase:'E10',group:'Geometry & topology'},
  {id:'topology-subset-profile',label:'Analyze subset topology…',phase:'E10',group:'Geometry & topology'},
];
const POINTS:Seed[]=[
  {id:'point-set-profile',label:'Point-set geometry',phase:'E10',group:'Analytic geometry'},
  {id:'point-distance-matrix',label:'Exact distance matrix',phase:'E10',group:'Analytic geometry'},
  {id:'affine-hull-profile',label:'Affine hull',phase:'E10',group:'Analytic geometry'},
];
const GEOMETRY:Seed={id:'geometry-profile',label:'Geometry object profile',phase:'E10',group:'Geometry ownership'};
const ready=(seed:Seed):ObjectCapability=>({...seed,applicable:true,available:true});

export function e10CapabilitiesForObject(object:SemanticMathObject):ObjectCapability[]{
  if(object.kind==='pde')return PDE.map(ready);
  if(object.kind==='finite-group')return GROUP.map(ready);
  if(object.kind==='finite-ring')return [ready(RING)];
  if(object.kind==='homomorphism')return [ready(HOM)];
  if(object.kind==='metric-space')return METRIC.map(ready);
  if(object.kind==='topology')return TOPOLOGY.map(ready);
  if(object.kind==='point-set')return POINTS.map(ready);
  if(object.kind==='geometry')return [ready(GEOMETRY)];
  return[];
}
