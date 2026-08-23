import type { AstNode } from './ast';
import {
  polynomialCoefficient,
  polynomialDegree,
  rationalToAst,
  rationalValue,
  simplifyAst,
  symbolsIn,
  toPolynomial,
  type Polynomial,
} from './algebra';
import { differentiateAst } from './calculus';
import { astToPlainText } from './format';
import {
  add,
  div,
  isZero,
  mul,
  parseRational,
  pow,
  rat,
  rationalToNumber,
  sub,
  type Rational,
} from './rational';
import type { DerivationStep, Exactness, MathResultFact, MathResultSection } from './types';

export interface E8Transform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  steps: DerivationStep[];
  sections: MathResultSection[];
}

type Complex = { re: number; im: number };
type Rectangular = { re: AstNode; im: AstNode };
type BranchIssue = { kind: string; detail: string };

const ZERO: AstNode = { type: 'number', value: '0' };
const ONE: AstNode = { type: 'number', value: '1' };

function n(value: string | number | bigint): AstNode { return { type: 'number', value: String(value) }; }
function s(name: string): AstNode { return { type: 'symbol', name }; }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode { return { type: 'binary', operator, left, right }; }
function u(operator: '+' | '-', operand: AstNode): AstNode { return { type: 'unary', operator, operand }; }
function call(name: string, ...args: AstNode[]): AstNode { return { type: 'call', name, args }; }
function matrix(rows: AstNode[][]): AstNode { return { type: 'matrix', rows }; }
function section(id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection { return { id, title, facts, description }; }
function unwrap(node: AstNode): AstNode { return node.type === 'definition' ? node.right : node; }
function exactStep(beforeAst: AstNode, afterAst: AstNode, rule: string, explanation: string, index: number): DerivationStep {
  return { id: `e8-step-${index}`, before: astToPlainText(beforeAst), after: astToPlainText(afterAst), beforeAst, afterAst, rule, explanation, verified: true };
}
function fmt(value: number, digits = 10): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 1e-13) return '0';
  return Number(value.toPrecision(digits)).toString();
}
function complexText(value: Complex): string { return `${fmt(value.re)} ${value.im < 0 ? '-' : '+'} ${fmt(Math.abs(value.im))}i`; }
function c(re = 0, im = 0): Complex { return { re, im }; }
function cAdd(a: Complex, d: Complex): Complex { return c(a.re + d.re, a.im + d.im); }
function cSub(a: Complex, d: Complex): Complex { return c(a.re - d.re, a.im - d.im); }
function cMul(a: Complex, d: Complex): Complex { return c(a.re * d.re - a.im * d.im, a.re * d.im + a.im * d.re); }
function cDiv(a: Complex, d: Complex): Complex {
  const q = d.re * d.re + d.im * d.im;
  if (!(q > 0)) throw new Error('Complex division encountered a zero denominator.');
  return c((a.re * d.re + a.im * d.im) / q, (a.im * d.re - a.re * d.im) / q);
}
function cAbs(a: Complex): number { return Math.hypot(a.re, a.im); }
function cArg(a: Complex): number { return Math.atan2(a.im, a.re); }
function cExp(a: Complex): Complex { const scale = Math.exp(a.re); return c(scale * Math.cos(a.im), scale * Math.sin(a.im)); }
function cLog(a: Complex): Complex {
  if (cAbs(a) === 0) throw new Error('Complex logarithm is undefined at zero.');
  return c(Math.log(cAbs(a)), cArg(a));
}
function cPow(a: Complex, d: Complex): Complex { return cExp(cMul(d, cLog(a))); }
function cSin(a: Complex): Complex { return c(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im)); }
function cCos(a: Complex): Complex { return c(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im)); }
function cSinh(a: Complex): Complex { return c(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im)); }
function cCosh(a: Complex): Complex { return c(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im)); }
function cSqrt(a: Complex): Complex {
  const r = cAbs(a); const re = Math.sqrt(Math.max(0, (r + a.re) / 2));
  const im = (a.im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (r - a.re) / 2));
  return c(re, im);
}

