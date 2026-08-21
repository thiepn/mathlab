import type { AstNode } from './ast';
import {
  evaluatePolynomial,
  polynomialCoefficient,
  polynomialDegree,
  polynomialToAst,
  rationalToAst,
  rationalValue,
  simplifyAst,
  sqrtDecomposition,
  sqrtRationalAst,
  substituteAst,
  symbolsIn,
  toPolynomial,
  type Polynomial,
} from './algebra';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import {
  ONE,
  ZERO,
  abs as rationalAbs,
  add,
  div,
  isZero,
  mul,
  neg,
  rat,
  rationalToNumber,
  sign,
  sqrtRational,
  sub,
  type Rational,
} from './rational';

export interface CalculusStep {
  rule: string;
  explanation: string;
  beforeAst: AstNode;
  afterAst: AstNode;
}

export interface CalculusTransform {
  ast: AstNode;
  steps: CalculusStep[];
  warnings: string[];
}

export interface LimitResult {
  ast?: AstNode;
  display?: string;
  steps: CalculusStep[];
  warnings: string[];
}

export interface IntervalFact {
  interval: string;
  behavior: 'increasing' | 'decreasing' | 'constant' | 'concave-up' | 'concave-down' | 'linear';
}

export interface StationaryPoint {
  x: AstNode;
  y: AstNode;
  classification: 'local minimum' | 'local maximum' | 'stationary / inconclusive';
}

function n(value: string | number | bigint): AstNode { return { type: 'number', value: String(value) }; }
function s(name: string): AstNode { return { type: 'symbol', name }; }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode, implicit = false): AstNode {
  return { type: 'binary', operator, left, right, implicit };
}
function u(operator: '+' | '-', operand: AstNode): AstNode { return { type: 'unary', operator, operand }; }
function call(name: string, ...args: AstNode[]): AstNode { return { type: 'call', name, args }; }
function equation(left: AstNode, right: AstNode): AstNode { return { type: 'equation', left, right }; }
function set(items: AstNode[]): AstNode { return { type: 'set', items }; }

function same(a: AstNode, c: AstNode): boolean { return JSON.stringify(a) === JSON.stringify(c); }

function containsVariable(node: AstNode, variable: string): boolean {
  return symbolsIn(node).includes(variable);
}

function constantRational(node: AstNode, variable: string): Rational | null {
  if (containsVariable(node, variable)) return null;
  return rationalValue(simplifyAst(node));
}

function simplifyKnownCalls(node: AstNode): AstNode {
  if (node.type === 'number' || node.type === 'symbol') return node;
  if (node.type === 'unary') return simplifyAst({ ...node, operand: simplifyKnownCalls(node.operand) });
  if (node.type === 'binary') return simplifyAst({ ...node, left: simplifyKnownCalls(node.left), right: simplifyKnownCalls(node.right) });
  if (node.type === 'matrix') return { ...node, rows: node.rows.map((row) => row.map(simplifyKnownCalls)) };
  if (node.type === 'system' || node.type === 'set') return { ...node, items: node.items.map(simplifyKnownCalls) };
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition') {
    return { ...node, left: simplifyKnownCalls(node.left), right: simplifyKnownCalls(node.right) };
  }
  const args = node.args.map(simplifyKnownCalls);
  const arg = args[0];
  if (!arg) return { ...node, args };
  const value = rationalValue(arg);
  if (node.name === 'sin') {
    if (value && isZero(value)) return n(0);
    if (arg.type === 'symbol' && arg.name === 'pi') return n(0);
  }
  if (node.name === 'cos') {
    if (value && isZero(value)) return n(1);
    if (arg.type === 'symbol' && arg.name === 'pi') return n(-1);
  }
  if ((node.name === 'exp') && value && isZero(value)) return n(1);
  if ((node.name === 'ln' || node.name === 'log') && value && value.n === value.d) return n(0);
  if (node.name === 'abs' && value) return rationalToAst(rationalAbs(value));
  if (node.name === 'sqrt' && value && value.n >= 0n) return simplifyAst({ ...node, args });
  return { ...node, args };
}

