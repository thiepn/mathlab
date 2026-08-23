import type { AstNode } from './ast';
import { astToPlainText } from './format';
import {
  polynomialCoefficient,
  polynomialDegree,
  rationalToAst,
  simplifyAst,
  substituteAst,
  symbolsIn,
  toPolynomial,
} from './algebra';
import { parseMath } from './parser';
import {
  div,
  isZero,
  mul,
  neg,
  rat,
  rationalToNumber,
  sign,
  sub,
  type Rational,
} from './rational';
import type { DerivationStep, Exactness, MathResultFact, MathResultSection } from './types';

export interface E7Transform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  steps: DerivationStep[];
  sections: MathResultSection[];
}

type Parity = 'even' | 'odd' | 'neither';
type Complex = { re: number; im: number };

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
function same(a: AstNode, c: AstNode): boolean { return JSON.stringify(simplifyAst(a)) === JSON.stringify(simplifyAst(c)); }
function hasVariable(node: AstNode, variable: string): boolean { return symbolsIn(node).includes(variable); }
function exactStep(beforeAst: AstNode, afterAst: AstNode, rule: string, explanation: string, index: number): DerivationStep {
  return { id: `e7-step-${index}`, before: astToPlainText(beforeAst), after: astToPlainText(afterAst), beforeAst, afterAst, rule, explanation, verified: true };
}
function formatNumber(value: number, digits = 8): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 1e-13) return '0';
  return Number(value.toPrecision(digits)).toString();
}
function factorial(value: number): bigint { let out = 1n; for (let i = 2; i <= value; i += 1) out *= BigInt(i); return out; }
function rationalConstant(node: AstNode): Rational | null {
  const poly = toPolynomial(simplifyAst(node), '__e7_constant__');
  if (!poly || polynomialDegree(poly) !== 0) return null;
  return polynomialCoefficient(poly, 0);
}
function linearCoefficient(node: AstNode, variable: string): Rational | null {
  const poly = toPolynomial(simplifyAst(node), variable);
  if (!poly || polynomialDegree(poly) > 1 || !isZero(polynomialCoefficient(poly, 0))) return null;
  return polynomialCoefficient(poly, 1);
}
function constantMultiplier(node: AstNode, variable: string): { constant: AstNode; varying: AstNode } | null {
  if (node.type !== 'binary' || node.operator !== '*') return null;
  if (!hasVariable(node.left, variable)) return { constant: node.left, varying: node.right };
  if (!hasVariable(node.right, variable)) return { constant: node.right, varying: node.left };
  return null;
}
function exponentialShift(node: AstNode, variable: string): { shift: Rational; rest: AstNode } | null {
  if (node.type !== 'binary' || node.operator !== '*') return null;
  for (const [candidate, rest] of [[node.left, node.right], [node.right, node.left]] as const) {
    if (candidate.type !== 'call' || candidate.name !== 'exp' || candidate.args.length !== 1) continue;
    const coefficient = linearCoefficient(candidate.args[0], variable);
    if (coefficient) return { shift: coefficient, rest };
  }
  return null;
}

