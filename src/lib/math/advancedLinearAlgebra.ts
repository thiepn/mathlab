import type { AstNode } from './ast';
import {
  polynomialCoefficient, polynomialDegree, polynomialToAst, rationalToAst, rationalValue, simplifyAst, sqrtDecomposition, sqrtRationalAst,
  type Polynomial,
} from './algebra';
import {
  inverseMatrix, matrixToAst, subspaceAnalysis, vectorToAst,
  type LinearStep,
} from './linearAlgebra';
import { solveEquation } from './solve';
import {
  ONE, ZERO, add, div, eq, isOne, isZero, mul, neg, pow, rat, sign, sub, type Rational,
} from './rational';

export interface ComplexRational { re: Rational; im: Rational }
export interface GramSchmidtResult {
  orthogonal: ComplexRational[][];
  normSquares: Rational[];
  sourceColumns: number[];
  dependentColumns: number[];
  steps: LinearStep[];
}
export interface EigenvalueResult {
  characteristic: AstNode;
  values: AstNode[];
  algebraicMultiplicities: number[];
  warning?: string;
}

const C_ZERO: ComplexRational = { re: ZERO, im: ZERO };
const C_ONE: ComplexRational = { re: ONE, im: ZERO };

function c(re: Rational = ZERO, im: Rational = ZERO): ComplexRational { return { re, im }; }
function cadd(a: ComplexRational, b: ComplexRational): ComplexRational { return c(add(a.re,b.re), add(a.im,b.im)); }
function csub(a: ComplexRational, b: ComplexRational): ComplexRational { return c(sub(a.re,b.re), sub(a.im,b.im)); }
function cneg(a: ComplexRational): ComplexRational { return c(neg(a.re), neg(a.im)); }
function cmul(a: ComplexRational, b: ComplexRational): ComplexRational { return c(sub(mul(a.re,b.re),mul(a.im,b.im)), add(mul(a.re,b.im),mul(a.im,b.re))); }
function cconj(a: ComplexRational): ComplexRational { return c(a.re, neg(a.im)); }
function cabs2(a: ComplexRational): Rational { return add(mul(a.re,a.re),mul(a.im,a.im)); }
function cisZero(a: ComplexRational): boolean { return isZero(a.re) && isZero(a.im); }
function ceq(a: ComplexRational,b:ComplexRational): boolean { return eq(a.re,b.re)&&eq(a.im,b.im); }
function cdiv(a: ComplexRational,b:ComplexRational): ComplexRational {
  const d=cabs2(b); if(isZero(d)) throw new Error('Division by zero in a complex scalar.');
  const n=cmul(a,cconj(b)); return c(div(n.re,d),div(n.im,d));
}
function cpow(a: ComplexRational,n:number):ComplexRational {
  if(!Number.isInteger(n)) throw new Error('Exact complex powers require an integer exponent.');
  if(n<0) return cdiv(C_ONE,cpow(a,-n));
  let out=C_ONE, base=a, e=n;
  while(e>0){ if(e%2===1) out=cmul(out,base); e=Math.floor(e/2); if(e) base=cmul(base,base); }
  return out;
}

export function complexFromAst(node: AstNode): ComplexRational | null {
  const q=rationalValue(node); if(q) return c(q,ZERO);
  if(node.type==='symbol' && node.name==='i') return c(ZERO,ONE);
  if(node.type==='unary') { const v=complexFromAst(node.operand); return v ? (node.operator==='-'?cneg(v):v) : null; }
  if(node.type==='binary') {
    const a=complexFromAst(node.left), b=complexFromAst(node.right); if(!a||!b) return null;
    if(node.operator==='+') return cadd(a,b); if(node.operator==='-') return csub(a,b);
    if(node.operator==='*') return cmul(a,b); if(node.operator==='/') return cdiv(a,b);
    if(node.operator==='^' && isZero(b.im) && b.re.d===1n) { const n=Number(b.re.n); return Number.isSafeInteger(n)?cpow(a,n):null; }
  }
  return null;
}

