import type { AstNode } from './ast';
import {
  dividePolynomials,
  evaluatePolynomial,
  makeBinary,
  makeNumber,
  makeSymbol,
  makeUnary,
  polynomialCoefficient,
  polynomialDegree,
  polynomialToAst,
  rationalToAst,
  rationalValue,
  simplifyAst,
  substituteAst,
  toPolynomial,
  type Polynomial,
} from './algebra';
import {
  differentiateAst,
  domainNotes,
  evaluateAt,
  limitAst,
  type CalculusStep,
  type LimitResult,
} from './calculus';
import { astToPlainText } from './format';
import {
  ONE,
  ZERO,
  abs as rationalAbs,
  add,
  div,
  eq,
  isZero,
  mul,
  neg,
  pow,
  rat,
  rationalToString,
  sign,
  sub,
  type Rational,
} from './rational';
import { solveEquation } from './solve';
import type { MathResultFact, MathResultSection } from './types';

export interface AnalysisTransform {
  ast?: AstNode;
  display?: string;
  exactness?: 'exact' | 'approximate' | 'heuristic';
  warnings: string[];
  steps: CalculusStep[];
  sections?: MathResultSection[];
}

export interface SequenceConvergence {
  status: 'convergent' | 'divergent' | 'unknown';
  limitAst?: AstNode;
  display: string;
  reason: string;
  warnings: string[];
  steps: CalculusStep[];
}

export interface SeriesConvergence {
  status: 'absolutely-convergent' | 'conditionally-convergent' | 'divergent' | 'unknown';
  display: string;
  reason: string;
  sumAst?: AstNode;
  warnings: string[];
  sections: MathResultSection[];
}

function n(value: string | number | bigint): AstNode { return makeNumber(value); }
function s(name: string): AstNode { return makeSymbol(name); }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode { return makeBinary(operator, left, right); }
function u(operator: '+' | '-', operand: AstNode): AstNode { return makeUnary(operator, operand); }
function same(a: AstNode, c: AstNode): boolean { return JSON.stringify(a) === JSON.stringify(c); }
function infinity(signValue = 1): AstNode { return signValue < 0 ? u('-', s('infinity')) : s('infinity'); }

function factorial(value: number): bigint {
  let result = 1n;
  for (let i = 2; i <= value; i += 1) result *= BigInt(i);
  return result;
}

function polyIsZero(poly: Polynomial): boolean {
  return [...poly.values()].every(isZero);
}

function monic(poly: Polynomial): Polynomial {
  if (polyIsZero(poly)) return new Map([[0, ZERO]]);
  const lead = polynomialCoefficient(poly, polynomialDegree(poly));
  const factor = div(ONE, lead);
  const result: Polynomial = new Map();
  for (const [degree, coefficient] of poly) result.set(degree, mul(coefficient, factor));
  return result;
}

function polynomialGcd(a: Polynomial, c: Polynomial): Polynomial {
  let x = monic(a);
  let y = monic(c);
  let guard = 0;
  while (!polyIsZero(y) && guard < 32) {
    const { remainder } = dividePolynomials(x, y);
    x = y;
    y = monic(remainder);
    guard += 1;
  }
  return monic(x);
}

function polynomialDerivative(poly: Polynomial): Polynomial {
  const result: Polynomial = new Map([[0, ZERO]]);
  for (const [degree, coefficient] of poly) {
    if (degree > 0) result.set(degree - 1, mul(coefficient, rat(degree)));
  }
  return result;
}

function zeroMultiplicity(poly: Polynomial, target: Rational): { multiplicity: number; leadingLocal: Rational } {
  let current = poly;
  let order = 0;
  while (order <= polynomialDegree(poly) && isZero(evaluatePolynomial(current, target))) {
    current = polynomialDerivative(current);
    order += 1;
  }
  if (order > polynomialDegree(poly)) return { multiplicity: Number.POSITIVE_INFINITY, leadingLocal: ZERO };
  const derivativeValue = evaluatePolynomial(current, target);
  return { multiplicity: order, leadingLocal: div(derivativeValue, rat(factorial(order))) };
}

function rationalFunction(node: AstNode, variable: string): { numerator: Polynomial; denominator: Polynomial } | null {
  const simplified = simplifyAst(node);
  if (simplified.type !== 'binary' || simplified.operator !== '/') return null;
  const numerator = toPolynomial(simplified.left, variable);
  const denominator = toPolynomial(simplified.right, variable);
  if (!numerator || !denominator || polyIsZero(denominator)) return null;
  return { numerator, denominator };
}

function rootsOfPolynomial(poly: Polynomial, variable: string): AstNode[] | null {
  if (polyIsZero(poly)) return [];
  const degree = polynomialDegree(poly);
  if (degree === 0) return [];
  if (degree > 2) return null;
  const solved = solveEquation({ type: 'equation', left: polynomialToAst(poly, variable), right: n(0) }, variable);
  if (solved.status === 'unsupported') return null;
  if (solved.status === 'none') return [];
  if (solved.resultAst?.type === 'set') return solved.resultAst.items;
  return null;
}

function rationalRootKey(root: AstNode): string { return astToPlainText(simplifyAst(root)); }

export function rationalDiscontinuities(node: AstNode, variable: string): {
  holes: AstNode[];
  poles: AstNode[];
  unresolved: boolean;
} | null {
  const rational = rationalFunction(node, variable);
  if (!rational) return null;
  const gcd = polynomialGcd(rational.numerator, rational.denominator);
  const denominatorReduced = dividePolynomials(rational.denominator, gcd).quotient;
  const holeRoots = polynomialDegree(gcd) > 0 ? rootsOfPolynomial(gcd, variable) : [];
  const poleRoots = rootsOfPolynomial(denominatorReduced, variable);
  if (holeRoots === null || poleRoots === null) return { holes: holeRoots ?? [], poles: poleRoots ?? [], unresolved: true };
  const poleKeys = new Set(poleRoots.map(rationalRootKey));
  return {
    holes: holeRoots.filter((root) => !poleKeys.has(rationalRootKey(root))),
    poles: poleRoots,
    unresolved: false,
  };
}

