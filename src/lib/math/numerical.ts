import type { AstNode } from './ast';
import { expandAst, rationalToAst, rationalValue, simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { abs as absRational, div, eq, rat, rationalToNumber, rationalToString, sub, type Rational, ZERO } from './rational';
import type { MathResultFact, MathResultSection } from './types';

export interface NumericalTransform {
  ast?: AstNode;
  display?: string;
  exactness: 'exact' | 'approximate' | 'heuristic';
  warnings: string[];
  sections: MathResultSection[];
}

export type RootMethod = 'bisection' | 'newton' | 'secant';
export type QuadratureMethod = 'adaptive-simpson' | 'simpson' | 'trapezoid';
export type OdeMethod = 'euler' | 'heun' | 'rk4';

function n(value: number | string): AstNode { return { type: 'number', value: String(value) }; }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode { return { type: 'binary', operator, left, right }; }
function section(id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection { return { id, title, facts, description }; }
function fixed(value: number, digits = 10): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  if (magnitude < 1e-7 || magnitude >= 1e9) return value.toExponential(7);
  return Number(value.toFixed(digits)).toString();
}
function finite(value: number, label = 'Numerical evaluation'): number {
  if (!Number.isFinite(value) || Math.abs(value) > 1e300) throw new Error(`${label} produced a non-finite value.`);
  return value;
}

function binary64AsRational(value: number): Rational {
  if (!Number.isFinite(value)) throw new Error('Binary64 profile requires a finite number.');
  if (Object.is(value, 0) || Object.is(value, -0)) return ZERO;
  const buffer = new ArrayBuffer(8); const view = new DataView(buffer); view.setFloat64(0, value, false);
  const high = view.getUint32(0, false); const low = view.getUint32(4, false); const negative = (high >>> 31) === 1; const exponentBits = (high >>> 20) & 0x7ff;
  const fraction = (BigInt(high & 0xfffff) << 32n) | BigInt(low);
  let mantissa: bigint; let exponent: number;
  if (exponentBits === 0) { mantissa = fraction; exponent = -1074; }
  else { mantissa = (1n << 52n) | fraction; exponent = exponentBits - 1023 - 52; }
  if (negative) mantissa = -mantissa;
  return exponent >= 0 ? rat(mantissa * (1n << BigInt(exponent))) : rat(mantissa, 1n << BigInt(-exponent));
}

export function floatingPointProfile(node: AstNode): NumericalTransform {
  const exact = rationalValue(simplifyAst(node)); if (!exact) throw new Error('Binary64 profiling currently requires an exact rational scalar.');
  const rounded = rationalToNumber(exact); if (!Number.isFinite(rounded)) throw new Error('The exact value overflows IEEE-754 binary64.');
  const represented = binary64AsRational(rounded); const error = absRational(sub(represented, exact)); const relative = exact.n === 0n ? ZERO : div(error, absRational(exact)); const exactRepresentation = eq(exact, represented);
  return {
    ast: n(rounded.toPrecision(17)), display: exactRepresentation ? `${rationalToString(exact)} is exactly representable in binary64` : `${rationalToString(exact)} → ${rounded.toPrecision(17)}`, exactness: 'approximate',
    warnings: exactRepresentation ? [] : ['The displayed decimal is the nearest IEEE-754 binary64 value. Subsequent floating-point operations can accumulate additional rounding error.'],
    sections: [section('binary64', 'IEEE-754 binary64 profile', [
      { label: 'Exact input', display: rationalToString(exact), ast: rationalToAst(exact) }, { label: 'Stored binary64 value', display: rounded.toPrecision(17) },
      { label: 'Stored value as exact rational', display: rationalToString(represented) }, { label: 'Exactly representable?', display: exactRepresentation ? 'Yes' : 'No', tone: exactRepresentation ? 'positive' : 'warning' },
      { label: 'Absolute representation error', display: rationalToString(error) }, { label: 'Relative representation error', display: rationalToString(relative) }, { label: 'Machine epsilon ε', display: String(Number.EPSILON) },
    ], 'The representation error is computed exactly by decoding the binary64 bit pattern back to a rational number.')],
  };
}

function numeric(node: AstNode, variables: Record<string, number>): number {
  switch (node.type) {
    case 'number': return finite(Number(node.value));
    case 'symbol': {
      if (Object.prototype.hasOwnProperty.call(variables, node.name)) return variables[node.name];
      if (node.name === 'pi') return Math.PI;
      if (node.name === 'e') return Math.E;
      throw new Error(`Unresolved symbol “${node.name}” in numerical evaluation.`);
    }
    case 'unary': return finite(node.operator === '-' ? -numeric(node.operand, variables) : numeric(node.operand, variables));
    case 'binary': {
      const left = numeric(node.left, variables); const right = numeric(node.right, variables);
      if (node.operator === '+') return finite(left + right);
      if (node.operator === '-') return finite(left - right);
      if (node.operator === '*') return finite(left * right);
      if (node.operator === '/') {
        if (right === 0) throw new Error('Division by zero during numerical evaluation.');
        return finite(left / right);
      }
      return finite(Math.pow(left, right));
    }
    case 'call': {
      if (node.args.length !== 1) throw new Error(`Numerical evaluation does not support the call ${node.name}(…) in this workflow.`);
      const x = numeric(node.args[0], variables);
      let out: number;
      switch (node.name) {
        case 'sin': out = Math.sin(x); break;
        case 'cos': out = Math.cos(x); break;
        case 'tan': out = Math.tan(x); break;
        case 'asin': out = Math.asin(x); break;
        case 'acos': out = Math.acos(x); break;
        case 'atan': out = Math.atan(x); break;
        case 'sinh': out = Math.sinh(x); break;
        case 'cosh': out = Math.cosh(x); break;
        case 'tanh': out = Math.tanh(x); break;
        case 'exp': out = Math.exp(x); break;
        case 'ln': out = Math.log(x); break;
        case 'log': out = Math.log10(x); break;
        case 'sqrt': out = Math.sqrt(x); break;
        case 'abs': out = Math.abs(x); break;
        case 'floor': out = Math.floor(x); break;
        case 'ceil': out = Math.ceil(x); break;
        default: throw new Error(`Numerical evaluation does not support ${node.name}(…).`);
      }
      return finite(out);
    }
    case 'definition': return numeric(node.right, variables);
    default: throw new Error('This object is not a scalar numerical expression.');
  }
}

function boundedTolerance(value: number | undefined): number {
  const tolerance = value ?? 1e-10;
  if (!Number.isFinite(tolerance) || tolerance < 1e-14 || tolerance > 1e-2) throw new Error('Tolerance must lie between 1e-14 and 1e-2.');
  return tolerance;
}
function boundedIterations(value: number | undefined): number {
  const count = value ?? 60;
  if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error('Maximum iterations must be an integer from 1 through 200.');
  return count;
}

export function numericalRoot(node: AstNode, variable: string, method: RootMethod, options: { a?: number; b?: number; x0?: number; x1?: number; tolerance?: number; maxIterations?: number }): NumericalTransform {
  const tolerance = boundedTolerance(options.tolerance); const maxIterations = boundedIterations(options.maxIterations);
  const f = (x: number) => numeric(node, { [variable]: x });
  let root = Number.NaN; let iterations = 0; let error = Number.POSITIVE_INFINITY; const trace: string[] = [];
  if (method === 'bisection') {
    let left = finite(options.a ?? Number.NaN, 'Left bracket'); let right = finite(options.b ?? Number.NaN, 'Right bracket');
    if (!(left < right)) throw new Error('Bisection requires finite bounds a < b.');
    let fl = f(left); let fr = f(right);
    if (fl === 0) { root = left; error = 0; }
    else if (fr === 0) { root = right; error = 0; }
    else {
      if (Math.sign(fl) === Math.sign(fr)) throw new Error('Bisection requires a sign change across [a,b].');
      for (iterations = 1; iterations <= maxIterations; iterations += 1) {
        const mid = (left + right) / 2; const fm = f(mid); root = mid; error = (right - left) / 2;
        if (trace.length < 12) trace.push(`k=${iterations}: x=${fixed(mid)}, f(x)=${fixed(fm)}, bound≤${fixed(error)}`);
        if (fm === 0 || error <= tolerance) break;
        if (Math.sign(fl) === Math.sign(fm)) { left = mid; fl = fm; } else { right = mid; fr = fm; }
      }
    }
  } else if (method === 'secant') {
    let x0 = finite(options.x0 ?? Number.NaN, 'First secant point'); let x1 = finite(options.x1 ?? Number.NaN, 'Second secant point');
    let f0 = f(x0); let f1 = f(x1);
    for (iterations = 1; iterations <= maxIterations; iterations += 1) {
      const denom = f1 - f0; if (Math.abs(denom) < 1e-16) throw new Error('Secant method stalled because consecutive function values are indistinguishable.');
      const x2 = x1 - f1 * (x1 - x0) / denom; error = Math.abs(x2 - x1); root = finite(x2, 'Secant iterate');
      const f2 = f(root); if (trace.length < 12) trace.push(`k=${iterations}: x=${fixed(root)}, f(x)=${fixed(f2)}, Δ=${fixed(error)}`);
      if (Math.abs(f2) <= tolerance || error <= tolerance) break;
      x0 = x1; f0 = f1; x1 = root; f1 = f2;
    }
  } else {
    let x = finite(options.x0 ?? Number.NaN, 'Newton initial value');
    for (iterations = 1; iterations <= maxIterations; iterations += 1) {
      const fx = f(x); const h = Math.max(1e-7, Math.sqrt(Number.EPSILON) * Math.max(1, Math.abs(x)));
      const derivative = (f(x + h) - f(x - h)) / (2 * h);
      if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-14) throw new Error('Newton method encountered a zero or unstable numerical derivative.');
      const next = x - fx / derivative; error = Math.abs(next - x); root = finite(next, 'Newton iterate');
      const residual = f(root); if (trace.length < 12) trace.push(`k=${iterations}: x=${fixed(root)}, f(x)=${fixed(residual)}, Δ=${fixed(error)}`);
      x = root; if (Math.abs(residual) <= tolerance || error <= tolerance) break;
    }
  }
  if (!Number.isFinite(root)) throw new Error('The numerical root method did not produce a finite root.');
  const residual = Math.abs(f(root));
  const converged = residual <= Math.max(tolerance * 10, 1e-12) || error <= tolerance;
  const warnings = [
    'Numerical root finding establishes an approximation, not an exact symbolic root.',
    ...(method === 'newton' ? ['Newton uses a centered numerical derivative in P12 and can converge to a different root when the starting value changes.'] : []),
    ...(!converged ? ['The requested stopping criterion was not reached before the iteration limit; treat this result as unconverged.'] : []),
  ];
  return {
    ast: n(fixed(root, 15)), display: `${variable} ≈ ${fixed(root, 12)}`, exactness: 'approximate', warnings,
    sections: [
      section('root-result', 'Numerical root', [
        { label: 'Method', display: method }, { label: 'Approximate root', display: fixed(root, 14), tone: converged ? 'positive' : 'warning' },
        { label: '|f(x)|', display: fixed(residual, 6) }, { label: 'Iterations', display: String(Math.min(iterations, maxIterations)) },
        { label: method === 'bisection' ? 'Final bracket error bound' : 'Final iterate change', display: fixed(error, 6) }, { label: 'Tolerance', display: String(tolerance) },
      ]),
      section('root-trace', 'Iteration trace', trace.map((value, index) => ({ label: `Step ${index + 1}`, display: value })), 'Trace output is capped; computation may use more iterations.'),
    ],
  };
}