function mulAst(a:AstNode,b:AstNode,implicit=false):AstNode { return simplifyAst({type:'binary',operator:'*',left:a,right:b,implicit}); }
function addAst(a:AstNode,b:AstNode):AstNode { return simplifyAst({type:'binary',operator:'+',left:a,right:b}); }
function subAst(a:AstNode,b:AstNode):AstNode { return simplifyAst({type:'binary',operator:'-',left:a,right:b}); }
function divAst(a:AstNode,b:AstNode):AstNode { return simplifyAst({type:'binary',operator:'/',left:a,right:b}); }

export function complexToAst(z: ComplexRational): AstNode {
  if(isZero(z.im)) return rationalToAst(z.re);
  const i:AstNode={type:'symbol',name:'i'};
  let imag:AstNode;
  const absIm=z.im.n<0n?neg(z.im):z.im;
  imag=isOne(absIm)?i:mulAst(rationalToAst(absIm),i,true);
  if(isZero(z.re)) return z.im.n<0n?{type:'unary',operator:'-',operand:imag}:imag;
  return z.im.n<0n?subAst(rationalToAst(z.re),imag):addAst(rationalToAst(z.re),imag);
}

export function complexCollectionFromAst(node:AstNode): {kind:'vector';values:ComplexRational[]} | {kind:'matrix';values:ComplexRational[][]} {
  if(node.type!=='matrix') throw new Error('This P8 operation requires a vector or matrix object.');
  if(!node.rows.length || !node.rows[0]?.length || node.rows.some(r=>r.length!==node.rows[0].length)) throw new Error('A matrix must be nonempty and rectangular.');
  const rows=node.rows.map(row=>row.map(cell=>{const value=complexFromAst(cell); if(!value) throw new Error('P8 exact inner-product workflows require entries built from rational numbers and i.'); return value;}));
  return rows.length===1?{kind:'vector',values:rows[0]}:{kind:'matrix',values:rows};
}

function complexMatrixAst(values:ComplexRational[][]):AstNode { return {type:'matrix',rows:values.map(row=>row.map(complexToAst))}; }
function complexVectorAst(values:ComplexRational[]):AstNode { return {type:'matrix',rows:[values.map(complexToAst)]}; }