function rationalPoleLimit(node: AstNode, variable: string, targetAst: AstNode, direction: 'both' | 'left' | 'right'): LimitResult | null {
  const target = rationalValue(simplifyAst(targetAst));
  const rational = rationalFunction(node, variable);
  if (!target || !rational) return null;
  const numeratorInfo = zeroMultiplicity(rational.numerator, target);
  const denominatorInfo = zeroMultiplicity(rational.denominator, target);
  if (!Number.isFinite(denominatorInfo.multiplicity) || denominatorInfo.multiplicity === 0) return null;
  if (!Number.isFinite(numeratorInfo.multiplicity)) return null;
  const poleOrder = denominatorInfo.multiplicity - numeratorInfo.multiplicity;
  if (poleOrder <= 0) return null;

  const coefficientSign = sign(div(numeratorInfo.leadingLocal, denominatorInfo.leadingLocal));
  const sideSign = (side: 'left' | 'right') => coefficientSign * (side === 'left' && poleOrder % 2 === 1 ? -1 : 1);
  const leftSign = sideSign('left');
  const rightSign = sideSign('right');
  const step: CalculusStep = {
    rule: 'local-leading-order-limit',
    explanation: `Compare the first nonzero local powers of ${variable} − ${astToPlainText(targetAst)} in numerator and denominator. The denominator vanishes ${poleOrder} order${poleOrder === 1 ? '' : 's'} faster.`,
    beforeAst: node,
    afterAst: direction === 'left' ? infinity(leftSign) : direction === 'right' ? infinity(rightSign) : leftSign === rightSign ? infinity(leftSign) : s('DNE'),
  };
  if (direction === 'left') return { ast: infinity(leftSign), steps: [step], warnings: [] };
  if (direction === 'right') return { ast: infinity(rightSign), steps: [step], warnings: [] };
  if (leftSign === rightSign) return { ast: infinity(leftSign), steps: [step], warnings: [] };
  return {
    ast: s('DNE'),
    display: 'Does not exist: the left- and right-hand limits are opposite infinities',
    steps: [step],
    warnings: ['The two-sided limit does not exist because the one-sided infinite limits have opposite signs.'],
  };
}

function matchesAbsRatio(node: AstNode, variable: string, target: Rational): boolean {
  const simplified = simplifyAst(node);
  if (simplified.type !== 'binary' || simplified.operator !== '/') return false;
  const denominator = toPolynomial(simplified.right, variable);
  if (!denominator || polynomialDegree(denominator) !== 1) return false;
  if (!isZero(evaluatePolynomial(denominator, target))) return false;
  return simplified.left.type === 'call' && simplified.left.name === 'abs' && simplified.left.args.length === 1 && same(simplifyAst(simplified.left.args[0]), simplifyAst(simplified.right));
}

export function analysisLimitAst(node: AstNode, variable: string, target: AstNode, direction: 'both' | 'left' | 'right' = 'both'): LimitResult {
  try {
    return limitAst(node, variable, target, direction);
  } catch (baseError) {
    const targetValue = rationalValue(simplifyAst(target));
    if (targetValue && matchesAbsRatio(node, variable, targetValue)) {
      const value = direction === 'left' ? n(-1) : direction === 'right' ? n(1) : s('DNE');
      return {
        ast: value,
        display: direction === 'both' ? 'Does not exist: left-hand limit = -1 and right-hand limit = 1' : undefined,
        steps: [{ rule: 'absolute-value-one-sided-limit', explanation: 'Resolve |u|/u by the sign of u on the requested side of the target.', beforeAst: node, afterAst: value }],
        warnings: direction === 'both' ? ['The two-sided limit fails because the one-sided limits disagree.'] : [],
      };
    }
    const pole = rationalPoleLimit(node, variable, target, direction);
    if (pole) return pole;
    throw baseError;
  }
}

export function sequenceTerms(node: AstNode, index: string, start = 1, count = 8): AstNode[] {
  if (!Number.isInteger(start) || !Number.isInteger(count) || count < 1 || count > 50) throw new Error('Sequence term preview requires an integer start and 1–50 terms.');
  const terms: AstNode[] = [];
  for (let k = start; k < start + count; k += 1) terms.push(simplifyAst(substituteAst(node, index, n(k))));
  return terms;
}

function powerWithIndex(node: AstNode, index: string): { base: Rational; coefficient: Rational } | null {
  const simplified = simplifyAst(node);
  if (simplified.type === 'binary' && simplified.operator === '^') {
    const base = rationalValue(simplified.left);
    const exponent = toPolynomial(simplified.right, index);
    if (base && exponent && polynomialDegree(exponent) === 1 && eq(polynomialCoefficient(exponent, 1), ONE)) {
      const shift = polynomialCoefficient(exponent, 0);
      if (shift.d === 1n) {
        const shiftNumber = Number(shift.n);
        if (!(isZero(base) && shiftNumber < 0)) return { base, coefficient: pow(base, shiftNumber) };
      }
    }
  }
  if (simplified.type === 'binary' && simplified.operator === '*') {
    const left = rationalValue(simplified.left);
    const right = powerWithIndex(simplified.right, index);
    if (left && right) return { base: right.base, coefficient: mul(left, right.coefficient) };
    const rightConstant = rationalValue(simplified.right);
    const leftPower = powerWithIndex(simplified.left, index);
    if (rightConstant && leftPower) return { base: leftPower.base, coefficient: mul(rightConstant, leftPower.coefficient) };
  }
  return null;
}

function alternatingPowerSeries(node: AstNode, index: string): { coefficient: Rational; p: number } | null {
  const simplified = simplifyAst(node);
  if (simplified.type !== 'binary' || simplified.operator !== '/') return null;
  const numerator = powerWithIndex(simplified.left, index);
  if (!numerator || !eq(numerator.base, rat(-1))) return null;
  const denominator = simplified.right;
  if (denominator.type === 'symbol' && denominator.name === index) return { coefficient: numerator.coefficient, p: 1 };
  if (denominator.type === 'binary' && denominator.operator === '^' && denominator.left.type === 'symbol' && denominator.left.name === index) {
    const exponent = rationalValue(denominator.right);
    if (exponent && exponent.d === 1n) return { coefficient: numerator.coefficient, p: Number(exponent.n) };
  }
  return null;
}

function pSeries(node: AstNode, index: string): { coefficient: Rational; p: number } | null {
  const simplified = simplifyAst(node);
  if (simplified.type === 'binary' && simplified.operator === '/') {
    const coefficient = rationalValue(simplified.left);
    if (!coefficient) return null;
    if (simplified.right.type === 'symbol' && simplified.right.name === index) return { coefficient, p: 1 };
    if (simplified.right.type === 'binary' && simplified.right.operator === '^' && simplified.right.left.type === 'symbol' && simplified.right.left.name === index) {
      const exponent = rationalValue(simplified.right.right);
      if (exponent && exponent.d === 1n) return { coefficient, p: Number(exponent.n) };
    }
  }
  return null;
}

function isOscillatoryPower(node: AstNode, index: string): boolean {
  const power = powerWithIndex(node, index);
  return Boolean(power && power.base.n < 0n && rationalAbs(power.base).n >= rationalAbs(power.base).d);
}