function laplaceNode(node0: AstNode, variable: string, transformVariable: string): AstNode {
  const node = simplifyAst(node0);
  const sv = s(transformVariable);
  if (!hasVariable(node, variable)) return simplifyAst(b('/', node, sv));
  if (node.type === 'symbol' && node.name === variable) return b('/', ONE, b('^', sv, n(2)));
  if (node.type === 'unary') return node.operator === '-' ? simplifyAst(u('-', laplaceNode(node.operand, variable, transformVariable))) : laplaceNode(node.operand, variable, transformVariable);
  if (node.type === 'binary' && (node.operator === '+' || node.operator === '-')) {
    return simplifyAst(b(node.operator, laplaceNode(node.left, variable, transformVariable), laplaceNode(node.right, variable, transformVariable)));
  }
  const shift = exponentialShift(node, variable);
  if (shift) {
    const base = laplaceNode(shift.rest, variable, transformVariable);
    const shiftedVariable = simplifyAst(b('-', sv, rationalToAst(shift.shift)));
    return simplifyAst(substituteAst(base, transformVariable, shiftedVariable));
  }
  const multiplier = constantMultiplier(node, variable);
  if (multiplier) return simplifyAst(b('*', multiplier.constant, laplaceNode(multiplier.varying, variable, transformVariable)));
  if (node.type === 'binary' && node.operator === '^' && node.left.type === 'symbol' && node.left.name === variable) {
    const exponent = rationalConstant(node.right);
    if (exponent?.d === 1n) {
      const power = Number(exponent.n);
      if (Number.isInteger(power) && power >= 0 && power <= 20) return simplifyAst(b('/', n(factorial(power)), b('^', sv, n(power + 1))));
    }
  }
  if (node.type === 'call' && node.args.length === 1) {
    const coefficient = linearCoefficient(node.args[0], variable);
    if (coefficient) {
      const a = rationalToAst(coefficient);
      const s2 = b('^', sv, n(2));
      const a2 = b('^', a, n(2));
      if (node.name === 'exp') return simplifyAst(b('/', ONE, b('-', sv, a)));
      if (node.name === 'sin') return simplifyAst(b('/', a, b('+', s2, a2)));
      if (node.name === 'cos') return simplifyAst(b('/', sv, b('+', s2, a2)));
      if (node.name === 'sinh') return simplifyAst(b('/', a, b('-', s2, a2)));
      if (node.name === 'cosh') return simplifyAst(b('/', sv, b('-', s2, a2)));
    }
  }
  throw new Error('No verified E7 Laplace rule matches this expression. Supported exact forms include constants, t^n, exp(a t), sin(a t), cos(a t), sinh/cosh, linear combinations, constant multiples, and exponential shifts of supported forms.');
}

export function laplaceTransform(node: AstNode, variable: string, transformVariable = 's'): E7Transform {
  const source = unwrap(node);
  const transformed = simplifyAst(laplaceNode(source, variable, transformVariable));
  return {
    ast: transformed,
    display: astToPlainText(transformed),
    exactness: 'exact',
    warnings: ['The unilateral Laplace transform uses L{f}(s)=∫₀∞ f(t)e^{-st}dt and assumes s lies in a region where the represented transform converges. E7 records the transform rule exactly but does not yet solve general regions of convergence.'],
    steps: [exactStep(source, transformed, 'laplace-transform', 'Apply the verified unilateral Laplace transform table together with linearity and supported shift rules.', 1)],
    sections: [section('laplace', 'Laplace transform', [
      { label: 'Input variable', display: variable },
      { label: 'Transform variable', display: transformVariable },
      { label: 'Result', display: astToPlainText(transformed), ast: transformed },
      { label: 'Convention', display: 'L{f}(s) = ∫₀∞ f(t)e^(-st) dt' },
    ])],
  };
}