type ComplexLinearValue = {kind:'scalar';value:ComplexRational}|{kind:'vector';values:ComplexRational[]}|{kind:'matrix';values:ComplexRational[][]};
function cScaleVector(v:ComplexRational[],q:ComplexRational){return v.map(x=>cmul(x,q));}
function cScaleMatrix(a:ComplexRational[][],q:ComplexRational){return a.map(row=>cScaleVector(row,q));}
function cMatrixMultiply(a:ComplexRational[][],b:ComplexRational[][]):ComplexRational[][]{
  if(a[0].length!==b.length)throw new Error('Complex matrix product dimensions do not match.');
  return a.map(row=>Array.from({length:b[0].length},(_,j)=>row.reduce((sum,x,k)=>cadd(sum,cmul(x,b[k][j])),C_ZERO)));
}
function cValueToAst(value:ComplexLinearValue):AstNode{return value.kind==='scalar'?complexToAst(value.value):value.kind==='vector'?complexVectorAst(value.values):complexMatrixAst(value.values);}
function evaluateComplexLinear(node:AstNode):ComplexLinearValue{
  const scalar=complexFromAst(node); if(scalar)return {kind:'scalar',value:scalar};
  if(node.type==='matrix'){const coll=complexCollectionFromAst(node);return coll.kind==='vector'?{kind:'vector',values:coll.values}:{kind:'matrix',values:coll.values};}
  if(node.type==='unary'){const v=evaluateComplexLinear(node.operand);if(node.operator==='+')return v;const minus=c(rat(-1n));return v.kind==='scalar'?{kind:'scalar',value:cmul(v.value,minus)}:v.kind==='vector'?{kind:'vector',values:cScaleVector(v.values,minus)}:{kind:'matrix',values:cScaleMatrix(v.values,minus)};}
  if(node.type==='binary'){
    const left=evaluateComplexLinear(node.left),right=evaluateComplexLinear(node.right);
    if(node.operator==='+'||node.operator==='-'){
      const combine=node.operator==='+'?cadd:csub;
      if(left.kind==='scalar'&&right.kind==='scalar')return {kind:'scalar',value:combine(left.value,right.value)};
      if(left.kind==='vector'&&right.kind==='vector'&&left.values.length===right.values.length)return {kind:'vector',values:left.values.map((x,i)=>combine(x,right.values[i]))};
      if(left.kind==='matrix'&&right.kind==='matrix'&&left.values.length===right.values.length&&left.values[0].length===right.values[0].length)return {kind:'matrix',values:left.values.map((row,r)=>row.map((x,j)=>combine(x,right.values[r][j])))};
      throw new Error('Complex collection addition/subtraction requires matching dimensions.');
    }
    if(node.operator==='*'){
      if(left.kind==='scalar'&&right.kind==='scalar')return {kind:'scalar',value:cmul(left.value,right.value)};
      if(left.kind==='scalar'&&right.kind==='vector')return {kind:'vector',values:cScaleVector(right.values,left.value)};
      if(left.kind==='vector'&&right.kind==='scalar')return {kind:'vector',values:cScaleVector(left.values,right.value)};
      if(left.kind==='scalar'&&right.kind==='matrix')return {kind:'matrix',values:cScaleMatrix(right.values,left.value)};
      if(left.kind==='matrix'&&right.kind==='scalar')return {kind:'matrix',values:cScaleMatrix(left.values,right.value)};
      if(left.kind==='matrix'&&right.kind==='matrix')return {kind:'matrix',values:cMatrixMultiply(left.values,right.values)};
      throw new Error('This complex collection product is outside the P8 materialization boundary.');
    }
    if(node.operator==='/'&&right.kind==='scalar'){
      const inv=cdiv(C_ONE,right.value);return left.kind==='scalar'?{kind:'scalar',value:cmul(left.value,inv)}:left.kind==='vector'?{kind:'vector',values:cScaleVector(left.values,inv)}:{kind:'matrix',values:cScaleMatrix(left.values,inv)};
    }
  }
  throw new Error('Could not materialize this complex-rational matrix/vector expression.');
}
export function materializeComplexLinearAst(node:AstNode):AstNode{return cValueToAst(evaluateComplexLinear(node));}
function matrixColumns<T>(a:T[][]):T[][] { return Array.from({length:a[0].length},(_,j)=>a.map(row=>row[j])); }
function columnsToRows<T>(columns:T[][]):T[][] { return Array.from({length:columns[0]?.length??0},(_,r)=>columns.map(col=>col[r])); }
function inner(a:ComplexRational[],b:ComplexRational[]):ComplexRational {
  if(a.length!==b.length) throw new Error('Inner product requires vectors with equal dimension.');
  return a.reduce((s,v,i)=>cadd(s,cmul(cconj(v),b[i])),C_ZERO);
}
function scale(v:ComplexRational[],factor:ComplexRational):ComplexRational[]{return v.map(x=>cmul(x,factor));}
function vsub(a:ComplexRational[],b:ComplexRational[]):ComplexRational[]{return a.map((x,i)=>csub(x,b[i]));}
function realNormSquare(v:ComplexRational[]):Rational {
  const z=inner(v,v); if(!isZero(z.im)||sign(z.re)<0) throw new Error('Internal inner-product invariant failed.'); return z.re;
}

export function gramSchmidtColumns(ast:AstNode):GramSchmidtResult {
  const coll=complexCollectionFromAst(ast); if(coll.kind!=='matrix') throw new Error('Gram–Schmidt expects a matrix whose columns are the input vectors.');
  const columns=matrixColumns(coll.values); const orthogonal:ComplexRational[][]=[]; const normSquares:Rational[]=[]; const sourceColumns:number[]=[]; const dependentColumns:number[]=[]; const steps:LinearStep[]=[];
  columns.forEach((source,index)=>{
    let u=source.map(z=>c(z.re,z.im));
    for(let j=0;j<orthogonal.length;j++){
      const denom=normSquares[j]; const coefficient=cdiv(inner(orthogonal[j],source),c(denom));
      u=vsub(u,scale(orthogonal[j],coefficient));
    }
    const n2=realNormSquare(u);
    if(isZero(n2)){dependentColumns.push(index); return;}
    orthogonal.push(u); normSquares.push(n2); sourceColumns.push(index);
    steps.push({beforeAst:complexVectorAst(source),afterAst:complexVectorAst(u),rule:'gram-schmidt-orthogonalize',explanation:`Remove projections onto earlier basis vectors from column ${index+1}.`});
  });
  return {orthogonal,normSquares,sourceColumns,dependentColumns,steps};
}

