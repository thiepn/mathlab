import type { AstNode } from './ast';
import {
  ONE, ZERO, abs, add, div, eq, isOne, isZero, mul, neg, parseRational,
  pow, rat, rationalToDecimalString, rationalToString, sign, sqrtRational, sub, type Rational,
} from './rational';

export type Polynomial = Map<number, Rational>;

export interface PolynomialDivisionResult { quotient: Polynomial; remainder: Polynomial }

function n(value: string | number | bigint): AstNode { return { type: 'number', value: String(value) }; }
function s(name: string): AstNode { return { type: 'symbol', name }; }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode, implicit = false): AstNode {
  return { type: 'binary', operator, left, right, implicit };
}
function u(operator: '+' | '-', operand: AstNode): AstNode { return { type: 'unary', operator, operand }; }
function call(name: string, ...args: AstNode[]): AstNode { return { type: 'call', name, args }; }

function normalizePoly(poly: Polynomial): Polynomial {
  const next = new Map<number, Rational>();
  for (const [degree, coefficient] of poly) if (!isZero(coefficient)) next.set(degree, coefficient);
  if (!next.size) next.set(0, ZERO);
  return next;
}

export function polynomialDegree(poly: Polynomial): number {
  return Math.max(...[...poly.entries()].filter(([, c]) => !isZero(c)).map(([d]) => d), 0);
}

export function polynomialCoefficient(poly: Polynomial, degree: number): Rational { return poly.get(degree) ?? ZERO; }

export function addPolynomials(a: Polynomial, c: Polynomial): Polynomial {
  const out = new Map(a);
  for (const [degree, coefficient] of c) out.set(degree, add(out.get(degree) ?? ZERO, coefficient));
  return normalizePoly(out);
}

export function scalePolynomial(poly: Polynomial, coefficient: Rational): Polynomial {
  return normalizePoly(new Map([...poly].map(([degree, value]) => [degree, mul(value, coefficient)])));
}

export function multiplyPolynomials(a: Polynomial, c: Polynomial): Polynomial {
  const out = new Map<number, Rational>();
  for (const [da, ca] of a) for (const [db, cb] of c) {
    const degree = da + db;
    out.set(degree, add(out.get(degree) ?? ZERO, mul(ca, cb)));
  }
  return normalizePoly(out);
}

export function powerPolynomial(poly: Polynomial, exponent: number): Polynomial {
  let out: Polynomial = new Map([[0, ONE]]);
  let base = poly;
  let e = exponent;
  while (e > 0) {
    if (e % 2 === 1) out = multiplyPolynomials(out, base);
    e = Math.floor(e / 2);
    if (e) base = multiplyPolynomials(base, base);
  }
  return normalizePoly(out);
}

function rationalFromAst(node: AstNode): Rational | null {
  if (node.type === 'number') return parseRational(node.value);
  if (node.type === 'unary') {
    const value = rationalFromAst(node.operand);
    return value ? (node.operator === '-' ? neg(value) : value) : null;
  }
  if (node.type === 'binary') {
    const left = rationalFromAst(node.left); const right = rationalFromAst(node.right);
    if (!left || !right) return null;
    if (node.operator === '+') return add(left, right);
    if (node.operator === '-') return sub(left, right);
    if (node.operator === '*') return mul(left, right);
    if (node.operator === '/') return isZero(right) ? null : div(left, right);
    if (node.operator === '^' && right.d === 1n) {
      const exponent = Number(right.n);
      if (Number.isSafeInteger(exponent)) return pow(left, exponent);
    }
  }
  return null;
}

export function rationalToAst(value: Rational): AstNode {
  if (value.d === 1n) return n(value.n);
  const numerator = value.n < 0n ? -value.n : value.n;
  const fraction = b('/', n(numerator), n(value.d));
  return value.n < 0n ? u('-', fraction) : fraction;
}