export function numericalDerivative(node: AstNode, variable: string, point: number, step?: number): NumericalTransform {
  finite(point, 'Evaluation point');
  const h = step ?? Math.max(1e-4, Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(point)));
  if (!Number.isFinite(h) || h <= 0 || h > 1) throw new Error('Difference step h must satisfy 0 < h ≤ 1.');
  const f = (x: number) => numeric(node, { [variable]: x });
  const d1 = (f(point + h) - f(point - h)) / (2 * h);
  const h2 = h / 2; const d2 = (f(point + h2) - f(point - h2)) / (2 * h2);
  const richardson = d2 + (d2 - d1) / 3; const estimatedError = Math.abs(richardson - d2);
  return {
    ast: n(fixed(richardson, 15)), display: `f'(${fixed(point)}) ≈ ${fixed(richardson, 12)}`, exactness: 'approximate',
    warnings: ['The reported error is a Richardson truncation estimate; floating-point roundoff and nonsmoothness can make the true error larger.'],
    sections: [section('numeric-derivative', 'Numerical derivative', [
      { label: 'Point', display: fixed(point) }, { label: 'Base step h', display: fixed(h) },
      { label: 'Centered difference D(h)', display: fixed(d1, 14) }, { label: 'Centered difference D(h/2)', display: fixed(d2, 14) },
      { label: 'Richardson estimate', display: fixed(richardson, 14), tone: 'positive' }, { label: 'Estimated truncation error', display: fixed(estimatedError, 6) },
    ])],
  };
}