function hasVariable(node: AstNode, variable: string): boolean { return symbolsIn(node).includes(variable); }
function rationalConstant(node: AstNode): Rational | null { return rationalValue(simplifyAst(node)); }
function astZero(node: AstNode): boolean { const value = rationalConstant(node); return Boolean(value && isZero(value)); }
function rect(re: AstNode, im: AstNode = ZERO): Rectangular { return { re: simplifyAst(re), im: simplifyAst(im) }; }
function rectAdd(a: Rectangular, d: Rectangular): Rectangular { return rect(b('+', a.re, d.re), b('+', a.im, d.im)); }
function rectSub(a: Rectangular, d: Rectangular): Rectangular { return rect(b('-', a.re, d.re), b('-', a.im, d.im)); }
function rectNeg(a: Rectangular): Rectangular { return rect(u('-', a.re), u('-', a.im)); }
function rectMul(a: Rectangular, d: Rectangular): Rectangular {
  return rect(b('-', b('*', a.re, d.re), b('*', a.im, d.im)), b('+', b('*', a.re, d.im), b('*', a.im, d.re)));
}
function rectDiv(a: Rectangular, d: Rectangular): Rectangular {
  const denominator = simplifyAst(b('+', b('^', d.re, n(2)), b('^', d.im, n(2))));
  return rect(
    b('/', b('+', b('*', a.re, d.re), b('*', a.im, d.im)), denominator),
    b('/', b('-', b('*', a.im, d.re), b('*', a.re, d.im)), denominator),
  );
}
function integerExponent(node: AstNode): number | null {
  const value = rationalConstant(node);
  if (!value || value.d !== 1n) return null;
  const exponent = Number(value.n);
  return Number.isSafeInteger(exponent) ? exponent : null;
}
function rectPow(base: Rectangular, exponent: number): Rectangular {
  if (exponent === 0) return rect(ONE);
  if (exponent < 0) return rectDiv(rect(ONE), rectPow(base, -exponent));
  let result = rect(ONE); let power = base; let e = exponent;
  while (e > 0) {
    if (e % 2 === 1) result = rectMul(result, power);
    e = Math.floor(e / 2);
    if (e) power = rectMul(power, power);
  }
  return result;
}

function rectangularNode(node0: AstNode, variable: string, x = 'x', y = 'y'): Rectangular {
  const node = simplifyAst(node0);
  if (node.type === 'number') return rect(node);
  if (node.type === 'symbol') {
    if (node.name === variable) return rect(s(x), s(y));
    if (node.name === 'i') return rect(ZERO, ONE);
    return rect(node);
  }
  if (node.type === 'unary') return node.operator === '-' ? rectNeg(rectangularNode(node.operand, variable, x, y)) : rectangularNode(node.operand, variable, x, y);
  if (node.type === 'binary') {
    const left = rectangularNode(node.left, variable, x, y);
    const right = rectangularNode(node.right, variable, x, y);
    if (node.operator === '+') return rectAdd(left, right);
    if (node.operator === '-') return rectSub(left, right);
    if (node.operator === '*') return rectMul(left, right);
    if (node.operator === '/') return rectDiv(left, right);
    const exponent = integerExponent(node.right);
    if (exponent !== null) return rectPow(left, exponent);
    throw new Error('Exact rectangular decomposition currently supports integer powers. Non-integer complex powers require an explicit branch and are handled by Branch diagnostics instead.');
  }
  if (node.type === 'call' && node.args.length === 1) {
    const original = node.args[0]; const a = rectangularNode(original, variable, x, y);
    if (node.name === 'exp') return rect(b('*', call('exp', a.re), call('cos', a.im)), b('*', call('exp', a.re), call('sin', a.im)));
    if (node.name === 'sin') return rect(b('*', call('sin', a.re), call('cosh', a.im)), b('*', call('cos', a.re), call('sinh', a.im)));
    if (node.name === 'cos') return rect(b('*', call('cos', a.re), call('cosh', a.im)), u('-', b('*', call('sin', a.re), call('sinh', a.im))));
    if (node.name === 'sinh') return rect(b('*', call('sinh', a.re), call('cos', a.im)), b('*', call('cosh', a.re), call('sin', a.im)));
    if (node.name === 'cosh') return rect(b('*', call('cosh', a.re), call('cos', a.im)), b('*', call('sinh', a.re), call('sin', a.im)));
    if (node.name === 'tanh') return rectDiv(rectangularNode(call('sinh', original), variable, x, y), rectangularNode(call('cosh', original), variable, x, y));
    if (node.name === 'conj') return rect(a.re, u('-', a.im));
    if (node.name === 're') return rect(a.re);
    if (node.name === 'im') return rect(a.im);
    if (node.name === 'abs') return rect(call('sqrt', b('+', b('^', a.re, n(2)), b('^', a.im, n(2)))));
    if (node.name === 'ln' || node.name === 'log') {
      const modulus = call('sqrt', b('+', b('^', a.re, n(2)), b('^', a.im, n(2))));
      return rect(call('ln', modulus), call('arg', original));
    }
    throw new Error(`E8 does not yet have an exact rectangular decomposition rule for ${node.name}(...).`);
  }
  throw new Error('E8 rectangular decomposition requires a scalar complex expression or unary function.');
}