export function symbolsIn(node: AstNode): string[] {
  const out = new Set<string>();
  const visit = (current: AstNode) => {
    switch (current.type) {
      case 'number': break;
      case 'symbol': if (!['pi', 'e', 'i', 'infinity'].includes(current.name)) out.add(current.name); break;
      case 'unary': visit(current.operand); break;
      case 'binary': visit(current.left); visit(current.right); break;
      case 'call': current.args.forEach(visit); break;
      case 'equation': case 'comparison': case 'definition': visit(current.left); visit(current.right); break;
      case 'matrix': current.rows.flat().forEach(visit); break;
      case 'system': case 'set': current.items.forEach(visit); break;
    }
  };
  visit(node);
  return [...out];
}

export function toPolynomial(node: AstNode, variable: string): Polynomial | null {
  const constant = rationalFromAst(node);
  if (constant) return new Map([[0, constant]]);
  if (node.type === 'symbol') return node.name === variable ? new Map([[1, ONE]]) : null;
  if (node.type === 'unary') {
    const operand = toPolynomial(node.operand, variable);
    if (!operand) return null;
    return node.operator === '-' ? scalePolynomial(operand, rat(-1n)) : operand;
  }
  if (node.type === 'binary') {
    const left = toPolynomial(node.left, variable); const right = toPolynomial(node.right, variable);
    if (node.operator === '/') {
      const denominator = rationalFromAst(node.right);
      return left && denominator && !isZero(denominator) ? scalePolynomial(left, div(ONE, denominator)) : null;
    }
    if (node.operator === '^') {
      const exponent = rationalFromAst(node.right);
      if (!left || !exponent || exponent.d !== 1n || exponent.n < 0n || exponent.n > 30n) return null;
      return powerPolynomial(left, Number(exponent.n));
    }
    if (!left || !right) return null;
    if (node.operator === '+') return addPolynomials(left, right);
    if (node.operator === '-') return addPolynomials(left, scalePolynomial(right, rat(-1n)));
    if (node.operator === '*') return multiplyPolynomials(left, right);
  }
  return null;
}

function termAst(variable: string, degree: number, coefficient: Rational): AstNode {
  const magnitude = abs(coefficient);
  if (degree === 0) return rationalToAst(magnitude);
  const variableAst = degree === 1 ? s(variable) : b('^', s(variable), n(degree));
  return isOne(magnitude) ? variableAst : b('*', rationalToAst(magnitude), variableAst, true);
}

export function polynomialToAst(poly: Polynomial, variable: string): AstNode {
  const entries = [...normalizePoly(poly)].filter(([, c]) => !isZero(c)).sort((a, c) => c[0] - a[0]);
  if (!entries.length) return n(0);
  let result: AstNode | null = null;
  for (const [degree, coefficient] of entries) {
    const term = termAst(variable, degree, coefficient);
    if (!result) result = sign(coefficient) < 0 ? u('-', term) : term;
    else result = b(sign(coefficient) < 0 ? '-' : '+', result, term);
  }
  return result ?? n(0);
}

function hasDistribution(node: AstNode): boolean {
  if (node.type === 'binary') {
    if (node.operator === '*' && (node.left.type === 'binary' && ['+', '-'].includes(node.left.operator) || node.right.type === 'binary' && ['+', '-'].includes(node.right.operator))) return true;
    if (node.operator === '^' && node.left.type === 'binary' && ['+', '-'].includes(node.left.operator)) return true;
    return hasDistribution(node.left) || hasDistribution(node.right);
  }
  if (node.type === 'unary') return hasDistribution(node.operand);
  if (node.type === 'call') return node.args.some(hasDistribution);
  return false;
}

function astEqual(a: AstNode, c: AstNode): boolean { return JSON.stringify(a) === JSON.stringify(c); }