function inverseRational(node: AstNode, transformVariable: string, variable: string): AstNode | null {
  if (node.type !== 'binary' || node.operator !== '/') return null;
  const numerator = toPolynomial(simplifyAst(node.left), transformVariable);
  const denominator = toPolynomial(simplifyAst(node.right), transformVariable);
  if (!numerator || !denominator) return null;
  const nd = polynomialDegree(numerator); const dd = polynomialDegree(denominator);
  if (nd > 1 || dd < 1 || dd > 2 || nd >= dd) return null;
  const t = s(variable);
  if (dd === 1) {
    const d1 = polynomialCoefficient(denominator, 1); const d0 = polynomialCoefficient(denominator, 0);
    const n0 = polynomialCoefficient(numerator, 0);
    if (isZero(d1)) return null;
    const scale = div(n0, d1); const alpha = div(d0, d1);
    return simplifyAst(b('*', rationalToAst(scale), call('exp', b('*', rationalToAst(neg(alpha)), t))));
  }
  const d2 = polynomialCoefficient(denominator, 2); const d1 = polynomialCoefficient(denominator, 1); const d0 = polynomialCoefficient(denominator, 0);
  const n1 = polynomialCoefficient(numerator, 1); const n0 = polynomialCoefficient(numerator, 0);
  if (isZero(d2)) return null;
  const twoD2 = mul(rat(2n), d2);
  const alpha = div(d1, twoD2);
  const beta2 = sub(div(d0, d2), mul(alpha, alpha));
  const a = div(n1, d2);
  const remainder = div(sub(n0, mul(n1, alpha)), d2);
  const envelope = call('exp', b('*', rationalToAst(neg(alpha)), t));
  if (isZero(beta2)) {
    const inside = simplifyAst(b('+', rationalToAst(a), b('*', rationalToAst(remainder), t)));
    return simplifyAst(b('*', envelope, inside));
  }
  if (sign(beta2) > 0) {
    const beta = call('sqrt', rationalToAst(beta2));
    const cosine = b('*', rationalToAst(a), call('cos', b('*', beta, t)));
    const sine = b('*', b('/', rationalToAst(remainder), beta), call('sin', b('*', beta, t)));
    return simplifyAst(b('*', envelope, b('+', cosine, sine)));
  }
  const gamma = call('sqrt', rationalToAst(neg(beta2)));
  const cosh = b('*', rationalToAst(a), call('cosh', b('*', gamma, t)));
  const sinh = b('*', b('/', rationalToAst(remainder), gamma), call('sinh', b('*', gamma, t)));
  return simplifyAst(b('*', envelope, b('+', cosh, sinh)));
}

function inverseLaplaceNode(node0: AstNode, transformVariable: string, variable: string): AstNode {
  const node = simplifyAst(node0);
  if (node.type === 'binary' && (node.operator === '+' || node.operator === '-')) return simplifyAst(b(node.operator, inverseLaplaceNode(node.left, transformVariable, variable), inverseLaplaceNode(node.right, transformVariable, variable)));
  const multiplier = constantMultiplier(node, transformVariable);
  if (multiplier) return simplifyAst(b('*', multiplier.constant, inverseLaplaceNode(multiplier.varying, transformVariable, variable)));
  const rational = inverseRational(node, transformVariable, variable);
  if (rational) return rational;
  if (node.type === 'binary' && node.operator === '/' && same(node.left, ONE)) {
    const denominator = simplifyAst(node.right);
    if (denominator.type === 'symbol' && denominator.name === transformVariable) return ONE;
    if (denominator.type === 'binary' && denominator.operator === '^' && denominator.left.type === 'symbol' && denominator.left.name === transformVariable) {
      const exponent = rationalConstant(denominator.right);
      if (exponent?.d === 1n) {
        const power = Number(exponent.n);
        if (power >= 1 && power <= 21) return simplifyAst(b('/', b('^', s(variable), n(power - 1)), n(factorial(power - 1))));
      }
    }
  }
  throw new Error('No verified E7 inverse-Laplace rule matches this expression. E7 currently supports linear combinations and proper rational transforms with denominator degree at most two, including repeated, oscillatory, and hyperbolic quadratic cases.');
}

export function inverseLaplaceTransform(node: AstNode, transformVariable: string, variable = 't'): E7Transform {
  const source = unwrap(node);
  const transformed = inverseLaplaceNode(source, transformVariable, variable);
  return {
    ast: transformed,
    display: astToPlainText(transformed),
    exactness: 'exact',
    warnings: ['Inverse transforms are table/rational-rule results within the accepted E7 boundary. Distribution-valued inverses, branch-sensitive inverses, and general contour inversion are not inferred.'],
    steps: [exactStep(source, transformed, 'inverse-laplace', 'Match the transform against the verified inverse table and bounded rational-quadratic reconstruction.', 1)],
    sections: [section('inverse-laplace', 'Inverse Laplace transform', [
      { label: 'Transform variable', display: transformVariable },
      { label: 'Time variable', display: variable },
      { label: 'Result', display: astToPlainText(transformed), ast: transformed },
    ])],
  };
}