function polynomialGeometricTerm(node: AstNode, index: string): { ratio: Rational; polynomialDegree: number } | null {
  const simplified = simplifyAst(node);
  const direct = powerWithIndex(simplified, index);
  if (direct) return { ratio: direct.base, polynomialDegree: 0 };
  if (simplified.type === 'binary' && simplified.operator === '*') {
    const leftPoly = toPolynomial(simplified.left, index);
    const rightGeom = powerWithIndex(simplified.right, index);
    if (leftPoly && rightGeom) return { ratio: rightGeom.base, polynomialDegree: polynomialDegree(leftPoly) };
    const rightPoly = toPolynomial(simplified.right, index);
    const leftGeom = powerWithIndex(simplified.left, index);
    if (rightPoly && leftGeom) return { ratio: leftGeom.base, polynomialDegree: polynomialDegree(rightPoly) };
  }
  if (simplified.type === 'binary' && simplified.operator === '/') {
    const numerator = toPolynomial(simplified.left, index);
    const denominatorGeom = powerWithIndex(simplified.right, index);
    if (numerator && denominatorGeom && !isZero(denominatorGeom.base)) return { ratio: div(ONE, denominatorGeom.base), polynomialDegree: polynomialDegree(numerator) };
  }
  return null;
}

function boundedTrigOverPower(node: AstNode, index: string): number | null {
  const simplified = simplifyAst(node);
  if (simplified.type !== 'binary' || simplified.operator !== '/') return null;
  const numerator = simplified.left;
  if (numerator.type !== 'call' || !['sin','cos'].includes(numerator.name) || numerator.args.length !== 1 || !same(numerator.args[0], s(index))) return null;
  if (simplified.right.type === 'symbol' && simplified.right.name === index) return 1;
  if (simplified.right.type === 'binary' && simplified.right.operator === '^' && same(simplified.right.left, s(index))) {
    const exponent = rationalValue(simplified.right.right);
    if (exponent && exponent.d === 1n) return Number(exponent.n);
  }
  return null;
}

export function sequenceConvergence(node: AstNode, index = 'n'): SequenceConvergence {
  const alternating = alternatingPowerSeries(node, index);
  if (alternating && alternating.p > 0) return { status:'convergent', limitAst:n(0), display:'Convergent to 0', reason:`The magnitude is |c|/n^${alternating.p} → 0; the alternating sign does not change the zero limit.`, warnings:[], steps:[{ rule:'squeeze-alternating-sequence', explanation:'Bound |a_n| by |c|/n^p and apply the squeeze theorem.', beforeAst:node, afterAst:n(0) }] };

  const trigPower = boundedTrigOverPower(node, index);
  if (trigPower !== null && trigPower > 0) return { status:'convergent', limitAst:n(0), display:'Convergent to 0', reason:`|${astToPlainText(node)}| is bounded by 1/n^${trigPower}, which tends to 0.`, warnings:[], steps:[{ rule:'squeeze-bounded-trig', explanation:'Use |sin n| ≤ 1 or |cos n| ≤ 1 and the squeeze theorem.', beforeAst:node, afterAst:n(0) }] };

  const geometric = powerWithIndex(node, index);
  if (geometric) {
    const absBase = rationalAbs(geometric.base);
    if (absBase.n < absBase.d) {
      return { status: 'convergent', limitAst: n(0), display: 'Convergent to 0', reason: `Geometric magnitude |${rationalToString(geometric.base)}| < 1.`, warnings: [], steps: [{ rule: 'geometric-sequence-limit', explanation: 'A geometric sequence c·r^n tends to 0 when |r| < 1.', beforeAst: node, afterAst: n(0) }] };
    }
    if (eq(geometric.base, ONE)) {
      const limit = rationalToAst(geometric.coefficient);
      return { status: 'convergent', limitAst: limit, display: `Convergent to ${astToPlainText(limit)}`, reason: 'The geometric ratio is 1, so the sequence is constant.', warnings: [], steps: [] };
    }
    if (geometric.base.n > geometric.base.d) {
      const limit = infinity(sign(geometric.coefficient));
      return { status:'divergent', limitAst:limit, display:`Divergent to ${astToPlainText(limit)}`, reason:'A positive geometric ratio r > 1 has unbounded magnitude.', warnings:[], steps:[{ rule:'geometric-sequence-divergence', explanation:'For r > 1, |c·r^n| grows without bound.', beforeAst:node, afterAst:limit }] };
    }
    if (isOscillatoryPower(node, index)) return { status: 'divergent', display: 'Divergent by oscillation', reason: 'A negative geometric ratio with |r| ≥ 1 does not approach one real limit.', warnings: [], steps: [] };
  }

  const polyGeometric = polynomialGeometricTerm(node, index);
  if (polyGeometric && polyGeometric.polynomialDegree > 0) {
    const magnitude = rationalAbs(polyGeometric.ratio);
    if (magnitude.n < magnitude.d) return { status:'convergent', limitAst:n(0), display:'Convergent to 0', reason:`Exponential decay |r|^n with |r| = ${rationalToString(magnitude)} < 1 dominates the polynomial factor n^${polyGeometric.polynomialDegree}.`, warnings:[], steps:[{ rule:'exponential-dominates-polynomial', explanation:'A fixed polynomial times r^n tends to zero when |r| < 1.', beforeAst:node, afterAst:n(0) }] };
    if (magnitude.n > magnitude.d) return { status:'divergent', display:polyGeometric.ratio.n < 0n ? 'Divergent by unbounded oscillation' : 'Divergent with unbounded magnitude', reason:'The exponential factor has |r| > 1, so the term cannot approach a finite limit.', warnings:[], steps:[] };
  }
  try {
    const transformed = analysisLimitAst(node, index, s('infinity'), 'both');
    const text = transformed.display ?? (transformed.ast ? astToPlainText(transformed.ast) : '');
    const infinite = transformed.ast?.type === 'symbol' && transformed.ast.name === 'infinity' || transformed.ast?.type === 'unary' && transformed.ast.operand.type === 'symbol' && transformed.ast.operand.name === 'infinity';
    const dne = transformed.ast?.type === 'symbol' && transformed.ast.name === 'DNE';
    if (dne) return { status: 'divergent', display: text || 'Divergent', reason: 'The sequence limit does not exist.', warnings: transformed.warnings, steps: transformed.steps };
    if (infinite) return { status: 'divergent', limitAst: transformed.ast, display: `Divergent (${text || astToPlainText(transformed.ast!)})`, reason: 'The sequence is unbounded in the extended-real sense rather than converging to a finite real number.', warnings: transformed.warnings, steps: transformed.steps };
    if (transformed.ast) return { status: 'convergent', limitAst: transformed.ast, display: `Convergent to ${astToPlainText(transformed.ast)}`, reason: 'The verified limit as n → ∞ is finite.', warnings: transformed.warnings, steps: transformed.steps };
  } catch { /* fall through to explicit unknown */ }
  return { status: 'unknown', display: 'Convergence not proved', reason: 'P9 could not prove convergence or divergence with its bounded exact sequence rules.', warnings: ['Unknown does not mean divergent; MathLab is withholding a claim that its current rule set cannot verify.'], steps: [] };
}

