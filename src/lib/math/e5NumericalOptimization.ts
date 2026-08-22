import type { AstNode } from './ast';
import { simplifyAst, substituteAst, symbolsIn } from './algebra';
import { astToPlainText } from './format';
import { functionComponents, functionParametersFromSource, hessian } from './multivariable';
import { parseMath } from './parser';
import type { Exactness, MathResultFact, MathResultSection } from './types';

export interface E5Transform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  sections: MathResultSection[];
}

export type OptimizationMethod = 'gradient-descent' | 'newton' | 'bfgs';

type Matrix = number[][];
type Vector = number[];

const MAX_MATRIX_DIMENSION = 12;
const DEFAULT_TOLERANCE = 1e-9;
const DEFAULT_MAX_ITERATIONS = 100;

function num(value: number): AstNode { return { type: 'number', value: Number(value.toPrecision(15)).toString() }; }
function matrixAst(rows: Matrix): AstNode { return { type: 'matrix', rows: rows.map((row) => row.map(num)) }; }
function vectorAst(values: Vector): AstNode { return { type: 'matrix', rows: [values.map(num)] }; }
function section(id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection { return { id, title, facts, description }; }
function fixed(value: number, digits = 10): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 1e-12) return '0';
  if (Math.abs(value) >= 1e8 || Math.abs(value) < 1e-6) return value.toExponential(6);
  return Number(value.toFixed(digits)).toString();
}
function matrixText(A: Matrix): string { return `[${A.map((row) => `[${row.map((v) => fixed(v, 8)).join(', ')}]`).join(', ')}]`; }
function vectorText(v: Vector): string { return `[${v.map((x) => fixed(x, 10)).join(', ')}]`; }
function boundedTolerance(value?: number): number {
  const t = value ?? DEFAULT_TOLERANCE;
  if (!Number.isFinite(t) || t < 1e-14 || t > 1e-2) throw new Error('E5 tolerance must lie between 1e-14 and 1e-2.');
  return t;
}
function boundedIterations(value?: number): number {
  const n = value ?? DEFAULT_MAX_ITERATIONS;
  if (!Number.isInteger(n) || n < 1 || n > 2000) throw new Error('E5 maximum iterations must be an integer from 1 through 2000.');
  return n;
}
function finite(value: number, label: string): number {
  if (!Number.isFinite(value) || Math.abs(value) > 1e300) throw new Error(`${label} produced a non-finite value.`);
  return value;
}

function scalarNumeric(node: AstNode, variables: Record<string, number>): number {
  switch (node.type) {
    case 'number': return finite(Number(node.value), 'Numeric literal');
    case 'symbol': {
      if (Object.prototype.hasOwnProperty.call(variables, node.name)) return variables[node.name];
      if (node.name === 'pi') return Math.PI;
      if (node.name === 'e') return Math.E;
      throw new Error(`Unresolved symbol “${node.name}” in E5 numerical evaluation.`);
    }
    case 'unary': return node.operator === '-' ? -scalarNumeric(node.operand, variables) : scalarNumeric(node.operand, variables);
    case 'binary': {
      const a = scalarNumeric(node.left, variables); const b = scalarNumeric(node.right, variables);
      if (node.operator === '+') return finite(a + b, 'Addition');
      if (node.operator === '-') return finite(a - b, 'Subtraction');
      if (node.operator === '*') return finite(a * b, 'Multiplication');
      if (node.operator === '/') { if (b === 0) throw new Error('Division by zero in E5 numerical evaluation.'); return finite(a / b, 'Division'); }
      return finite(Math.pow(a, b), 'Power');
    }
    case 'call': {
      if (node.args.length !== 1) throw new Error(`E5 numerical evaluation supports unary elementary calls; ${node.name}(…) has ${node.args.length} arguments.`);
      const x = scalarNumeric(node.args[0], variables);
      const fn: Record<string, (v: number) => number> = {
        sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
        sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, ln: Math.log, log: Math.log10,
        sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil,
      };
      const f = fn[node.name]; if (!f) throw new Error(`E5 numerical evaluation does not support ${node.name}(…).`);
      return finite(f(x), node.name);
    }
    case 'definition': return scalarNumeric(node.right, variables);
    default: throw new Error('E5 expected a scalar numerical expression.');
  }
}