function derivativeRaw(node: AstNode, variable: string, steps: CalculusStep[]): AstNode {
  if (!containsVariable(node, variable)) return n(0);
  if (node.type === 'number') return n(0);
  if (node.type === 'symbol') return node.name === variable ? n(1) : n(0);
  if (node.type === 'unary') {
    const inner = derivativeRaw(node.operand, variable, steps);
    const out = node.operator === '-' ? u('-', inner) : inner;
    steps.push({ rule: 'constant-sign-rule', explanation: 'Differentiate through the unary sign.', beforeAst: node, afterAst: out });
    return out;
  }
  if (node.type === 'binary') {
    if (node.operator === '+' || node.operator === '-') {
      const out = b(node.operator, derivativeRaw(node.left, variable, steps), derivativeRaw(node.right, variable, steps));
      steps.push({ rule: node.operator === '+' ? 'sum-rule' : 'difference-rule', explanation: 'Differentiate each term independently.', beforeAst: node, afterAst: out });
      return out;
    }
    if (node.operator === '*') {
      const leftPrime = derivativeRaw(node.left, variable, steps);
      const rightPrime = derivativeRaw(node.right, variable, steps);
      const out = b('+', b('*', leftPrime, node.right), b('*', node.left, rightPrime));
      steps.push({ rule: 'product-rule', explanation: "Apply (uv)' = u'v + uv'.", beforeAst: node, afterAst: out });
      return out;
    }
    if (node.operator === '/') {
      const leftPrime = derivativeRaw(node.left, variable, steps);
      const rightPrime = derivativeRaw(node.right, variable, steps);
      const numerator = b('-', b('*', leftPrime, node.right), b('*', node.left, rightPrime));
      const out = b('/', numerator, b('^', node.right, n(2)));
      steps.push({ rule: 'quotient-rule', explanation: "Apply (u/v)' = (u'v - uv')/v² on the original domain.", beforeAst: node, afterAst: out });
      return out;
    }
    if (node.operator === '^') {
      const exponent = constantRational(node.right, variable);
      if (exponent) {
        const innerPrime = derivativeRaw(node.left, variable, steps);
        const lowered = sub(exponent, ONE);
        const out = b('*', b('*', rationalToAst(exponent), b('^', node.left, rationalToAst(lowered))), innerPrime);
        steps.push({ rule: 'power-chain-rule', explanation: 'Apply the power rule and multiply by the derivative of the inner function.', beforeAst: node, afterAst: out });
        return out;
      }
      if (!containsVariable(node.left, variable) && node.left.type === 'symbol' && node.left.name === 'e') {
        const exponentPrime = derivativeRaw(node.right, variable, steps);
        const out = b('*', node, exponentPrime);
        steps.push({ rule: 'exponential-chain-rule', explanation: "Differentiate e^u as e^u · u'.", beforeAst: node, afterAst: out });
        return out;
      }
      throw new Error('P5 differentiation supports powers with a variable-independent exponent. General u(x)^v(x) differentiation is intentionally deferred because its real-domain conditions must be explicit.');
    }
  }
  if (node.type === 'call') {
    if (node.args.length !== 1) throw new Error(`P5 differentiation currently supports unary elementary functions; ${node.name} has ${node.args.length} arguments.`);
    const inner = node.args[0];
    const innerPrime = derivativeRaw(inner, variable, steps);
    let outer: AstNode;
    switch (node.name) {
      case 'sin': outer = call('cos', inner); break;
      case 'cos': outer = u('-', call('sin', inner)); break;
      case 'tan': outer = b('^', call('sec', inner), n(2)); break;
      case 'exp': outer = call('exp', inner); break;
      case 'ln': outer = b('/', n(1), inner); break;
      case 'log': outer = b('/', n(1), b('*', inner, call('ln', n(10)))); break;
      case 'sqrt': outer = b('/', n(1), b('*', n(2), call('sqrt', inner))); break;
      case 'sinh': outer = call('cosh', inner); break;
      case 'cosh': outer = call('sinh', inner); break;
      case 'tanh': outer = b('/', n(1), b('^', call('cosh', inner), n(2))); break;
      case 'asin': outer = b('/', n(1), call('sqrt', b('-', n(1), b('^', inner, n(2))))); break;
      case 'acos': outer = u('-', b('/', n(1), call('sqrt', b('-', n(1), b('^', inner, n(2)))))); break;
      case 'atan': outer = b('/', n(1), b('+', n(1), b('^', inner, n(2)))); break;
      case 'abs': throw new Error('P5 does not differentiate abs(...) without a sign assumption because the derivative changes across zeros of the argument.');
      case 'floor':
      case 'ceil': throw new Error(`${node.name}(...) is not differentiable at its jump points; a global symbolic derivative is not emitted.`);
      default: throw new Error(`P5 does not yet have a verified derivative rule for ${node.name}(...).`);
    }
    const out = b('*', outer, innerPrime);
    steps.push({ rule: 'elementary-chain-rule', explanation: `Differentiate ${node.name}(u) and multiply by u'.`, beforeAst: node, afterAst: out });
    return out;
  }
  throw new Error('P5 differentiation is defined for scalar expressions and unary functions, not relations, sets, systems, or matrices.');
}

export function differentiateAst(node: AstNode, variable: string): CalculusTransform {
  const steps: CalculusStep[] = [];
  const raw = derivativeRaw(node, variable, steps);
  const ast = simplifyKnownCalls(simplifyAst(raw));
  if (!same(raw, ast)) steps.push({ rule: 'simplify-derivative', explanation: 'Simplify the derivative using exact algebra without changing its domain.', beforeAst: raw, afterAst: ast });
  const restrictions = [...new Set([...domainNotes(node, variable), ...domainNotes(ast, variable)])];
  const warnings = restrictions.length ? [`Derivative formula is valid only on its inherited real domain: ${restrictions.join(' · ')}.`] : [];
  return { ast, steps, warnings };
}