function divideComplexBySqrtAst(value:ComplexRational,normSquare:Rational):AstNode {
  if(cisZero(value)) return rationalToAst(ZERO);
  const decomposition=sqrtDecomposition(normSquare);
  if(!decomposition) return divAst(complexToAst(value),sqrtRationalAst(normSquare));
  if(isOne(decomposition.radicand)) return complexToAst(cdiv(value,c(decomposition.coefficient)));
  const scaleFactor=div(ONE,mul(decomposition.coefficient,decomposition.radicand));
  const scaled=complexToAst(cmul(value,c(scaleFactor)));
  return mulAst(scaled,sqrtRationalAst(decomposition.radicand),false);
}
function normalizedEntryAst(value:ComplexRational,normSquare:Rational):AstNode {
  return divideComplexBySqrtAst(value,normSquare);
}

export function gramSchmidtAsts(ast:AstNode):{orthogonalAst:AstNode;orthonormalAst:AstNode;analysis:GramSchmidtResult} {
  const analysis=gramSchmidtColumns(ast);
  const orthogonalAst=complexMatrixAst(columnsToRows(analysis.orthogonal));
  const qColumns=analysis.orthogonal.map((col,j)=>col.map(value=>({value,n2:analysis.normSquares[j]})));
  const orthonormalAst:AstNode={type:'matrix',rows:Array.from({length:analysis.orthogonal[0]?.length??0},(_,r)=>qColumns.map(col=>normalizedEntryAst(col[r].value,col[r].n2)))};
  return {orthogonalAst,orthonormalAst,analysis};
}

export function qrDecompositionAst(ast:AstNode):{q:AstNode;r:AstNode;steps:LinearStep[]} {
  const coll=complexCollectionFromAst(ast); if(coll.kind!=='matrix') throw new Error('QR decomposition requires a matrix.');
  const m=coll.values.length,n=coll.values[0].length; if(m<n) throw new Error('Reduced QR currently requires rows ≥ columns.');
  const gs=gramSchmidtColumns(ast); if(gs.orthogonal.length!==n) throw new Error('QR decomposition currently requires linearly independent columns.');
  const qRows:Array<AstNode[]>=Array.from({length:m},(_,row)=>gs.orthogonal.map((col,j)=>normalizedEntryAst(col[row],gs.normSquares[j])));
  const sourceCols=matrixColumns(coll.values); const rRows:Array<AstNode[]>=Array.from({length:n},()=>Array.from({length:n},()=>rationalToAst(ZERO)));
  for(let i=0;i<n;i++) for(let j=i;j<n;j++) {
    if(i===j) rRows[i][j]=sqrtRationalAst(gs.normSquares[i]);
    else rRows[i][j]=divideComplexBySqrtAst(inner(gs.orthogonal[i],sourceCols[j]),gs.normSquares[i]);
  }
  return {q:{type:'matrix',rows:qRows},r:{type:'matrix',rows:rRows},steps:gs.steps};
}

export function orthogonalityProfile(ast:AstNode):{gram:AstNode;orthogonal:boolean;orthonormal:boolean;square:boolean;unitary:boolean;real:boolean} {
  const coll=complexCollectionFromAst(ast); const cols=coll.kind==='vector'?[coll.values]:matrixColumns(coll.values); const n=cols.length;
  const gram:ComplexRational[][]=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>inner(cols[i],cols[j])));
  const orthogonal=gram.every((row,i)=>row.every((z,j)=>i===j||cisZero(z)));
  const orthonormal=gram.every((row,i)=>row.every((z,j)=>ceq(z,i===j?C_ONE:C_ZERO)));
  const square=coll.kind==='matrix'&&coll.values.length===coll.values[0].length;
  const real=(coll.kind==='vector'?coll.values:coll.values.flat()).every(z=>isZero(z.im));
  return {gram:complexMatrixAst(gram),orthogonal,orthonormal,square,unitary:square&&orthonormal,real};
}