function scanCalls(node: AstNode, names: Set<string>): boolean {
  if (node.type === 'call') return names.has(node.name) || node.args.some(arg => scanCalls(arg, names));
  if (node.type === 'unary') return scanCalls(node.operand, names);
  if (node.type === 'binary') return scanCalls(node.left, names) || scanCalls(node.right, names);
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition') return scanCalls(node.left, names) || scanCalls(node.right, names);
  if (node.type === 'matrix') return node.rows.flat().some(item => scanCalls(item, names));
  if (node.type === 'system' || node.type === 'set') return node.items.some(item => scanCalls(item, names));
  return false;
}
const NONHOLOMORPHIC_CALLS = new Set(['abs', 'conj', 're', 'im', 'arg', 'floor', 'ceil']);

function branchIssues(node: AstNode, variable: string): BranchIssue[] {
  const issues: BranchIssue[] = [];
  const visit = (current: AstNode) => {
    if (current.type === 'call') {
      if (current.name === 'ln' || current.name === 'log') issues.push({ kind: 'logarithm', detail: 'The principal logarithm excludes 0 and uses the negative real axis as its conventional branch cut.' });
      if (current.name === 'sqrt') issues.push({ kind: 'square root', detail: 'The principal square root uses the negative real axis as its conventional branch cut and has a branch point at 0.' });
      if (current.name === 'arg') issues.push({ kind: 'argument', detail: 'arg(z) is branch-dependent and discontinuous across the selected argument cut.' });
      current.args.forEach(visit);
      return;
    }
    if (current.type === 'binary') {
      if (current.operator === '^' && hasVariable(current.left, variable)) {
        const exponent = rationalConstant(current.right);
        if (!exponent || exponent.d !== 1n) issues.push({ kind: 'non-integer power', detail: 'Non-integer complex powers are defined through a logarithm and inherit its branch choice/cut.' });
      }
      visit(current.left); visit(current.right); return;
    }
    if (current.type === 'unary') visit(current.operand);
  };
  visit(node);
  const unique = new Map(issues.map(item => [`${item.kind}:${item.detail}`, item]));
  return [...unique.values()];
}

export function complexDecompose(node: AstNode, variable: string): E8Transform {
  const source = unwrap(node); const pair = rectangularNode(source, variable);
  const output = matrix([[pair.re, pair.im]]);
  return {
    ast: output,
    display: `u(x,y)=${astToPlainText(pair.re)} · v(x,y)=${astToPlainText(pair.im)}`,
    exactness: 'exact',
    warnings: branchIssues(source, variable).map(item => item.detail),
    steps: [exactStep(source, output, 'rectangular-decomposition', 'Substitute z=x+iy and apply exact complex arithmetic/elementary identities.', 1)],
    sections: [section('rectangular', 'Real / imaginary decomposition', [
      { label: 'u(x,y)', display: astToPlainText(pair.re), ast: pair.re },
      { label: 'v(x,y)', display: astToPlainText(pair.im), ast: pair.im },
      { label: 'Reconstruction', display: `f(z)=u(x,y)+i·v(x,y), z=x+iy` },
    ])],
  };
}

export function complexDerivative(node: AstNode, variable: string): E8Transform {
  const source = unwrap(node);
  if (scanCalls(source, NONHOLOMORPHIC_CALLS)) throw new Error('A complex derivative is not emitted for expressions containing abs, conjugation, Re, Im, arg, floor, or ceil because these are not holomorphic on open complex domains in the represented form.');
  const derivative = differentiateAst(source, variable).ast;
  const branches = branchIssues(source, variable);
  return {
    ast: derivative,
    display: astToPlainText(derivative),
    exactness: 'exact',
    warnings: branches.length ? branches.map(item => `Derivative is local to a branch domain. ${item.detail}`) : [],
    steps: [exactStep(source, derivative, 'complex-derivative', 'Apply the elementary complex derivative rules on the represented holomorphic domain.', 1)],
    sections: [section('complex-derivative', 'Complex derivative', [
      { label: "f′(z)", display: astToPlainText(derivative), ast: derivative },
      { label: 'Status', display: branches.length ? 'Exact on each selected branch domain' : 'Exact on the represented holomorphic domain' },
    ])],
  };
}