function affineForm(node: AstNode, variable: string): { a: Rational; c: Rational } | null {
  const poly = toPolynomial(node, variable);
  if (!poly || polynomialDegree(poly) > 1) return null;
  return { a: polynomialCoefficient(poly, 1), c: polynomialCoefficient(poly, 0) };
}

function integratePolynomial(poly: Polynomial, variable: string): AstNode {
  let out: Polynomial = new Map([[0, ZERO]]);
  for (const [degree, coefficient] of poly) {
    const newDegree = degree + 1;
    out.set(newDegree, div(coefficient, rat(newDegree)));
  }
  return polynomialToAst(out, variable);
}

function integrateRaw(node: AstNode, variable: string, steps: CalculusStep[]): AstNode {
  const simplified = simplifyAst(node);
  const polynomial = toPolynomial(simplified, variable);
  if (polynomial) {
    const out = integratePolynomial(polynomial, variable);
    steps.push({ rule: 'polynomial-antiderivative', explanation: 'Integrate each polynomial term with the power rule.', beforeAst: node, afterAst: out });
    return out;
  }

  if (!containsVariable(simplified, variable)) {
    const out = b('*', simplified, s(variable), true);
    steps.push({ rule: 'constant-integral', explanation: 'Treat variable-independent factors as constants.', beforeAst: node, afterAst: out });
    return out;
  }

  if (simplified.type === 'binary' && (simplified.operator === '+' || simplified.operator === '-')) {
    const out = b(simplified.operator, integrateRaw(simplified.left, variable, steps), integrateRaw(simplified.right, variable, steps));
    steps.push({ rule: 'integral-linearity', explanation: 'Integrate sums and differences term by term.', beforeAst: node, afterAst: out });
    return out;
  }

  if (simplified.type === 'binary' && simplified.operator === '*') {
    const leftConstant = !containsVariable(simplified.left, variable);
    const rightConstant = !containsVariable(simplified.right, variable);
    if (leftConstant !== rightConstant) {
      const constant = leftConstant ? simplified.left : simplified.right;
      const variablePart = leftConstant ? simplified.right : simplified.left;
      const out = b('*', constant, integrateRaw(variablePart, variable, steps));
      steps.push({ rule: 'constant-multiple-rule', explanation: 'Pull the variable-independent factor outside the integral.', beforeAst: node, afterAst: out });
      return out;
    }
  }

  if (simplified.type === 'binary' && simplified.operator === '/' && same(simplified.left, n(1))) {
    const affine = affineForm(simplified.right, variable);
    if (affine && !isZero(affine.a)) {
      const out = b('*', rationalToAst(div(ONE, affine.a)), call('ln', call('abs', simplified.right)));
      steps.push({ rule: 'logarithmic-antiderivative', explanation: 'Use ∫u′/u dx = ln|u| for a nonconstant affine denominator.', beforeAst: node, afterAst: out });
      return out;
    }
  }

  if (simplified.type === 'binary' && simplified.operator === '^') {
    const exponent = rationalValue(simplified.right);
    const affine = affineForm(simplified.left, variable);
    if (exponent && affine && !isZero(affine.a)) {
      if (exponent.n === -exponent.d) {
        const out = b('*', rationalToAst(div(ONE, affine.a)), call('ln', call('abs', simplified.left)));
        steps.push({ rule: 'affine-log-integral', explanation: 'Integrate an affine reciprocal with the logarithm rule.', beforeAst: node, afterAst: out });
        return out;
      }
      const raised = add(exponent, ONE);
      const coefficient = div(ONE, mul(affine.a, raised));
      const out = b('*', rationalToAst(coefficient), b('^', simplified.left, rationalToAst(raised)));
      steps.push({ rule: 'affine-power-integral', explanation: 'Use substitution for an affine inner function and apply the power rule.', beforeAst: node, afterAst: out });
      return out;
    }
  }

  if (simplified.type === 'call' && simplified.args.length === 1) {
    const inner = simplified.args[0];
    const affine = affineForm(inner, variable);
    if (!affine || isZero(affine.a)) throw new Error(`P5 elementary integration supports ${simplified.name}(ax+b) only when the inner derivative is a nonzero constant.`);
    const invA = rationalToAst(div(ONE, affine.a));
    let primitive: AstNode;
    switch (simplified.name) {
      case 'exp': primitive = call('exp', inner); break;
      case 'sin': primitive = u('-', call('cos', inner)); break;
      case 'cos': primitive = call('sin', inner); break;
      case 'sinh': primitive = call('cosh', inner); break;
      case 'cosh': primitive = call('sinh', inner); break;
      case 'ln': {
        if (!same(inner, s(variable))) throw new Error('P5 currently integrates ln(x) directly; translated/scaled logarithms are deferred.');
        primitive = b('-', b('*', s(variable), call('ln', s(variable))), s(variable));
        break;
      }
      default: throw new Error(`P5 does not yet have a verified elementary antiderivative rule for ${simplified.name}(...).`);
    }
    const out = same(invA, n(1)) ? primitive : b('*', invA, primitive);
    steps.push({ rule: 'elementary-antiderivative', explanation: `Apply the verified antiderivative rule for ${simplified.name}(ax+b).`, beforeAst: node, afterAst: out });
    return out;
  }

  throw new Error('No verified elementary antiderivative is available for this expression in P5. MathLab will not invent a closed form.');
}