function trapezoid(f: (x: number) => number, a: number, c: number, panels: number): { value: number; evaluations: number } {
  const h = (c - a) / panels; let sum = 0.5 * (f(a) + f(c)); for (let i = 1; i < panels; i += 1) sum += f(a + i * h); return { value: h * sum, evaluations: panels + 1 };
}
function simpson(f: (x: number) => number, a: number, c: number, panels: number): { value: number; evaluations: number } {
  if (panels % 2 !== 0) throw new Error('Composite Simpson requires an even number of panels.');
  const h = (c - a) / panels; let sum = f(a) + f(c); for (let i = 1; i < panels; i += 1) sum += (i % 2 ? 4 : 2) * f(a + i * h); return { value: h * sum / 3, evaluations: panels + 1 };
}
function adaptiveSimpson(f: (x: number) => number, a: number, c: number, tolerance: number): { value: number; error: number; evaluations: number; depth: number } {
  let evaluations = 0; let maxDepthUsed = 0;
  const fe = (x: number) => { evaluations += 1; if (evaluations > 100000) throw new Error('Adaptive Simpson exceeded the P12 evaluation budget (100,000).'); return f(x); };
  const whole = (left: number, right: number, fl: number, fm: number, fr: number) => (right - left) * (fl + 4 * fm + fr) / 6;
  const fl = fe(a); const fr = fe(c); const m = (a + c) / 2; const fm = fe(m); const initial = whole(a, c, fl, fm, fr);
  function recurse(left: number, right: number, fLeft: number, fMid: number, fRight: number, estimate: number, tol: number, depth: number): { value: number; error: number } {
    maxDepthUsed = Math.max(maxDepthUsed, depth); if (depth > 24) throw new Error('Adaptive Simpson reached its subdivision-depth safety limit.');
    const mid = (left + right) / 2; const lm = (left + mid) / 2; const rm = (mid + right) / 2; const fLm = fe(lm); const fRm = fe(rm);
    const leftEst = whole(left, mid, fLeft, fLm, fMid); const rightEst = whole(mid, right, fMid, fRm, fRight); const delta = leftEst + rightEst - estimate;
    if (Math.abs(delta) <= 15 * tol) return { value: leftEst + rightEst + delta / 15, error: Math.abs(delta) / 15 };
    const L = recurse(left, mid, fLeft, fLm, fMid, leftEst, tol / 2, depth + 1); const R = recurse(mid, right, fMid, fRm, fRight, rightEst, tol / 2, depth + 1);
    return { value: L.value + R.value, error: L.error + R.error };
  }
  const out = recurse(a, c, fl, fm, fr, initial, tolerance, 0); return { ...out, evaluations, depth: maxDepthUsed };
}