export function symmetryProfile(ast:AstNode):{hermitian:boolean;symmetric:boolean;skewHermitian:boolean;normal:boolean;real:boolean;adjoint:AstNode} {
  const coll=complexCollectionFromAst(ast); if(coll.kind!=='matrix') throw new Error('Symmetry/Hermitian analysis requires a matrix.');
  const a=coll.values; if(a.length!==a[0].length) throw new Error('Hermitian/symmetric classification requires a square matrix.');
  const n=a.length; const adj:Array<ComplexRational[]>=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>cconj(a[c][r])));
  const hermitian=a.every((row,r)=>row.every((z,col)=>ceq(z,adj[r][col])));
  const skewHermitian=a.every((row,r)=>row.every((z,col)=>ceq(z,cneg(adj[r][col]))));
  const real=a.flat().every(z=>isZero(z.im));
  const symmetric=real&&a.every((row,r)=>row.every((z,col)=>ceq(z,a[col][r])));
  const multiply=(x:ComplexRational[][],y:ComplexRational[][])=>x.map((row)=>Array.from({length:y[0].length},(_,j)=>row.reduce((sum,z,k)=>cadd(sum,cmul(z,y[k][j])),C_ZERO)));
  const aa=multiply(a,adj), bb=multiply(adj,a); const normal=aa.every((row,r)=>row.every((z,col)=>ceq(z,bb[r][col])));
  return {hermitian,symmetric,skewHermitian,normal,real,adjoint:complexMatrixAst(adj)};
}

function transposeR(a:Rational[][]):Rational[][]{return Array.from({length:a[0].length},(_,j)=>a.map(row=>row[j]));}
function multiplyR(a:Rational[][],b:Rational[][]):Rational[][]{
  if(a[0].length!==b.length) throw new Error('Internal matrix dimension mismatch.');
  return a.map(row=>Array.from({length:b[0].length},(_,j)=>row.reduce((s,v,k)=>add(s,mul(v,b[k][j])),ZERO)));
}
function matVecR(a:Rational[][],v:Rational[]):Rational[]{if(a[0].length!==v.length)throw new Error('Target vector dimension does not match the matrix.');return a.map(row=>row.reduce((s,x,k)=>add(s,mul(x,v[k])),ZERO));}
function scaleVecR(v:Rational[],q:Rational):Rational[]{return v.map(x=>mul(x,q));}
function subVecR(a:Rational[],b:Rational[]):Rational[]{return a.map((x,i)=>sub(x,b[i]));}
function dotR(a:Rational[],b:Rational[]):Rational{return a.reduce((s,x,i)=>add(s,mul(x,b[i])),ZERO);}

export function projectVectorOntoVector(target:Rational[],basis:Rational[]):Rational[]{
  if(target.length!==basis.length) throw new Error('Projection requires vectors with equal dimension.');
  const denom=dotR(basis,basis); if(isZero(denom)) throw new Error('Projection onto the zero vector is undefined.');
  return scaleVecR(basis,div(dotR(target,basis),denom));
}

export function projectOntoColumnSpace(a:Rational[][],target:Rational[]):{projection:Rational[];coefficients:Rational[];basis:Rational[][]} {
  if(a.length!==target.length) throw new Error(`Projection target must have dimension ${a.length}.`);
  const analysis=subspaceAnalysis(a); if(analysis.rank===0) return {projection:Array.from({length:a.length},()=>ZERO),coefficients:[],basis:[]};
  const basisColumns=analysis.columnBasis; const b=columnsToRows(basisColumns); const bt=transposeR(b); const gram=multiplyR(bt,b); const inv=inverseMatrix(gram).matrix;
  const rhs=matVecR(bt,target); const coefficients=matVecR(inv,rhs); const projection=matVecR(b,coefficients);
  return {projection,coefficients,basis:basisColumns};
}