export function partialSum(node: AstNode, index = 'n', start = 1, end = 10): AstNode {
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || end - start > 999) throw new Error('Partial sums require integer bounds with at most 1000 terms.');
  let total = ZERO;
  for (let k = start; k <= end; k += 1) {
    const term = simplifyAst(substituteAst(node, index, n(k)));
    const value = rationalValue(term);
    if (!value) throw new Error(`Exact partial sums currently require rational-valued terms; a_${k} could not be reduced to a rational number.`);
    total = add(total, value);
  }
  return rationalToAst(total);
}

function geometricSeriesSum(term: { base: Rational; coefficient: Rational }, start: number): AstNode | undefined {
  const absBase = rationalAbs(term.base);
  if (absBase.n >= absBase.d) return undefined;
  const numerator = mul(term.coefficient, pow(term.base, start));
  return rationalToAst(div(numerator, sub(ONE, term.base)));
}

export function seriesConvergence(node: AstNode, index = 'n', start = 1): SeriesConvergence {
  const termLimit = sequenceConvergence(node, index);
  const termLimitValue = termLimit.limitAst ? rationalValue(simplifyAst(termLimit.limitAst)) : null;
  if (termLimit.status === 'divergent' || (termLimitValue && !isZero(termLimitValue))) {
    return {
      status: 'divergent', display: 'Divergent', reason: 'Nth-term test: a convergent series must satisfy a_n → 0.', warnings: [],
      sections: [{ id: 'nth-term-test', title: 'Necessary condition', facts: [{ label: 'lim a_n', display: termLimit.limitAst ? astToPlainText(termLimit.limitAst) : termLimit.display, tone: 'negative' }, { label: 'Conclusion', display: 'The series diverges.', tone: 'negative' }], description: 'This is a one-way theorem: a_n → 0 is necessary, not sufficient, for ∑a_n to converge.' }],
    };
  }

  const geometric = powerWithIndex(node, index);
  if (geometric) {
    const absBase = rationalAbs(geometric.base);
    const converges = absBase.n < absBase.d;
    const sumAst = converges ? geometricSeriesSum(geometric, start) : undefined;
    return {
      status: converges ? 'absolutely-convergent' : 'divergent',
      display: converges ? 'Absolutely convergent (geometric series)' : 'Divergent geometric series',
      reason: converges ? `|r| = ${rationalToString(absBase)} < 1.` : `|r| = ${rationalToString(absBase)} ≥ 1.`,
      sumAst,
      warnings: [],
      sections: [{ id: 'geometric-test', title: 'Geometric-series test', facts: [
        { label: 'Ratio r', display: rationalToString(geometric.base) },
        { label: '|r|', display: rationalToString(absBase) },
        { label: 'Conclusion', display: converges ? 'Absolute convergence' : 'Divergence', tone: converges ? 'positive' : 'negative' },
        ...(sumAst ? [{ label: `Sum from n = ${start}`, display: astToPlainText(sumAst), ast: sumAst, tone: 'positive' as const }] : []),
      ] }],
    };
  }

  const polyGeometric = polynomialGeometricTerm(node, index);
  if (polyGeometric && polyGeometric.polynomialDegree > 0) {
    const magnitude = rationalAbs(polyGeometric.ratio);
    if (magnitude.n < magnitude.d) return {
      status:'absolutely-convergent', display:'Absolutely convergent by ratio test', reason:`The polynomial factor changes the term ratio only by a factor tending to 1, leaving ratio limit |r| = ${rationalToString(magnitude)} < 1.`, warnings:[],
      sections:[{ id:'ratio-test', title:'Ratio test', facts:[{ label:'Ratio limit', display:rationalToString(magnitude) },{ label:'Conclusion', display:'Absolute convergence', tone:'positive' }], description:'P9 applies this theorem to recognized polynomial × geometric terms.' }],
    };
    if (magnitude.n > magnitude.d) return { status:'divergent', display:'Divergent by nth-term / ratio behavior', reason:`The exponential magnitude ratio ${rationalToString(magnitude)} > 1 prevents terms from tending to zero.`, warnings:[], sections:[{ id:'ratio-test', title:'Ratio test', facts:[{label:'Ratio magnitude',display:rationalToString(magnitude)},{label:'Conclusion',display:'Divergent',tone:'negative'}] }] };
  }

  const alternating = alternatingPowerSeries(node, index);
  if (alternating && alternating.p > 0) {
    const absolute = alternating.p > 1;
    return {
      status: absolute ? 'absolutely-convergent' : 'conditionally-convergent',
      display: absolute ? 'Absolutely convergent' : 'Conditionally convergent',
      reason: absolute ? `The absolute series is a p-series with p = ${alternating.p} > 1.` : `The alternating-series test applies, while the absolute p-series has p = ${alternating.p} ≤ 1 and diverges.`,
      warnings: alternating.p <= 1 ? ['Conditional convergence depends on the alternating sign and decreasing magnitude; rearrangement can change the sum.'] : [],
      sections: [{ id: 'alternating-test', title: 'Alternating / absolute convergence', facts: [
        { label: 'p', display: String(alternating.p) },
        { label: 'Absolute series', display: absolute ? 'Convergent' : 'Divergent' },
        { label: 'Original series', display: absolute ? 'Absolutely convergent' : 'Conditionally convergent', tone: 'positive' },
      ], description: 'P9 applies this rule only to the recognized family c·(-1)^n/n^p.' }],
    };
  }

  const p = pSeries(node, index);
  if (p) {
    const converges = p.p > 1;
    return {
      status: converges ? 'absolutely-convergent' : 'divergent',
      display: converges ? 'Absolutely convergent (p-series)' : 'Divergent (p-series)',
      reason: converges ? `p = ${p.p} > 1.` : `p = ${p.p} ≤ 1.`,
      warnings: [],
      sections: [{ id: 'p-series-test', title: 'p-series test', facts: [{ label: 'p', display: String(p.p) }, { label: 'Conclusion', display: converges ? 'Convergent' : 'Divergent', tone: converges ? 'positive' : 'negative' }] }],
    };
  }

  const rational = rationalFunction(node, index);
  if (rational) {
    const numeratorDegree = polynomialDegree(rational.numerator);
    const denominatorDegree = polynomialDegree(rational.denominator);
    const pValue = denominatorDegree - numeratorDegree;
    const numeratorLead = polynomialCoefficient(rational.numerator, numeratorDegree);
    const denominatorLead = polynomialCoefficient(rational.denominator, denominatorDegree);
    if (pValue > 0 && !isZero(numeratorLead) && !isZero(denominatorLead)) {
      const converges = pValue > 1;
      return {
        status: converges ? 'absolutely-convergent' : 'divergent',
        display: converges ? 'Absolutely convergent by limit comparison' : 'Divergent by limit comparison',
        reason: `The term is asymptotic to C/n^${pValue} with nonzero C, so it has the same convergence behavior as the p-series ∑1/n^${pValue}.`,
        warnings: [],
        sections: [{ id: 'limit-comparison', title: 'Limit comparison', facts: [
          { label: 'Numerator degree', display: String(numeratorDegree) },
          { label: 'Denominator degree', display: String(denominatorDegree) },
          { label: 'Comparison exponent p', display: String(pValue) },
          { label: 'Conclusion', display: converges ? 'Absolute convergence' : 'Divergence', tone: converges ? 'positive' : 'negative' },
        ] }],
      };
    }
  }

  return {
    status: 'unknown', display: 'Convergence not proved', reason: 'No verified P9 convergence test matched this exact term family.',
    warnings: ['The nth-term condition a_n → 0 is not sufficient for convergence. MathLab intentionally does not infer convergence from that condition alone.'],
    sections: [{ id: 'test-boundary', title: 'Analysis boundary', facts: [{ label: 'Nth-term condition', display: termLimit.display }, { label: 'Conclusion', display: 'No supported test proves the series', tone: 'warning' }], description: 'Try algebraic simplification or use a recognized geometric, p-series, alternating p-series, or rational-comparison form.' }],
  };
}