export function numericalIntegral(node: AstNode, variable: string, method: QuadratureMethod, a: number, c: number, options: { tolerance?: number; panels?: number }): NumericalTransform {
  finite(a, 'Lower bound'); finite(c, 'Upper bound'); if (a === c) return { ast: n(0), display: '0', exactness: 'approximate', warnings: [], sections: [section('quadrature', 'Numerical integral', [{ label: 'Integral', display: '0' }])] };
  const f = (x: number) => numeric(node, { [variable]: x });
  let value: number; let error: number; let evaluations: number; let detail: string;
  if (method === 'adaptive-simpson') {
    const tol = boundedTolerance(options.tolerance ?? 1e-9); const out = adaptiveSimpson(f, a, c, tol); value = out.value; error = out.error; evaluations = out.evaluations; detail = `Adaptive Simpson · max depth ${out.depth} · requested tolerance ${tol}`;
  } else {
    let panels = options.panels ?? 100; if (!Number.isInteger(panels) || panels < 2 || panels > 100000) throw new Error('Composite quadrature panels must be an integer from 2 through 100,000.');
    if (method === 'simpson' && panels % 2 !== 0) panels += 1;
    const coarse = method === 'simpson' ? simpson(f, a, c, panels) : trapezoid(f, a, c, panels);
    const fine = method === 'simpson' ? simpson(f, a, c, panels * 2) : trapezoid(f, a, c, panels * 2);
    value = fine.value; evaluations = coarse.evaluations + fine.evaluations; error = Math.abs(fine.value - coarse.value) / (method === 'simpson' ? 15 : 3); detail = `${method === 'simpson' ? 'Composite Simpson' : 'Composite trapezoid'} · ${panels * 2} final panels`;
  }
  return {
    ast: n(fixed(value, 15)), display: `∫ ≈ ${fixed(value, 12)}`, exactness: 'approximate',
    warnings: ['Numerical quadrature can fail across discontinuities or severe singularities. The error estimate assumes the integrand is sufficiently regular on the interval.'],
    sections: [section('quadrature', 'Numerical integration', [
      { label: 'Method', display: detail }, { label: 'Interval', display: `[${fixed(a)}, ${fixed(c)}]` },
      { label: 'Approximation', display: fixed(value, 14), tone: 'positive' }, { label: 'Estimated absolute error', display: fixed(error, 6) }, { label: 'Function evaluations', display: String(evaluations) },
    ])],
  };
}