function containsSymbolicZeroPower(node: AstNode): boolean {
  if (node.type === 'binary') {
    const exponent = rationalFromAst(node.right);
    if (node.operator === '^' && exponent && isZero(exponent) && symbolsIn(node.left).length > 0) return true;
    return containsSymbolicZeroPower(node.left) || containsSymbolicZeroPower(node.right);
  }
  if (node.type === 'unary') return containsSymbolicZeroPower(node.operand);
  if (node.type === 'call') return node.args.some(containsSymbolicZeroPower);
  return false;
}


function squareFreeDecompose(value: bigint): { outside: bigint; inside: bigint } {
  if (value < 0n) throw new Error('Square-free decomposition requires a nonnegative integer.');
  if (value === 0n) return { outside: 0n, inside: 1n };
  let remaining = value;
  let outside = 1n;
  let inside = 1n;
  let p = 2n;
  while (p * p <= remaining) {
    let count = 0;
    while (remaining % p === 0n) { remaining /= p; count += 1; }
    if (count >= 2) outside *= p ** BigInt(Math.floor(count / 2));
    if (count % 2 === 1) inside *= p;
    p = p === 2n ? 3n : p + 2n;
    if (p > 100000n && remaining > 1n) break;
  }
  if (remaining > 1n) inside *= remaining;
  return { outside, inside };
}

export function sqrtDecomposition(value: Rational): { coefficient: Rational; radicand: Rational } | null {
  if (value.n < 0n) return null;
  const exact = sqrtRational(value);
  if (exact) return { coefficient: exact, radicand: ONE };
  const num = squareFreeDecompose(value.n);
  const den = squareFreeDecompose(value.d);
  // Rationalize the square-free denominator: sqrt(a/b) = sqrt(ab)/b.
  return { coefficient: rat(num.outside, den.outside * den.inside), radicand: rat(num.inside * den.inside) };
}

export function sqrtRationalAst(value: Rational): AstNode {
  const decomposition = sqrtDecomposition(value);
  if (!decomposition) return call('sqrt', rationalToAst(value));
  if (isOne(decomposition.radicand)) return rationalToAst(decomposition.coefficient);
  const radical = call('sqrt', rationalToAst(decomposition.radicand));
  return isOne(decomposition.coefficient) ? radical : b('*', rationalToAst(decomposition.coefficient), radical, true);
}

export function simplifyAst(node: AstNode): AstNode {
  if (node.type === 'number' || node.type === 'symbol') return node;
  if (node.type === 'matrix') return { ...node, rows: node.rows.map((row) => row.map(simplifyAst)) };
  if (node.type === 'system' || node.type === 'set') return { ...node, items: node.items.map(simplifyAst) };
  if (node.type === 'equation' || node.type === 'comparison' || node.type === 'definition') return { ...node, left: simplifyAst(node.left), right: simplifyAst(node.right) };
  if (node.type === 'call') {
    const args = node.args.map(simplifyAst);
    if (node.name === 'sqrt' && args[0]) {
      const value = rationalFromAst(args[0]);
      if (value && value.n >= 0n) return sqrtRationalAst(value);
    }
    return { ...node, args };
  }
  if (node.type === 'unary') {
    const operand = simplifyAst(node.operand);
    const value = rationalFromAst({ ...node, operand });
    if (value) return rationalToAst(value);
    if (node.operator === '+' ) return operand;
    if (operand.type === 'unary' && operand.operator === '-') return operand.operand;
    return { ...node, operand };
  }

  const left = simplifyAst(node.left); const right = simplifyAst(node.right);
  const candidate: AstNode = { ...node, left, right };
  const numeric = rationalFromAst(candidate);
  if (numeric) return rationalToAst(numeric);

  const lr = rationalFromAst(left); const rr = rationalFromAst(right);
  if (node.operator === '+') {
    if (lr && isZero(lr)) return right;
    if (rr && isZero(rr)) return left;
  }
  if (node.operator === '-') {
    if (rr && isZero(rr)) return left;
    if (astEqual(left, right)) return n(0);
  }
  if (node.operator === '*') {
    if ((lr && isZero(lr)) || (rr && isZero(rr))) return n(0);
    if (lr && isOne(lr)) return right;
    if (rr && isOne(rr)) return left;
  }
  if (node.operator === '/') {
    if (rr && isZero(rr)) throw new Error('Division by zero is undefined.');
    if (lr && isZero(lr)) return n(0);
    if (rr && isOne(rr)) return left;
    // Do not cancel x/x without a nonzero assumption: that would silently change the domain.
  }
  if (node.operator === '^' && rr) {
    if (isOne(rr)) return left;
    // Symbolic x^0 is left intact unless numeric evaluation already proved the base is defined.
  }

  const symbols = symbolsIn(candidate);
  if (symbols.length === 1 && !hasDistribution(candidate) && !containsSymbolicZeroPower(candidate)) {
    const poly = toPolynomial(candidate, symbols[0]);
    if (poly) return polynomialToAst(poly, symbols[0]);
  }
  return candidate;
}