function parseSecondExpression(source: string): AstNode {
  const parsed = parseMath(source);
  if (!parsed.ast || parsed.diagnostics.some(item => item.severity === 'error')) throw new Error('The second convolution expression could not be parsed.');
  return unwrap(parsed.ast);
}

export function convolutionTransform(node: AstNode, variable: string, secondSource: string): E7Transform {
  if (!secondSource.trim()) throw new Error('Convolution requires a second function/expression.');
  const left = unwrap(node); const right = parseSecondExpression(secondSource); const tau = s('tau');
  const leftTau = substituteAst(left, variable, tau);
  const rightShifted = substituteAst(right, variable, b('-', s(variable), tau));
  const integral = call('DefIntegral', simplifyAst(b('*', leftTau, rightShifted)), tau, ZERO, s(variable));
  const leftLaplace = laplaceNode(left, variable, 's'); const rightLaplace = laplaceNode(right, variable, 's');
  const product = simplifyAst(b('*', leftLaplace, rightLaplace));
  let closed: AstNode | undefined;
  try { closed = inverseLaplaceNode(product, 's', variable); } catch { closed = undefined; }
  return {
    ast: closed ?? integral,
    display: closed ? astToPlainText(closed) : astToPlainText(integral),
    exactness: 'exact',
    warnings: [closed ? 'The convolution was reconstructed from the exact product of supported Laplace transforms.' : 'The convolution theorem is exact, but E7 leaves the time-domain convolution as a definite integral because the product is outside the bounded inverse-Laplace table.'],
    steps: [
      exactStep(b('*', call('L', left), call('L', right)), product, 'convolution-theorem', 'L{f*g}=L{f}L{g} for the unilateral convolution.', 1),
    ],
    sections: [section('convolution', 'Convolution', [
      { label: '(f*g)(t)', display: astToPlainText(integral), ast: integral },
      { label: 'L{f}', display: astToPlainText(leftLaplace), ast: leftLaplace },
      { label: 'L{g}', display: astToPlainText(rightLaplace), ast: rightLaplace },
      { label: 'Product in s', display: astToPlainText(product), ast: product },
      ...(closed ? [{ label: 'Closed time-domain form', display: astToPlainText(closed), ast: closed }] : []),
    ])],
  };
}

function evaluate(node: AstNode, variable: string, value: number): number {
  if (node.type === 'number') return Number(node.value);
  if (node.type === 'symbol') {
    if (node.name === variable) return value;
    if (node.name === 'pi') return Math.PI;
    if (node.name === 'e') return Math.E;
    throw new Error(`Numerical transform still contains unresolved symbol “${node.name}”.`);
  }
  if (node.type === 'unary') { const v = evaluate(node.operand, variable, value); return node.operator === '-' ? -v : v; }
  if (node.type === 'binary') {
    const left = evaluate(node.left, variable, value); const right = evaluate(node.right, variable, value);
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return left / right;
    return left ** right;
  }
  if (node.type === 'call' && node.args.length === 1) {
    const v = evaluate(node.args[0], variable, value);
    const fn: Record<string, (x: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh };
    if (fn[node.name]) return fn[node.name](v);
  }
  throw new Error('Numerical E7 transforms support scalar elementary expressions only.');
}
function simpsonIntegrate(fn: (x: number) => number, lower: number, upper: number, intervals: number): number {
  const count = Math.max(2, Math.min(8192, intervals + (intervals % 2)));
  const h = (upper - lower) / count;
  let total = fn(lower) + fn(upper);
  for (let i = 1; i < count; i += 1) total += (i % 2 === 0 ? 2 : 4) * fn(lower + i * h);
  return total * h / 3;
}
function combineParity(a: Parity, c: Parity, multiply: boolean): Parity {
  if (a === 'neither' || c === 'neither') return 'neither';
  if (!multiply) return a === c ? a : 'neither';
  return a === c ? 'even' : 'odd';
}
function parityOf(node0: AstNode, variable: string): Parity {
  const node = simplifyAst(node0);
  if (!hasVariable(node, variable)) return 'even';
  if (node.type === 'symbol') return node.name === variable ? 'odd' : 'neither';
  if (node.type === 'unary') return parityOf(node.operand, variable);
  if (node.type === 'binary') {
    const left = parityOf(node.left, variable); const right = parityOf(node.right, variable);
    if (node.operator === '+' || node.operator === '-') return combineParity(left, right, false);
    if (node.operator === '*' || node.operator === '/') return combineParity(left, right, true);
    if (node.operator === '^') {
      const exponent = rationalConstant(node.right); const base = parityOf(node.left, variable);
      if (!exponent || exponent.d !== 1n || exponent.n < 0n) return 'neither';
      return exponent.n % 2n === 0n ? 'even' : base;
    }
  }
  if (node.type === 'call' && node.args.length === 1) {
    const p = parityOf(node.args[0], variable);
    if (node.name === 'sin' || node.name === 'sinh' || node.name === 'tan' || node.name === 'tanh') return p === 'odd' ? 'odd' : 'neither';
    if (node.name === 'cos' || node.name === 'cosh' || node.name === 'abs') return p === 'odd' ? 'even' : 'neither';
  }
  return 'neither';
}