export function cauchyRiemann(node: AstNode, variable: string): E8Transform {
  const source = unwrap(node);
  if (scanCalls(source, NONHOLOMORPHIC_CALLS)) {
    return { display: 'Cauchy–Riemann conditions fail structurally', exactness: 'exact', warnings: ['The expression contains an explicitly non-holomorphic operator such as conjugation, Re, Im, abs, or arg.'], steps: [], sections: [section('cr', 'Cauchy–Riemann check', [{ label: 'Holomorphic', display: 'No (structural obstruction)', tone: 'negative' }])] };
  }
  const branches = branchIssues(source, variable);
  if (branches.length) throw new Error('Exact Cauchy–Riemann certification for branch-sensitive ln/sqrt/non-integer powers is deferred to a branch-domain model. Use Branch diagnostics and Complex derivative for the local branch formula.');
  const pair = rectangularNode(source, variable);
  const ux = differentiateAst(pair.re, 'x').ast; const uy = differentiateAst(pair.re, 'y').ast;
  const vx = differentiateAst(pair.im, 'x').ast; const vy = differentiateAst(pair.im, 'y').ast;
  const firstResidual = simplifyAst(b('-', ux, vy));
  const secondResidual = simplifyAst(b('+', uy, vx));
  const certified = astZero(firstResidual) && astZero(secondResidual);
  return {
    display: certified ? 'Cauchy–Riemann identities verified' : 'Cauchy–Riemann identities not certified',
    exactness: 'exact',
    warnings: certified ? ['Certification applies where all denominators in the represented expression are nonzero.'] : ['Failure to simplify both residuals to zero is not promoted to a universal non-holomorphic theorem unless an explicit structural obstruction was detected.'],
    steps: [],
    sections: [section('cr', 'Cauchy–Riemann check', [
      { label: 'uₓ−vᵧ', display: astToPlainText(firstResidual), ast: firstResidual },
      { label: 'uᵧ+vₓ', display: astToPlainText(secondResidual), ast: secondResidual },
      { label: 'Holomorphic', display: certified ? 'Verified on represented domain' : 'Not certified', tone: certified ? 'positive' : 'warning' },
    ])],
  };
}

function evaluateComplex(node: AstNode, variable: string, z: Complex): Complex {
  if (node.type === 'number') return c(Number(node.value), 0);
  if (node.type === 'symbol') {
    if (node.name === variable) return z;
    if (node.name === 'i') return c(0, 1);
    if (node.name === 'pi') return c(Math.PI, 0);
    if (node.name === 'e') return c(Math.E, 0);
    throw new Error(`Complex evaluation still contains unresolved symbol “${node.name}”.`);
  }
  if (node.type === 'unary') { const value = evaluateComplex(node.operand, variable, z); return node.operator === '-' ? c(-value.re, -value.im) : value; }
  if (node.type === 'binary') {
    const left = evaluateComplex(node.left, variable, z); const right = evaluateComplex(node.right, variable, z);
    if (node.operator === '+') return cAdd(left, right);
    if (node.operator === '-') return cSub(left, right);
    if (node.operator === '*') return cMul(left, right);
    if (node.operator === '/') return cDiv(left, right);
    return cPow(left, right);
  }
  if (node.type === 'call' && node.args.length === 1) {
    const value = evaluateComplex(node.args[0], variable, z);
    if (node.name === 'exp') return cExp(value);
    if (node.name === 'ln') return cLog(value);
    if (node.name === 'log') return cDiv(cLog(value), c(Math.log(10), 0));
    if (node.name === 'sqrt') return cSqrt(value);
    if (node.name === 'sin') return cSin(value);
    if (node.name === 'cos') return cCos(value);
    if (node.name === 'tan') return cDiv(cSin(value), cCos(value));
    if (node.name === 'sinh') return cSinh(value);
    if (node.name === 'cosh') return cCosh(value);
    if (node.name === 'tanh') return cDiv(cSinh(value), cCosh(value));
    if (node.name === 'abs') return c(cAbs(value), 0);
    if (node.name === 'arg') return c(cArg(value), 0);
    if (node.name === 'conj') return c(value.re, -value.im);
    if (node.name === 're') return c(value.re, 0);
    if (node.name === 'im') return c(value.im, 0);
  }
  throw new Error('Numerical complex evaluation supports scalar elementary expressions only.');
}