export function expandAst(node: AstNode, variable?: string): AstNode {
  const vars = variable ? [variable] : symbolsIn(node);
  if (vars.length !== 1) return simplifyAst(node);
  const poly = toPolynomial(node, vars[0]);
  return poly ? polynomialToAst(poly, vars[0]) : simplifyAst(node);
}

function lcm(a: bigint, c: bigint): bigint {
  const gcd = (x: bigint, y: bigint): bigint => y === 0n ? (x < 0n ? -x : x) : gcd(y, x % y);
  return (a / gcd(a, c)) * c;
}

function integerized(poly: Polynomial): { coefficients: bigint[]; scale: Rational } {
  const degree = polynomialDegree(poly);
  let denominator = 1n;
  for (let d = 0; d <= degree; d++) denominator = lcm(denominator, polynomialCoefficient(poly, d).d);
  const ints = Array.from({ length: degree + 1 }, (_, d) => polynomialCoefficient(poly, d).n * (denominator / polynomialCoefficient(poly, d).d));
  let g = 0n;
  const gcd = (x: bigint, y: bigint): bigint => y === 0n ? (x < 0n ? -x : x) : gcd(y, x % y);
  for (const value of ints) g = gcd(g, value);
  if (g === 0n) g = 1n;
  return { coefficients: ints.map((v) => v / g), scale: rat(g, denominator) };
}

function integerDivisors(value: bigint): bigint[] {
  const v = value < 0n ? -value : value;
  if (v === 0n) return [0n];
  if (v > 1000000n) return [];
  const out = new Set<bigint>();
  for (let i = 1n; i * i <= v; i++) if (v % i === 0n) { out.add(i); out.add(v / i); }
  return [...out];
}

export function evaluatePolynomial(poly: Polynomial, x: Rational): Rational {
  const degree = polynomialDegree(poly);
  let result = ZERO;
  for (let d = degree; d >= 0; d--) result = add(mul(result, x), polynomialCoefficient(poly, d));
  return result;
}

export function dividePolynomials(dividend: Polynomial, divisor: Polynomial): PolynomialDivisionResult {
  const divisorDegree = polynomialDegree(divisor);
  const divisorLead = polynomialCoefficient(divisor, divisorDegree);
  if (isZero(divisorLead)) throw new Error('Polynomial division by zero.');
  let remainder = normalizePoly(dividend);
  let quotient: Polynomial = new Map([[0, ZERO]]);
  while (polynomialDegree(remainder) >= divisorDegree && !isZero(polynomialCoefficient(remainder, polynomialDegree(remainder)))) {
    const rd = polynomialDegree(remainder);
    const termDegree = rd - divisorDegree;
    const termCoeff = div(polynomialCoefficient(remainder, rd), divisorLead);
    const term: Polynomial = new Map([[termDegree, termCoeff]]);
    quotient = addPolynomials(quotient, term);
    remainder = addPolynomials(remainder, scalePolynomial(multiplyPolynomials(term, divisor), rat(-1n)));
    if (polynomialDegree(remainder) === 0 && isZero(polynomialCoefficient(remainder, 0))) break;
  }
  return { quotient: normalizePoly(quotient), remainder: normalizePoly(remainder) };
}