export function integrateAst(node: AstNode, variable: string, includeConstant = true): CalculusTransform {
  const steps: CalculusStep[] = [];
  const raw = integrateRaw(node, variable, steps);
  const simplified = simplifyKnownCalls(simplifyAst(raw));
  const ast = includeConstant ? b('+', simplified, s('C')) : simplified;
  if (!same(raw, simplified)) steps.push({ rule: 'simplify-antiderivative', explanation: 'Simplify the antiderivative using exact algebra.', beforeAst: raw, afterAst: simplified });
  const restrictions = domainNotes(node, variable);
  const warnings = [
    ...(includeConstant ? ['C is an arbitrary constant of integration.'] : []),
    ...(restrictions.length ? [`Antiderivative formulas apply on connected intervals of the original real domain: ${restrictions.join(' · ')}.`] : []),
  ];
  return { ast, steps, warnings };
}

export function parsePoint(source: string): AstNode {
  const normalized = source.trim().replace(/^\+?∞$/, 'infinity').replace(/^-∞$/, '-infinity');
  const parsed = parseMath(normalized);
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) throw new Error(parsed.diagnostics[0]?.message ?? `Could not parse “${source}”.`);
  if (parsed.ast.type === 'equation' || parsed.ast.type === 'comparison' || parsed.ast.type === 'definition' || parsed.ast.type === 'system' || parsed.ast.type === 'set' || parsed.ast.type === 'matrix') {
    throw new Error('A calculus point or bound must be a scalar expression.');
  }
  return parsed.ast;
}

export function evaluateAt(node: AstNode, variable: string, point: AstNode): AstNode {
  assertPointDomain(node, variable, point);
  return evaluateAtUnchecked(node, variable, point);
}

function scalarApprox(node: AstNode): number | null {
  const value = rationalValue(simplifyAst(node));
  if (value) return rationalToNumber(value);
  if (node.type === 'symbol' && node.name === 'pi') return Math.PI;
  if (node.type === 'symbol' && node.name === 'e') return Math.E;
  if (node.type === 'unary' && node.operator === '-') {
    const inner = scalarApprox(node.operand);
    return inner === null ? null : -inner;
  }
  if (node.type === 'binary') {
    const left = scalarApprox(node.left); const right = scalarApprox(node.right);
    if (left === null || right === null) return null;
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return right === 0 ? null : left / right;
    if (node.operator === '^') return Number.isFinite(left ** right) ? left ** right : null;
  }
  return null;
}

function assertPointDomain(node: AstNode, variable: string, point: AstNode): void {
  const x = scalarApprox(point);
  if (x === null) return;
  const visit = (current: AstNode) => {
    if (current.type === 'binary') {
      if (current.operator === '/') {
        const denominator = evaluateAtUnchecked(current.right, variable, point);
        const value = scalarApprox(denominator);
        if (value !== null && Math.abs(value) < 1e-12) throw new Error('The requested input is outside the function domain because a denominator is zero.');
      }
      if (current.operator === '^') {
        const exponent = rationalValue(simplifyAst(current.right));
        const baseValue = scalarApprox(evaluateAtUnchecked(current.left, variable, point));
        if (exponent && baseValue !== null) {
          if (exponent.n < 0n && Math.abs(baseValue) < 1e-12) throw new Error('The requested input is outside the function domain because a negative power has zero base.');
          if (exponent.d % 2n === 0n && baseValue < 0) throw new Error('The requested input is outside the real domain because an even-denominator power has negative base.');
        }
      }
      visit(current.left); visit(current.right); return;
    }
    if (current.type === 'unary') { visit(current.operand); return; }
    if (current.type === 'call') {
      const arg = current.args[0];
      if (arg) {
        const argValue = scalarApprox(evaluateAtUnchecked(arg, variable, point));
        if ((current.name === 'ln' || current.name === 'log') && argValue !== null && argValue <= 0) throw new Error('The requested input is outside the real logarithm domain.');
        if (current.name === 'sqrt' && argValue !== null && argValue < 0) throw new Error('The requested input is outside the real square-root domain.');
        if (current.name === 'tan' && argValue !== null && Math.abs(Math.cos(argValue)) < 1e-10) throw new Error('The requested input is a pole of tan(...).');
        if ((current.name === 'asin' || current.name === 'acos') && argValue !== null && (argValue < -1 || argValue > 1)) throw new Error(`The requested input is outside the real ${current.name}(...) domain.`);
      }
      current.args.forEach(visit);
    }
  };
  visit(node);
}

function evaluateAtUnchecked(node: AstNode, variable: string, point: AstNode): AstNode {
  return simplifyKnownCalls(simplifyAst(substituteAst(node, variable, point)));
}