export function complexMapping(node: AstNode, variable: string, pointRe: number, pointIm: number): E8Transform {
  if (![pointRe, pointIm].every(Number.isFinite)) throw new Error('Complex mapping coordinates must be finite.');
  const source = unwrap(node); const input = c(pointRe, pointIm); const output = evaluateComplex(source, variable, input);
  if (![output.re, output.im].every(Number.isFinite)) throw new Error('Complex mapping produced a non-finite value; the selected point may be outside the function domain.');
  let derivative: Complex | undefined;
  if (!scanCalls(source, NONHOLOMORPHIC_CALLS)) {
    try { derivative = evaluateComplex(differentiateAst(source, variable).ast, variable, input); } catch { derivative = undefined; }
  }
  return {
    display: `${complexText(input)} ↦ ${complexText(output)}`,
    exactness: 'approximate',
    warnings: ['Point evaluation uses binary64 complex arithmetic and the principal branches for ln, sqrt, and non-integer powers.'],
    steps: [],
    sections: [section('mapping', 'Complex mapping', [
      { label: 'Input z', display: complexText(input) },
      { label: 'f(z)', display: complexText(output) },
      { label: '|f(z)|', display: fmt(cAbs(output)) },
      { label: 'arg f(z)', display: `${fmt(cArg(output))} rad` },
      ...(derivative ? [{ label: "f′(z)", display: complexText(derivative) }, { label: 'Local conformality signal', display: cAbs(derivative) > 1e-12 ? 'Derivative nonzero' : 'Derivative zero / inconclusive', tone: cAbs(derivative) > 1e-12 ? 'positive' as const : 'warning' as const }] : []),
    ])],
  };
}

function choose(nValue: number, kValue: number): bigint {
  let k = Math.min(kValue, nValue - kValue); let out = 1n;
  for (let j = 1; j <= k; j += 1) out = out * BigInt(nValue - k + j) / BigInt(j);
  return out;
}
function shiftPolynomial(poly: Polynomial, center: Rational): Polynomial {
  const out = new Map<number, Rational>();
  for (const [degree, coefficient] of poly) {
    for (let k = 0; k <= degree; k += 1) {
      const term = mul(coefficient, mul(rat(choose(degree, k)), pow(center, degree - k)));
      out.set(k, add(out.get(k) ?? rat(0n), term));
    }
  }
  return out;
}
function isZeroPolynomial(poly: Polynomial): boolean { return [...poly.values()].every(isZero); }
function minDegree(poly: Polynomial): number {
  const degrees = [...poly.entries()].filter(([, coefficient]) => !isZero(coefficient)).map(([degree]) => degree);
  return degrees.length ? Math.min(...degrees) : Number.POSITIVE_INFINITY;
}
function rationalFraction(node0: AstNode, variable: string): { numerator: Polynomial; denominator: Polynomial } | null {
  const node = simplifyAst(node0);
  if (node.type === 'binary' && node.operator === '/') {
    const numerator = toPolynomial(node.left, variable); const denominator = toPolynomial(node.right, variable);
    if (numerator && denominator && !isZeroPolynomial(denominator)) return { numerator, denominator };
  }
  const polynomial = toPolynomial(node, variable);
  return polynomial ? { numerator: polynomial, denominator: new Map([[0, rat(1n)]]) } : null;
}
interface SeriesInfo { coefficients: Map<number, Rational>; denominatorOrder: number; numeratorOrder: number; poleOrder: number; denominator: Polynomial; numerator: Polynomial; center: Rational; }
function seriesInfo(node: AstNode, variable: string, center: Rational, maxExponent: number): SeriesInfo {
  const fraction = rationalFraction(node, variable);
  if (!fraction) throw new Error('E8 exact power/Laurent series currently requires a rational function of z with real rational coefficients.');
  const numerator = shiftPolynomial(fraction.numerator, center); const denominator = shiftPolynomial(fraction.denominator, center);
  const denominatorOrder = minDegree(denominator); const numeratorOrder = minDegree(numerator);
  if (!Number.isFinite(denominatorOrder)) throw new Error('The rational denominator is identically zero.');
  const q0 = denominator.get(denominatorOrder) ?? rat(0n); if (isZero(q0)) throw new Error('Internal Laurent normalization failed.');
  const count = Math.max(0, maxExponent + denominatorOrder);
  const series = new Map<number, Rational>();
  for (let degree = 0; degree <= count; degree += 1) {
    let rhs = numerator.get(degree) ?? rat(0n);
    for (let j = 1; j <= degree; j += 1) {
      const qj = denominator.get(denominatorOrder + j) ?? rat(0n); const previous = series.get(degree - j) ?? rat(0n);
      if (!isZero(qj) && !isZero(previous)) rhs = sub(rhs, mul(qj, previous));
    }
    series.set(degree, div(rhs, q0));
  }
  const coefficients = new Map<number, Rational>();
  for (const [degree, coefficient] of series) if (!isZero(coefficient)) coefficients.set(degree - denominatorOrder, coefficient);
  const poleOrder = Number.isFinite(numeratorOrder) ? Math.max(0, denominatorOrder - numeratorOrder) : 0;
  return { coefficients, denominatorOrder, numeratorOrder, poleOrder, denominator: fraction.denominator, numerator: fraction.numerator, center };
}
function seriesAst(info: SeriesInfo, variable: string): AstNode {
  const centerAst = rationalToAst(info.center); const base = isZero(info.center) ? s(variable) : b('-', s(variable), centerAst);
  const terms = [...info.coefficients.entries()].sort((a, d) => a[0] - d[0]).map(([exponent, coefficient]) => {
    const coefficientAst = rationalToAst(coefficient);
    if (exponent === 0) return coefficientAst;
    const powerAst = exponent === 1 ? base : b('^', base, n(exponent));
    return simplifyAst(b('*', coefficientAst, powerAst));
  });
  return terms.length ? terms.reduce((left, right) => simplifyAst(b('+', left, right))) : ZERO;
}
function polynomialAt(poly: Polynomial, z: Complex): Complex {
  let total = c();
  for (const [degree, coefficient] of poly) total = cAdd(total, cMul(c(rationalToNumber(coefficient), 0), integerComplexPower(z, degree)));
  return total;
}
function integerComplexPower(value: Complex, exponent: number): Complex {
  let result = c(1, 0); let base = value; let e = exponent;
  while (e > 0) { if (e % 2 === 1) result = cMul(result, base); e = Math.floor(e / 2); if (e) base = cMul(base, base); }
  return result;
}
function derivativePolynomial(poly: Polynomial): Polynomial {
  const out = new Map<number, Rational>();
  for (const [degree, coefficient] of poly) if (degree > 0) out.set(degree - 1, mul(rat(BigInt(degree)), coefficient));
  return out.size ? out : new Map([[0, rat(0n)]]);
}
function quadraticRoots(poly: Polynomial): Complex[] {
  const degree = polynomialDegree(poly);
  if (degree === 0) return [];
  if (degree === 1) {
    const a = rationalToNumber(polynomialCoefficient(poly, 1)); const d = rationalToNumber(polynomialCoefficient(poly, 0));
    return [c(-d / a, 0)];
  }
  if (degree !== 2) throw new Error('Automatic E8 pole discovery is currently bounded to rational denominators of degree at most two.');
  const a = rationalToNumber(polynomialCoefficient(poly, 2)); const d = rationalToNumber(polynomialCoefficient(poly, 1)); const e = rationalToNumber(polynomialCoefficient(poly, 0));
  const disc = d * d - 4 * a * e;
  if (disc >= 0) { const root = Math.sqrt(disc); return [c((-d + root) / (2 * a), 0), c((-d - root) / (2 * a), 0)]; }
  const root = Math.sqrt(-disc); return [c(-d / (2 * a), root / (2 * a)), c(-d / (2 * a), -root / (2 * a))];
}
function radiusEstimate(denominator: Polynomial, center: Rational): number | null {
  try {
    const roots = quadraticRoots(denominator); if (!roots.length) return Number.POSITIVE_INFINITY;
    const origin = c(rationalToNumber(center), 0); return Math.min(...roots.map(root => cAbs(cSub(root, origin))));
  } catch { return null; }
}