export function fourierSeries(node: AstNode, variable: string, period: number, order: number, intervals = 1200): E7Transform {
  if (!(period > 0) || !Number.isFinite(period)) throw new Error('Fourier-series period must be a positive finite number.');
  if (!Number.isInteger(order) || order < 1 || order > 40) throw new Error('Fourier-series order must be an integer from 1 to 40.');
  const source = unwrap(node); const parity = parityOf(source, variable); const half = period / 2; const omega0 = 2 * Math.PI / period;
  const integrate = (fn: (x: number) => number) => simpsonIntegrate(fn, -half, half, intervals);
  const f = (x: number) => evaluate(source, variable, x);
  const a0 = parity === 'odd' ? 0 : (2 / period) * integrate(f);
  const cosine: number[] = []; const sine: number[] = [];
  for (let k = 1; k <= order; k += 1) {
    cosine.push(parity === 'odd' ? 0 : (2 / period) * integrate(x => f(x) * Math.cos(k * omega0 * x)));
    sine.push(parity === 'even' ? 0 : (2 / period) * integrate(x => f(x) * Math.sin(k * omega0 * x)));
  }
  const coefficientFacts: MathResultFact[] = [];
  for (let k = 1; k <= order; k += 1) coefficientFacts.push({ label: `n=${k}`, display: `aₙ≈${formatNumber(cosine[k - 1])} · bₙ≈${formatNumber(sine[k - 1])}` });
  return {
    display: `a₀≈${formatNumber(a0)} · ${order} harmonic${order === 1 ? '' : 's'} · ${parity} parity`,
    exactness: 'approximate',
    warnings: ['Fourier coefficients are deterministic composite-Simpson approximations on one represented period. Structural even/odd detection can eliminate the mathematically zero coefficient family exactly, but the remaining numeric coefficients are still approximate.'],
    steps: [],
    sections: [
      section('fourier-series', 'Fourier series', [
        { label: 'Period T', display: formatNumber(period) },
        { label: 'Fundamental angular frequency', display: formatNumber(omega0) },
        { label: 'Detected parity', display: parity },
        { label: 'a₀', display: formatNumber(a0) },
        { label: 'Series convention', display: 'f(t) ≈ a₀/2 + Σ[aₙ cos(nω₀t) + bₙ sin(nω₀t)]' },
      ], 'E7 evaluates the represented function over [-T/2,T/2].'),
      section('fourier-coefficients', 'Fourier coefficients', coefficientFacts),
    ],
  };
}

function gaussianCoefficient(argument: AstNode, variable: string): Rational | null {
  const poly = toPolynomial(simplifyAst(argument), variable);
  if (!poly || polynomialDegree(poly) !== 2 || !isZero(polynomialCoefficient(poly, 1)) || !isZero(polynomialCoefficient(poly, 0))) return null;
  const coefficient = polynomialCoefficient(poly, 2);
  return sign(coefficient) < 0 ? neg(coefficient) : null;
}