function assertDefiniteDomain(node: AstNode, variable: string, lower: AstNode, upper: AstNode): void {
  const low = scalarApprox(lower); const high = scalarApprox(upper);
  if (low === null || high === null) return;
  const min = Math.min(low, high); const max = Math.max(low, high);
  const inside = (value: number) => value >= min - 1e-12 && value <= max + 1e-12;

  const visit = (current: AstNode) => {
    if (current.type === 'binary') {
      if (current.operator === '/') {
        const denominator = toPolynomial(current.right, variable);
        const roots = denominator ? quadraticRoots(denominator) : null;
        if (roots?.some((root) => inside(root.approx))) {
          throw new Error('The integration interval contains a denominator zero. P5 does not silently evaluate improper or discontinuous definite integrals.');
        }
      }
      if (current.operator === '^') {
        const exponent = rationalValue(simplifyAst(current.right));
        const affine = affineForm(current.left, variable);
        if (exponent && affine && !isZero(affine.a)) {
          const root = -rationalToNumber(affine.c) / rationalToNumber(affine.a);
          if (exponent.n < 0n && inside(root)) throw new Error('The integration interval crosses a zero of a negative-power base, so the integral is improper.');
          if (exponent.d % 2n === 0n) {
            const baseAtLow = rationalToNumber(affine.a) * low + rationalToNumber(affine.c);
            const baseAtHigh = rationalToNumber(affine.a) * high + rationalToNumber(affine.c);
            if (Math.min(baseAtLow, baseAtHigh) < -1e-12) throw new Error('The real-valued integrand leaves its domain on this interval because an even-denominator power receives negative input.');
          }
        }
      }
      visit(current.left); visit(current.right); return;
    }
    if (current.type === 'unary') { visit(current.operand); return; }
    if (current.type === 'call') {
      const arg = current.args[0];
      const affine = arg ? affineForm(arg, variable) : null;
      if (affine) {
        const atLow = rationalToNumber(affine.a) * low + rationalToNumber(affine.c);
        const atHigh = rationalToNumber(affine.a) * high + rationalToNumber(affine.c);
        if ((current.name === 'ln' || current.name === 'log') && Math.min(atLow, atHigh) <= 0) {
          throw new Error('The logarithm is not real and defined throughout the requested integration interval.');
        }
        if (current.name === 'sqrt' && Math.min(atLow, atHigh) < 0) {
          throw new Error('The square root is not real throughout the requested integration interval.');
        }
        if (current.name === 'tan' && !isZero(affine.a)) {
          const aNumber = rationalToNumber(affine.a); const cNumber = rationalToNumber(affine.c);
          const argMin = Math.min(aNumber * low + cNumber, aNumber * high + cNumber);
          const argMax = Math.max(aNumber * low + cNumber, aNumber * high + cNumber);
          const firstPole = Math.ceil((argMin - Math.PI / 2) / Math.PI);
          const pole = Math.PI / 2 + firstPole * Math.PI;
          if (pole <= argMax + 1e-12) throw new Error('tan(...) has a pole inside the integration interval; the integral is improper.');
        }
      }
      current.args.forEach(visit);
    }
  };
  visit(node);
}

export function definiteIntegralAst(node: AstNode, variable: string, lower: AstNode, upper: AstNode): CalculusTransform {
  if (isInfinity(lower) || isInfinity(upper)) throw new Error('Improper definite integrals are deferred; use P5 limits explicitly at the boundary.');
  assertDefiniteDomain(node, variable, lower, upper);
  const primitive = integrateAst(node, variable, false);
  const upperValue = evaluateAt(primitive.ast, variable, upper);
  const lowerValue = evaluateAt(primitive.ast, variable, lower);
  const difference = simplifyKnownCalls(simplifyAst(b('-', upperValue, lowerValue)));
  const step: CalculusStep = {
    rule: 'fundamental-theorem-of-calculus',
    explanation: 'Evaluate an antiderivative at the upper and lower bounds and subtract.',
    beforeAst: primitive.ast,
    afterAst: difference,
  };
  return { ast: difference, steps: [...primitive.steps, step], warnings: primitive.warnings.filter((warning) => !warning.startsWith('C ')) };
}

function isInfinity(node: AstNode): boolean {
  return (node.type === 'symbol' && node.name === 'infinity') || (node.type === 'unary' && node.operator === '-' && node.operand.type === 'symbol' && node.operand.name === 'infinity');
}

function infinitySign(node: AstNode): 1 | -1 | 0 {
  if (node.type === 'symbol' && node.name === 'infinity') return 1;
  if (node.type === 'unary' && node.operator === '-' && node.operand.type === 'symbol' && node.operand.name === 'infinity') return -1;
  return 0;
}

function infinityAst(signValue: number): AstNode {
  const inf = s('infinity');
  return signValue < 0 ? u('-', inf) : inf;
}

function polynomialLimitAtInfinity(poly: Polynomial, direction: 1 | -1): AstNode {
  const degree = polynomialDegree(poly);
  const lead = polynomialCoefficient(poly, degree);
  if (degree === 0) return rationalToAst(lead);
  const signAtInfinity = sign(lead) * (direction < 0 && degree % 2 === 1 ? -1 : 1);
  return infinityAst(signAtInfinity);
}