function linearFactor(variable: string, root: Rational): AstNode {
  return sign(root) < 0 ? b('+', s(variable), rationalToAst(abs(root))) : b('-', s(variable), rationalToAst(root));
}

function rationalRootCandidates(poly: Polynomial): Rational[] {
  const { coefficients } = integerized(poly);
  const degree = coefficients.length - 1;
  const constant = coefficients[0]; const lead = coefficients[degree];
  if (constant === 0n) return [ZERO];
  const ps = integerDivisors(constant); const qs = integerDivisors(lead);
  const out: Rational[] = [];
  const seen = new Set<string>();
  for (const p of ps) for (const q of qs) if (q !== 0n) for (const signed of [p, -p]) {
    const value = rat(signed, q); const key = rationalToString(value);
    if (!seen.has(key)) { seen.add(key); out.push(value); }
  }
  return out;
}

export function factorPolynomial(poly: Polynomial, variable: string): AstNode {
  let remaining = normalizePoly(poly);
  const degree = polynomialDegree(remaining);
  if (degree <= 0) return polynomialToAst(remaining, variable);
  const factors: AstNode[] = [];

  // Pull out rational content so the residual polynomial is primitive when possible.
  const { scale } = integerized(remaining);
  if (!isOne(abs(scale))) {
    factors.push(rationalToAst(scale));
    remaining = scalePolynomial(remaining, div(ONE, scale));
  } else if (sign(scale) < 0) {
    factors.push(n(-1));
    remaining = scalePolynomial(remaining, rat(-1n));
  }

  while (polynomialDegree(remaining) > 2) {
    const root = rationalRootCandidates(remaining).find((candidate) => isZero(evaluatePolynomial(remaining, candidate)));
    if (!root) break;
    factors.push(linearFactor(variable, root));
    remaining = dividePolynomials(remaining, new Map([[1, ONE], [0, neg(root)]])).quotient;
  }

  const rd = polynomialDegree(remaining);
  if (rd === 2) {
    const a = polynomialCoefficient(remaining, 2); const c1 = polynomialCoefficient(remaining, 1); const c0 = polynomialCoefficient(remaining, 0);
    const discriminant = sub(mul(c1, c1), mul(rat(4n), mul(a, c0)));
    const rootDisc = sqrtRational(discriminant);
    if (rootDisc) {
      const twoA = mul(rat(2n), a);
      const r1 = div(add(neg(c1), rootDisc), twoA);
      const r2 = div(sub(neg(c1), rootDisc), twoA);
      if (!isOne(a)) factors.push(rationalToAst(a));
      factors.push(linearFactor(variable, r1), linearFactor(variable, r2));
      remaining = new Map([[0, ONE]]);
    }
  }
  if (!(polynomialDegree(remaining) === 0 && isOne(polynomialCoefficient(remaining, 0)))) factors.push(polynomialToAst(remaining, variable));
  if (!factors.length) return polynomialToAst(poly, variable);
  return factors.reduce((left, right) => b('*', left, right, true));
}

export function factorAst(node: AstNode, variable?: string): AstNode {
  const vars = variable ? [variable] : symbolsIn(node);
  if (vars.length !== 1) return simplifyAst(node);
  const poly = toPolynomial(node, vars[0]);
  return poly ? factorPolynomial(poly, vars[0]) : simplifyAst(node);
}