export function complexSeries(node: AstNode, variable: string, centerValue: number, order: number): E8Transform {
  if (!Number.isFinite(centerValue)) throw new Error('Series center must be finite.');
  if (!Number.isInteger(order) || order < 0 || order > 30) throw new Error('Series order must be an integer from 0 to 30.');
  const center = parseRational(String(centerValue)); if (!center) throw new Error('Exact E8 series currently requires a rational real center.');
  const source = unwrap(node); const info = seriesInfo(source, variable, center, order); const series = seriesAst(info, variable); const radius = radiusEstimate(info.denominator, center);
  const classification = info.denominatorOrder === 0 ? 'Power series / regular point' : info.poleOrder > 0 ? `Laurent series / pole order ${info.poleOrder}` : 'Laurent representation with removable singularity';
  return {
    ast: series,
    display: astToPlainText(series),
    exactness: 'exact',
    warnings: ['The displayed coefficients are an exact truncation of the local rational power/Laurent expansion. Convergence is local; an estimated nearest-pole radius is numerical when reported.'],
    steps: [exactStep(source, series, 'rational-laurent-recurrence', 'Shift z to w=z−z₀ and solve the rational coefficient recurrence exactly.', 1)],
    sections: [section('series', 'Complex power / Laurent series', [
      { label: 'Center z₀', display: astToPlainText(rationalToAst(center)) },
      { label: 'Classification', display: classification },
      { label: 'Truncation through exponent', display: String(order) },
      { label: 'Series', display: astToPlainText(series), ast: series },
      { label: 'Nearest-pole radius estimate', display: radius === null ? 'Not determined' : radius === Number.POSITIVE_INFINITY ? '∞ (polynomial denominator)' : fmt(radius) },
    ])],
  };
}