export function leastSquares(a:Rational[][],b:Rational[]):{solution:Rational[];fitted:Rational[];residual:Rational[];residualNorm:AstNode} {
  if(a.length!==b.length) throw new Error(`Least-squares target must have dimension ${a.length}.`);
  const analysis=subspaceAnalysis(a); if(analysis.rank!==a[0].length) throw new Error('P8 least squares currently requires linearly independent columns so the minimizing coefficient vector is unique.');
  const at=transposeR(a), normal=multiplyR(at,a), rhs=matVecR(at,b); const solution=matVecR(inverseMatrix(normal).matrix,rhs); const fitted=matVecR(a,solution); const residual=subVecR(b,fitted); const norm2=dotR(residual,residual);
  return {solution,fitted,residual,residualNorm:sqrtRationalAst(norm2)};
}

function trace(a:Rational[][]):Rational { return a.reduce((s,row,i)=>add(s,row[i]),ZERO); }
function identityR(n:number):Rational[][]{return Array.from({length:n},(_,r)=>Array.from({length:n},(_,col)=>r===col?ONE:ZERO));}
function addScalarIdentity(a:Rational[][],q:Rational):Rational[][]{return a.map((row,r)=>row.map((x,col)=>r===col?add(x,q):x));}

export function characteristicPolynomial(a:Rational[][],variable='lambda'):{polynomial:Polynomial;ast:AstNode;coefficients:Rational[]} {
  if(!a.length||a.length!==a[0].length) throw new Error('Characteristic polynomial requires a square matrix.');
  const n=a.length; if(n>6) throw new Error('P8 exact characteristic polynomials are limited to 6×6 matrices.');
  let b=identityR(n); const coefficients:Rational[]=[ONE];
  for(let k=1;k<=n;k++){
    const ab=multiplyR(a,b); const ck=neg(div(trace(ab),rat(BigInt(k)))); coefficients.push(ck); b=addScalarIdentity(ab,ck);
  }
  const poly:Polynomial=new Map(); coefficients.forEach((coef,index)=>{const degree=n-index;if(!isZero(coef))poly.set(degree,coef);});
  return {polynomial:poly,ast:polynomialToAst(poly,variable),coefficients};
}

function integerFactors(value:bigint,limit=2000):bigint[]{
  const v=value<0n?-value:value;if(v===0n)return [0n]; const out:bigint[]=[]; const max=BigInt(limit);
  for(let d=1n;d*d<=v&&d<=max;d++) if(v%d===0n){out.push(d);if(d*d!==v)out.push(v/d);} return out;
}
function evalPoly(poly:Polynomial,x:Rational):Rational { let s=ZERO; for(const [degree,coef] of poly)s=add(s,mul(coef,pow(x,degree))); return s; }
function divideByLinear(poly:Polynomial,root:Rational):Polynomial {
  const degree=polynomialDegree(poly); const desc=Array.from({length:degree+1},(_,i)=>polynomialCoefficient(poly,degree-i)); const out:Rational[]=[desc[0]];
  for(let i=1;i<desc.length-1;i++) out.push(add(desc[i],mul(out[i-1],root)));
  const remainder=add(desc[desc.length-1],mul(out[out.length-1],root)); if(!isZero(remainder)) throw new Error('Internal polynomial division failed.');
  const q:Polynomial=new Map();out.forEach((coef,i)=>{const d=degree-1-i;if(!isZero(coef))q.set(d,coef);});return q;
}
function rationalRoot(poly:Polynomial):Rational|null {
  const degree=polynomialDegree(poly), lead=polynomialCoefficient(poly,degree), constant=polynomialCoefficient(poly,0);
  if(isZero(constant)) return ZERO;
  const nums=integerFactors(constant.n), dens=integerFactors(lead.n); let count=0;
  for(const p0 of nums) for(const q0 of dens){ if(q0===0n)continue; for(const s of [1n,-1n]){const x=rat(s*p0*lead.d,q0*constant.d); count++; if(count>5000)return null; if(isZero(evalPoly(poly,x)))return x;}}
  return null;
}
function rootSetFromSolve(poly:Polynomial,variable:string):AstNode[] {
  const degree=polynomialDegree(poly);
  const solved=solveEquation({type:'equation',left:polynomialToAst(poly,variable),right:rationalToAst(ZERO)},variable);
  if(solved.status==='solved')return solved.solutions;
  if(degree===2){
    const a=polynomialCoefficient(poly,2), b=polynomialCoefficient(poly,1), cc=polynomialCoefficient(poly,0);
    const disc=sub(mul(b,b),mul(rat(4n),mul(a,cc)));
    if(sign(disc)<0){
      const twoA=mul(rat(2n),a); const center=div(neg(b),twoA); const root=sqrtRationalAst(neg(disc));
      const imag=mulAst(divAst(root,rationalToAst(twoA)),{type:'symbol',name:'i'},true);
      const centerAst=rationalToAst(center);
      return isZero(center)?[imag,{type:'unary',operator:'-',operand:imag}]:[addAst(centerAst,imag),subAst(centerAst,imag)];
    }
  }
  return [];
}