function numericMatrix(node: AstNode): Matrix {
  const ast = node.type === 'definition' ? node.right : node;
  if (ast.type !== 'matrix' || !ast.rows.length || !ast.rows[0]?.length) throw new Error('E5 matrix operation requires a nonempty matrix.');
  const cols = ast.rows[0].length;
  if (ast.rows.some((row) => row.length !== cols)) throw new Error('Matrix rows must have equal length.');
  if (ast.rows.length > MAX_MATRIX_DIMENSION || cols > MAX_MATRIX_DIMENSION + 1) throw new Error(`E5 matrix workflows are bounded to at most ${MAX_MATRIX_DIMENSION} rows/columns.`);
  return ast.rows.map((row) => row.map((cell) => scalarNumeric(cell, {})));
}
function clone(A: Matrix): Matrix { return A.map((row) => [...row]); }
function zeros(r: number, c: number): Matrix { return Array.from({ length: r }, () => Array(c).fill(0)); }
function identity(n: number): Matrix { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0)); }
function transpose(A: Matrix): Matrix { return Array.from({ length: A[0].length }, (_, j) => A.map((row) => row[j])); }
function matmul(A: Matrix, B: Matrix): Matrix {
  if (A[0].length !== B.length) throw new Error('Matrix dimensions do not conform for multiplication.');
  return A.map((row) => Array.from({ length: B[0].length }, (_, j) => row.reduce((sum, a, k) => sum + a * B[k][j], 0)));
}
function matvec(A: Matrix, x: Vector): Vector { return A.map((row) => row.reduce((sum, a, j) => sum + a * x[j], 0)); }
function dot(a: Vector, b: Vector): number { return a.reduce((sum, value, i) => sum + value * b[i], 0); }
function norm2(v: Vector): number { return Math.hypot(...v); }
function normInf(v: Vector): number { return Math.max(0, ...v.map(Math.abs)); }
function frobenius(A: Matrix): number { return Math.sqrt(A.reduce((s, row) => s + row.reduce((r, v) => r + v * v, 0), 0)); }
function subtractMatrix(A: Matrix, B: Matrix): Matrix { return A.map((row, i) => row.map((v, j) => v - B[i][j])); }
function isSquare(A: Matrix): boolean { return A.length === A[0].length; }
function isSymmetric(A: Matrix, tolerance = 1e-12): boolean { return isSquare(A) && A.every((row, i) => row.every((v, j) => Math.abs(v - A[j][i]) <= tolerance * Math.max(1, Math.abs(v), Math.abs(A[j][i])))); }