export function fourierTransform(node: AstNode, variable: string, frequencyVariable = 'omega'): E7Transform {
  const source = simplifyAst(unwrap(node));
  if (source.type === 'call' && source.name === 'exp' && source.args.length === 1) {
    const a = gaussianCoefficient(source.args[0], variable);
    if (a) {
      const omega = s(frequencyVariable); const aAst = rationalToAst(a);
      const amplitude = call('sqrt', b('/', s('pi'), aAst));
      const exponent = u('-', b('/', b('^', omega, n(2)), b('*', n(4), aAst)));
      const result = simplifyAst(b('*', amplitude, call('exp', exponent)));
      return { ast: result, display: astToPlainText(result), exactness: 'exact', warnings: ['Fourier convention: F(ω)=∫_{-∞}^{∞}f(t)e^{-iωt}dt. The Gaussian identity is exact for a>0.'], steps: [exactStep(source, result, 'gaussian-fourier-transform', 'Apply the exact Gaussian Fourier transform identity.', 1)], sections: [section('fourier-transform', 'Fourier transform', [{ label: 'Convention', display: 'F(ω)=∫ f(t)e^(-iωt) dt' }, { label: 'Result', display: astToPlainText(result), ast: result }])] };
    }
  }
  throw new Error('No exact E7 Fourier-transform rule matches this expression. The exact bilateral table currently certifies Gaussian exp(-a t^2), a>0. Use Numerical Fourier transform for general integrable elementary expressions on a finite interval.');
}

export function inverseFourierTransform(node: AstNode, frequencyVariable: string, variable = 't'): E7Transform {
  const source = simplifyAst(unwrap(node));
  if (source.type === 'call' && source.name === 'exp' && source.args.length === 1) {
    const a = gaussianCoefficient(source.args[0], frequencyVariable);
    if (a) {
      const t = s(variable); const aAst = rationalToAst(a);
      const amplitude = b('/', ONE, b('*', n(2), call('sqrt', b('*', s('pi'), aAst))));
      const exponent = u('-', b('/', b('^', t, n(2)), b('*', n(4), aAst)));
      const result = simplifyAst(b('*', amplitude, call('exp', exponent)));
      return { ast: result, display: astToPlainText(result), exactness: 'exact', warnings: ['Inverse convention: f(t)=(1/2π)∫_{-∞}^{∞}F(ω)e^{iωt}dω. The Gaussian identity is exact for a>0.'], steps: [exactStep(source, result, 'gaussian-inverse-fourier', 'Apply the exact inverse Gaussian transform under the E7 angular-frequency convention.', 1)], sections: [section('inverse-fourier', 'Inverse Fourier transform', [{ label: 'Convention', display: 'f(t)=(1/2π)∫ F(ω)e^(iωt) dω' }, { label: 'Result', display: astToPlainText(result), ast: result }])] };
    }
  }
  throw new Error('No exact E7 inverse-Fourier rule matches this expression. The exact bilateral inverse table is intentionally bounded; use the numerical inverse workflow only when a finite frequency interval is explicitly supplied.');
}