function standardZeroLimit(node: AstNode, variable: string, target: Rational): AstNode | null {
  if (!isZero(target)) return null;
  if (node.type !== 'binary' || node.operator !== '/') return null;
  const denominatorIsX = same(simplifyAst(node.right), s(variable));
  if (!denominatorIsX) return null;
  if (node.left.type === 'call' && node.left.name === 'sin' && node.left.args[0] && same(node.left.args[0], s(variable))) return n(1);
  if (node.left.type === 'binary' && node.left.operator === '-' && node.left.left.type === 'call' && node.left.left.name === 'exp' && node.left.left.args[0] && same(node.left.left.args[0], s(variable)) && same(simplifyAst(node.left.right), n(1))) return n(1);
  if (node.left.type === 'call' && node.left.name === 'ln' && node.left.args[0]?.type === 'binary' && node.left.args[0].operator === '+' && same(simplifyAst(node.left.args[0].left), n(1)) && same(node.left.args[0].right, s(variable))) return n(1);
  return null;
}

export function limitAst(node: AstNode, variable: string, target: AstNode, direction: 'both' | 'left' | 'right' = 'both'): LimitResult {
  const targetInfinity = infinitySign(target);
  if (targetInfinity) {
    const polynomial = toPolynomial(node, variable);
    if (polynomial) {
      const ast = polynomialLimitAtInfinity(polynomial, targetInfinity);
      return { ast, steps: [{ rule: 'polynomial-leading-term-limit', explanation: 'At infinity, a polynomial is governed by its leading term.', beforeAst: node, afterAst: ast }], warnings: [] };
    }
    if (node.type === 'binary' && node.operator === '/') {
      const numerator = toPolynomial(node.left, variable);
      const denominator = toPolynomial(node.right, variable);
      if (numerator && denominator) {
        const nd = polynomialDegree(numerator); const dd = polynomialDegree(denominator);
        let ast: AstNode;
        if (nd < dd) ast = n(0);
        else if (nd === dd) ast = rationalToAst(div(polynomialCoefficient(numerator, nd), polynomialCoefficient(denominator, dd)));
        else {
          const exponent = nd - dd;
          const lead = div(polynomialCoefficient(numerator, nd), polynomialCoefficient(denominator, dd));
          const signed = sign(lead) * (targetInfinity < 0 && exponent % 2 === 1 ? -1 : 1);
          ast = infinityAst(signed);
        }
        return { ast, steps: [{ rule: 'rational-degree-limit', explanation: 'Compare numerator and denominator degrees and leading coefficients.', beforeAst: node, afterAst: ast }], warnings: [] };
      }
    }
    if (node.type === 'call' && node.args[0] && same(node.args[0], s(variable))) {
      if (node.name === 'exp') {
        const ast = targetInfinity > 0 ? s('infinity') : n(0);
        return { ast, steps: [{ rule: 'exponential-infinity-limit', explanation: 'Use the standard exponential limit at ±∞.', beforeAst: node, afterAst: ast }], warnings: [] };
      }
      if (node.name === 'ln' && targetInfinity > 0) {
        const ast = s('infinity');
        return { ast, steps: [{ rule: 'log-infinity-limit', explanation: 'ln(x) grows without bound as x → +∞.', beforeAst: node, afterAst: ast }], warnings: [] };
      }
    }
    throw new Error('P5 infinity limits currently cover polynomials, rational functions, exp(x), and ln(x) at +∞.');
  }

  const targetValue = rationalValue(simplifyAst(target));
  if (!targetValue) throw new Error('P5 finite limits currently require an exact rational target or ±∞.');
  const standard = standardZeroLimit(node, variable, targetValue);
  if (standard) return { ast: standard, steps: [{ rule: 'standard-fundamental-limit', explanation: 'Apply a verified standard limit at zero.', beforeAst: node, afterAst: standard }], warnings: [] };

  try {
    const direct = evaluateAt(node, variable, target);
    const directValue = rationalValue(direct);
    if (directValue || direct.type === 'call' || (direct.type === 'symbol' && direct.name !== variable)) {
      return { ast: direct, steps: [{ rule: 'continuity-substitution', explanation: 'The expression is continuous and defined at the target, so substitute directly.', beforeAst: node, afterAst: direct }], warnings: [] };
    }
  } catch {
    // A zero denominator can still be removable; continue to polynomial cancellation below.
  }

  if (node.type === 'binary' && node.operator === '/') {
    let numerator = toPolynomial(node.left, variable);
    let denominator = toPolynomial(node.right, variable);
    if (numerator && denominator) {
      const factor: Polynomial = new Map([[1, ONE], [0, neg(targetValue)]]);
      let cancelled = 0;
      while (isZero(evaluatePolynomial(numerator, targetValue)) && isZero(evaluatePolynomial(denominator, targetValue))) {
        const divideNumerator = divideByLinearFactor(numerator, factor);
        const divideDenominator = divideByLinearFactor(denominator, factor);
        if (!divideNumerator || !divideDenominator) break;
        numerator = divideNumerator; denominator = divideDenominator; cancelled += 1;
      }
      const denominatorAt = evaluatePolynomial(denominator, targetValue);
      if (!isZero(denominatorAt)) {
        const value = div(evaluatePolynomial(numerator, targetValue), denominatorAt);
        const ast = rationalToAst(value);
        const reduced = b('/', polynomialToAst(numerator, variable), polynomialToAst(denominator, variable));
        return {
          ast,
          steps: [
            { rule: 'limit-factor-cancellation', explanation: `Cancel ${cancelled} common vanishing factor${cancelled === 1 ? '' : 's'} only inside the limit computation.`, beforeAst: node, afterAst: reduced },
            { rule: 'continuity-substitution', explanation: 'Substitute into the reduced expression, which is defined at the target.', beforeAst: reduced, afterAst: ast },
          ],
          warnings: cancelled ? ['Factor cancellation is used only for the limit; MathLab does not claim the original function is defined at the removed point.'] : [],
        };
      }
    }
  }

  if (direction !== 'both') throw new Error(`P5 one-sided ${direction} limits are only emitted when the current symbolic rules can prove them. This input is outside that verified set.`);
  throw new Error('P5 could not prove this limit with direct continuity, rational-factor cancellation, or its verified standard-limit rules.');
}