function singularityFacts(info: SeriesInfo): { classification: string; residue: Rational } {
  const denominatorVanishing = info.denominatorOrder > 0;
  const classification = !denominatorVanishing ? 'Regular point' : info.poleOrder > 0 ? `Pole of order ${info.poleOrder}` : 'Removable singularity';
  return { classification, residue: info.coefficients.get(-1) ?? rat(0n) };
}
export function singularityProfile(node: AstNode, variable: string, centerValue: number): E8Transform {
  const center = parseRational(String(centerValue)); if (!center) throw new Error('Exact E8 singularity classification currently requires a rational real center.');
  const source = unwrap(node); const info = seriesInfo(source, variable, center, Math.max(4, infoOrderHint(source, variable)));
  const facts = singularityFacts(info); const residueAst = rationalToAst(facts.residue);
  return {
    ast: residueAst,
    display: facts.classification,
    exactness: 'exact',
    warnings: ['For rational functions, isolated finite singularities are poles or removable; essential singularities require non-rational functions and are not inferred by this rational classifier.'],
    steps: [],
    sections: [section('singularity', 'Isolated singularity', [
      { label: 'Point z₀', display: astToPlainText(rationalToAst(center)) },
      { label: 'Classification', display: facts.classification },
      { label: 'Residue', display: astToPlainText(residueAst), ast: residueAst },
    ])],
  };
}
function infoOrderHint(node: AstNode, variable: string): number { const fraction = rationalFraction(node, variable); return fraction ? Math.max(polynomialDegree(fraction.numerator), polynomialDegree(fraction.denominator)) + 2 : 4; }

function simpsonComplex(fn: (t: number) => Complex, lower: number, upper: number, intervals: number): Complex {
  const count = Math.max(2, Math.min(8192, Math.trunc(intervals) + (Math.trunc(intervals) % 2)));
  const h = (upper - lower) / count; let total = cAdd(fn(lower), fn(upper));
  for (let j = 1; j < count; j += 1) { const value = fn(lower + j * h); const weight = j % 2 === 0 ? 2 : 4; total = cAdd(total, c(value.re * weight, value.im * weight)); }
  return c(total.re * h / 3, total.im * h / 3);
}
function circleIntegral(source: AstNode, variable: string, center: Complex, radius: number, intervals: number): Complex {
  if (!(radius > 0) || !Number.isFinite(radius)) throw new Error('Circle radius must be positive and finite.');
  return simpsonComplex(theta => {
    const exp = c(Math.cos(theta), Math.sin(theta)); const z = cAdd(center, c(radius * exp.re, radius * exp.im));
    const dz = c(-radius * Math.sin(theta), radius * Math.cos(theta)); return cMul(evaluateComplex(source, variable, z), dz);
  }, 0, 2 * Math.PI, intervals);
}

export function residueAt(node: AstNode, variable: string, pointRe: number, pointIm: number, radius = 1e-3, intervals = 1200): E8Transform {
  const source = unwrap(node);
  if (branchIssues(source, variable).length) throw new Error('Residues require an isolated single-valued singularity on a punctured neighborhood. E8 does not assign residues at unresolved branch points/cuts.');
  if (pointIm === 0) {
    const center = parseRational(String(pointRe));
    if (center) {
      try {
        const info = seriesInfo(source, variable, center, Math.max(4, infoOrderHint(source, variable))); const residue = info.coefficients.get(-1) ?? rat(0n); const residueAst = rationalToAst(residue);
        return { ast: residueAst, display: astToPlainText(residueAst), exactness: 'exact', warnings: [], steps: [], sections: [section('residue', 'Residue', [{ label: 'Point', display: astToPlainText(rationalToAst(center)) }, { label: 'Residue', display: astToPlainText(residueAst), ast: residueAst }, { label: 'Method', display: 'Exact Laurent coefficient of (z−z₀)^−1' }])] };
      } catch { /* numerical fallback below */ }
    }
  }
  if (![pointRe, pointIm].every(Number.isFinite)) throw new Error('Residue point must be finite.');
  const integral = circleIntegral(source, variable, c(pointRe, pointIm), radius, intervals); const residue = cDiv(integral, c(0, 2 * Math.PI));
  return { display: complexText(residue), exactness: 'approximate', warnings: ['Numerical residue uses a small circular contour. The selected radius must isolate exactly one singularity and avoid other singularities/branch cuts; E8 cannot certify that from sampling alone.'], steps: [], sections: [section('residue', 'Numerical residue', [{ label: 'Point', display: complexText(c(pointRe, pointIm)) }, { label: 'Radius', display: fmt(radius) }, { label: 'Residue', display: complexText(residue) }])] };
}