export function numericalFourierTransform(node: AstNode, variable: string, lower: number, upper: number, frequency: number, intervals = 1600, inverse = false): E7Transform {
  if (![lower, upper, frequency].every(Number.isFinite) || !(upper > lower)) throw new Error('Numerical Fourier transform requires finite lower < upper bounds and a finite evaluation frequency/time.');
  const source = unwrap(node); const scale = inverse ? 1 / (2 * Math.PI) : 1;
  const real = scale * simpsonIntegrate(x => evaluate(source, variable, x) * Math.cos(frequency * x), lower, upper, intervals);
  const imaginary = scale * simpsonIntegrate(x => evaluate(source, variable, x) * (inverse ? 1 : -1) * Math.sin(frequency * x), lower, upper, intervals);
  const magnitude = Math.hypot(real, imaginary);
  return {
    display: `${formatNumber(real)} ${imaginary < 0 ? '-' : '+'} ${formatNumber(Math.abs(imaginary))}i`,
    exactness: 'approximate',
    warnings: ['This is a finite-window composite-Simpson approximation, not the exact bilateral transform over the entire real line. Window truncation and quadrature error are both present.'],
    steps: [],
    sections: [section(inverse ? 'numerical-inverse-fourier' : 'numerical-fourier', inverse ? 'Numerical inverse Fourier evaluation' : 'Numerical Fourier evaluation', [
      { label: inverse ? 'Time t' : 'Angular frequency ω', display: formatNumber(frequency) },
      { label: 'Integration window', display: `[${formatNumber(lower)}, ${formatNumber(upper)}]` },
      { label: 'Real part', display: formatNumber(real) },
      { label: 'Imaginary part', display: formatNumber(imaginary) },
      { label: 'Magnitude', display: formatNumber(magnitude) },
    ])],
  };
}

function numericVector(node0: AstNode): number[] {
  const node = unwrap(node0);
  if (node.type !== 'matrix' || node.rows.length !== 1) throw new Error('DFT expects a real vector such as [1,0,-1,0].');
  return node.rows[0].map(cell => {
    const value = rationalConstant(cell); if (!value) throw new Error('DFT vector entries must be resolved real rational numbers.'); return rationalToNumber(value);
  });
}
function numericComplexMatrix(node0: AstNode): Complex[] {
  const node = unwrap(node0);
  if (node.type !== 'matrix' || node.rows.some(row => row.length !== 2)) throw new Error('Inverse DFT expects an n×2 matrix whose rows are [real, imaginary] coefficients.');
  return node.rows.map(row => {
    const re = rationalConstant(row[0]); const im = rationalConstant(row[1]);
    if (!re || !im) throw new Error('Inverse DFT coefficients must be resolved real rational pairs.');
    return { re: rationalToNumber(re), im: rationalToNumber(im) };
  });
}
function dftValues(values: Complex[], inverse: boolean): Complex[] {
  const count = values.length; const direction = inverse ? 1 : -1; const scale = inverse ? 1 / count : 1;
  return Array.from({ length: count }, (_, k) => {
    let re = 0; let im = 0;
    for (let j = 0; j < count; j += 1) {
      const angle = direction * 2 * Math.PI * k * j / count; const c = Math.cos(angle); const q = Math.sin(angle);
      re += values[j].re * c - values[j].im * q; im += values[j].re * q + values[j].im * c;
    }
    return { re: scale * re, im: scale * im };
  });
}
export function discreteFourierTransform(node: AstNode): E7Transform {
  const input = numericVector(node); if (input.length < 2 || input.length > 256) throw new Error('E7 DFT size is bounded to 2–256 samples.');
  const output = dftValues(input.map(re => ({ re, im: 0 })), false);
  const resultAst = matrix(output.map(value => [n(formatNumber(value.re, 12)), n(formatNumber(value.im, 12))]));
  return { ast: resultAst, display: `${input.length}-point DFT`, exactness: 'approximate', warnings: ['The direct O(N²) DFT uses binary64 trigonometric evaluation. It is a discrete numerical transform, not an exact symbolic Fourier transform or an FFT implementation.'], steps: [], sections: [section('dft', 'Discrete Fourier transform', output.map((value, index) => ({ label: `k=${index}`, display: `${formatNumber(value.re)} ${value.im < 0 ? '-' : '+'} ${formatNumber(Math.abs(value.im))}i · |X|=${formatNumber(Math.hypot(value.re, value.im))}` })))] };
}
export function inverseDiscreteFourierTransform(node: AstNode): E7Transform {
  const input = numericComplexMatrix(node); if (input.length < 2 || input.length > 256) throw new Error('E7 inverse DFT size is bounded to 2–256 coefficients.');
  const output = dftValues(input, true); const resultAst = matrix(output.map(value => [n(formatNumber(value.re, 12)), n(formatNumber(value.im, 12))]));
  return { ast: resultAst, display: `${input.length}-point inverse DFT`, exactness: 'approximate', warnings: ['Inverse DFT uses the 1/N normalization and binary64 trigonometric evaluation. Near-zero imaginary reconstruction residue is numerical roundoff, not a new complex component.'], steps: [], sections: [section('idft', 'Inverse discrete Fourier transform', output.map((value, index) => ({ label: `n=${index}`, display: `${formatNumber(value.re)} ${value.im < 0 ? '-' : '+'} ${formatNumber(Math.abs(value.im))}i` })))] };
}