function gaussianSolve(A0: Matrix, b0: Vector, tolerance = 1e-14): Vector {
  const A = clone(A0); const b = [...b0]; const n = A.length;
  if (!isSquare(A) || b.length !== n) throw new Error('Linear solve requires a square coefficient matrix and matching vector.');
  for (let k = 0; k < n; k += 1) {
    let p = k; for (let i = k + 1; i < n; i += 1) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    if (Math.abs(A[p][k]) <= tolerance) throw new Error('Numerical linear solve encountered a singular or rank-deficient matrix.');
    [A[k], A[p]] = [A[p], A[k]]; [b[k], b[p]] = [b[p], b[k]];
    for (let i = k + 1; i < n; i += 1) { const f = A[i][k] / A[k][k]; A[i][k] = 0; for (let j = k + 1; j < n; j += 1) A[i][j] -= f * A[k][j]; b[i] -= f * b[k]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) { let s = b[i]; for (let j = i + 1; j < n; j += 1) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
  return x;
}

function luCore(A0: Matrix): { P: Matrix; L: Matrix; U: Matrix; swaps: number; minPivot: number } {
  if (!isSquare(A0)) throw new Error('LU decomposition requires a square matrix.');
  const n = A0.length; const U = clone(A0); const L = identity(n); const P = identity(n); let swaps = 0; let minPivot = Infinity;
  for (let k = 0; k < n; k += 1) {
    let p = k; for (let i = k + 1; i < n; i += 1) if (Math.abs(U[i][k]) > Math.abs(U[p][k])) p = i;
    if (Math.abs(U[p][k]) <= 1e-14) throw new Error('LU decomposition encountered a zero numerical pivot; the matrix is singular to working tolerance.');
    if (p !== k) {
      [U[k], U[p]] = [U[p], U[k]]; [P[k], P[p]] = [P[p], P[k]];
      for (let j = 0; j < k; j += 1) [L[k][j], L[p][j]] = [L[p][j], L[k][j]];
      swaps += 1;
    }
    minPivot = Math.min(minPivot, Math.abs(U[k][k]));
    for (let i = k + 1; i < n; i += 1) { const f = U[i][k] / U[k][k]; L[i][k] = f; U[i][k] = 0; for (let j = k + 1; j < n; j += 1) U[i][j] -= f * U[k][j]; }
  }
  return { P, L, U, swaps, minPivot };
}

export function numericalLu(node: AstNode): E5Transform {
  const A = numericMatrix(node); const out = luCore(A); const residual = frobenius(subtractMatrix(matmul(out.P, A), matmul(out.L, out.U)));
  return { ast: matrixAst(out.U), display: `PA ≈ LU · residual ${fixed(residual, 6)}`, exactness: 'approximate', warnings: ['Partial pivoting improves robustness but finite-precision LU is not an exact factorization.'], sections: [section('lu','Pivoted LU decomposition',[{label:'P',display:matrixText(out.P),ast:matrixAst(out.P)},{label:'L',display:matrixText(out.L),ast:matrixAst(out.L)},{label:'U',display:matrixText(out.U),ast:matrixAst(out.U)},{label:'Row swaps',display:String(out.swaps)},{label:'Smallest pivot magnitude',display:fixed(out.minPivot,8)},{label:'||PA-LU||F',display:fixed(residual,8),tone:residual<1e-8?'positive':'warning'}],'PA=LU is computed with partial pivoting.') ] };
}

export function numericalCholesky(node: AstNode): E5Transform {
  const A = numericMatrix(node); if (!isSquare(A) || !isSymmetric(A)) throw new Error('Cholesky requires a real symmetric matrix.');
  const n = A.length; const L = zeros(n,n); let minDiag = Infinity;
  for (let i=0;i<n;i+=1) for (let j=0;j<=i;j+=1) {
    let sum=A[i][j]; for(let k=0;k<j;k+=1) sum-=L[i][k]*L[j][k];
    if(i===j){ if(sum<=1e-14) throw new Error('Cholesky failed: the matrix is not numerically positive definite.'); L[i][j]=Math.sqrt(sum); minDiag=Math.min(minDiag,L[i][j]); }
    else L[i][j]=sum/L[j][j];
  }
  const residual=frobenius(subtractMatrix(A,matmul(L,transpose(L))));
  return{ast:matrixAst(L),display:`A ≈ L Lᵀ · residual ${fixed(residual,6)}`,exactness:'approximate',warnings:['Successful Cholesky is a numerical positive-definiteness diagnostic at the working tolerance, not exact symbolic proof.'],sections:[section('cholesky','Cholesky decomposition',[{label:'L',display:matrixText(L),ast:matrixAst(L)},{label:'Minimum L diagonal',display:fixed(minDiag,10)},{label:'||A-LLᵀ||F',display:fixed(residual,8),tone:residual<1e-8?'positive':'warning'}]) ]};
}

function qrCore(A0: Matrix): { Q: Matrix; R: Matrix } {
  const m=A0.length,n=A0[0].length; let R=clone(A0); let Q=identity(m); const steps=Math.min(m,n);
  for(let k=0;k<steps;k+=1){
    const x=Array.from({length:m-k},(_,i)=>R[k+i][k]); const nx=norm2(x); if(nx<1e-15)continue;
    const alpha=x[0]>=0?-nx:nx; const v=[...x]; v[0]-=alpha; const nv=norm2(v); if(nv<1e-15)continue; for(let i=0;i<v.length;i+=1)v[i]/=nv;
    for(let j=k;j<n;j+=1){let proj=0;for(let i=0;i<v.length;i+=1)proj+=v[i]*R[k+i][j];for(let i=0;i<v.length;i+=1)R[k+i][j]-=2*v[i]*proj;}
    for(let i=0;i<m;i+=1){let proj=0;for(let r=0;r<v.length;r+=1)proj+=Q[i][k+r]*v[r];for(let r=0;r<v.length;r+=1)Q[i][k+r]-=2*proj*v[r];}
  }
  R=R.map((row,i)=>row.map((v,j)=>Math.abs(v)<1e-13&&i>j?0:v)); return{Q,R};
}
export function numericalQr(node:AstNode):E5Transform{
  const A=numericMatrix(node);const{Q,R}=qrCore(A);const residual=frobenius(subtractMatrix(A,matmul(Q,R)));const orth=frobenius(subtractMatrix(matmul(transpose(Q),Q),identity(Q.length)));
  return{ast:matrixAst(R),display:`A ≈ QR · residual ${fixed(residual,6)}`,exactness:'approximate',warnings:['Householder QR is computed in binary64 arithmetic.'],sections:[section('qr','Householder QR decomposition',[{label:'Q',display:matrixText(Q),ast:matrixAst(Q)},{label:'R',display:matrixText(R),ast:matrixAst(R)},{label:'||A-QR||F',display:fixed(residual,8),tone:residual<1e-8?'positive':'warning'},{label:'||QᵀQ-I||F',display:fixed(orth,8),tone:orth<1e-8?'positive':'warning'}]) ]};
}

function symmetricEigen(A0:Matrix,tolerance=1e-12,maxIterations=5000):{values:Vector;vectors:Matrix;iterations:number;off:number}{
  if(!isSymmetric(A0,1e-10))throw new Error('This E5 eigen/SVD kernel requires a real symmetric matrix.');
  const A=clone(A0),V=identity(A.length),n=A.length;let iterations=0,off=Infinity;
  for(;iterations<maxIterations;iterations+=1){let p=0,q=1,max=0;for(let i=0;i<n;i+=1)for(let j=i+1;j<n;j+=1)if(Math.abs(A[i][j])>max){max=Math.abs(A[i][j]);p=i;q=j;}off=max;if(max<=tolerance)break;
    const phi=0.5*Math.atan2(2*A[p][q],A[q][q]-A[p][p]);const c=Math.cos(phi),s=Math.sin(phi);
    for(let k=0;k<n;k+=1){const apk=A[p][k],aqk=A[q][k];A[p][k]=c*apk-s*aqk;A[q][k]=s*apk+c*aqk;}
    for(let k=0;k<n;k+=1){const akp=A[k][p],akq=A[k][q];A[k][p]=c*akp-s*akq;A[k][q]=s*akp+c*akq;}
    for(let k=0;k<n;k+=1){const vkp=V[k][p],vkq=V[k][q];V[k][p]=c*vkp-s*vkq;V[k][q]=s*vkp+c*vkq;}
  }
  const values=A.map((row,i)=>row[i]);const order=values.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);return{values:order.map(x=>x.v),vectors:V.map(row=>order.map(x=>row[x.i])),iterations,off};
}
export function numericalEigen(node:AstNode,tolerance?:number):E5Transform{
  const A=numericMatrix(node);if(!isSquare(A))throw new Error('Numerical eigenanalysis requires a square matrix.');if(!isSymmetric(A,1e-10))throw new Error('E5 currently certifies numerical eigenpairs for real symmetric matrices. General nonsymmetric Schur/eigen workflows remain outside this phase boundary.');
  const e=symmetricEigen(A,boundedTolerance(tolerance));const residuals=e.values.map((lambda,j)=>norm2(matvec(A,e.vectors.map(row=>row[j])).map((v,i)=>v-lambda*e.vectors[i][j])));return{ast:vectorAst(e.values),display:`λ ≈ ${vectorText(e.values)}`,exactness:'approximate',warnings:['The symmetric Jacobi algorithm returns real orthonormal eigenvectors in binary64 arithmetic.'],sections:[section('eigen','Symmetric numerical eigendecomposition',[{label:'Eigenvalues',display:vectorText(e.values),ast:vectorAst(e.values)},{label:'Eigenvector matrix V',display:matrixText(e.vectors),ast:matrixAst(e.vectors)},{label:'Largest eigenpair residual',display:fixed(Math.max(...residuals),8),tone:Math.max(...residuals)<1e-7?'positive':'warning'},{label:'Jacobi rotations',display:String(e.iterations)},{label:'Final off-diagonal max',display:fixed(e.off,8)}]) ]};
}

function svdCore(A:Matrix,tolerance=1e-12):{U:Matrix;S:Vector;V:Matrix;rank:number;threshold:number;residual:number}{
  const At=transpose(A),AtA=matmul(At,A),eig=symmetricEigen(AtA,Math.max(1e-14,tolerance*tolerance));const S=eig.values.map(v=>Math.sqrt(Math.max(0,v)));const smax=Math.max(0,...S);const threshold=Math.max(tolerance,smax*Math.max(A.length,A[0].length)*Number.EPSILON*10);const rank=S.filter(s=>s>threshold).length;const V=eig.vectors;const U=zeros(A.length,S.length);
  for(let j=0;j<S.length;j+=1){if(S[j]<=threshold)continue;const Av=matvec(A,V.map(row=>row[j]));for(let i=0;i<A.length;i+=1)U[i][j]=Av[i]/S[j];}
  const Sigma=zeros(S.length,S.length);S.forEach((s,i)=>Sigma[i][i]=s);const reconstructed=matmul(matmul(U,Sigma),transpose(V));const residual=frobenius(subtractMatrix(A,reconstructed));return{U,S,V,rank,threshold,residual};
}
export function numericalSvd(node:AstNode,tolerance?:number):E5Transform{
  const A=numericMatrix(node),t=boundedTolerance(tolerance),svd=svdCore(A,t);return{ast:vectorAst(svd.S),display:`σ ≈ ${vectorText(svd.S)}`,exactness:'approximate',warnings:['SVD is formed from the symmetric eigendecomposition of AᵀA; very ill-conditioned problems may lose relative accuracy in tiny singular values.'],sections:[section('svd','Singular value decomposition',[{label:'Singular values',display:vectorText(svd.S),ast:vectorAst(svd.S)},{label:'U (economy columns)',display:matrixText(svd.U),ast:matrixAst(svd.U)},{label:'V',display:matrixText(svd.V),ast:matrixAst(svd.V)},{label:'Tolerance-aware rank',display:String(svd.rank)},{label:'Rank threshold',display:fixed(svd.threshold,8)},{label:'||A-UΣVᵀ||F',display:fixed(svd.residual,8),tone:svd.residual<1e-7?'positive':'warning'}]) ]};
}
export function pseudoinverse(node:AstNode,tolerance?:number):E5Transform{
  const A=numericMatrix(node),t=boundedTolerance(tolerance),svd=svdCore(A,t),Sinv=zeros(svd.S.length,svd.S.length);svd.S.forEach((s,i)=>{if(s>svd.threshold)Sinv[i][i]=1/s;});const pinv=matmul(matmul(svd.V,Sinv),transpose(svd.U));const aa=matmul(matmul(A,pinv),A);const residual=frobenius(subtractMatrix(A,aa));return{ast:matrixAst(pinv),display:`A⁺ ≈ ${matrixText(pinv)}`,exactness:'approximate',warnings:['The Moore–Penrose pseudoinverse depends on the selected numerical singular-value threshold.'],sections:[section('pinv','Moore–Penrose pseudoinverse',[{label:'A⁺',display:matrixText(pinv),ast:matrixAst(pinv)},{label:'Effective rank',display:String(svd.rank)},{label:'Threshold',display:fixed(svd.threshold,8)},{label:'||AA⁺A-A||F',display:fixed(residual,8),tone:residual<1e-7?'positive':'warning'}]) ]};
}
export function numericalRank(node:AstNode,tolerance?:number):E5Transform{
  const A=numericMatrix(node),t=boundedTolerance(tolerance),svd=svdCore(A,t);return{ast:num(svd.rank),display:`rankₜ(A) = ${svd.rank}`,exactness:'approximate',warnings:['Numerical rank is tolerance-dependent; it is not an exact algebraic rank certificate.'],sections:[section('rank','Tolerance-aware numerical rank',[{label:'Rank',display:String(svd.rank),tone:'positive'},{label:'Singular values',display:vectorText(svd.S)},{label:'Threshold',display:fixed(svd.threshold,10)}]) ]};
}
export function spectralCondition(node:AstNode,tolerance?:number):E5Transform{
  const A=numericMatrix(node),svd=svdCore(A,boundedTolerance(tolerance));const nonzero=svd.S.filter(s=>s>svd.threshold);const cond=nonzero.length===svd.S.length&&nonzero.length?nonzero[0]/nonzero[nonzero.length-1]:Infinity;return{ast:Number.isFinite(cond)?num(cond):undefined,display:Number.isFinite(cond)?`κ₂(A) ≈ ${fixed(cond,10)}`:'κ₂(A) = ∞ at the selected threshold',exactness:'approximate',warnings:[Number.isFinite(cond)?'Condition number is based on numerically computed singular values.':'The matrix is numerically rank-deficient at the selected threshold.'],sections:[section('condition2','Spectral condition diagnostics',[{label:'κ₂(A)',display:Number.isFinite(cond)?fixed(cond,12):'∞',tone:cond<1e6?'positive':'warning'},{label:'σmax',display:fixed(svd.S[0]??0,12)},{label:'σmin',display:fixed(svd.S[svd.S.length-1]??0,12)},{label:'Effective rank',display:String(svd.rank)}]) ]};
}

export function conjugateGradient(node:AstNode,tolerance?:number,maxIterations?:number):E5Transform{
  const augmented=numericMatrix(node),n=augmented.length;if(augmented[0].length!==n+1)throw new Error('Conjugate gradient expects an n×(n+1) augmented matrix [A|b].');const A=augmented.map(r=>r.slice(0,n)),b=augmented.map(r=>r[n]);if(!isSymmetric(A,1e-10))throw new Error('Conjugate gradient requires a symmetric coefficient matrix.');numericalCholesky(matrixAst(A));
  const tol=boundedTolerance(tolerance),limit=boundedIterations(maxIterations??Math.min(2000,10*n));let x=Array(n).fill(0),r=[...b],p=[...r],rr=dot(r,r),iterations=0;const trace:MathResultFact[]=[];
  for(;iterations<limit&&Math.sqrt(rr)>tol;iterations+=1){const Ap=matvec(A,p),den=dot(p,Ap);if(den<=0)throw new Error('Conjugate gradient lost positive-definite curvature.');const alpha=rr/den;x=x.map((v,i)=>v+alpha*p[i]);r=r.map((v,i)=>v-alpha*Ap[i]);const next=dot(r,r);if(trace.length<12)trace.push({label:`k=${iterations+1}`,display:`||r||₂=${fixed(Math.sqrt(next),8)}`});if(Math.sqrt(next)<=tol){rr=next;break;}const beta=next/rr;p=r.map((v,i)=>v+beta*p[i]);rr=next;}
  const residual=norm2(matvec(A,x).map((v,i)=>v-b[i]));return{ast:vectorAst(x),display:`x ≈ ${vectorText(x)}`,exactness:'approximate',warnings:[...(residual>tol*10?['The requested residual tolerance was not reached before the iteration limit.']:[])],sections:[section('cg','Conjugate-gradient solve',[{label:'Solution',display:vectorText(x),ast:vectorAst(x)},{label:'Iterations',display:String(iterations+1)},{label:'||Ax-b||₂',display:fixed(residual,10),tone:residual<=tol*10?'positive':'warning'},{label:'Tolerance',display:String(tol)}]),section('cg-trace','Convergence trace',trace,'Trace output is capped.') ]};
}

function parametersFor(source:string,node:AstNode):string[]{
  const params=functionParametersFromSource(source,node);return params.filter(name=>!['pi','e','i','infinity'].includes(name));
}
function pointFromSource(source:string|undefined,n:number):Vector{
  if(!source?.trim())return Array(n).fill(0);const parsed=parseMath(source.trim());if(!parsed.ast||parsed.diagnostics.some(d=>d.severity==='error'))throw new Error('Could not parse the E5 starting point.');const ast=parsed.ast.type==='definition'?parsed.ast.right:parsed.ast;if(ast.type!=='matrix'||ast.rows.length!==1||ast.rows[0].length!==n)throw new Error(`Starting point must be a ${n}-vector such as [0, 0].`);return ast.rows[0].map(cell=>scalarNumeric(cell,{}));
}
function env(params:string[],x:Vector):Record<string,number>{return Object.fromEntries(params.map((p,i)=>[p,x[i]]));}
function numericalGradient(f:AstNode,params:string[],x:Vector):Vector{
  return params.map((_,i)=>{const h=Math.cbrt(Number.EPSILON)*Math.max(1,Math.abs(x[i]));const xp=[...x],xm=[...x];xp[i]+=h;xm[i]-=h;return(scalarNumeric(f,env(params,xp))-scalarNumeric(f,env(params,xm)))/(2*h);});
}
function numericalHessian(f:AstNode,params:string[],x:Vector):Matrix{
  const n=params.length,H=zeros(n,n),fx=scalarNumeric(f,env(params,x));for(let i=0;i<n;i+=1){const hi=Math.pow(Number.EPSILON,0.25)*Math.max(1,Math.abs(x[i]));const xp=[...x],xm=[...x];xp[i]+=hi;xm[i]-=hi;H[i][i]=(scalarNumeric(f,env(params,xp))-2*fx+scalarNumeric(f,env(params,xm)))/(hi*hi);for(let j=i+1;j<n;j+=1){const hj=Math.pow(Number.EPSILON,0.25)*Math.max(1,Math.abs(x[j]));const pp=[...x],pm=[...x],mp=[...x],mm=[...x];pp[i]+=hi;pp[j]+=hj;pm[i]+=hi;pm[j]-=hj;mp[i]-=hi;mp[j]+=hj;mm[i]-=hi;mm[j]-=hj;const v=(scalarNumeric(f,env(params,pp))-scalarNumeric(f,env(params,pm))-scalarNumeric(f,env(params,mp))+scalarNumeric(f,env(params,mm)))/(4*hi*hj);H[i][j]=H[j][i]=v;}}return H;
}
function addVec(a:Vector,b:Vector,scale=1):Vector{return a.map((v,i)=>v+scale*b[i]);}
function outer(a:Vector,b:Vector):Matrix{return a.map(x=>b.map(y=>x*y));}
function addMatrix(A:Matrix,B:Matrix,scale=1):Matrix{return A.map((row,i)=>row.map((v,j)=>v+scale*B[i][j]));}

export function nonlinearSystemSolve(node:AstNode,source:string,pointSource?:string,tolerance?:number,maxIterations?:number):E5Transform{
  const components=functionComponents(node);if(components.length<2)throw new Error('Nonlinear-system Newton requires a vector-valued function such as F(x,y):=[f,g].');const params=parametersFor(source,node);if(params.length!==components.length||params.length>6)throw new Error('E5 nonlinear Newton requires a square vector system with 2–6 parameters/components.');let x=pointFromSource(pointSource,params.length);const tol=boundedTolerance(tolerance),limit=boundedIterations(maxIterations);const trace:MathResultFact[]=[];let residual=Infinity,iterations=0;
  const F=(z:Vector)=>components.map(c=>scalarNumeric(c,env(params,z)));
  for(;iterations<limit;iterations+=1){const fx=F(x);residual=normInf(fx);if(trace.length<12)trace.push({label:`k=${iterations}`,display:`x=${vectorText(x)} · ||F||∞=${fixed(residual,8)}`});if(residual<=tol)break;const J=zeros(params.length,params.length);for(let j=0;j<params.length;j+=1){const h=Math.cbrt(Number.EPSILON)*Math.max(1,Math.abs(x[j]));const xp=[...x],xm=[...x];xp[j]+=h;xm[j]-=h;const fp=F(xp),fm=F(xm);for(let i=0;i<params.length;i+=1)J[i][j]=(fp[i]-fm[i])/(2*h);}const delta=gaussianSolve(J,fx.map(v=>-v));let alpha=1,next=addVec(x,delta),nextRes=normInf(F(next));while(nextRes>residual&&alpha>1/1024){alpha/=2;next=addVec(x,delta,alpha);nextRes=normInf(F(next));}x=next;if(norm2(delta)*alpha<=tol*Math.max(1,norm2(x))){residual=nextRes;break;}}
  residual=normInf(F(x));return{ast:vectorAst(x),display:`(${params.map((p,i)=>`${p}≈${fixed(x[i],10)}`).join(', ')})`,exactness:'approximate',warnings:['Multivariate Newton is local: convergence and the reached root depend on the starting point.','The Jacobian is evaluated by centered finite differences; singular/ill-conditioned Jacobians can destabilize the iteration.',...(residual>tol*10?['The requested residual tolerance was not reached.']:[])],sections:[section('nonlinear-root','Nonlinear system solve',[{label:'Approximate root',display:vectorText(x),ast:vectorAst(x)},{label:'Parameters',display:params.join(', ')},{label:'||F(x)||∞',display:fixed(residual,10),tone:residual<=tol*10?'positive':'warning'},{label:'Iterations',display:String(iterations)},{label:'Tolerance',display:String(tol)}]),section('nonlinear-trace','Newton trace',trace,'Trace output is capped.') ]};
}

function optimizeCore(f:AstNode,params:string[],start:Vector,method:OptimizationMethod,tol:number,limit:number):{x:Vector;value:number;gradient:Vector;iterations:number;trace:MathResultFact[];converged:boolean}{
  let x=[...start],Hinv=identity(params.length);let value=scalarNumeric(f,env(params,x));const trace:MathResultFact[]=[];let gradient=numericalGradient(f,params,x),converged=false,iterations=0;
  for(;iterations<limit;iterations+=1){const gnorm=norm2(gradient);if(trace.length<14)trace.push({label:`k=${iterations}`,display:`f=${fixed(value,10)} · ||∇f||₂=${fixed(gnorm,8)} · x=${vectorText(x)}`});if(gnorm<=tol){converged=true;break;}let direction:Vector;
    if(method==='gradient-descent')direction=gradient.map(v=>-v);else if(method==='newton'){try{direction=gaussianSolve(numericalHessian(f,params,x),gradient.map(v=>-v));if(dot(direction,gradient)>=0)direction=gradient.map(v=>-v);}catch{direction=gradient.map(v=>-v);}}else direction=matvec(Hinv,gradient).map(v=>-v);
    const slope=dot(gradient,direction);let alpha=1;let next=addVec(x,direction,alpha);let nextValue=scalarNumeric(f,env(params,next));while(nextValue>value+1e-4*alpha*slope&&alpha>1e-10){alpha*=0.5;next=addVec(x,direction,alpha);nextValue=scalarNumeric(f,env(params,next));}if(alpha<=1e-10)break;
    const nextGradient=numericalGradient(f,params,next);if(method==='bfgs'){const svec=next.map((v,i)=>v-x[i]),y=nextGradient.map((v,i)=>v-gradient[i]),ys=dot(y,svec);if(ys>1e-12){const rho=1/ys,I=identity(params.length),sy=outer(svec,y),ysOuter=outer(y,svec),ss=outer(svec,svec);const left=addMatrix(I,sy,-rho),right=addMatrix(I,ysOuter,-rho);Hinv=addMatrix(matmul(matmul(left,Hinv),right),ss,rho);}}
    if(norm2(next.map((v,i)=>v-x[i]))<=tol*Math.max(1,norm2(next))){x=next;value=nextValue;gradient=nextGradient;converged=norm2(gradient)<=Math.sqrt(tol);break;}x=next;value=nextValue;gradient=nextGradient;
  }
  return{x,value,gradient,iterations,trace,converged};
}
export function numericalOptimize(node:AstNode,source:string,options:{method?:OptimizationMethod;point?:string;tolerance?:number;maxIterations?:number}={}):E5Transform{
  if(node.type==='matrix')throw new Error('Numerical optimization requires a scalar-valued function.');const params=parametersFor(source,node);if(params.length<2||params.length>6)throw new Error('E5 multivariable optimization requires a scalar function of 2–6 variables.');const start=pointFromSource(options.point,params.length),method=options.method??'bfgs',tol=boundedTolerance(options.tolerance),limit=boundedIterations(options.maxIterations),out=optimizeCore(node,params,start,method,tol,limit);const H=numericalHessian(node,params,out.x);let curvature='indefinite / inconclusive';if(isSymmetric(H)){const ev=symmetricEigen(H,1e-10).values;if(ev.every(v=>v>Math.sqrt(tol)))curvature='positive definite (local minimum certificate)';else if(ev.every(v=>v<-Math.sqrt(tol)))curvature='negative definite (local maximum certificate)';else if(ev.some(v=>v>Math.sqrt(tol))&&ev.some(v=>v<-Math.sqrt(tol)))curvature='indefinite (saddle-type stationary point)';else curvature='semidefinite / inconclusive';}
  return{ast:vectorAst(out.x),display:`x* ≈ ${vectorText(out.x)} · f ≈ ${fixed(out.value,10)}`,exactness:'approximate',warnings:['Optimization is local. MathLab does not claim a global optimum unless a separate convexity certificate supports it.',`${method} uses binary64 values with backtracking line search.`,...(!out.converged?['The gradient stopping criterion was not fully reached; inspect the final gradient norm.']:[])],sections:[section('optimization','Numerical local optimization',[{label:'Method',display:method},{label:'Point',display:vectorText(out.x),ast:vectorAst(out.x)},{label:'Objective',display:fixed(out.value,12)},{label:'||∇f||₂',display:fixed(norm2(out.gradient),10),tone:out.converged?'positive':'warning'},{label:'Local Hessian',display:curvature},{label:'Iterations',display:String(out.iterations)}]),section('optimization-trace','Convergence trace',out.trace,'Trace output is capped.') ]};
}

function parseScalarExpression(source:string):AstNode{const p=parseMath(source);if(!p.ast||p.diagnostics.some(d=>d.severity==='error'))throw new Error('Could not parse the equality constraint.');const ast=p.ast.type==='definition'?p.ast.right:p.ast;if(['matrix','system','set','comparison','definition'].includes(ast.type))throw new Error('Constraint must be a scalar expression g(x)=0, entered as the expression g(x).');return ast;}
export function constrainedOptimize(node:AstNode,source:string,options:{constraint?:string;point?:string;tolerance?:number;maxIterations?:number}={}):E5Transform{
  if(!options.constraint?.trim())throw new Error('Constrained optimization requires one equality constraint expression g(x)=0.');const params=parametersFor(source,node);if(params.length<2||params.length>5)throw new Error('E5 constrained optimization supports 2–5 variables and one equality constraint.');const g=parseScalarExpression(options.constraint),extra=symbolsIn(g).filter(s=>!params.includes(s)&&!['pi','e'].includes(s));if(extra.length)throw new Error(`Constraint contains unresolved symbols: ${extra.join(', ')}.`);let x=pointFromSource(options.point,params.length),mu=10;const tol=boundedTolerance(options.tolerance),limit=boundedIterations(options.maxIterations);const trace:MathResultFact[]=[];
  for(let stage=0;stage<5;stage+=1){const penalty:AstNode={type:'binary',operator:'+',left:node,right:{type:'binary',operator:'*',left:num(mu),right:{type:'binary',operator:'^',left:g,right:num(2)}}};const out=optimizeCore(penalty,params,x,'bfgs',Math.max(tol,1e-10),Math.max(20,Math.floor(limit/5)));x=out.x;const gv=Math.abs(scalarNumeric(g,env(params,x)));trace.push({label:`μ=${mu}`,display:`f=${fixed(scalarNumeric(node,env(params,x)),10)} · |g|=${fixed(gv,8)} · x=${vectorText(x)}`});if(gv<=Math.sqrt(tol))break;mu*=10;}
  const value=scalarNumeric(node,env(params,x)),constraintResidual=Math.abs(scalarNumeric(g,env(params,x)));return{ast:vectorAst(x),display:`x* ≈ ${vectorText(x)} · f ≈ ${fixed(value,10)} · |g|≈${fixed(constraintResidual,6)}`,exactness:'approximate',warnings:['This is a local quadratic-penalty method for one equality constraint; it does not certify a global constrained optimum.','Large penalty parameters can worsen conditioning.',...(constraintResidual>Math.sqrt(tol)*10?['Constraint satisfaction remains weak at the final penalty stage.']:[])],sections:[section('constrained','Equality-constrained local optimization',[{label:'Constraint',display:`${options.constraint} = 0`},{label:'Point',display:vectorText(x),ast:vectorAst(x)},{label:'Objective',display:fixed(value,12)},{label:'|g(x)|',display:fixed(constraintResidual,10),tone:constraintResidual<=Math.sqrt(tol)*10?'positive':'warning'},{label:'Final penalty μ',display:String(mu)}]),section('penalty-trace','Penalty stages',trace)]};
}

export function convexityDiagnostic(node:AstNode,source:string,pointSource?:string):E5Transform{
  if(node.type==='matrix')throw new Error('Convexity diagnostics require a scalar-valued function.');const params=parametersFor(source,node);if(params.length<2||params.length>6)throw new Error('E5 convexity diagnostics support scalar functions of 2–6 variables.');const H=hessian(node,params).ast;if(H.type!=='matrix')throw new Error('Could not construct the Hessian.');const variableEntries=H.rows.flat().some(cell=>symbolsIn(cell).some(s=>params.includes(s)));let point:Vector;let scope:string;
  if(variableEntries){if(!pointSource?.trim())return{ast:H,display:'Global convexity not certified from a variable Hessian',exactness:'exact',warnings:['The Hessian depends on position. Supply a point for a local curvature diagnostic; E5 does not infer global convexity from sampling.'],sections:[section('convexity','Convexity boundary',[{label:'Hessian',display:astToPlainText(H),ast:H},{label:'Global classification',display:'Not certified',tone:'warning'}]) ]};point=pointFromSource(pointSource,params.length);scope=`local at ${vectorText(point)}`;}else{point=Array(params.length).fill(0);scope='global (constant Hessian)';}
  const numericH=H.rows.map(row=>row.map(cell=>scalarNumeric(cell,env(params,point))));const eig=symmetricEigen(numericH,1e-12).values;const eps=1e-9;let label:string;if(eig.every(v=>v>eps))label=variableEntries?'locally strictly convex curvature':'strictly convex';else if(eig.every(v=>v>=-eps))label=variableEntries?'locally convex curvature':'convex';else if(eig.every(v=>v<-eps))label=variableEntries?'locally strictly concave curvature':'strictly concave';else if(eig.every(v=>v<=eps))label=variableEntries?'locally concave curvature':'concave';else label='indefinite / nonconvex curvature';return{ast:H,display:`${label} · ${scope}`,exactness:variableEntries?'approximate':'exact',warnings:variableEntries?['A pointwise Hessian classification is local and does not establish global convexity.']:[],sections:[section('convexity','Hessian convexity diagnostic',[{label:'Scope',display:scope},{label:'Classification',display:label,tone:label.includes('indefinite')?'warning':'positive'},{label:'Hessian',display:matrixText(numericH),ast:matrixAst(numericH)},{label:'Eigenvalues',display:vectorText(eig),ast:vectorAst(eig)}]) ]};
}

function parseVectorOption(source:string|undefined,expected:number,label:string):Vector{if(!source?.trim())throw new Error(`${label} is required.`);return pointFromSource(source,expected);}
export function linearProgram2d(node:AstNode,options:{objective?:string;sense?:string}={}):E5Transform{
  const rows=numericMatrix(node);if(rows[0].length!==3)throw new Error('E5 linear programming uses an m×3 matrix whose rows encode a*x+b*y≤c.');const c=parseVectorOption(options.objective,2,'Objective vector [c1,c2]');const sense=options.sense==='min'?'min':'max';
  const hasXUpper=rows.some(r=>Math.abs(r[0]-1)<1e-12&&Math.abs(r[1])<1e-12&&r[2]>=0);const hasYUpper=rows.some(r=>Math.abs(r[1]-1)<1e-12&&Math.abs(r[0])<1e-12&&r[2]>=0);if(!hasXUpper||!hasYUpper)throw new Error('The bounded 2D LP solver requires explicit upper bounds x≤M and y≤N among the constraints; nonnegativity x,y≥0 is implicit.');
  const constraints=[...rows,[ -1,0,0 ],[0,-1,0]];const candidates:Vector[]=[];for(let i=0;i<constraints.length;i+=1)for(let j=i+1;j<constraints.length;j+=1){const[a,b,p]=constraints[i],[d,e,q]=constraints[j],det=a*e-b*d;if(Math.abs(det)<1e-14)continue;const x=(p*e-b*q)/det,y=(a*q-p*d)/det;if(constraints.every(r=>r[0]*x+r[1]*y<=r[2]+1e-9))candidates.push([x,y]);}
  const unique=candidates.filter((v,i,all)=>all.findIndex(w=>norm2(v.map((x,k)=>x-w[k]))<1e-8)===i);if(!unique.length)throw new Error('The represented bounded LP has no feasible vertex.');const scored=unique.map(v=>({v,z:dot(c,v)})).sort((a,b)=>sense==='max'?b.z-a.z:a.z-b.z);const best=scored[0];return{ast:vectorAst(best.v),display:`${sense} c·x ≈ ${fixed(best.z,10)} at ${vectorText(best.v)}`,exactness:'approximate',warnings:['This E5 LP workflow is deliberately bounded to two variables, implicit x,y≥0, linear ≤ constraints, and explicit finite upper bounds. Within that bounded polygon, a linear objective attains its global optimum at an enumerated vertex.'],sections:[section('lp','Bounded 2D linear program',[{label:'Sense',display:sense},{label:'Objective c',display:vectorText(c)},{label:'Optimal vertex',display:vectorText(best.v),ast:vectorAst(best.v)},{label:'Objective value',display:fixed(best.z,12),tone:'positive'},{label:'Feasible vertices checked',display:String(unique.length)}]),section('lp-vertices','Feasible vertices',scored.slice(0,20).map((item,i)=>({label:`v${i+1}`,display:`${vectorText(item.v)} · c·v=${fixed(item.z,10)}`})))]};
}

export function substituteBindings(node:AstNode,bindings:Array<{name:string;ast:AstNode}>,protectedNames:string[]=[]):AstNode{let out=node;const protectedSet=new Set(protectedNames);for(const binding of bindings)if(!protectedSet.has(binding.name))out=substituteAst(out,binding.name,binding.ast);return simplifyAst(out);}