export function eigenvaluesExact(a:Rational[][],variable='lambda'):EigenvalueResult {
  if(a.length!==a[0].length) throw new Error('Eigenvalues require a square matrix.');
  const characteristic=characteristicPolynomial(a,variable); const n=a.length;
  if(n===1) return {characteristic:characteristic.ast,values:[rationalToAst(a[0][0])],algebraicMultiplicities:[1]};
  if(n<=2){const roots=rootSetFromSolve(characteristic.polynomial,variable); return {characteristic:characteristic.ast,values:roots,algebraicMultiplicities:roots.length===1?[2]:roots.map(()=>1)};}
  if(n===3){
    const root=rationalRoot(characteristic.polynomial); if(!root)return {characteristic:characteristic.ast,values:[],algebraicMultiplicities:[],warning:'The cubic characteristic polynomial has no bounded rational root that P8 can factor exactly. Numerical eigensolvers are deferred.'};
    const quotient=divideByLinear(characteristic.polynomial,root); const rest=rootSetFromSolve(quotient,variable); const values=[rationalToAst(root),...rest];
    const groups:AstNode[]=[];const mult:number[]=[];for(const value of values){const key=JSON.stringify(value);const index=groups.findIndex(v=>JSON.stringify(v)===key);if(index>=0)mult[index]+=1;else{groups.push(value);mult.push(1);}}
    return {characteristic:characteristic.ast,values:groups,algebraicMultiplicities:mult};
  }
  return {characteristic:characteristic.ast,values:[],algebraicMultiplicities:[],warning:`P8 computes the exact characteristic polynomial up to 6×6, but exact eigenvalue extraction is currently bounded to degree 3. This matrix has size ${n}.`};
}

function subtractLambda(a:Rational[][],lambda:Rational):Rational[][] { return a.map((row,r)=>row.map((x,col)=>r===col?sub(x,lambda):x)); }
export function eigenspacesExact(a:Rational[][]):{eigen:EigenvalueResult;spaces:Array<{value:AstNode;multiplicity:number;basisAst?:AstNode;dimension?:number;symbolicVector?:AstNode}>;warning?:string} {
  const eigen=eigenvaluesExact(a); const spaces=eigen.values.map((value,index)=>{
    const lambda=rationalValue(value);
    if(lambda){const analysis=subspaceAnalysis(subtractLambda(a,lambda));return {value,multiplicity:eigen.algebraicMultiplicities[index],basisAst:{type:'set',items:analysis.nullBasis.map(vectorToAst)} as AstNode,dimension:analysis.nullity};}
    if(a.length===2){
      const aa=rationalToAst(a[0][0]), b=a[0][1], cc=a[1][0], d=rationalToAst(a[1][1]); let vector:AstNode;
      if(!isZero(b)) vector={type:'matrix',rows:[[rationalToAst(b),subAst(value,aa)]]};
      else if(!isZero(cc)) vector={type:'matrix',rows:[[subAst(value,d),rationalToAst(cc)]]};
      else vector={type:'matrix',rows:[[rationalToAst(ONE),rationalToAst(ZERO)]]};
      return {value,multiplicity:eigen.algebraicMultiplicities[index],symbolicVector:vector,dimension:1};
    }
    return {value,multiplicity:eigen.algebraicMultiplicities[index]};
  });
  return {eigen,spaces,warning:eigen.warning};
}