function rationalPairs(node: AstNode): Array<[Rational, Rational]> {
  const s = simplifyAst(node); if (s.type !== 'matrix' || s.rows.length < 2 || s.rows.some((row) => row.length !== 2)) throw new Error('Interpolation requires an n×2 matrix of points [[x1,y1],…] with n≥2.');
  if (s.rows.length > 12) throw new Error('P12 exact interpolation is limited to 12 points to control symbolic polynomial growth.');
  const points = s.rows.map((row, index): [Rational, Rational] => {
    const x = rationalValue(row[0]); const y = rationalValue(row[1]); if (!x || !y) throw new Error(`Interpolation point ${index + 1} must contain exact rational coordinates.`); return [x, y];
  });
  const keys = points.map(([x]) => rationalToString(x)); if (new Set(keys).size !== keys.length) throw new Error('Interpolation x-values must be distinct.'); return points;
}
function newtonCoefficients(points: Array<[Rational,Rational]>): Rational[] {
  const coefficients = points.map(([, y]) => y);
  for (let order = 1; order < points.length; order += 1) for (let i = points.length - 1; i >= order; i -= 1) coefficients[i] = div(sub(coefficients[i], coefficients[i - 1]), sub(points[i][0], points[i - order][0]));
  return coefficients;
}
export function interpolationPolynomial(node: AstNode): NumericalTransform {
  const points = rationalPairs(node); const coefficients = newtonCoefficients(points); const x: AstNode = { type: 'symbol', name: 'x' };
  let polynomial: AstNode = rationalToAst(coefficients[0]); let product: AstNode = n(1);
  for (let k = 1; k < coefficients.length; k += 1) {
    product = b('*', product, b('-', x, rationalToAst(points[k - 1][0]))); polynomial = b('+', polynomial, b('*', rationalToAst(coefficients[k]), product));
  }
  polynomial = expandAst(simplifyAst(polynomial), 'x');
  return {
    ast: polynomial, display: `p(x) = ${astToPlainText(polynomial)}`, exactness: 'exact', warnings: ['A high-degree interpolating polynomial can oscillate strongly between points (Runge phenomenon); exact interpolation does not imply a good predictive model.'],
    sections: [
      section('interpolation-polynomial', 'Polynomial interpolation', [{ label: 'Degree', display: `≤ ${points.length - 1}` }, { label: 'Exact polynomial', display: astToPlainText(polynomial), ast: polynomial, tone: 'positive' }]),
      section('divided-differences', 'Newton divided differences', coefficients.map((value, index) => ({ label: `c${index}`, display: rationalToString(value), ast: rationalToAst(value) }))),
    ],
  };
}

