import type { AstNode } from './ast';
import { simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { compareRat, exactRational, exactVector, b, call, n, rationalAst, s, section } from './e10Common';
import { ZERO, type Rational } from './rational';
import type { E10Transform } from './e10Types';

type PdeFamily = 'heatpde' | 'wavepde' | 'laplacepde';
interface HeatSpec { family: 'heatpde'; L: Rational; alpha: Rational; coefficients: Rational[] }
interface WaveSpec { family: 'wavepde'; L: Rational; c: Rational; displacement: Rational[]; velocity: Rational[] }
interface LaplaceSpec { family: 'laplacepde'; L: Rational; H: Rational; coefficients: Rational[] }
type PdeSpec = HeatSpec | WaveSpec | LaplaceSpec;

function positive(value: Rational, label: string): void {
  if (compareRat(value, ZERO) <= 0) throw new Error(`${label} must be positive.`);
}
function modalVector(node: AstNode, label: string): Rational[] {
  const values = exactVector(node, label);
  if (values.length < 1 || values.length > 20) throw new Error(`${label} must contain 1–20 exact modal coefficients.`);
  return values;
}
export function isE10PdeConstructorCall(node: AstNode): boolean {
  return node.type === 'call' && ['heatpde','wavepde','laplacepde'].includes(node.name);
}
export function e10PdeShapeInfo(node: AstNode): { family: string; modes: number } | null {
  try {
    const spec = pdeSpec(node);
    return { family: spec.family, modes: spec.family === 'wavepde' ? spec.displacement.length : spec.coefficients.length };
  } catch { return null; }
}
export function e10PdeIntrinsicSymbols(node: AstNode): string[] {
  return isE10PdeConstructorCall(node) ? ['x','y','t'] : [];
}

function pdeSpec(node: AstNode): PdeSpec {
  const q = simplifyAst(node);
  if (q.type !== 'call') throw new Error('PDE object must use heatpde(...), wavepde(...), or laplacepde(...).');
  if (q.name === 'heatpde') {
    if (q.args.length !== 3) throw new Error('heatpde(L, alpha, [b1,...,bN]) requires length, diffusivity, and sine-series coefficients.');
    const L = exactRational(q.args[0], 'Rod length L'), alpha = exactRational(q.args[1], 'Diffusivity alpha');
    positive(L, 'Rod length L'); positive(alpha, 'Diffusivity alpha');
    return { family: 'heatpde', L, alpha, coefficients: modalVector(q.args[2], 'Initial-temperature sine coefficients') };
  }
  if (q.name === 'wavepde') {
    if (q.args.length !== 4) throw new Error('wavepde(L, c, [a1,...,aN], [b1,...,bN]) requires displacement and velocity sine coefficients.');
    const L = exactRational(q.args[0], 'String length L'), c = exactRational(q.args[1], 'Wave speed c');
    positive(L, 'String length L'); positive(c, 'Wave speed c');
    const displacement = modalVector(q.args[2], 'Initial-displacement coefficients');
    const velocity = modalVector(q.args[3], 'Initial-velocity coefficients');
    if (displacement.length !== velocity.length) throw new Error('Wave displacement and velocity coefficient vectors must have the same length.');
    return { family: 'wavepde', L, c, displacement, velocity };
  }
  if (q.name === 'laplacepde') {
    if (q.args.length !== 3) throw new Error('laplacepde(L, H, [b1,...,bN]) requires rectangle width, height, and top-boundary sine coefficients.');
    const L = exactRational(q.args[0], 'Rectangle width L'), H = exactRational(q.args[1], 'Rectangle height H');
    positive(L, 'Rectangle width L'); positive(H, 'Rectangle height H');
    return { family: 'laplacepde', L, H, coefficients: modalVector(q.args[2], 'Top-boundary sine coefficients') };
  }
  throw new Error('Unsupported E10 PDE constructor.');
}

function pdeEquation(spec: PdeSpec): string {
  if (spec.family === 'heatpde') return 'u_t = α u_xx';
  if (spec.family === 'wavepde') return 'u_tt = c² u_xx';
  return 'u_xx + u_yy = 0';
}
function conditions(spec: PdeSpec): string[] {
  if (spec.family === 'heatpde') return ['u(0,t)=u(L,t)=0', 'u(x,0)=Σ b_n sin(nπx/L)'];
  if (spec.family === 'wavepde') return ['u(0,t)=u(L,t)=0', 'u(x,0)=Σ a_n sin(nπx/L)', 'u_t(x,0)=Σ b_n sin(nπx/L)'];
  return ['u(0,y)=u(L,y)=u(x,0)=0', 'u(x,H)=Σ b_n sin(nπx/L)'];
}

export function pdeProfile(node: AstNode): E10Transform {
  const spec = pdeSpec(node);
  const modes = spec.family === 'wavepde' ? spec.displacement.length : spec.coefficients.length;
  const familyLabel = spec.family === 'heatpde' ? '1D heat equation' : spec.family === 'wavepde' ? '1D wave equation' : '2D Laplace equation on a rectangle';
  return {
    display: `${familyLabel} · ${modes} represented mode${modes === 1 ? '' : 's'}`,
    exactness: 'exact', warnings: [], steps: [],
    sections: [
      section('pde-classification','PDE classification',[
        {label:'Family',display:familyLabel},{label:'Canonical equation',display:pdeEquation(spec)},{label:'Order',display:'2'},{label:'Linearity',display:'Linear'},{label:'Homogeneous PDE',display:'Yes'},{label:'Represented modes',display:String(modes)},
      ]),
      section('pde-conditions','Initial / boundary conditions',conditions(spec).map((display, i)=>({label:`Condition ${i+1}`,display})),'The constructor owns the canonical rectangular/interval problem rather than leaving boundary data as unrelated UI text.'),
    ],
  };
}

export function pdeSeparationTemplate(node: AstNode): E10Transform {
  const spec = pdeSpec(node);
  if (spec.family === 'heatpde') return {
    display:'X_n(x)=sin(nπx/L), T_n(t)=exp(-α(nπ/L)^2 t)', exactness:'exact', warnings:[], steps:[],
    sections:[section('separation','Separation-of-variables template',[{label:'Spatial eigenproblem',display:"X''+λX=0, X(0)=X(L)=0"},{label:'Eigenvalues',display:'λ_n=(nπ/L)^2, n≥1'},{label:'Spatial modes',display:'X_n(x)=sin(nπx/L)'},{label:'Time modes',display:'T_n(t)=exp(-αλ_n t)'}])],
  };
  if (spec.family === 'wavepde') return {
    display:'X_n(x)=sin(nπx/L), T_n(t)=A_n cos(cnπt/L)+B_n sin(cnπt/L)', exactness:'exact', warnings:[], steps:[],
    sections:[section('separation','Separation-of-variables template',[{label:'Spatial eigenproblem',display:"X''+λX=0, X(0)=X(L)=0"},{label:'Eigenvalues',display:'λ_n=(nπ/L)^2, n≥1'},{label:'Spatial modes',display:'X_n(x)=sin(nπx/L)'},{label:'Time modes',display:'T_n(t)=A_n cos(c√λ_n t)+B_n sin(c√λ_n t)'}])],
  };
  return {
    display:'X_n(x)=sin(nπx/L), Y_n(y)=sinh(nπy/L)', exactness:'exact', warnings:[], steps:[],
    sections:[section('separation','Separation-of-variables template',[{label:'Separated form',display:'u(x,y)=X(x)Y(y)'},{label:'x-modes',display:'X_n(x)=sin(nπx/L)'},{label:'y-modes',display:'Y_n(y)=sinh(nπy/L)'},{label:'Normalization',display:'Y_n(y)/Y_n(H)=sinh(nπy/L)/sinh(nπH/L)'}])],
  };
}

function lambda(index: number, L: Rational): AstNode {
  return b('/', b('*', n(index), s('pi')), rationalAst(L));
}
function sumTerms(terms: AstNode[]): AstNode {
  if (!terms.length) return n(0);
  return terms.slice(1).reduce((sum, term) => b('+', sum, term), terms[0]);
}
export function pdeModalSolution(node: AstNode): E10Transform {
  const spec = pdeSpec(node); const x=s('x'),t=s('t'),y=s('y'); const terms:AstNode[]=[];
  if (spec.family === 'heatpde') {
    spec.coefficients.forEach((coef, i)=>{ const k=i+1,Lam=lambda(k,spec.L); const decay=call('exp',{type:'unary',operator:'-',operand:b('*',b('*',rationalAst(spec.alpha),b('^',Lam,n(2))),t)}); terms.push(b('*',b('*',rationalAst(coef),decay),call('sin',b('*',Lam,x)))); });
  } else if (spec.family === 'wavepde') {
    spec.displacement.forEach((coef, i)=>{ const k=i+1,Lam=lambda(k,spec.L),omega=b('*',rationalAst(spec.c),Lam); const temporal=b('+',b('*',rationalAst(coef),call('cos',b('*',omega,t))),b('*',b('/',rationalAst(spec.velocity[i]),omega),call('sin',b('*',omega,t)))); terms.push(b('*',temporal,call('sin',b('*',Lam,x)))); });
  } else {
    spec.coefficients.forEach((coef, i)=>{ const k=i+1,Lam=lambda(k,spec.L); const vertical=b('/',call('sinh',b('*',Lam,y)),call('sinh',b('*',Lam,rationalAst(spec.H)))); terms.push(b('*',b('*',rationalAst(coef),vertical),call('sin',b('*',Lam,x)))); });
  }
  const ast=simplifyAst(sumTerms(terms));
  return {
    ast, display:`u = ${astToPlainText(ast)}`, exactness:'exact',
    warnings:['This is the exact finite modal solution for the represented coefficient data. It is not a claim to recover arbitrary initial/boundary functions or an infinite-series convergence theorem.'],
    steps:[], sections:[section('modal-solution','Canonical modal solution',[{label:'u',display:astToPlainText(ast),ast},{label:'Modes used',display:String(terms.length)},{label:'Problem',display:pdeEquation(spec)}],conditions(spec).join(' · '))],
  };
}
