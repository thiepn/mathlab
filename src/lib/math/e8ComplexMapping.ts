import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { differentiateAst } from './calculus';
import type { MathResultFact, MathResultSection } from './types';
import type { E8Transform } from './e8ComplexAnalysis';

type Complex = { re: number; im: number };

function c(re = 0, im = 0): Complex { return { re, im }; }
function add(a: Complex, b: Complex): Complex { return c(a.re + b.re, a.im + b.im); }
function sub(a: Complex, b: Complex): Complex { return c(a.re - b.re, a.im - b.im); }
function mul(a: Complex, b: Complex): Complex { return c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
function div(a: Complex, b: Complex): Complex {
  const denominator = b.re * b.re + b.im * b.im;
  if (!(denominator > 0)) throw new Error('Complex division encountered a zero denominator.');
  return c((a.re * b.re + a.im * b.im) / denominator, (a.im * b.re - a.re * b.im) / denominator);
}
function abs(a: Complex): number { return Math.hypot(a.re, a.im); }
function arg(a: Complex): number { return Math.atan2(a.im, a.re); }
function exp(a: Complex): Complex { const scale = Math.exp(a.re); return c(scale * Math.cos(a.im), scale * Math.sin(a.im)); }
function log(a: Complex): Complex {
  if (abs(a) === 0) throw new Error('Complex logarithm is undefined at zero.');
  return c(Math.log(abs(a)), arg(a));
}
function sin(a: Complex): Complex { return c(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im)); }
function cos(a: Complex): Complex { return c(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im)); }
function sinh(a: Complex): Complex { return c(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im)); }
function cosh(a: Complex): Complex { return c(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im)); }
function sqrt(a: Complex): Complex {
  const radius = abs(a);
  const re = Math.sqrt(Math.max(0, (radius + a.re) / 2));
  const im = (a.im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (radius - a.re) / 2));
  return c(re, im);
}
function integerPower(base: Complex, exponent: number): Complex {
  if (exponent === 0) return c(1, 0);
  if (exponent < 0) return div(c(1, 0), integerPower(base, -exponent));
  let result = c(1, 0); let power = base; let remaining = exponent;
  while (remaining > 0) {
    if (remaining % 2 === 1) result = mul(result, power);
    remaining = Math.floor(remaining / 2);
    if (remaining) power = mul(power, power);
  }
  return result;
}
function integerExponent(node: AstNode): number | null {
  const value = rationalValue(simplifyAst(node));
  if (!value || value.d !== 1n) return null;
  const exponent = Number(value.n);
  return Number.isSafeInteger(exponent) ? exponent : null;
}
function power(base: Complex, exponent: Complex): Complex { return exp(mul(exponent, log(base))); }
function format(value: number, digits = 10): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 1e-13) return '0';
  return Number(value.toPrecision(digits)).toString();
}
function complexText(value: Complex): string { return `${format(value.re)} ${value.im < 0 ? '-' : '+'} ${format(Math.abs(value.im))}i`; }
function section(id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection { return { id, title, facts, description }; }
function scanNonHolomorphic(node: AstNode): boolean {
  if (node.type === 'call') return ['abs','conj','re','im','arg','floor','ceil'].includes(node.name) || node.args.some(scanNonHolomorphic);
  if (node.type === 'unary') return scanNonHolomorphic(node.operand);
  if (node.type === 'binary') return scanNonHolomorphic(node.left) || scanNonHolomorphic(node.right);
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition') return scanNonHolomorphic(node.left) || scanNonHolomorphic(node.right);
  if (node.type === 'matrix') return node.rows.flat().some(scanNonHolomorphic);
  if (node.type === 'system' || node.type === 'set') return node.items.some(scanNonHolomorphic);
  return false;
}

function evaluate(node: AstNode, variable: string, z: Complex): Complex {
  if (node.type === 'number') return c(Number(node.value), 0);
  if (node.type === 'symbol') {
    if (node.name === variable) return z;
    if (node.name === 'i') return c(0, 1);
    if (node.name === 'pi') return c(Math.PI, 0);
    if (node.name === 'e') return c(Math.E, 0);
    throw new Error(`Complex evaluation still contains unresolved symbol “${node.name}”.`);
  }
  if (node.type === 'unary') { const value = evaluate(node.operand, variable, z); return node.operator === '-' ? c(-value.re, -value.im) : value; }
  if (node.type === 'binary') {
    const left = evaluate(node.left, variable, z);
    if (node.operator === '^') {
      const integer = integerExponent(node.right);
      if (integer !== null) return integerPower(left, integer);
      return power(left, evaluate(node.right, variable, z));
    }
    const right = evaluate(node.right, variable, z);
    if (node.operator === '+') return add(left, right);
    if (node.operator === '-') return sub(left, right);
    if (node.operator === '*') return mul(left, right);
    return div(left, right);
  }
  if (node.type === 'call' && node.args.length === 1) {
    const value = evaluate(node.args[0], variable, z);
    if (node.name === 'exp') return exp(value);
    if (node.name === 'ln') return log(value);
    if (node.name === 'log') return div(log(value), c(Math.log(10), 0));
    if (node.name === 'sqrt') return sqrt(value);
    if (node.name === 'sin') return sin(value);
    if (node.name === 'cos') return cos(value);
    if (node.name === 'tan') return div(sin(value), cos(value));
    if (node.name === 'sinh') return sinh(value);
    if (node.name === 'cosh') return cosh(value);
    if (node.name === 'tanh') return div(sinh(value), cosh(value));
    if (node.name === 'abs') return c(abs(value), 0);
    if (node.name === 'arg') return c(arg(value), 0);
    if (node.name === 'conj') return c(value.re, -value.im);
    if (node.name === 're') return c(value.re, 0);
    if (node.name === 'im') return c(value.im, 0);
  }
  throw new Error('Numerical complex evaluation supports scalar elementary expressions only.');
}

export function complexMapping(node: AstNode, variable: string, pointRe: number, pointIm: number): E8Transform {
  if (![pointRe, pointIm].every(Number.isFinite)) throw new Error('Complex mapping coordinates must be finite.');
  const source = node.type === 'definition' ? node.right : node;
  const input = c(pointRe, pointIm); const output = evaluate(source, variable, input);
  if (![output.re, output.im].every(Number.isFinite)) throw new Error('Complex mapping produced a non-finite value; the selected point may be outside the function domain.');
  let derivative: Complex | undefined;
  if (!scanNonHolomorphic(source)) {
    try { derivative = evaluate(differentiateAst(source, variable).ast, variable, input); } catch { derivative = undefined; }
  }
  return {
    display: `${complexText(input)} ↦ ${complexText(output)}`,
    exactness: 'approximate',
    warnings: ['Point evaluation uses binary64 complex arithmetic. Integer powers are evaluated algebraically; ln, sqrt, and non-integer powers use principal branches.'],
    steps: [],
    sections: [section('mapping', 'Complex mapping', [
      { label: 'Input z', display: complexText(input) },
      { label: 'f(z)', display: complexText(output) },
      { label: '|f(z)|', display: format(abs(output)) },
      { label: 'arg f(z)', display: `${format(arg(output))} rad` },
      ...(derivative ? [{ label: "f′(z)", display: complexText(derivative) }, { label: 'Local conformality signal', display: abs(derivative) > 1e-12 ? 'Derivative nonzero' : 'Derivative zero / inconclusive', tone: abs(derivative) > 1e-12 ? 'positive' as const : 'warning' as const }] : []),
    ])],
  };
}