function numericMatrix(node: AstNode): number[][] {
  const s = simplifyAst(node); if (s.type !== 'matrix' || !s.rows.length || !s.rows[0]?.length) throw new Error('Numerical linear algebra requires a nonempty numeric matrix.');
  const width = s.rows[0].length; if (s.rows.some((row) => row.length !== width)) throw new Error('Matrix rows must have equal length.');
  return s.rows.map((row, i) => row.map((cell, j) => { const r = rationalValue(simplifyAst(cell)); if (!r) throw new Error(`Matrix entry (${i + 1},${j + 1}) must resolve to a real rational number.`); return rationalToNumber(r); }));
}
function normInfMatrix(A: number[][]): number { return Math.max(...A.map((row) => row.reduce((sum, value) => sum + Math.abs(value), 0))); }
function gaussianSolve(Ain: number[][], bin: number[]): { x: number[]; minPivot: number; maxPivot: number } {
  const nRows = Ain.length; if (nRows !== Ain[0].length || bin.length !== nRows) throw new Error('Gaussian solve requires a square coefficient matrix and matching right-hand side.');
  if (nRows > 50) throw new Error('P12 pivoted numerical solves are limited to 50×50 systems.');
  const A = Ain.map((row) => [...row]); const rhs = [...bin]; let minPivot = Number.POSITIVE_INFINITY; let maxPivot = 0;
  for (let k = 0; k < nRows; k += 1) {
    let pivotRow = k; for (let i = k + 1; i < nRows; i += 1) if (Math.abs(A[i][k]) > Math.abs(A[pivotRow][k])) pivotRow = i;
    const pivot = Math.abs(A[pivotRow][k]); if (pivot < 1e-14) throw new Error('Numerical Gaussian elimination detected a singular or severely rank-deficient matrix.');
    if (pivotRow !== k) { [A[k], A[pivotRow]] = [A[pivotRow], A[k]]; [rhs[k], rhs[pivotRow]] = [rhs[pivotRow], rhs[k]]; }
    minPivot = Math.min(minPivot, pivot); maxPivot = Math.max(maxPivot, pivot);
    for (let i = k + 1; i < nRows; i += 1) { const factor = A[i][k] / A[k][k]; A[i][k] = 0; for (let j = k + 1; j < nRows; j += 1) A[i][j] -= factor * A[k][j]; rhs[i] -= factor * rhs[k]; }
  }
  const x = Array<number>(nRows).fill(0); for (let i = nRows - 1; i >= 0; i -= 1) { let sum = rhs[i]; for (let j = i + 1; j < nRows; j += 1) sum -= A[i][j] * x[j]; x[i] = sum / A[i][i]; }
  return { x, minPivot, maxPivot };
}
export function numericalLinearSolve(node: AstNode): NumericalTransform {
  const augmented = numericMatrix(node); const nRows = augmented.length; if (augmented[0].length !== nRows + 1) throw new Error('Numerical system solve expects an n×(n+1) augmented matrix [A|b].');
  const A = augmented.map((row) => row.slice(0, nRows)); const rhs = augmented.map((row) => row[nRows]); const solved = gaussianSolve(A, rhs);
  const residuals = A.map((row, i) => row.reduce((sum, value, j) => sum + value * solved.x[j], 0) - rhs[i]); const residual = Math.max(...residuals.map(Math.abs));
  const vectorAst: AstNode = { type: 'matrix', rows: [solved.x.map((value) => n(fixed(value, 15)))] };
  return { ast: vectorAst, display: `[${solved.x.map((value) => fixed(value, 12)).join(', ')}]`, exactness: 'approximate', warnings: ['Partial pivoting improves numerical stability but does not make an ill-conditioned system well-conditioned. Compare the residual and condition diagnostics when accuracy matters.'], sections: [section('numeric-linear-solve', 'Pivoted Gaussian solve', [
    { label: 'Solution', display: `[${solved.x.map((value) => fixed(value, 14)).join(', ')}]`, ast: vectorAst, tone: 'positive' }, { label: 'Residual ||Ax-b||∞', display: fixed(residual, 6) }, { label: 'Smallest selected pivot', display: fixed(solved.minPivot, 6) }, { label: 'Largest selected pivot', display: fixed(solved.maxPivot, 6) },
  ])] };
}
export function iterativeLinearSolve(node: AstNode, method: 'jacobi' | 'gauss-seidel', tolerance = 1e-10, maxIterations = 500): NumericalTransform {
  const augmented = numericMatrix(node); const size = augmented.length; if (augmented[0].length !== size + 1) throw new Error('Iterative solve expects an n×(n+1) augmented matrix [A|b].');
  if (size > 50) throw new Error('P12 iterative solves are limited to 50 unknowns.'); boundedTolerance(tolerance); if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 5000) throw new Error('Iterative solve iteration limit must be 1–5000.');
  const A = augmented.map((row) => row.slice(0, size)); const rhs = augmented.map((row) => row[size]);
  for (let i = 0; i < size; i += 1) if (Math.abs(A[i][i]) < 1e-14) throw new Error('Jacobi/Gauss–Seidel requires nonzero diagonal entries in the supplied row ordering.');
  const dominance = A.every((row, i) => Math.abs(row[i]) >= row.reduce((sum, value, j) => sum + (j === i ? 0 : Math.abs(value)), 0));
  let x = Array<number>(size).fill(0); let change = Number.POSITIVE_INFINITY; let iterations = 0; const trace: string[] = [];
  for (iterations = 1; iterations <= maxIterations; iterations += 1) {
    const previous = [...x]; const next = method === 'jacobi' ? [...x] : x;
    for (let i = 0; i < size; i += 1) {
      let sum = rhs[i]; for (let j = 0; j < size; j += 1) if (j !== i) sum -= A[i][j] * (method === 'gauss-seidel' && j < i ? next[j] : previous[j]);
      next[i] = sum / A[i][i];
    }
    x = [...next]; change = Math.max(...x.map((value, i) => Math.abs(value - previous[i])));
    if (trace.length < 10) trace.push(`k=${iterations}: Δ∞=${fixed(change,6)} · x=[${x.map((v)=>fixed(v,8)).join(', ')}]`);
    if (!x.every(Number.isFinite)) throw new Error('The iterative solve diverged to a non-finite iterate.'); if (change <= tolerance) break;
  }
  const residual = Math.max(...A.map((row, i) => Math.abs(row.reduce((sum, value, j) => sum + value * x[j], 0) - rhs[i]))); const converged = change <= tolerance;
  const vectorAst: AstNode = { type: 'matrix', rows: [x.map((value) => n(fixed(value, 15)))] };
  return { ast: vectorAst, display: `[${x.map((value) => fixed(value,12)).join(', ')}]`, exactness: 'approximate', warnings: [
    ...(dominance ? [] : ['The matrix is not row-wise diagonally dominant. Convergence of Jacobi/Gauss–Seidel is therefore not guaranteed by the standard sufficient criterion.']),
    ...(!converged ? ['The iteration limit was reached before the requested iterate-change tolerance.'] : []),
  ], sections: [
    section('iterative-linear','Iterative linear solve',[{label:'Method',display:method === 'jacobi' ? 'Jacobi' : 'Gauss–Seidel'},{label:'Solution estimate',display:`[${x.map((v)=>fixed(v,12)).join(', ')}]`,ast:vectorAst,tone:converged?'positive':'warning'},{label:'Iterations',display:String(Math.min(iterations,maxIterations))},{label:'Final Δ∞',display:fixed(change,6)},{label:'Residual ||Ax-b||∞',display:fixed(residual,6)},{label:'Row-wise diagonal dominance',display:dominance?'Yes':'No'}]),
    section('iterative-trace','Convergence trace',trace.map((value,index)=>({label:`Step ${index+1}`,display:value}))),
  ] };
}