function ode2Call(node: AstNode): Extract<AstNode, { type: 'call' }> {
  const source = unwrap(node);
  if (source.type !== 'call' || source.name !== 'ode2') throw new Error('Transform-based ODE solving currently targets ode2(a,b,c,forcing,0,y0,v0).');
  if (source.args.length < 7) throw new Error('Laplace ODE solving requires ode2 with initial conditions at t=0: ode2(a,b,c,forcing,0,y0,v0).');
  return source;
}
export function laplaceOdeSolve(node: AstNode): E7Transform {
  const ode = ode2Call(node); const [a, c1, c0, forcing, t0, y0, v0] = ode.args;
  const t0Value = rationalConstant(t0); if (!t0Value || !isZero(t0Value)) throw new Error('E7 unilateral Laplace ODE solving currently requires the encoded initial time t0=0.');
  for (const [label, value] of [['a', a], ['b', c1], ['c', c0], ['y(0)', y0], ["y'(0)", v0]] as const) if (hasVariable(value, 't')) throw new Error(`${label} must be constant for the E7 constant-coefficient Laplace workflow.`);
  const sv = s('s'); const forcingTransform = laplaceNode(forcing, 't', 's');
  const denominator = simplifyAst(b('+', b('+', b('*', a, b('^', sv, n(2))), b('*', c1, sv)), c0));
  const initialContribution = simplifyAst(b('+', b('*', a, b('+', b('*', sv, y0), v0)), b('*', c1, y0)));
  const numerator = simplifyAst(b('+', forcingTransform, initialContribution));
  const yTransform = simplifyAst(b('/', numerator, denominator));
  let timeSolution: AstNode | undefined;
  try { timeSolution = inverseLaplaceNode(yTransform, 's', 't'); } catch { timeSolution = undefined; }
  const facts: MathResultFact[] = [
    { label: 'L{forcing}', display: astToPlainText(forcingTransform), ast: forcingTransform },
    { label: 'Y(s)', display: astToPlainText(yTransform), ast: yTransform },
    { label: 'Initial conditions', display: `y(0)=${astToPlainText(y0)}, y'(0)=${astToPlainText(v0)}` },
  ];
  if (timeSolution) facts.push({ label: 'y(t)', display: astToPlainText(timeSolution), ast: timeSolution });
  return {
    ast: timeSolution ?? yTransform,
    display: timeSolution ? astToPlainText(timeSolution) : `Y(s)=${astToPlainText(yTransform)}`,
    exactness: 'exact',
    warnings: [timeSolution ? 'The time-domain solution is reconstructed inside the bounded E7 inverse-Laplace rational table.' : 'The Laplace-domain solution Y(s) is exact, but E7 does not fabricate a time-domain inverse outside its bounded inverse table.'],
    steps: [
      exactStep(ode, yTransform, 'laplace-ode', "Use L{y'}=sY-y(0) and L{y''}=s²Y-sy(0)-y'(0), then solve algebraically for Y(s).", 1),
      ...(timeSolution ? [exactStep(yTransform, timeSolution, 'inverse-laplace-ode', 'Invert the resulting proper rational transform using the verified E7 inverse table.', 2)] : []),
    ],
    sections: [section('laplace-ode', 'Transform-based ODE solution', facts, 'Accepted for constant-coefficient second-order ode2(...) objects with initial data encoded at t=0 and forcing inside the supported exact Laplace table.')],
  };
}