function continuousElementary(node: AstNode, variable: string): boolean {
  if (node.type === 'number' || node.type === 'symbol') return true;
  if (node.type === 'unary') return continuousElementary(node.operand, variable);
  if (node.type === 'binary') {
    if (node.operator === '/') return false;
    if (node.operator === '^') {
      const exponent = rationalValue(node.right);
      return Boolean(exponent && exponent.d === 1n && exponent.n >= 0n && continuousElementary(node.left, variable));
    }
    return continuousElementary(node.left, variable) && continuousElementary(node.right, variable);
  }
  if (node.type === 'call') {
    return ['sin','cos','exp','sinh','cosh','tanh'].includes(node.name) && node.args.every((arg) => continuousElementary(arg, variable));
  }
  return false;
}

export function continuityProfile(node: AstNode, variable: string): AnalysisTransform {
  const restrictions = domainNotes(node, variable);
  const rational = rationalDiscontinuities(node, variable);
  const facts: MathResultFact[] = [];
  const warnings: string[] = [];

  if (continuousElementary(node, variable)) {
    facts.push({ label: 'Continuity set', display: 'All real numbers', tone: 'positive' });
    facts.push({ label: 'Reason', display: 'Built from globally continuous elementary functions using continuity-preserving operations.' });
  } else if (rational) {
    facts.push({ label: 'Continuous on', display: rational.holes.length || rational.poles.length ? `R except {${[...rational.holes, ...rational.poles].map(astToPlainText).join(', ')}}` : 'All real numbers', tone: 'positive' });
    if (rational.holes.length) facts.push({ label: 'Removable discontinuities', display: rational.holes.map(astToPlainText).join(', '), tone: 'warning' });
    if (rational.poles.length) facts.push({ label: 'Infinite discontinuities / poles', display: rational.poles.map(astToPlainText).join(', '), tone: 'negative' });
    if (rational.unresolved) warnings.push('The denominator has roots outside the current exact degree-2 root classifier, so the discontinuity list may be incomplete.');
  } else {
    facts.push({ label: 'Detected real-domain restrictions', display: restrictions.length ? restrictions.join(' · ') : 'None detected by the current rule set' });
    facts.push({ label: 'Continuity claim', display: restrictions.length ? 'Continuous wherever all constituent elementary operations are defined, within the verified P9 composition rules.' : 'Global continuity not proved by the current bounded rule set.', tone: restrictions.length ? 'positive' : 'warning' });
  }

  return {
    ast: node,
    warnings,
    steps: [],
    sections: [{ id: 'continuity', title: 'Continuity profile', facts, description: 'MathLab distinguishes “continuous on its domain” from “continuous on all real numbers”; domain exclusions are never silently filled in.' }],
  };
}

export function continuityAt(node: AstNode, variable: string, point: AstNode): AnalysisTransform {
  let value: AstNode | undefined;
  let valueText = 'Undefined';
  try {
    value = evaluateAt(node, variable, point);
    const valueRat = rationalValue(value);
    if (!valueRat && value.type === 'binary' && value.operator === '/' && rationalValue(value.right) && isZero(rationalValue(value.right)!)) value = undefined;
    if (value) valueText = astToPlainText(value);
  } catch { value = undefined; }

  let limit: LimitResult;
  try { limit = analysisLimitAst(node, variable, point, 'both'); }
  catch (error) {
    return { warnings: [error instanceof Error ? error.message : 'Could not prove the point limit.'], steps: [], sections: [{ id: 'continuity-at', title: `Continuity at ${variable} = ${astToPlainText(point)}`, facts: [{ label: 'Function value', display: valueText }, { label: 'Limit', display: 'Not proved' }, { label: 'Conclusion', display: 'Continuity not established', tone: 'warning' }] }] };
  }
  const limitText = limit.display ?? (limit.ast ? astToPlainText(limit.ast) : 'Unknown');
  const isContinuous = Boolean(value && limit.ast && same(simplifyAst(value), simplifyAst(limit.ast)) && !(limit.ast.type === 'symbol' && ['DNE','infinity'].includes(limit.ast.name)));
  return {
    ast: isContinuous ? n(1) : n(0),
    display: isContinuous ? 'Continuous at the point' : 'Not continuous at the point',
    warnings: limit.warnings,
    steps: limit.steps,
    sections: [{ id: 'continuity-at', title: `Continuity at ${variable} = ${astToPlainText(point)}`, facts: [
      { label: `f(${astToPlainText(point)})`, display: valueText },
      { label: 'Two-sided limit', display: limitText },
      { label: 'Conclusion', display: isContinuous ? 'Continuous' : 'Not continuous', tone: isContinuous ? 'positive' : 'negative' },
    ], description: 'Continuity at a requires both f(a) to be defined and limₓ→ₐ f(x) = f(a).' }],
  };
}