export function diagonalizationExact(a:Rational[][]):{diagonalizable:boolean;p?:AstNode;d?:AstNode;pinv?:AstNode;warning?:string;spaces:ReturnType<typeof eigenspacesExact>['spaces']} {
  if(a.length!==a[0].length) throw new Error('Diagonalization requires a square matrix.'); const n=a.length; if(n>3) return {diagonalizable:false,warning:'P8 diagonalization is currently bounded to matrices up to 3×3 with fully resolved exact eigenspaces.',spaces:[]};
  const es=eigenspacesExact(a); if(es.warning&&es.eigen.values.length===0)return {diagonalizable:false,warning:es.warning,spaces:es.spaces};
  let total=0;es.spaces.forEach(space=>{total+=space.dimension??0;}); if(total<n)return {diagonalizable:false,warning:'The currently resolved eigenspaces do not provide n linearly independent eigenvectors, so exact diagonalization is unavailable.',spaces:es.spaces};
  // Build P only when all basis vectors are rational. Radical 2×2 eigenvectors are represented symbolically, but P^{-1} is not simplified safely by the P7 rational inverse.
  const rationalColumns:Rational[][]=[]; const diagonal:AstNode[]=[];
  for(const space of es.spaces){
    const lambda=rationalValue(space.value); if(!lambda||!space.basisAst||space.basisAst.type!=='set') return {diagonalizable:true,warning:'The matrix has a complete exact eigenbasis, but P⁻¹ is left symbolic because the eigenvectors contain radicals.',spaces:es.spaces,p:{type:'matrix',rows:Array.from({length:n},(_,r)=>es.spaces.flatMap(s=>s.symbolicVector?.type==='matrix'?[s.symbolicVector.rows[0][r]]:[]))},d:{type:'matrix',rows:Array.from({length:n},(_,r)=>Array.from({length:n},(_,col)=>r===col?(es.spaces[r]?.value??rationalToAst(ZERO)):rationalToAst(ZERO)))}};
    for(const item of space.basisAst.items){if(item.type!=='matrix')continue;const vals=item.rows[0].map(cell=>rationalValue(cell)!);rationalColumns.push(vals);diagonal.push(space.value);}
  }
  if(rationalColumns.length!==n)return {diagonalizable:false,warning:'Could not construct a complete rational eigenbasis.',spaces:es.spaces};
  const pR=columnsToRows(rationalColumns);const pinv=inverseMatrix(pR).matrix;const dAst:AstNode={type:'matrix',rows:Array.from({length:n},(_,r)=>Array.from({length:n},(_,col)=>r===col?diagonal[r]:rationalToAst(ZERO)))};
  return {diagonalizable:true,p:matrixToAst(pR),d:dAst,pinv:matrixToAst(pinv),spaces:es.spaces};
}

export function transposeAstExact(ast:AstNode,conjugate=false):AstNode {
  const coll=complexCollectionFromAst(ast); if(coll.kind==='vector') return {type:'matrix',rows:coll.values.map(z=>[complexToAst(conjugate?cconj(z):z)])};
  const rows=Array.from({length:coll.values[0].length},(_,r)=>coll.values.map(row=>complexToAst(conjugate?cconj(row[r]):row[r]))); return {type:'matrix',rows};
}

export function rationalMatrixFromAst(ast:AstNode):Rational[][] {
  if(ast.type!=='matrix'||ast.rows.length===1)throw new Error('This P8 operation requires a matrix.');
  return ast.rows.map(row=>row.map(cell=>{const q=rationalValue(cell);if(!q)throw new Error('This P8 operation currently requires real rational matrix entries.');return q;}));
}
export function rationalVectorFromAst(ast:AstNode):Rational[] {
  if(ast.type!=='matrix'||ast.rows.length!==1)throw new Error('This P8 operation requires a vector.');
  return ast.rows[0].map(cell=>{const q=rationalValue(cell);if(!q)throw new Error('This P8 operation currently requires real rational vector entries.');return q;});
}