export function substituteAst(node: AstNode, symbol: string, replacement: AstNode): AstNode {
  switch (node.type) {
    case 'number': return node;
    case 'symbol': return node.name === symbol ? replacement : node;
    case 'unary': return { ...node, operand: substituteAst(node.operand, symbol, replacement) };
    case 'binary': return { ...node, left: substituteAst(node.left, symbol, replacement), right: substituteAst(node.right, symbol, replacement) };
    case 'call': return { ...node, args: node.args.map((arg) => substituteAst(arg, symbol, replacement)) };
    case 'equation': case 'comparison': case 'definition': return { ...node, left: substituteAst(node.left, symbol, replacement), right: substituteAst(node.right, symbol, replacement) };
    case 'matrix': return { ...node, rows: node.rows.map((row) => row.map((cell) => substituteAst(cell, symbol, replacement))) };
    case 'system': case 'set': return { ...node, items: node.items.map((item) => substituteAst(item, symbol, replacement)) };
  }
}

export function decimalAst(node: AstNode, digits = 10): AstNode {
  const value = rationalFromAst(node);
  if (!value) return node;
  return n(rationalToDecimalString(value, digits));
}

export function partialFractionsAst(node: AstNode, variable?: string): AstNode | null {
  if (node.type !== 'binary' || node.operator !== '/') return null;
  const vars = variable ? [variable] : symbolsIn(node);
  if (vars.length !== 1) return null;
  const x = vars[0];
  const numerator = toPolynomial(node.left, x); const denominator = toPolynomial(node.right, x);
  if (!numerator || !denominator || polynomialDegree(denominator) < 1) return null;
  const division = dividePolynomials(numerator, denominator);
  let residual = division.remainder;
  let denom = denominator;
  const roots: Rational[] = [];
  while (polynomialDegree(denom) > 0) {
    const root = rationalRootCandidates(denom).find((candidate) => isZero(evaluatePolynomial(denom, candidate)));
    if (!root) return null;
    if (roots.some((item) => eq(item, root))) return null; // P4 supports distinct linear factors only.
    roots.push(root);
    denom = dividePolynomials(denom, new Map([[1, ONE], [0, neg(root)]])).quotient;
  }
  if (polynomialDegree(denom) !== 0) return null;
  const leadingScale = polynomialCoefficient(denom, 0);

  let result: AstNode | null = polynomialDegree(division.quotient) === 0 && isZero(polynomialCoefficient(division.quotient, 0)) ? null : polynomialToAst(division.quotient, x);
  for (const root of roots) {
    // A_i = R(r_i) / D'(r_i) = R(r_i) / (leadingScale * product_{j != i}(r_i-r_j)).
    let denomAtRoot = leadingScale;
    for (const other of roots) if (!eq(root, other)) denomAtRoot = mul(denomAtRoot, sub(root, other));
    const coefficient = div(evaluatePolynomial(residual, root), denomAtRoot);
    const term = b('/', rationalToAst(coefficient), linearFactor(x, root));
    result = result ? b('+', result, term) : term;
  }
  return result ? simplifyAst(result) : n(0);
}

export function polynomialLongDivisionAst(numerator: AstNode, denominator: AstNode, variable?: string): { quotient: AstNode; remainder: AstNode } | null {
  const vars = variable ? [variable] : [...new Set([...symbolsIn(numerator), ...symbolsIn(denominator)])];
  if (vars.length !== 1) return null;
  const a = toPolynomial(numerator, vars[0]); const c = toPolynomial(denominator, vars[0]);
  if (!a || !c) return null;
  const division = dividePolynomials(a, c);
  return { quotient: polynomialToAst(division.quotient, vars[0]), remainder: polynomialToAst(division.remainder, vars[0]) };
}

export function rationalValue(node: AstNode): Rational | null { return rationalFromAst(node); }
export function isPerfectSquareRational(value: Rational) { return sqrtRational(value); }
export function makeNumber(value: number | string | bigint): AstNode { return n(value); }
export function makeSymbol(name: string): AstNode { return s(name); }
export function makeBinary(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode, implicit = false): AstNode { return b(operator, left, right, implicit); }
export function makeUnary(operator: '+' | '-', operand: AstNode): AstNode { return u(operator, operand); }
export function makeCall(name: string, ...args: AstNode[]): AstNode { return call(name, ...args); }