export function taylorPolynomial(node: AstNode, variable: string, center: AstNode, order: number): AnalysisTransform {
  if (!Number.isInteger(order) || order < 0 || order > 10) throw new Error('P9 Taylor polynomials support orders 0 through 10.');
  const centerValue = rationalValue(simplifyAst(center));
  if (!centerValue) throw new Error('P9 Taylor centers currently require an exact rational value.');
  let derivative = node;
  let polynomial: AstNode = n(0);
  const steps: CalculusStep[] = [];
  const facts: MathResultFact[] = [];
  for (let k = 0; k <= order; k += 1) {
    let atCenter: AstNode;
    try { atCenter = simplifyAst(evaluateAt(derivative, variable, center)); }
    catch { throw new Error(`The ${k === 0 ? 'function' : `${k}th derivative`} is not evaluable at the requested center within P9's exact rules.`); }
    const coefficient = simplifyAst(b('/', atCenter, n(factorial(k))));
    const shift = simplifyAst(b('-', s(variable), center));
    const term = k === 0 ? coefficient : simplifyAst(b('*', coefficient, b('^', shift, n(k))));
    polynomial = simplifyAst(b('+', polynomial, term));
    facts.push({ label: k === 0 ? 'f(a)' : `f^(${k})(a) / ${k}!`, display: astToPlainText(coefficient), ast: coefficient });
    if (k < order) {
      const transformed = differentiateAst(derivative, variable);
      steps.push(...transformed.steps);
      derivative = transformed.ast;
    }
  }
  return {
    ast: simplifyAst(polynomial),
    warnings: ['A Taylor polynomial is a finite local approximation. P9 does not claim the infinite Taylor series equals the function unless a supported convergence theorem/profile establishes that separately.'],
    steps,
    sections: [{ id: 'taylor-coefficients', title: `Taylor coefficients about ${variable} = ${astToPlainText(center)}`, facts }, { id: 'taylor-remainder', title: 'Remainder boundary', facts: [{ label: 'Degree', display: String(order) }, { label: 'Guarantee', display: 'Finite Taylor polynomial computed exactly; no unproved global equality to an infinite series.', tone: 'warning' }] }],
  };
}

function isSymbol(node: AstNode, name: string): boolean { return node.type === 'symbol' && node.name === name; }
function isNumberValue(node: AstNode, value: Rational): boolean { const candidate = rationalValue(simplifyAst(node)); return Boolean(candidate && eq(candidate, value)); }

export function powerSeriesProfile(node: AstNode, variable: string, center: AstNode): AnalysisTransform {
  const centerValue = rationalValue(simplifyAst(center));
  if (!centerValue) throw new Error('P9 power-series profiles currently require an exact rational center.');
  const simplified = simplifyAst(node);
  const facts: MathResultFact[] = [{ label: 'Center', display: astToPlainText(center) }];
  const warnings: string[] = [];
  const polynomial = toPolynomial(simplified, variable);
  if (polynomial) {
    facts.push({ label: 'Series type', display: 'Finite Taylor series (polynomial)', tone: 'positive' });
    facts.push({ label: 'Radius of convergence', display: '∞', tone: 'positive' });
    facts.push({ label: 'Interval of convergence', display: '(-∞, ∞)', tone: 'positive' });
    return { ast: simplified, warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts, description: 'A polynomial is its own Taylor series after finitely many terms, so convergence is global.' }] };
  }
  if (!isZero(centerValue)) {
    warnings.push('General nonzero-center singularity-distance analysis is deferred. Taylor polynomials are still available at rational centers.');
    facts.push({ label: 'Infinite-series profile', display: 'Not proved for this center', tone: 'warning' });
    return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
  }

  if (simplified.type === 'call' && simplified.args.length === 1 && isSymbol(simplified.args[0], variable)) {
    if (simplified.name === 'exp') {
      facts.push({ label: 'Maclaurin series', display: 'Σₙ₌₀∞ x^n / n!' }, { label: 'Radius', display: '∞', tone: 'positive' }, { label: 'Interval', display: '(-∞, ∞)', tone: 'positive' });
      return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
    }
    if (simplified.name === 'sin') {
      facts.push({ label: 'Maclaurin series', display: 'Σₙ₌₀∞ (-1)^n x^(2n+1)/(2n+1)!' }, { label: 'Radius', display: '∞', tone: 'positive' }, { label: 'Interval', display: '(-∞, ∞)', tone: 'positive' });
      return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
    }
    if (simplified.name === 'cos') {
      facts.push({ label: 'Maclaurin series', display: 'Σₙ₌₀∞ (-1)^n x^(2n)/(2n)!' }, { label: 'Radius', display: '∞', tone: 'positive' }, { label: 'Interval', display: '(-∞, ∞)', tone: 'positive' });
      return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
    }
  }

  if (simplified.type === 'binary' && simplified.operator === '/' && isNumberValue(simplified.left, ONE)) {
    const denominator = toPolynomial(simplified.right, variable);
    if (denominator && polynomialDegree(denominator) === 1 && eq(polynomialCoefficient(denominator, 0), ONE)) {
      const xCoefficient = polynomialCoefficient(denominator, 1);
      if (!isZero(xCoefficient)) {
        const ratio = neg(xCoefficient);
        const radius = div(ONE, rationalAbs(ratio));
        facts.push({ label: 'Geometric form', display: `Σₙ₌₀∞ (${rationalToString(ratio)}x)^n` });
        facts.push({ label: 'Radius', display: rationalToString(radius), tone: 'positive' });
        facts.push({ label: 'Interval of convergence', display: `(-${rationalToString(radius)}, ${rationalToString(radius)})`, tone: 'positive' });
        facts.push({ label: 'Endpoint reasoning', display: 'At |x| = R, the geometric-series terms have magnitude 1 and therefore do not tend to 0; both endpoints diverge.' });
        return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
      }
    }
  }

  if (simplified.type === 'call' && simplified.name === 'ln' && simplified.args.length === 1) {
    const argument = toPolynomial(simplified.args[0], variable);
    if (argument && polynomialDegree(argument) === 1 && eq(polynomialCoefficient(argument, 0), ONE)) {
      const c = polynomialCoefficient(argument, 1);
      if (eq(c, ONE)) {
        facts.push({ label: 'Maclaurin series', display: 'Σₙ₌₁∞ (-1)^(n+1) x^n/n' }, { label: 'Radius', display: '1', tone: 'positive' }, { label: 'Interval', display: '(-1, 1]', tone: 'positive' }, { label: 'Endpoint reasoning', display: 'x=1 converges by alternating-series test; x=-1 is the negative harmonic series and diverges.' });
        return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
      }
      if (eq(c, rat(-1))) {
        facts.push({ label: 'Maclaurin series', display: '-Σₙ₌₁∞ x^n/n' }, { label: 'Radius', display: '1', tone: 'positive' }, { label: 'Interval', display: '[-1, 1)', tone: 'positive' });
        return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
      }
    }
  }

  warnings.push('No verified closed-form power-series family matched this function. Use Taylor polynomial for finite local approximation.');
  facts.push({ label: 'Infinite-series profile', display: 'Not proved', tone: 'warning' });
  return { warnings, steps: [], sections: [{ id: 'power-series', title: 'Power-series profile', facts }] };
}

