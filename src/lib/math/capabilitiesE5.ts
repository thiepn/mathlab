import { capabilitiesFor as baseCapabilitiesFor, type ObjectCapability } from './capabilities';
import { e6CapabilitiesForObject, filterBaseCapabilitiesForE6 } from './capabilitiesE6';
import type { SemanticMathObject } from './types';

type Seed = Omit<ObjectCapability,'applicable'|'available'|'reason'>;

const MATRIX_TOOLS: Seed[] = [
  {id:'numerical-lu',label:'Pivoted numerical LU',phase:'E5',group:'Numerical linear algebra'},
  {id:'numerical-cholesky',label:'Numerical Cholesky',phase:'E5',group:'Numerical linear algebra'},
  {id:'numerical-qr',label:'Householder numerical QR',phase:'E5',group:'Numerical linear algebra'},
  {id:'numerical-eigen',label:'Symmetric numerical eigenanalysis',phase:'E5',group:'Numerical spectral analysis'},
  {id:'numerical-svd',label:'Singular value decomposition',phase:'E5',group:'Numerical spectral analysis'},
  {id:'pseudoinverse',label:'Moore–Penrose pseudoinverse',phase:'E5',group:'Numerical spectral analysis'},
  {id:'numerical-rank',label:'Tolerance-aware numerical rank',phase:'E5',group:'Numerical diagnostics'},
  {id:'spectral-condition',label:'Spectral condition number',phase:'E5',group:'Numerical diagnostics'},
  {id:'conjugate-gradient',label:'Conjugate-gradient solve',phase:'E5',group:'Iterative linear algebra'},
  {id:'linear-program',label:'Bounded 2D linear program…',phase:'E5',group:'Optimization'},
];
const FUNCTION_TOOLS: Seed[] = [
  {id:'nonlinear-system-solve',label:'Nonlinear system Newton…',phase:'E5',group:'Nonlinear systems'},
  {id:'numerical-optimize',label:'Numerical local optimization…',phase:'E5',group:'Optimization'},
  {id:'constrained-optimize',label:'Equality-constrained optimization…',phase:'E5',group:'Optimization'},
  {id:'convexity-diagnostic',label:'Convexity / Hessian diagnostic…',phase:'E5',group:'Optimization'},
];

function blocked(seed:Seed,reason:string):ObjectCapability{return{...seed,applicable:false,available:false,reason};}
function ready(seed:Seed):ObjectCapability{return{...seed,applicable:true,available:true};}

function matrixCapabilities(object:SemanticMathObject):ObjectCapability[]{
  if(object.kind!=='matrix'||object.shape.type!=='matrix')return[];
  const {rows,columns}=object.shape;
  return MATRIX_TOOLS.map(seed=>{
    if(object.variables.length||object.domain==='complex')return blocked(seed,'E5 numerical linear algebra currently requires resolved real matrix entries.');
    if(seed.id==='numerical-lu'&&rows!==columns)return blocked(seed,'Pivoted LU requires a square matrix.');
    if(seed.id==='numerical-cholesky'&&rows!==columns)return blocked(seed,'Cholesky requires a square matrix; symmetry/positive definiteness are checked numerically at execution.');
    if(seed.id==='numerical-eigen'&&rows!==columns)return blocked(seed,'Numerical eigenanalysis requires a square matrix and currently certifies the real-symmetric case.');
    if(seed.id==='conjugate-gradient'&&columns!==rows+1)return blocked(seed,'Conjugate gradient expects an n×(n+1) augmented matrix [A|b].');
    if(seed.id==='linear-program'&&(columns!==3||rows<2))return blocked(seed,'The bounded E5 LP workflow expects an m×3 matrix encoding a*x+b*y≤c.');
    return ready(seed);
  });
}
function functionCapabilities(object:SemanticMathObject):ObjectCapability[]{
  if(object.kind!=='function'&&object.kind!=='expression')return[];
  const params=object.kind==='function'?object.parameters:object.variables;
  const vectorValued=object.valueAst.type==='matrix';
  return FUNCTION_TOOLS.map(seed=>{
    if(params.length<2||params.length>6)return blocked(seed,'E5 multivariable numerical workflows require 2–6 independent variables.');
    if(seed.id==='nonlinear-system-solve'){
      if(!vectorValued||object.valueAst.type!=='matrix'||object.valueAst.rows.length!==1||object.valueAst.rows[0].length!==params.length)return blocked(seed,'Nonlinear Newton requires a square vector-valued function F(x1,…,xn)=[f1,…,fn].');
      return ready(seed);
    }
    if(vectorValued)return blocked(seed,'Optimization and convexity workflows require a scalar-valued objective function.');
    if(seed.id==='constrained-optimize'&&params.length>5)return blocked(seed,'The one-constraint penalty workflow is bounded to at most five variables.');
    return ready(seed);
  });
}

export function capabilitiesFor(object:SemanticMathObject|null):ObjectCapability[]{
  if(!object)return[];
  const inherited=[...baseCapabilitiesFor(object),...matrixCapabilities(object),...functionCapabilities(object)];
  return [...filterBaseCapabilitiesForE6(object,inherited),...e6CapabilitiesForObject(object)];
}

export type { ObjectCapability };