export function contourIntegral(node: AstNode, variable: string, path: 'circle' | 'line', options: { centerRe: number; centerIm: number; radius: number; startRe: number; startIm: number; endRe: number; endIm: number; intervals: number }): E8Transform {
  const source = unwrap(node); let integral: Complex; let description: string;
  if (path === 'circle') {
    integral = circleIntegral(source, variable, c(options.centerRe, options.centerIm), options.radius, options.intervals);
    description = `circle center ${complexText(c(options.centerRe, options.centerIm))}, radius ${fmt(options.radius)}`;
  } else {
    const start = c(options.startRe, options.startIm); const end = c(options.endRe, options.endIm); const dz = cSub(end, start);
    integral = simpsonComplex(t => cMul(evaluateComplex(source, variable, cAdd(start, c(dz.re * t, dz.im * t))), dz), 0, 1, options.intervals);
    description = `line ${complexText(start)} → ${complexText(end)}`;
  }
  return { display: complexText(integral), exactness: 'approximate', warnings: ['Parameterized contour integration uses deterministic composite Simpson quadrature in the parameter. It does not prove analyticity or contour-independence.'], steps: [], sections: [section('contour', 'Complex contour integral', [{ label: 'Contour', display: description }, { label: 'Integral', display: complexText(integral) }, { label: 'Quadrature', display: `${Math.max(2, Math.min(8192, options.intervals))} parameter intervals` }])] };
}

export function residueTheorem(node: AstNode, variable: string, centerRe: number, centerIm: number, radius: number): E8Transform {
  if (!(radius > 0) || ![centerRe, centerIm, radius].every(Number.isFinite)) throw new Error('Residue-theorem circle requires finite center coordinates and positive radius.');
  const source = unwrap(node); const fraction = rationalFraction(source, variable);
  if (!fraction) throw new Error('Automatic E8 residue-theorem pole discovery currently requires a rational function with real rational coefficients.');
  const roots = quadraticRoots(fraction.denominator); const derivative = derivativePolynomial(fraction.denominator); const center = c(centerRe, centerIm);
  const inside = roots.filter(root => cAbs(cSub(root, center)) < radius - 1e-10);
  const boundary = roots.filter(root => Math.abs(cAbs(cSub(root, center)) - radius) <= 1e-10);
  if (boundary.length) throw new Error('A discovered pole lies on the contour; the ordinary residue theorem does not apply to this contour.');
  const residues: { pole: Complex; residue: Complex }[] = [];
  for (const root of inside) {
    const qPrime = polynomialAt(derivative, root); if (cAbs(qPrime) < 1e-10) throw new Error('E8 automatic residue theorem currently requires simple poles; a repeated denominator root was detected.');
    residues.push({ pole: root, residue: cDiv(polynomialAt(fraction.numerator, root), qPrime) });
  }
  const sum = residues.reduce((total, item) => cAdd(total, item.residue), c()); const integral = cMul(c(0, 2 * Math.PI), sum);
  const facts: MathResultFact[] = residues.map((item, index) => ({ label: `Pole ${index + 1}`, display: `${complexText(item.pole)} · Res=${complexText(item.residue)}` }));
  facts.push({ label: 'Sum of enclosed residues', display: complexText(sum) }, { label: '∮f(z)dz = 2πi ΣRes', display: complexText(integral) });
  return { display: complexText(integral), exactness: 'approximate', warnings: ['Pole discovery and residue evaluation use binary64 arithmetic after exact rational coefficient extraction. The theorem claim is bounded to rational functions with denominator degree ≤2 and simple poles.'], steps: [], sections: [section('residue-theorem', 'Residue theorem', facts, `Circle center ${complexText(center)}, radius ${fmt(radius)}. ${inside.length} enclosed simple pole${inside.length === 1 ? '' : 's'} detected.`)] };
}

export function branchDiagnostics(node: AstNode, variable: string): E8Transform {
  const source = unwrap(node); const issues = branchIssues(source, variable);
  const facts: MathResultFact[] = issues.length ? issues.map((item, index) => ({ label: `Branch issue ${index + 1}: ${item.kind}`, display: item.detail, tone: 'warning' })) : [{ label: 'Branch-sensitive operations', display: 'None detected in the represented expression', tone: 'positive' }];
  return { display: issues.length ? `${issues.length} branch-sensitive construct${issues.length === 1 ? '' : 's'} detected` : 'No branch-sensitive constructs detected', exactness: 'exact', warnings: [], steps: [], sections: [section('branches', 'Branch / domain diagnostics', facts, 'E8 reports principal-branch conventions but does not create a full Riemann-surface or analytic-continuation model.')] };
}