function divideByLinearFactor(poly: Polynomial, factor: Polynomial): Polynomial | null {
  const degree = polynomialDegree(poly);
  if (degree < 1) return null;
  const divisorRoot = neg(polynomialCoefficient(factor, 0));
  if (!isZero(evaluatePolynomial(poly, divisorRoot))) return null;
  const coefficients = Array.from({ length: degree + 1 }, (_, index) => polynomialCoefficient(poly, degree - index));
  const out: Rational[] = [coefficients[0]];
  for (let i = 1; i < coefficients.length - 1; i += 1) out.push(add(coefficients[i], mul(out[i - 1], divisorRoot)));
  const remainder = add(coefficients[coefficients.length - 1], mul(out[out.length - 1], divisorRoot));
  if (!isZero(remainder)) return null;
  const result: Polynomial = new Map();
  out.forEach((coefficient, index) => result.set(degree - 1 - index, coefficient));
  return result;
}

function quadraticRoots(poly: Polynomial): Array<{ ast: AstNode; approx: number }> | null {
  const degree = polynomialDegree(poly);
  if (degree === 0) return [];
  if (degree === 1) {
    const root = div(neg(polynomialCoefficient(poly, 0)), polynomialCoefficient(poly, 1));
    return [{ ast: rationalToAst(root), approx: rationalToNumber(root) }];
  }
  if (degree !== 2) return null;
  const a = polynomialCoefficient(poly, 2); const bb = polynomialCoefficient(poly, 1); const c = polynomialCoefficient(poly, 0);
  const discriminant = sub(mul(bb, bb), mul(rat(4), mul(a, c)));
  if (sign(discriminant) < 0) return [];
  const twoA = mul(rat(2), a);
  const exactSqrt = sqrtRational(discriminant);
  if (exactSqrt) {
    const first = div(sub(neg(bb), exactSqrt), twoA);
    const second = div(add(neg(bb), exactSqrt), twoA);
    if (first.n === second.n && first.d === second.d) return [{ ast: rationalToAst(first), approx: rationalToNumber(first) }];
    const roots = [
      { ast: rationalToAst(first), approx: rationalToNumber(first) },
      { ast: rationalToAst(second), approx: rationalToNumber(second) },
    ];
    return roots.sort((left, right) => left.approx - right.approx);
  }
  const decomposition = sqrtDecomposition(discriminant);
  if (!decomposition) return [];
  const center = div(neg(bb), twoA);
  const radicalCoefficient = div(decomposition.coefficient, twoA);
  const radical = sqrtRationalAst(decomposition.radicand);
  const radicalTerm = radicalCoefficient.n === radicalCoefficient.d
    ? radical
    : b('*', rationalToAst(radicalCoefficient), radical, true);
  const centerAst = rationalToAst(center);
  const firstAst = isZero(center) ? u('-', radicalTerm) : b('-', centerAst, radicalTerm);
  const secondAst = isZero(center) ? radicalTerm : b('+', centerAst, radicalTerm);
  const discNumber = rationalToNumber(discriminant);
  const sqrtNumber = Math.sqrt(discNumber);
  const centerNumber = rationalToNumber(center);
  const spread = sqrtNumber / (2 * Math.abs(rationalToNumber(a)));
  const root1 = centerNumber - spread; const root2 = centerNumber + spread;
  return [{ ast: firstAst, approx: Math.min(root1, root2) }, { ast: secondAst, approx: Math.max(root1, root2) }];
}

function sampleForInterval(left: number, right: number): number {
  if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
  if (!Number.isFinite(left)) return right - Math.max(1, Math.abs(right) * 0.5 + 1);
  if (!Number.isFinite(right)) return left + Math.max(1, Math.abs(left) * 0.5 + 1);
  return (left + right) / 2;
}