export function conditionEstimate(node: AstNode): NumericalTransform {
  const A = numericMatrix(node); const size = A.length; if (A[0].length !== size) throw new Error('Condition estimation requires a square matrix.'); if (size > 30) throw new Error('P12 condition estimates are limited to 30×30 matrices.');
  const inverseColumns: number[][] = [];
  for (let j = 0; j < size; j += 1) { const rhs = Array<number>(size).fill(0); rhs[j] = 1; inverseColumns.push(gaussianSolve(A, rhs).x); }
  const inverse = Array.from({ length: size }, (_v, i) => inverseColumns.map((column) => column[i])); const normA = normInfMatrix(A); const normInv = normInfMatrix(inverse); const condition = normA * normInv;
  return { ast: n(fixed(condition, 15)), display: `κ∞(A) ≈ ${fixed(condition, 10)}`, exactness: 'approximate', warnings: ['This is a floating-point infinity-norm condition estimate computed from a numerically inverted matrix; it is not an exact condition number certificate.'], sections: [section('condition', 'Condition estimate', [
    { label: '||A||∞', display: fixed(normA, 12) }, { label: '||A⁻¹||∞', display: fixed(normInv, 12) }, { label: 'κ∞(A)', display: fixed(condition, 12), tone: condition > 1e8 ? 'warning' : 'positive' }, { label: 'Interpretation', display: condition > 1e12 ? 'Extremely ill-conditioned' : condition > 1e8 ? 'Strongly ill-conditioned' : condition > 1e4 ? 'Moderately ill-conditioned' : 'Well/moderately conditioned at this scale' },
  ])] };
}