export function asymptoticProfile(node: AstNode, variable: string): AnalysisTransform {
  const simplified = simplifyAst(node);
  const facts: MathResultFact[] = [];
  const warnings: string[] = [];
  const polynomial = toPolynomial(simplified, variable);
  if (polynomial) {
    const degree = polynomialDegree(polynomial);
    const lead = polynomialCoefficient(polynomial, degree);
    facts.push({ label: 'Leading term', display: astToPlainText(simplifyAst(b('*', rationalToAst(lead), b('^', s(variable), n(degree))))) });
    facts.push({ label: 'Growth class', display: degree === 0 ? 'Θ(1)' : `Θ(|${variable}|^${degree})` });
    facts.push({ label: 'Degree', display: String(degree) });
    try {
      const plus = analysisLimitAst(simplified, variable, s('infinity'));
      facts.push({ label: `${variable} → +∞`, display: plus.display ?? astToPlainText(plus.ast!) });
    } catch { /* optional */ }
    try {
      const minus = analysisLimitAst(simplified, variable, u('-', s('infinity')));
      facts.push({ label: `${variable} → -∞`, display: minus.display ?? astToPlainText(minus.ast!) });
    } catch { /* optional */ }
    return { ast: simplified, warnings, steps: [], sections: [{ id: 'asymptotic', title: 'Asymptotic profile', facts }] };
  }

  const rational = rationalFunction(simplified, variable);
  if (rational) {
    const numeratorDegree = polynomialDegree(rational.numerator);
    const denominatorDegree = polynomialDegree(rational.denominator);
    const degreeDifference = numeratorDegree - denominatorDegree;
    facts.push({ label: 'Degree difference', display: `${numeratorDegree} − ${denominatorDegree} = ${degreeDifference}` });
    if (degreeDifference >= 0) {
      const division = dividePolynomials(rational.numerator, rational.denominator);
      const quotient = polynomialToAst(division.quotient, variable);
      facts.push({ label: degreeDifference === 0 ? 'Horizontal asymptote' : degreeDifference === 1 ? 'Oblique asymptote' : 'Polynomial asymptote', display: `y = ${astToPlainText(quotient)}`, ast: quotient, tone: 'positive' });
    } else {
      facts.push({ label: 'Horizontal asymptote', display: 'y = 0', tone: 'positive' });
    }
    facts.push({ label: 'Growth class', display: degreeDifference === 0 ? 'Θ(1)' : degreeDifference > 0 ? `Θ(|${variable}|^${degreeDifference})` : `Θ(1/|${variable}|^${-degreeDifference})` });
    const discontinuities = rationalDiscontinuities(simplified, variable);
    if (discontinuities?.poles.length) facts.push({ label: 'Vertical asymptotes', display: discontinuities.poles.map((root) => `${variable} = ${astToPlainText(root)}`).join(', '), tone: 'warning' });
    if (discontinuities?.holes.length) facts.push({ label: 'Removable holes', display: discontinuities.holes.map((root) => `${variable} = ${astToPlainText(root)}`).join(', ') });
    return { ast: simplified, warnings, steps: [], sections: [{ id: 'asymptotic', title: 'Asymptotic profile', facts, description: 'Polynomial division determines the polynomial asymptote; removable holes are not mislabeled as vertical asymptotes.' }] };
  }

  if (simplified.type === 'call' && simplified.args.length === 1 && isSymbol(simplified.args[0], variable)) {
    if (simplified.name === 'exp') facts.push({ label: 'Growth', display: 'Exponential; faster than every fixed positive power of x as x → +∞.' }, { label: `${variable} → +∞`, display: '+∞' }, { label: `${variable} → -∞`, display: '0' });
    if (simplified.name === 'ln') facts.push({ label: 'Growth', display: 'Logarithmic; slower than every positive power x^a as x → +∞.' }, { label: `${variable} → +∞`, display: '+∞' }, { label: 'Domain', display: `${variable} > 0` });
    if (facts.length) return { ast: simplified, warnings, steps: [], sections: [{ id: 'asymptotic', title: 'Asymptotic profile', facts }] };
  }

  return { warnings: ['P9 could not classify this expression asymptotically with its verified polynomial/rational/elementary rules.'], steps: [], sections: [{ id: 'asymptotic', title: 'Asymptotic profile', facts: [{ label: 'Classification', display: 'Not proved', tone: 'warning' }] }] };
}

export function differentiabilityProfile(node: AstNode, variable: string): AnalysisTransform {
  const simplified = simplifyAst(node);
  const facts: MathResultFact[] = [];
  const warnings: string[] = [];
  const polynomial = toPolynomial(simplified, variable);
  if (polynomial) {
    facts.push({ label:'Differentiable on', display:'All real numbers', tone:'positive' });
    facts.push({ label:'Reason', display:'Every polynomial is differentiable on R.' });
  } else {
    const rational = rationalDiscontinuities(simplified, variable);
    if (rational) {
      const excluded=[...rational.holes,...rational.poles];
      facts.push({ label:'Differentiable on', display:excluded.length ? `R except {${excluded.map(astToPlainText).join(', ')}}` : 'All real numbers', tone:'positive' });
      if(rational.holes.length) facts.push({ label:'Removable discontinuities', display:rational.holes.map(astToPlainText).join(', '), tone:'negative' });
      if(rational.poles.length) facts.push({ label:'Poles', display:rational.poles.map(astToPlainText).join(', '), tone:'negative' });
      if(rational.unresolved) warnings.push('Some denominator roots exceed the current exact classifier, so the exceptional set may be incomplete.');
    } else if (simplified.type === 'call' && simplified.name === 'abs' && simplified.args.length === 1) {
      const inner=toPolynomial(simplified.args[0],variable);
      if(inner && polynomialDegree(inner)===1 && !isZero(polynomialCoefficient(inner,1))) {
        const root=div(neg(polynomialCoefficient(inner,0)),polynomialCoefficient(inner,1));
        facts.push({ label:'Differentiable on', display:`R except {${rationalToString(root)}}`, tone:'positive' });
        facts.push({ label:'Nondifferentiable point', display:`${variable} = ${rationalToString(root)} (corner of |affine|)`, tone:'negative' });
      } else facts.push({ label:'Global differentiability', display:'Not classified for this absolute-value composition', tone:'warning' });
    } else if (simplified.type === 'call' && ['floor','ceil'].includes(simplified.name) && simplified.args.length===1 && isSymbol(simplified.args[0],variable)) {
      facts.push({ label:'Differentiable on', display:'R \ Z', tone:'positive' });
      facts.push({ label:'Derivative there', display:'0' });
      facts.push({ label:'At integers', display:'Discontinuous, hence not differentiable', tone:'negative' });
    } else {
      try {
        const derivative=differentiateAst(simplified,variable);
        facts.push({ label:'Derivative formula', display:astToPlainText(derivative.ast), ast:derivative.ast });
        facts.push({ label:'Differentiability set', display:'Where both the original function and derivative formula are defined within the inherited real domain.', tone:'positive' });
        warnings.push(...derivative.warnings);
      } catch(error) {
        facts.push({ label:'Differentiability', display:'Not proved by the current P9 rule set', tone:'warning' });
        warnings.push(error instanceof Error ? error.message : 'Derivative rule unavailable.');
      }
    }
  }
  facts.push({ label:'Theorem guard', display:'Differentiability implies continuity at a point; continuity alone does not imply differentiability.', tone:'warning' });
  return { ast:simplified, warnings:[...new Set(warnings)], steps:[], sections:[{ id:'differentiability', title:'Differentiability profile', facts }] };
}