function rationalApprox(value: number): Rational {
  if (Number.isInteger(value)) return rat(value);
  const scale = 1_000_000;
  return rat(Math.round(value * scale), scale);
}

function intervalLabel(left: number, right: number, roots: Array<{ ast: AstNode; approx: number }>): string {
  const label = (value: number): string => {
    if (value === Number.NEGATIVE_INFINITY) return '−∞';
    if (value === Number.POSITIVE_INFINITY) return '∞';
    const root = roots.find((item) => Math.abs(item.approx - value) < 1e-10);
    return root ? astToPlainText(root.ast) : String(value);
  };
  return `(${label(left)}, ${label(right)})`;
}

export function polynomialBehavior(node: AstNode, variable: string, mode: 'monotonicity' | 'concavity'): IntervalFact[] {
  const derivative = differentiateAst(node, variable);
  const target = mode === 'monotonicity' ? derivative.ast : differentiateAst(derivative.ast, variable).ast;
  const poly = toPolynomial(target, variable);
  if (!poly) throw new Error(`P5 ${mode} analysis currently requires the relevant derivative to be a polynomial.`);
  const roots = quadraticRoots(poly);
  if (roots === null) throw new Error(`P5 ${mode} analysis currently supports relevant derivative degree 2 or lower, which covers polynomial functions through cubic order for monotonicity and quartic order for concavity.`);
  const ordered = [...roots].sort((a, c) => a.approx - c.approx);
  const boundaries = [Number.NEGATIVE_INFINITY, ...ordered.map((item) => item.approx), Number.POSITIVE_INFINITY];
  const facts: IntervalFact[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const left = boundaries[index]; const right = boundaries[index + 1];
    const sample = rationalApprox(sampleForInterval(left, right));
    const value = evaluatePolynomial(poly, sample);
    const valueSign = sign(value);
    let behavior: IntervalFact['behavior'];
    if (mode === 'monotonicity') behavior = valueSign > 0 ? 'increasing' : valueSign < 0 ? 'decreasing' : 'constant';
    else behavior = valueSign > 0 ? 'concave-up' : valueSign < 0 ? 'concave-down' : 'linear';
    facts.push({ interval: intervalLabel(left, right, ordered), behavior });
  }
  return facts;
}

export function stationaryPoints(node: AstNode, variable: string): StationaryPoint[] {
  const first = differentiateAst(node, variable).ast;
  const derivativePoly = toPolynomial(first, variable);
  if (!derivativePoly) throw new Error('P5 stationary-point analysis currently requires a polynomial derivative.');
  const roots = quadraticRoots(derivativePoly);
  if (roots === null) throw new Error('P5 stationary-point classification currently supports derivative degree 2 or lower.');
  const second = differentiateAst(first, variable).ast;
  return roots.map((root) => {
    const y = evaluateAt(node, variable, root.ast);
    const secondAt = rationalValue(evaluateAt(second, variable, root.ast));
    const classification: StationaryPoint['classification'] = secondAt && sign(secondAt) > 0
      ? 'local minimum'
      : secondAt && sign(secondAt) < 0
        ? 'local maximum'
        : 'stationary / inconclusive';
    return { x: root.ast, y, classification };
  });
}

export function zerosAst(node: AstNode, variable: string): AstNode {
  const poly = toPolynomial(node, variable);
  if (!poly) throw new Error('P5 zero finding currently delegates to the exact polynomial solver and therefore requires a polynomial function of degree 2 or lower.');
  const roots = quadraticRoots(poly);
  if (roots === null) throw new Error('P5 zero finding currently supports polynomial degree 2 or lower.');
  return set(roots.map((root) => root.ast));
}

export function domainNotes(node: AstNode, variable: string): string[] {
  const notes: string[] = [];
  const visit = (current: AstNode) => {
    if (current.type === 'binary') {
      if (current.operator === '/') {
        const denominator = toPolynomial(current.right, variable);
        const roots = denominator ? quadraticRoots(denominator) : null;
        if (roots && roots.length) notes.push(`${variable} ≠ ${roots.map((root) => astToPlainText(root.ast)).join(', ')}`);
        else if (containsVariable(current.right, variable)) notes.push(`denominator ${astToPlainText(current.right)} ≠ 0`);
      }
      visit(current.left); visit(current.right); return;
    }
    if (current.type === 'unary') { visit(current.operand); return; }
    if (current.type === 'call') {
      const arg = current.args[0];
      if (arg && (current.name === 'ln' || current.name === 'log')) notes.push(`${astToPlainText(arg)} > 0`);
      if (arg && current.name === 'sqrt') notes.push(`${astToPlainText(arg)} ≥ 0`);
      if (arg && current.name === 'tan') notes.push(`cos(${astToPlainText(arg)}) ≠ 0`);
      current.args.forEach(visit);
    }
  };
  visit(node);
  return [...new Set(notes)];
}

export function pointEquations(points: StationaryPoint[], variable: string): AstNode {
  return { type: 'system', items: points.flatMap((point, index) => [
    equation(s(`${variable}_${index + 1}`), point.x),
    equation(s(`f_${index + 1}`), point.y),
  ]) };
}