export function isIvpCall(node: AstNode): node is Extract<AstNode, { type: 'call' }> { return node.type === 'call' && node.name === 'ivp'; }
export function ivpShapeInfo(node: AstNode): { variables: 2 } | null { return isIvpCall(node) && node.args.length === 3 ? { variables: 2 } : null; }
function ivpSpec(node: AstNode): { rhs: AstNode; x0: number; y0: number } {
  const s = simplifyAst(node); if (s.type !== 'call' || s.name !== 'ivp' || s.args.length !== 3) throw new Error('Use ivp(f(x,y), x0, y0), for example ivp(x+y, 0, 1).');
  const x0r = rationalValue(s.args[1]); const y0r = rationalValue(s.args[2]); if (!x0r || !y0r) throw new Error('IVP initial values x0 and y0 must be resolved real rational numbers.');
  return { rhs: s.args[0], x0: rationalToNumber(x0r), y0: rationalToNumber(y0r) };
}
export function ivpProfile(node: AstNode): NumericalTransform {
  const spec = ivpSpec(node); numeric(spec.rhs, { x: spec.x0, y: spec.y0 });
  return { display: `y' = ${astToPlainText(spec.rhs)}, y(${fixed(spec.x0)}) = ${fixed(spec.y0)}`, exactness: 'exact', warnings: ['P12 treats x and y as the independent/dependent variables inside ivp(…). General higher-order ODEs, systems, stiffness detection, and symbolic ODE solving are deferred.'], sections: [section('ivp', 'Initial-value problem', [
    { label: "ODE", display: `y' = ${astToPlainText(spec.rhs)}`, ast: spec.rhs }, { label: 'Initial condition', display: `y(${fixed(spec.x0)}) = ${fixed(spec.y0)}` }, { label: 'Available solvers', display: 'Euler (order 1), Heun (order 2), RK4 (order 4)' },
  ])] };
}
function odeStep(method: OdeMethod, f: (x:number,y:number)=>number, x:number, y:number, h:number): number {
  if (method === 'euler') return y + h * f(x,y);
  if (method === 'heun') { const k1 = f(x,y); const predictor = y + h*k1; const k2 = f(x+h,predictor); return y + h*(k1+k2)/2; }
  const k1 = f(x,y); const k2 = f(x+h/2, y+h*k1/2); const k3 = f(x+h/2, y+h*k2/2); const k4 = f(x+h, y+h*k3); return y + h*(k1+2*k2+2*k3+k4)/6;
}
function odeIntegrate(spec:{rhs:AstNode;x0:number;y0:number}, method:OdeMethod, endpoint:number, steps:number): { y:number; rows:Array<[number,number]> } {
  const f=(x:number,y:number)=>numeric(spec.rhs,{x,y}); const h=(endpoint-spec.x0)/steps; let x=spec.x0; let y=spec.y0; const rows:Array<[number,number]>=[[x,y]]; const stride=Math.max(1,Math.floor(steps/16));
  for(let i=0;i<steps;i+=1){ y=finite(odeStep(method,f,x,y,h),'ODE iterate'); x=spec.x0+(i+1)*h; if((i+1)%stride===0 || i===steps-1) rows.push([x,y]); }
  return {y,rows};
}
export function solveIvp(node: AstNode, method: OdeMethod, endpoint: number, requestedStep: number): NumericalTransform {
  const spec=ivpSpec(node); finite(endpoint,'ODE endpoint'); if(endpoint===spec.x0) return {ast:n(spec.y0),display:`y(${fixed(endpoint)}) ≈ ${fixed(spec.y0)}`,exactness:'approximate',warnings:[],sections:[section('ode','ODE solution',[{label:'Endpoint value',display:fixed(spec.y0)}])]};
  if(!Number.isFinite(requestedStep)||requestedStep<=0) throw new Error('ODE step size must be positive.');
  const steps=Math.ceil(Math.abs(endpoint-spec.x0)/requestedStep); if(steps<1||steps>20000) throw new Error('P12 ODE solves are limited to 20,000 accepted fixed steps. Increase the requested step size or shorten the interval.');
  const fineSteps=steps*2; if(fineSteps>40000) throw new Error('Step-doubling error estimation would exceed the P12 ODE work budget. Increase the step size.');
  const coarse=odeIntegrate(spec,method,endpoint,steps); const fine=odeIntegrate(spec,method,endpoint,fineSteps); const order=method==='euler'?1:method==='heun'?2:4; const error=Math.abs(fine.y-coarse.y)/(Math.pow(2,order)-1); const actualH=Math.abs(endpoint-spec.x0)/fineSteps;
  const tableFacts=fine.rows.map(([x,y],i)=>({label:`${i===0?'Initial':'Sample '+i}`,display:`x=${fixed(x,8)}, y≈${fixed(y,12)}`}));
  return {ast:n(fixed(fine.y,15)),display:`y(${fixed(endpoint)}) ≈ ${fixed(fine.y,12)}`,exactness:'approximate',warnings:['The endpoint error is estimated by fixed-step doubling under the assumed method order; it is not a rigorous enclosure. Stiff equations can make explicit Euler/Heun/RK4 unreliable even when the estimate looks small.'],sections:[
    section('ode-result','ODE numerical solution',[{label:'Method',display:method.toUpperCase()},{label:'Endpoint',display:fixed(endpoint)},{label:'Approximate y',display:fixed(fine.y,14),tone:'positive'},{label:'Fine steps',display:String(fineSteps)},{label:'Fine step size |h|',display:fixed(actualH,10)},{label:'Step-doubling error estimate',display:fixed(error,6)}]),
    section('ode-samples','Solution samples',tableFacts,'The display table is thinned; the solver uses every fixed step internally.'),
  ]};
}