export function differentiabilityAt(node: AstNode, variable: string, point: AstNode): AnalysisTransform {
  const pointText=astToPlainText(point);
  const pointValue=rationalValue(simplifyAst(point));
  const simplified=simplifyAst(node);

  if (pointValue && simplified.type==='call' && ['floor','ceil'].includes(simplified.name) && simplified.args.length===1 && isSymbol(simplified.args[0],variable)) {
    const integer=pointValue.d===1n;
    return { ast:integer?n(0):n(1), display:integer?'Not differentiable at the point':'Differentiable at the point', warnings:[], steps:[], sections:[{ id:'differentiability-at', title:`Differentiability at ${variable} = ${pointText}`, facts:[
      { label:'Continuity', display:integer?'Discontinuous at an integer':'Continuous locally between adjacent integers', tone:integer?'negative':'positive' },
      { label:'Derivative', display:integer?'Does not exist':'0', tone:integer?'negative':'positive' },
      { label:'Conclusion', display:integer?'Not differentiable':'Differentiable', tone:integer?'negative':'positive' },
    ] }] };
  }

  const continuity=continuityAt(simplified,variable,point);
  const continuous=continuity.ast?.type==='number' && continuity.ast.value==='1';
  if(!continuous) return { ast:n(0), display:'Not differentiable at the point', warnings:continuity.warnings, steps:continuity.steps, sections:[...(continuity.sections??[]),{ id:'differentiability-at', title:'Differentiability conclusion', facts:[{ label:'Conclusion', display:'Not differentiable because differentiability would imply continuity.', tone:'negative' }] }] };

  if(pointValue && simplified.type==='call' && simplified.name==='sqrt' && simplified.args.length===1) {
    const inner=toPolynomial(simplified.args[0],variable);
    if(inner && polynomialDegree(inner)<=1) {
      const innerAt=evaluatePolynomial(inner,pointValue);
      const slope=polynomialCoefficient(inner,1);
      if(isZero(innerAt) && !isZero(slope)) {
        return { ast:n(0), display:'Not differentiable at the point', warnings:[], steps:[], sections:[{ id:'differentiability-at', title:`Differentiability at ${variable} = ${pointText}`, facts:[
          { label:'Continuity', display:'Continuous on its real-domain boundary', tone:'positive' },
          { label:'Difference quotient', display:'Unbounded from the admissible side; no finite two-sided derivative exists', tone:'negative' },
          { label:'Conclusion', display:'Not differentiable as a real function on an open neighborhood of the point', tone:'negative' },
        ], description:'A square root of a nonconstant affine function has a vertical tangent/domain boundary at its simple radicand zero.' }] };
      }
    }
  }

  if(pointValue && simplified.type==='call' && simplified.name==='abs' && simplified.args.length===1) {
    const inner=toPolynomial(simplified.args[0],variable);
    if(inner && polynomialDegree(inner)<=1) {
      const innerAt=evaluatePolynomial(inner,pointValue);
      const slope=polynomialCoefficient(inner,1);
      if(isZero(innerAt) && !isZero(slope)) {
        const absSlope=rationalAbs(slope);
        return { ast:n(0), display:'Not differentiable at the point', warnings:[], steps:[], sections:[{ id:'differentiability-at', title:`Differentiability at ${variable} = ${pointText}`, facts:[
          { label:'Continuity', display:'Continuous', tone:'positive' },
          { label:'Left derivative', display:rationalToString(neg(absSlope)) },
          { label:'Right derivative', display:rationalToString(absSlope) },
          { label:'Conclusion', display:'Not differentiable: one-sided derivatives disagree', tone:'negative' },
        ], description:'P9 resolves the corner of an absolute value of a nonconstant affine function exactly.' }] };
      }
      const derivativeValue=sign(innerAt)>=0?slope:neg(slope);
      return { ast:rationalToAst(derivativeValue), display:`Differentiable; derivative = ${rationalToString(derivativeValue)}`, warnings:[], steps:[], sections:[{ id:'differentiability-at', title:`Differentiability at ${variable} = ${pointText}`, facts:[{ label:'Continuity', display:'Continuous', tone:'positive' },{ label:'Derivative', display:rationalToString(derivativeValue), tone:'positive' },{ label:'Conclusion', display:'Differentiable', tone:'positive' }] }] };
    }
  }

  try {
    const derivative=differentiateAst(simplified,variable);
    const derivativeAt=evaluateAt(derivative.ast,variable,point);
    return { ast:derivativeAt, display:`Differentiable; derivative = ${astToPlainText(derivativeAt)}`, warnings:derivative.warnings, steps:derivative.steps, sections:[{ id:'differentiability-at', title:`Differentiability at ${variable} = ${pointText}`, facts:[
      { label:'Continuity', display:'Continuous', tone:'positive' },
      { label:'Derivative', display:astToPlainText(derivativeAt), ast:derivativeAt, tone:'positive' },
      { label:'Conclusion', display:'Differentiable', tone:'positive' },
    ] }] };
  } catch(error) {
    return { ast:n(0), display:'Differentiability not established', warnings:[error instanceof Error?error.message:'Derivative evaluation failed.'], steps:[], sections:[{ id:'differentiability-at', title:`Differentiability at ${variable} = ${pointText}`, facts:[{ label:'Continuity', display:'Continuous' },{ label:'Derivative', display:'Not proved / not finite in the supported rules', tone:'warning' },{ label:'Conclusion', display:'Differentiability not established', tone:'warning' }] }] };
  }
}

export function analysisOverview(node: AstNode, variable: string): AnalysisTransform {
  const continuity = continuityProfile(node, variable);
  const differentiability = differentiabilityProfile(node, variable);
  const asymptotic = asymptoticProfile(node, variable);
  return {
    ast: node,
    warnings: [...new Set([...continuity.warnings, ...differentiability.warnings, ...asymptotic.warnings])],
    steps: [],
    sections: [...(continuity.sections ?? []), ...(differentiability.sections ?? []), ...(asymptotic.sections ?? [])],
  };
}
