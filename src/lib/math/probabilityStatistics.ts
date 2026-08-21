import type { AstNode } from './ast';
import { rationalToAst, rationalValue, simplifyAst } from './algebra';
import { parseMath } from './parser';
import {
  ONE,
  ZERO,
  add,
  div,
  eq,
  mul,
  pow,
  rat,
  rationalToNumber,
  rationalToString,
  sign,
  sub,
  type Rational,
} from './rational';
import type { MathResultFact, MathResultSection } from './types';

export type DistributionFamily = 'bernoulli' | 'binomial' | 'geometric' | 'poisson' | 'uniform' | 'normal';

export interface DistributionSpec {
  family: DistributionFamily;
  args: Rational[];
}

export interface ProbabilityTransform {
  ast?: AstNode;
  display?: string;
  exactness: 'exact' | 'approximate' | 'heuristic';
  warnings: string[];
  sections: MathResultSection[];
}

function n(value: string | number | bigint): AstNode { return { type: 'number', value: String(value) }; }
function s(name: string): AstNode { return { type: 'symbol', name }; }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode { return { type: 'binary', operator, left, right }; }
function call(name: string, ...args: AstNode[]): AstNode { return { type: 'call', name, args }; }
function rAst(value: Rational): AstNode { return rationalToAst(value); }
function section(id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection { return { id, title, facts, description }; }
function fixed(value: number, digits = 6): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if ((abs > 0 && abs < 1e-5) || abs >= 1e7) return value.toExponential(5);
  return Number(value.toFixed(digits)).toString();
}

function compareRational(a: Rational, c: Rational): number {
  const lhs = a.n * c.d;
  const rhs = c.n * a.d;
  return lhs === rhs ? 0 : lhs < rhs ? -1 : 1;
}

function sumRationals(values: Rational[]): Rational { return values.reduce(add, ZERO); }
function meanRational(values: Rational[]): Rational {
  if (!values.length) throw new Error('A dataset must contain at least one value.');
  return div(sumRationals(values), rat(values.length));
}
function squared(value: Rational): Rational { return mul(value, value); }

function medianSorted(values: Rational[]): Rational {
  if (!values.length) throw new Error('Median requires at least one value.');
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 1 ? values[middle] : div(add(values[middle - 1], values[middle]), rat(2));
}

function datasetValuesFromAst(node: AstNode): Rational[] {
  const simplified = simplifyAst(node);
  const cells = simplified.type === 'call' && simplified.name === 'data'
    ? simplified.args
    : simplified.type === 'matrix' && simplified.rows.length === 1
      ? simplified.rows[0]
      : null;
  if (!cells) throw new Error('Statistics expects data(…) or a numeric vector such as [1, 2, 3].');
  if (!cells.length) throw new Error('A dataset must contain at least one observation.');
  return cells.map((cell, index) => {
    const value = rationalValue(simplifyAst(cell));
    if (!value) throw new Error(`Observation ${index + 1} is not an exact rational number. Define or substitute unresolved values first.`);
    return value;
  });
}

function sampleVariance(values: Rational[]): Rational {
  if (values.length < 2) throw new Error('Sample variance requires at least two observations.');
  const mean = meanRational(values);
  return div(values.reduce((total, value) => add(total, squared(sub(value, mean))), ZERO), rat(values.length - 1));
}
function populationVariance(values: Rational[]): Rational {
  const mean = meanRational(values);
  return div(values.reduce((total, value) => add(total, squared(sub(value, mean))), ZERO), rat(values.length));
}

function modeValues(values: Rational[]): Rational[] {
  const counts = new Map<string, { value: Rational; count: number }>();
  for (const value of values) {
    const key = rationalToString(value);
    const current = counts.get(key);
    counts.set(key, { value, count: (current?.count ?? 0) + 1 });
  }
  const max = Math.max(...[...counts.values()].map((item) => item.count));
  if (max <= 1) return [];
  return [...counts.values()].filter((item) => item.count === max).map((item) => item.value).sort(compareRational);
}

function quartiles(values: Rational[]): { q1: Rational; median: Rational; q3: Rational } {
  const sorted = [...values].sort(compareRational);
  const median = medianSorted(sorted);
  const half = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.slice(sorted.length % 2 ? half + 1 : half);
  return {
    q1: lower.length ? medianSorted(lower) : sorted[0],
    median,
    q3: upper.length ? medianSorted(upper) : sorted[sorted.length - 1],
  };
}

export function descriptiveStatistics(node: AstNode): ProbabilityTransform {
  const values = datasetValuesFromAst(node);
  const sorted = [...values].sort(compareRational);
  const mean = meanRational(values);
  const popVar = populationVariance(values);
  const sampVar = values.length > 1 ? sampleVariance(values) : undefined;
  const { q1, median, q3 } = quartiles(values);
  const iqr = sub(q3, q1);
  const range = sub(sorted[sorted.length - 1], sorted[0]);
  const modes = modeValues(values);
  const threeHalves = rat(3, 2);
  const lowerFence = sub(q1, mul(threeHalves, iqr));
  const upperFence = add(q3, mul(threeHalves, iqr));
  const outliers = sorted.filter((value) => compareRational(value, lowerFence) < 0 || compareRational(value, upperFence) > 0);

  const facts: MathResultFact[] = [
    { label: 'Count', display: String(values.length), tone: 'positive' },
    { label: 'Sum', display: rationalToString(sumRationals(values)), ast: rAst(sumRationals(values)) },
    { label: 'Mean', display: rationalToString(mean), ast: rAst(mean) },
    { label: 'Median', display: rationalToString(median), ast: rAst(median) },
    { label: 'Mode', display: modes.length ? modes.map(rationalToString).join(', ') : 'No mode' },
    { label: 'Minimum', display: rationalToString(sorted[0]), ast: rAst(sorted[0]) },
    { label: 'Maximum', display: rationalToString(sorted[sorted.length - 1]), ast: rAst(sorted[sorted.length - 1]) },
    { label: 'Range', display: rationalToString(range), ast: rAst(range) },
  ];
  const spread: MathResultFact[] = [
    { label: 'Population variance σ²', display: rationalToString(popVar), ast: rAst(popVar) },
    { label: 'Population SD σ', display: `sqrt(${rationalToString(popVar)})`, ast: call('sqrt', rAst(popVar)) },
    ...(sampVar ? [
      { label: 'Sample variance s²', display: rationalToString(sampVar), ast: rAst(sampVar) },
      { label: 'Sample SD s', display: `sqrt(${rationalToString(sampVar)})`, ast: call('sqrt', rAst(sampVar)) },
    ] satisfies MathResultFact[] : []),
  ];
  const fiveNumber: MathResultFact[] = [
    { label: 'Q1', display: rationalToString(q1), ast: rAst(q1) },
    { label: 'Median', display: rationalToString(median), ast: rAst(median) },
    { label: 'Q3', display: rationalToString(q3), ast: rAst(q3) },
    { label: 'IQR', display: rationalToString(iqr), ast: rAst(iqr) },
    { label: '1.5×IQR fences', display: `[${rationalToString(lowerFence)}, ${rationalToString(upperFence)}]` },
    { label: 'Tukey outliers', display: outliers.length ? outliers.map(rationalToString).join(', ') : 'None', tone: outliers.length ? 'warning' : 'positive' },
  ];
  return {
    ast: rAst(mean),
    display: `Mean = ${rationalToString(mean)} · Median = ${rationalToString(median)}`,
    exactness: 'exact',
    warnings: ['Quartiles use the Tukey median-of-halves convention; software packages using another quantile convention may report different quartiles for small samples.'],
    sections: [
      section('descriptive-center', 'Center & range', facts),
      section('descriptive-spread', 'Variance & standard deviation', spread, 'Population and sample formulas are reported separately; MathLab never silently substitutes one for the other.'),
      section('five-number', 'Five-number / outlier profile', fiveNumber, 'Q1 and Q3 use Tukey hinges (median excluded from each half when n is odd).'),
    ],
  };
}

function integerRational(node: AstNode, label: string): bigint {
  const value = rationalValue(simplifyAst(node));
  if (!value || value.d !== 1n) throw new Error(`${label} must be an exact integer.`);
  return value.n;
}
function probabilityRational(node: AstNode, label: string, allowOne = true): Rational {
  const value = rationalValue(simplifyAst(node));
  if (!value) throw new Error(`${label} must be an exact rational probability.`);
  if (sign(value) < 0 || compareRational(value, ONE) > 0 || (!allowOne && eq(value, ONE))) throw new Error(`${label} must lie ${allowOne ? 'in [0, 1]' : 'in [0, 1)'}.`);
  return value;
}
function chooseBigInt(nValue: bigint, kValue: bigint): bigint {
  if (nValue < 0n || kValue < 0n || kValue > nValue) return 0n;
  let k = kValue > nValue - kValue ? nValue - kValue : kValue;
  let result = 1n;
  for (let i = 1n; i <= k; i += 1n) result = (result * (nValue - k + i)) / i;
  return result;
}
function permuteBigInt(nValue: bigint, kValue: bigint): bigint {
  if (nValue < 0n || kValue < 0n || kValue > nValue) return 0n;
  let result = 1n;
  for (let i = 0n; i < kValue; i += 1n) result *= nValue - i;
  return result;
}
function ensureProbabilityResult(value: Rational, label: string): Rational {
  if (sign(value) < 0 || compareRational(value, ONE) > 0) throw new Error(`${label} produced ${rationalToString(value)}, outside [0, 1]. Check the supplied event probabilities.`);
  return value;
}

const PROBABILITY_CALLS = new Set(['choose','permute','conditional','bayes','unionprob','independentjoint','complement']);
export function isProbabilityCall(node: AstNode): boolean { return node.type === 'call' && PROBABILITY_CALLS.has(node.name); }

export function evaluateProbabilityExpression(node: AstNode): ProbabilityTransform {
  const simplified = simplifyAst(node);
  if (simplified.type !== 'call' || !PROBABILITY_CALLS.has(simplified.name)) throw new Error('Expected a supported probability/combinatorics call.');
  let value: Rational;
  let explanation = '';
  if (simplified.name === 'choose') {
    if (simplified.args.length !== 2) throw new Error('choose(n, k) requires exactly two arguments.');
    const nn = integerRational(simplified.args[0], 'n');
    const kk = integerRational(simplified.args[1], 'k');
    if (nn > 100000n) throw new Error('Exact choose(n, k) is currently limited to n ≤ 100000.');
    value = rat(chooseBigInt(nn, kk));
    explanation = `C(${nn}, ${kk}) counts unordered selections without replacement.`;
  } else if (simplified.name === 'permute') {
    if (simplified.args.length !== 2) throw new Error('permute(n, k) requires exactly two arguments.');
    const nn = integerRational(simplified.args[0], 'n');
    const kk = integerRational(simplified.args[1], 'k');
    if (nn > 100000n) throw new Error('Exact permute(n, k) is currently limited to n ≤ 100000.');
    value = rat(permuteBigInt(nn, kk));
    explanation = `P(${nn}, ${kk}) counts ordered selections without replacement.`;
  } else if (simplified.name === 'conditional') {
    if (simplified.args.length !== 2) throw new Error('conditional(P(A∩B), P(B)) requires two arguments.');
    const joint = probabilityRational(simplified.args[0], 'P(A∩B)');
    const base = probabilityRational(simplified.args[1], 'P(B)');
    if (eq(base, ZERO)) throw new Error('Conditional probability is undefined when P(B) = 0.');
    value = ensureProbabilityResult(div(joint, base), 'Conditional probability');
    explanation = 'P(A|B) = P(A∩B) / P(B).';
  } else if (simplified.name === 'bayes') {
    if (simplified.args.length !== 3) throw new Error('bayes(P(A), P(B|A), P(B)) requires three arguments.');
    const prior = probabilityRational(simplified.args[0], 'P(A)');
    const likelihood = probabilityRational(simplified.args[1], 'P(B|A)');
    const evidence = probabilityRational(simplified.args[2], 'P(B)');
    if (eq(evidence, ZERO)) throw new Error('Bayes’ theorem is undefined when P(B) = 0.');
    value = ensureProbabilityResult(div(mul(prior, likelihood), evidence), 'Bayes posterior');
    explanation = 'P(A|B) = P(B|A)P(A) / P(B).';
  } else if (simplified.name === 'unionprob') {
    if (simplified.args.length !== 3) throw new Error('unionprob(P(A), P(B), P(A∩B)) requires three arguments.');
    const pa = probabilityRational(simplified.args[0], 'P(A)');
    const pb = probabilityRational(simplified.args[1], 'P(B)');
    const joint = probabilityRational(simplified.args[2], 'P(A∩B)');
    value = ensureProbabilityResult(sub(add(pa, pb), joint), 'Union probability');
    explanation = 'P(A∪B) = P(A) + P(B) − P(A∩B).';
  } else if (simplified.name === 'independentjoint') {
    if (simplified.args.length !== 2) throw new Error('independentjoint(P(A), P(B)) requires two arguments.');
    value = mul(probabilityRational(simplified.args[0], 'P(A)'), probabilityRational(simplified.args[1], 'P(B)'));
    explanation = 'For independent events, P(A∩B) = P(A)P(B).';
  } else {
    if (simplified.args.length !== 1) throw new Error('complement(P(A)) requires one argument.');
    value = sub(ONE, probabilityRational(simplified.args[0], 'P(A)'));
    explanation = 'P(Aᶜ) = 1 − P(A).';
  }
  return {
    ast: rAst(value), display: rationalToString(value), exactness: 'exact', warnings: [],
    sections: [section('probability-evaluation', 'Exact probability / combinatorics', [
      { label: 'Result', display: rationalToString(value), ast: rAst(value), tone: 'positive' },
      { label: 'Rule', display: explanation },
    ])],
  };
}

const DISTRIBUTION_CALLS = new Set<DistributionFamily>(['bernoulli','binomial','geometric','poisson','uniform','normal']);
export function isDistributionCall(node: AstNode): boolean { return node.type === 'call' && DISTRIBUTION_CALLS.has(node.name as DistributionFamily); }

export function distributionSpec(node: AstNode): DistributionSpec {
  const simplified = simplifyAst(node);
  if (simplified.type !== 'call' || !DISTRIBUTION_CALLS.has(simplified.name as DistributionFamily)) throw new Error('Expected a supported distribution such as binomial(n,p) or normal(mu,sigma).');
  const family = simplified.name as DistributionFamily;
  const args = simplified.args.map((arg, index) => {
    const value = rationalValue(simplifyAst(arg));
    if (!value) throw new Error(`Distribution parameter ${index + 1} must resolve to an exact rational value.`);
    return value;
  });
  if (family === 'bernoulli') {
    if (args.length !== 1) throw new Error('bernoulli(p) requires one parameter.');
    if (sign(args[0]) < 0 || compareRational(args[0], ONE) > 0) throw new Error('Bernoulli p must lie in [0, 1].');
  } else if (family === 'binomial') {
    if (args.length !== 2) throw new Error('binomial(n, p) requires n and p.');
    if (args[0].d !== 1n || args[0].n < 0n || args[0].n > 10000n) throw new Error('Binomial n must be an integer in [0, 10000].');
    if (sign(args[1]) < 0 || compareRational(args[1], ONE) > 0) throw new Error('Binomial p must lie in [0, 1].');
  } else if (family === 'geometric') {
    if (args.length !== 1) throw new Error('geometric(p) requires one parameter.');
    if (sign(args[0]) <= 0 || compareRational(args[0], ONE) > 0) throw new Error('Geometric p must lie in (0, 1].');
  } else if (family === 'poisson') {
    if (args.length !== 1 || sign(args[0]) <= 0) throw new Error('poisson(lambda) requires lambda > 0.');
  } else if (family === 'uniform') {
    if (args.length !== 2 || compareRational(args[0], args[1]) >= 0) throw new Error('uniform(a, b) requires a < b.');
  } else if (family === 'normal') {
    if (args.length !== 2 || sign(args[1]) <= 0) throw new Error('normal(mu, sigma) requires sigma > 0.');
  }
  return { family, args };
}

export function distributionMoments(spec: DistributionSpec): { mean: AstNode; variance: AstNode; support: string; discrete: boolean } {
  const a = spec.args;
  switch (spec.family) {
    case 'bernoulli': {
      const p = a[0]; return { mean: rAst(p), variance: rAst(mul(p, sub(ONE, p))), support: '{0, 1}', discrete: true };
    }
    case 'binomial': {
      const nn = a[0]; const p = a[1]; return { mean: rAst(mul(nn, p)), variance: rAst(mul(mul(nn, p), sub(ONE, p))), support: `{0, …, ${nn.n}}`, discrete: true };
    }
    case 'geometric': {
      const p = a[0]; return { mean: rAst(div(ONE, p)), variance: rAst(div(sub(ONE, p), squared(p))), support: '{1, 2, 3, …}', discrete: true };
    }
    case 'poisson': return { mean: rAst(a[0]), variance: rAst(a[0]), support: '{0, 1, 2, …}', discrete: true };
    case 'uniform': {
      const lo = a[0]; const hi = a[1]; const width = sub(hi, lo);
      return { mean: rAst(div(add(lo, hi), rat(2))), variance: rAst(div(squared(width), rat(12))), support: `[${rationalToString(lo)}, ${rationalToString(hi)}]`, discrete: false };
    }
    case 'normal': return { mean: rAst(a[0]), variance: rAst(squared(a[1])), support: '(-∞, ∞)', discrete: false };
  }
}

export function distributionProfile(node: AstNode): ProbabilityTransform {
  const spec = distributionSpec(node);
  const moments = distributionMoments(spec);
  const args = spec.args.map(rationalToString).join(', ');
  return {
    ast: moments.mean,
    display: `${spec.family}(${args})`, exactness: 'exact', warnings: [],
    sections: [section('distribution-profile', 'Distribution profile', [
      { label: 'Family', display: spec.family[0].toUpperCase() + spec.family.slice(1), tone: 'positive' },
      { label: 'Type', display: moments.discrete ? 'Discrete' : 'Continuous' },
      { label: 'Support', display: moments.support },
      { label: 'Expectation E[X]', display: '', ast: moments.mean },
      { label: 'Variance Var(X)', display: '', ast: moments.variance },
      { label: 'Standard deviation', display: '', ast: call('sqrt', moments.variance) },
    ])],
  };
}

function factorialBigInt(k: bigint): bigint { let value = 1n; for (let i = 2n; i <= k; i += 1n) value *= i; return value; }
function discretePmfExact(spec: DistributionSpec, k: bigint): AstNode {
  const a = spec.args;
  if (spec.family === 'bernoulli') {
    if (k === 1n) return rAst(a[0]);
    if (k === 0n) return rAst(sub(ONE, a[0]));
    return n(0);
  }
  if (spec.family === 'binomial') {
    const nn = a[0].n; const p = a[1];
    if (k < 0n || k > nn) return n(0);
    const coefficient = rat(chooseBigInt(nn, k));
    return rAst(mul(coefficient, mul(pow(p, Number(k)), pow(sub(ONE, p), Number(nn - k)))));
  }
  if (spec.family === 'geometric') {
    if (k < 1n) return n(0);
    return rAst(mul(pow(sub(ONE, a[0]), Number(k - 1n)), a[0]));
  }
  if (spec.family === 'poisson') {
    if (k < 0n) return n(0);
    if (k > 5000n) throw new Error('Exact symbolic Poisson point probabilities are currently limited to k ≤ 5000.');
    const lambda = rAst(a[0]);
    return b('*', call('exp', { type: 'unary', operator: '-', operand: lambda }), b('/', b('^', lambda, n(k)), n(factorialBigInt(k))));
  }
  throw new Error('PMF is only defined for discrete distributions.');
}



function astSum(items: AstNode[]): AstNode {
  if (!items.length) return n(0);
  return items.slice(1).reduce<AstNode>((total, item) => b('+', total, item), items[0]);
}
function floorRational(value: Rational): bigint {
  const q = value.n / value.d;
  return value.n < 0n && value.n % value.d !== 0n ? q - 1n : q;
}
function ceilRational(value: Rational): bigint {
  const q = value.n / value.d;
  return value.n > 0n && value.n % value.d !== 0n ? q + 1n : q;
}
function discreteCdfExact(spec: DistributionSpec, k: bigint): AstNode {
  if (k < 0n) return n(0);
  if (spec.family === 'bernoulli') {
    if (k < 0n) return n(0);
    if (k === 0n) return discretePmfExact(spec, 0n);
    return n(1);
  }
  if (spec.family === 'binomial') {
    const totalN = spec.args[0].n;
    if (k >= totalN) return n(1);
    const p = spec.args[1];
    if (eq(p, ZERO)) return n(1);
    if (eq(p, ONE)) return n(0);
    const upper = k > totalN ? totalN : k;
    let term = pow(sub(ONE, p), Number(totalN));
    let total = term;
    for (let j = 0n; j < upper; j += 1n) {
      term = mul(term, mul(div(rat(totalN - j), rat(j + 1n)), div(p, sub(ONE, p))));
      total = add(total, term);
    }
    return rAst(total);
  }
  if (spec.family === 'geometric') {
    if (k < 1n) return n(0);
    return rAst(sub(ONE, pow(sub(ONE, spec.args[0]), Number(k))));
  }
  if (spec.family === 'poisson') {
    if (k > 500n) throw new Error('Exact symbolic Poisson cumulative sums are currently limited to k ≤ 500. Use simulation or a later numerical distribution workflow for larger tails.');
    return simplifyAst(astSum(Array.from({ length: Number(k + 1n) }, (_, index) => discretePmfExact(spec, BigInt(index)))));
  }
  throw new Error('Exact CDF helper expects a discrete distribution.');
}

function erf(x: number): number {
  const signValue = x < 0 ? -1 : 1;
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return signValue * y;
}
function normalCdf(x: number, mu = 0, sigma = 1): number { return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2))); }

function inverseNormalCdf(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error('Normal quantiles require 0 < p < 1.');
  const a = [-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269, -30.66479806614716,2.506628277459239];
  const c = [-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const bcoef = [-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const d = [0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
  const plow = 0.02425; const phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1-p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  const q = p - 0.5; const r = q*q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((bcoef[0]*r+bcoef[1])*r+bcoef[2])*r+bcoef[3])*r+bcoef[4])*r+1);
}

function pmfNumeric(spec: DistributionSpec, k: number): number {
  if (!Number.isInteger(k)) return 0;
  const a = spec.args.map(rationalToNumber);
  if (spec.family === 'bernoulli') return k === 1 ? a[0] : k === 0 ? 1-a[0] : 0;
  if (spec.family === 'binomial') {
    const nn = Number(spec.args[0].n); if (k < 0 || k > nn) return 0;
    return Number(chooseBigInt(BigInt(nn), BigInt(k))) * a[1]**k * (1-a[1])**(nn-k);
  }
  if (spec.family === 'geometric') return k >= 1 ? (1-a[0])**(k-1)*a[0] : 0;
  if (spec.family === 'poisson') {
    if (k < 0) return 0;
    let term = Math.exp(-a[0]); for (let i=1;i<=k;i+=1) term *= a[0]/i; return term;
  }
  return 0;
}
function cdfNumeric(spec: DistributionSpec, x: number): number {
  const a = spec.args.map(rationalToNumber);
  if (spec.family === 'normal') return normalCdf(x, a[0], a[1]);
  if (spec.family === 'uniform') return x <= a[0] ? 0 : x >= a[1] ? 1 : (x-a[0])/(a[1]-a[0]);
  const upper = Math.floor(x);
  if (spec.family === 'bernoulli') return upper < 0 ? 0 : upper < 1 ? 1-a[0] : 1;
  if (spec.family === 'binomial') {
    const nn = Number(spec.args[0].n); let total=0; for(let k=0;k<=Math.min(nn,upper);k+=1) total+=pmfNumeric(spec,k); return Math.max(0,Math.min(1,total));
  }
  if (spec.family === 'geometric') return upper < 1 ? 0 : 1-(1-a[0])**upper;
  if (spec.family === 'poisson') { let total=0; for(let k=0;k<=upper;k+=1) total+=pmfNumeric(spec,k); return Math.max(0,Math.min(1,total)); }
  return NaN;
}

export function distributionProbability(node: AstNode, event: 'eq'|'le'|'ge'|'between', valueSource: string, lowerSource?: string, upperSource?: string): ProbabilityTransform {
  const spec = distributionSpec(node);
  const moments = distributionMoments(spec);
  const discrete = moments.discrete;
  const parseSource = (source: string, label: string): Rational => {
    const parsedSource = parseMath(source);
    if (!parsedSource.ast || parsedSource.diagnostics.some((item) => item.severity === 'error')) throw new Error(`${label} must be a finite numeric value.`);
    const parsed = rationalValue(simplifyAst(parsedSource.ast));
    if (!parsed) throw new Error(`${label} must be an exact rational value such as 2, 1/2, or 0.25.`);
    return parsed;
  };
  const exactProbabilityResult = (label: string, ast: AstNode, warnings: string[] = []): ProbabilityTransform => {
    const simplified = simplifyAst(ast);
    const rv = rationalValue(simplified);
    return { ast: simplified, display: rv ? rationalToString(rv) : undefined, exactness: 'exact', warnings, sections: [section('distribution-probability','Distribution probability',[{label,display:rv ? rationalToString(rv) : '',ast:simplified,tone:'positive'}])] };
  };

  if (event === 'eq') {
    const value = parseSource(valueSource, 'Value');
    if (!discrete) return exactProbabilityResult(`P(X = ${rationalToString(value)})`, n(0), ['A continuous random variable assigns probability 0 to an individual point.']);
    if (value.d !== 1n) return exactProbabilityResult(`P(X = ${rationalToString(value)})`, n(0));
    return exactProbabilityResult(`P(X = ${value.n})`, discretePmfExact(spec, value.n));
  }

  if (event === 'between') {
    const lo = parseSource(lowerSource ?? '', 'Lower bound');
    const hi = parseSource(upperSource ?? '', 'Upper bound');
    if (compareRational(lo, hi) > 0) throw new Error('Lower bound must not exceed upper bound.');
    const label = `P(${rationalToString(lo)} ≤ X ≤ ${rationalToString(hi)})`;
    if (discrete) {
      const upperK = floorRational(hi);
      const belowLower = ceilRational(lo) - 1n;
      return exactProbabilityResult(label, b('-', discreteCdfExact(spec, upperK), discreteCdfExact(spec, belowLower)));
    }
    if (spec.family === 'uniform') {
      const a = spec.args[0], c = spec.args[1];
      const left = compareRational(lo,a)<0?a:lo; const right = compareRational(hi,c)>0?c:hi;
      const prob = compareRational(left,right)>=0 ? ZERO : div(sub(right,left),sub(c,a));
      return exactProbabilityResult(label, rAst(prob));
    }
    const lowN=rationalToNumber(lo), hiN=rationalToNumber(hi);
    const prob = cdfNumeric(spec,hiN)-cdfNumeric(spec,lowN);
    return {display:fixed(prob),exactness:'approximate',warnings:['Normal probabilities use a deterministic numerical erf approximation.'],sections:[section('distribution-probability','Distribution probability',[{label,display:fixed(prob),tone:'positive'}])]};
  }

  const value = parseSource(valueSource, 'Value');
  const label = `P(X ${event==='le'?'≤':'≥'} ${rationalToString(value)})`;
  if (discrete) {
    const ast = event === 'le'
      ? discreteCdfExact(spec, floorRational(value))
      : b('-', n(1), discreteCdfExact(spec, ceilRational(value) - 1n));
    return exactProbabilityResult(label, ast);
  }
  if (spec.family === 'uniform') {
    const lo=spec.args[0],hi=spec.args[1];
    let prob:Rational;
    if(event==='le') prob=compareRational(value,lo)<=0?ZERO:compareRational(value,hi)>=0?ONE:div(sub(value,lo),sub(hi,lo));
    else prob=compareRational(value,lo)<=0?ONE:compareRational(value,hi)>=0?ZERO:div(sub(hi,value),sub(hi,lo));
    return exactProbabilityResult(label,rAst(prob));
  }
  const x=rationalToNumber(value); const prob=event==='le'?cdfNumeric(spec,x):1-cdfNumeric(spec,x);
  return {display:fixed(prob),exactness:'approximate',warnings:['Normal probabilities use a deterministic numerical erf approximation.'],sections:[section('distribution-probability','Distribution probability',[{label,display:fixed(prob),tone:'positive'}])]};
}

export function distributionQuantile(node: AstNode, pSource: string): ProbabilityTransform {
  const spec = distributionSpec(node);
  const parsedP = parseMath(pSource);
  const pRat = parsedP.ast && !parsedP.diagnostics.some((item) => item.severity === 'error') ? rationalValue(simplifyAst(parsedP.ast)) : null;
  if (!pRat || sign(pRat)<=0 || compareRational(pRat,ONE)>=0) throw new Error('Quantile probability p must lie strictly between 0 and 1.');
  const p=rationalToNumber(pRat);
  if (spec.family==='uniform') {
    const q=add(spec.args[0],mul(pRat,sub(spec.args[1],spec.args[0])));
    return {ast:rAst(q),display:rationalToString(q),exactness:'exact',warnings:[],sections:[section('quantile','Distribution quantile',[{label:`Q(${rationalToString(pRat)})`,display:rationalToString(q),ast:rAst(q),tone:'positive'}])]};
  }
  if (spec.family==='normal') {
    const mu=rationalToNumber(spec.args[0]), sigma=rationalToNumber(spec.args[1]); const q=mu+sigma*inverseNormalCdf(p);
    return {display:fixed(q),exactness:'approximate',warnings:['Normal quantiles are numerical approximations.'],sections:[section('quantile','Distribution quantile',[{label:`Q(${rationalToString(pRat)})`,display:fixed(q),tone:'positive'}])]};
  }
  let k=spec.family==='geometric'?1:0;
  const limit=spec.family==='binomial'?Number(spec.args[0].n):100000;
  if (spec.family !== 'poisson') {
    while (k <= limit) {
      const exactCdf = rationalValue(simplifyAst(discreteCdfExact(spec, BigInt(k))));
      if (!exactCdf) throw new Error('Exact discrete quantile comparison could not be reduced to a rational cumulative probability.');
      if (compareRational(exactCdf, pRat) >= 0) break;
      k += 1;
    }
    if(k>limit) throw new Error('The requested discrete quantile exceeded the current bounded search range.');
    return {ast:n(k),display:String(k),exactness:'exact',warnings:[],sections:[section('quantile','Distribution quantile',[{label:`Smallest k with F(k) ≥ ${rationalToString(pRat)}`,display:String(k),ast:n(k),tone:'positive'}])]};
  }
  while(k<=limit && cdfNumeric(spec,k)<p) k+=1;
  if(k>limit) throw new Error('The requested Poisson quantile exceeded the current bounded search range.');
  return {ast:n(k),display:String(k),exactness:'approximate',warnings:['Poisson quantile selection compares numerically evaluated cumulative probabilities. The returned support point is integral, but the threshold comparison is numerical.'],sections:[section('quantile','Distribution quantile',[{label:`Smallest k with F(k) ≥ ${rationalToString(pRat)}`,display:String(k),ast:n(k),tone:'positive'}])]};
}

export function samplingMeanProfile(node: AstNode, sampleSize: number): ProbabilityTransform {
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 1000000) throw new Error('Sample size must be an integer from 1 to 1,000,000.');
  const spec=distributionSpec(node); const moments=distributionMoments(spec); const variance=simplifyAst(b('/',moments.variance,n(sampleSize))); const se=call('sqrt',variance);
  const normalExact=spec.family==='normal';
  const warnings:string[]=[];
  if(!normalExact && sampleSize<30) warnings.push('A normal approximation for the sample mean is not asserted for n < 30. The mean and standard-error formulas are still exact.');
  else if(!normalExact) warnings.push('The normal sampling-shape statement uses the central limit theorem as an approximation, not an exact finite-sample identity.');
  return {ast:moments.mean,display:normalExact?'Exact normal sampling distribution':sampleSize>=30?'CLT normal approximation':'Sampling moments',exactness:normalExact?'exact':sampleSize>=30?'approximate':'exact',warnings,sections:[section('sampling-mean','Sampling distribution of the mean',[
    {label:'Sample size n',display:String(sampleSize)},
    {label:'E[X̄]',display:'',ast:moments.mean},
    {label:'Var(X̄)',display:'',ast:variance},
    {label:'SE(X̄)',display:'',ast:se},
    {label:'Shape',display:normalExact?'Normal exactly':sampleSize>=30?'Approximately normal by CLT':'Not asserted by P10',tone:normalExact||sampleSize>=30?'positive':'warning'},
  ])]};
}

function logGamma(z:number):number {
  const p=[0.9999999999998099,676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<0.5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  let x=p[0]; const zz=z-1; for(let i=1;i<p.length;i+=1)x+=p[i]/(zz+i); const t=zz+7.5;
  return 0.5*Math.log(2*Math.PI)+(zz+0.5)*Math.log(t)-t+Math.log(x);
}
function betaContinuedFraction(a:number,bv:number,x:number):number {
  const maxIter=200; const eps=3e-14; const fpmin=1e-300;
  let qab=a+bv,qap=a+1,qam=a-1; let c=1; let d=1-qab*x/qap; if(Math.abs(d)<fpmin)d=fpmin; d=1/d; let h=d;
  for(let m=1;m<=maxIter;m+=1){
    const m2=2*m; let aa=m*(bv-m)*x/((qam+m2)*(a+m2)); d=1+aa*d;if(Math.abs(d)<fpmin)d=fpmin;c=1+aa/c;if(Math.abs(c)<fpmin)c=fpmin;d=1/d;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2)); d=1+aa*d;if(Math.abs(d)<fpmin)d=fpmin;c=1+aa/c;if(Math.abs(c)<fpmin)c=fpmin;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<eps)break;
  } return h;
}
function regularizedBeta(x:number,a:number,bv:number):number {
  if(x<=0)return 0;if(x>=1)return 1;
  const bt=Math.exp(logGamma(a+bv)-logGamma(a)-logGamma(bv)+a*Math.log(x)+bv*Math.log(1-x));
  return x<(a+1)/(a+bv+2)?bt*betaContinuedFraction(a,bv,x)/a:1-bt*betaContinuedFraction(bv,a,1-x)/bv;
}
function studentTCdf(t:number,df:number):number {
  if(!Number.isFinite(t))return t<0?0:1;
  const x=df/(df+t*t); const ib=regularizedBeta(x,df/2,0.5); return t>=0?1-0.5*ib:0.5*ib;
}
function studentTQuantile(p:number,df:number):number {
  if(!(p>0&&p<1))throw new Error('t quantile probability must lie in (0,1).');
  if(p===0.5)return 0; if(p<0.5)return -studentTQuantile(1-p,df);
  let lo=0,hi=1; while(studentTCdf(hi,df)<p&&hi<1e6)hi*=2;
  for(let i=0;i<100;i+=1){const mid=(lo+hi)/2;if(studentTCdf(mid,df)<p)lo=mid;else hi=mid;} return (lo+hi)/2;
}

export function meanConfidenceInterval(node: AstNode, confidence: number): ProbabilityTransform {
  const values=datasetValuesFromAst(node); if(values.length<2)throw new Error('A t confidence interval requires at least two observations.');
  if(!(confidence>0&&confidence<1))throw new Error('Confidence level must lie between 0 and 1.');
  const mean=meanRational(values), variance=sampleVariance(values); const meanN=rationalToNumber(mean), s=Math.sqrt(rationalToNumber(variance)); const se=s/Math.sqrt(values.length); const df=values.length-1; const critical=studentTQuantile((1+confidence)/2,df); const margin=critical*se;
  return {display:`[${fixed(meanN-margin)}, ${fixed(meanN+margin)}]`,exactness:'approximate',warnings:['The sample mean and variance are exact; the Student-t critical value and interval endpoints are numerical approximations.'],sections:[section('mean-ci','One-sample mean confidence interval',[
    {label:'Confidence',display:`${fixed(confidence*100,3)}%`},{label:'n',display:String(values.length)},{label:'df',display:String(df)},{label:'Sample mean',display:rationalToString(mean),ast:rAst(mean)},{label:'Sample variance',display:rationalToString(variance),ast:rAst(variance)},{label:'t*',display:fixed(critical)},{label:'Standard error',display:fixed(se)},{label:'Margin',display:fixed(margin)},{label:'Interval',display:`[${fixed(meanN-margin)}, ${fixed(meanN+margin)}]`,tone:'positive'}
  ],'Uses the classical Student-t interval for an unknown population standard deviation. Interpretation assumes an appropriate random/independent sample and a population shape for which the t procedure is justified.') ]};
}

export function meanHypothesisTest(node: AstNode, nullMean: number, alternative: 'two-sided'|'less'|'greater'): ProbabilityTransform {
  const values=datasetValuesFromAst(node); if(values.length<2)throw new Error('A one-sample t test requires at least two observations.');
  if(!Number.isFinite(nullMean))throw new Error('Null mean must be finite.');
  const mean=meanRational(values),variance=sampleVariance(values); const se=Math.sqrt(rationalToNumber(variance)/values.length); if(se===0)throw new Error('The t statistic is undefined because the sample standard deviation is zero.');
  const t=(rationalToNumber(mean)-nullMean)/se,df=values.length-1,cdf=studentTCdf(t,df); const p=alternative==='two-sided'?2*Math.min(cdf,1-cdf):alternative==='less'?cdf:1-cdf;
  return {display:`t(${df}) = ${fixed(t)}, p = ${fixed(p)}`,exactness:'approximate',warnings:['The test statistic uses exact sample summaries where possible; the Student-t tail probability is numerical. Statistical significance is not the same as practical importance.'],sections:[section('mean-test','One-sample Student-t test',[
    {label:'H₀',display:`μ = ${nullMean}`},{label:'Alternative',display:alternative},{label:'n',display:String(values.length)},{label:'df',display:String(df)},{label:'Sample mean',display:rationalToString(mean),ast:rAst(mean)},{label:'t statistic',display:fixed(t)},{label:'p-value',display:fixed(Math.max(0,Math.min(1,p))),tone:p<0.05?'warning':'neutral'}
  ],'P10 reports the p-value and assumptions; it does not convert p < 0.05 into a universal scientific conclusion.') ]};
}

function binarySummary(values:Rational[]):{successes:number;n:number;pHat:number}{
  let successes=0; for(const value of values){if(eq(value,ONE))successes+=1;else if(!eq(value,ZERO))throw new Error('Proportion inference requires a binary dataset containing only 0 and 1.');} return {successes,n:values.length,pHat:successes/values.length};
}
export function proportionConfidenceInterval(node:AstNode,confidence:number):ProbabilityTransform{
  const values=datasetValuesFromAst(node);const {successes,n:count,pHat}=binarySummary(values);if(!(confidence>0&&confidence<1))throw new Error('Confidence level must lie between 0 and 1.');const z=inverseNormalCdf((1+confidence)/2);const denom=1+z*z/count;const center=(pHat+z*z/(2*count))/denom;const half=z*Math.sqrt(pHat*(1-pHat)/count+z*z/(4*count*count))/denom;return{display:`[${fixed(center-half)}, ${fixed(center+half)}]`,exactness:'approximate',warnings:['Uses the Wilson score interval, which has better finite-sample behavior than the simple Wald interval. Normal quantiles are numerical approximations.'],sections:[section('proportion-ci','One-proportion confidence interval',[{label:'Successes',display:`${successes}/${count}`},{label:'p̂',display:fixed(pHat)},{label:'Confidence',display:`${fixed(confidence*100,3)}%`},{label:'Wilson interval',display:`[${fixed(center-half)}, ${fixed(center+half)}]`,tone:'positive'}])]};
}
export function proportionHypothesisTest(node:AstNode,nullP:number,alternative:'two-sided'|'less'|'greater'):ProbabilityTransform{
  const values=datasetValuesFromAst(node);const {successes,n:count,pHat}=binarySummary(values);if(!(nullP>0&&nullP<1))throw new Error('Null proportion must lie strictly between 0 and 1.');const se=Math.sqrt(nullP*(1-nullP)/count),z=(pHat-nullP)/se,cdf=normalCdf(z),p=alternative==='two-sided'?2*Math.min(cdf,1-cdf):alternative==='less'?cdf:1-cdf;const expectedSuccess=count*nullP,expectedFailure=count*(1-nullP);const warnings=['Uses the large-sample one-proportion z test.'];if(Math.min(expectedSuccess,expectedFailure)<10)warnings.push('Normal-approximation warning: expected successes or failures under H₀ are below 10; an exact binomial test would be preferable.');return{display:`z = ${fixed(z)}, p = ${fixed(p)}`,exactness:'approximate',warnings,sections:[section('proportion-test','One-proportion z test',[{label:'H₀',display:`p = ${nullP}`},{label:'Alternative',display:alternative},{label:'Observed successes',display:`${successes}/${count}`},{label:'p̂',display:fixed(pHat)},{label:'z statistic',display:fixed(z)},{label:'p-value',display:fixed(p),tone:p<0.05?'warning':'neutral'}])]};
}

function pairedMatrix(node:AstNode):Array<[Rational,Rational]>{
  const simplified=simplifyAst(node);if(simplified.type!=='matrix'||simplified.rows[0]?.length!==2)throw new Error('Correlation/regression expects an n×2 matrix of paired observations [[x1,y1], …].');if(simplified.rows.length<2)throw new Error('At least two paired observations are required.');return simplified.rows.map((row,index)=>{const x=rationalValue(simplifyAst(row[0])),y=rationalValue(simplifyAst(row[1]));if(!x||!y)throw new Error(`Pair ${index+1} must contain exact rational values.`);return[x,y];});
}
export function correlationRegression(node:AstNode):ProbabilityTransform{
  const pairs=pairedMatrix(node);const xs=pairs.map(p=>p[0]),ys=pairs.map(p=>p[1]);const xbar=meanRational(xs),ybar=meanRational(ys);let sxx=ZERO,syy=ZERO,sxy=ZERO;for(const [x,y] of pairs){const dx=sub(x,xbar),dy=sub(y,ybar);sxx=add(sxx,squared(dx));syy=add(syy,squared(dy));sxy=add(sxy,mul(dx,dy));}if(eq(sxx,ZERO))throw new Error('Regression slope is undefined because all x values are identical.');const slope=div(sxy,sxx),intercept=sub(ybar,mul(slope,xbar));const line:AstNode={type:'equation',left:s('y'),right:simplifyAst(b('+',rAst(intercept),b('*',rAst(slope),s('x'))))};const facts:MathResultFact[]=[{label:'n',display:String(pairs.length)},{label:'x̄',display:rationalToString(xbar),ast:rAst(xbar)},{label:'ȳ',display:rationalToString(ybar),ast:rAst(ybar)},{label:'Least-squares line',display:'',ast:line},{label:'Slope',display:rationalToString(slope),ast:rAst(slope)},{label:'Intercept',display:rationalToString(intercept),ast:rAst(intercept)}];const warnings:string[]=['Regression describes linear association; it does not establish causation.'];if(!eq(syy,ZERO)){const r2=div(squared(sxy),mul(sxx,syy));const rAstExact: AstNode=sign(sxy)<0?{type:'unary',operator:'-',operand:call('sqrt',rAst(r2))}:call('sqrt',rAst(r2));facts.push({label:'Pearson r',display:'',ast:rAstExact},{label:'R²',display:rationalToString(r2),ast:rAst(r2)});}else warnings.push('Pearson correlation is undefined because all y values are identical.');return{ast:line,display:`y = ${rationalToString(intercept)} + ${rationalToString(slope)}x`,exactness:'exact',warnings,sections:[section('regression','Correlation & simple linear regression',facts,'The least-squares coefficients and R² are exact for rational input. Pearson r is retained as an exact signed square root when needed.') ]};
}

function makeRng(seed:number):()=>number { let state=(seed|0)||0x6d2b79f5; return()=>{state|=0;state=state+0x6D2B79F5|0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}; }
function simulateOne(spec:DistributionSpec,rng:()=>number):number{
  const a=spec.args.map(rationalToNumber);if(spec.family==='bernoulli')return rng()<a[0]?1:0;if(spec.family==='binomial'){let total=0;for(let i=0;i<Number(spec.args[0].n);i+=1)if(rng()<a[1])total+=1;return total;}if(spec.family==='geometric'){const u=Math.max(Number.MIN_VALUE,rng());return Math.ceil(Math.log(1-u)/Math.log(1-a[0]));}if(spec.family==='uniform')return a[0]+(a[1]-a[0])*rng();if(spec.family==='normal'){const u1=Math.max(Number.MIN_VALUE,rng()),u2=rng();return a[0]+a[1]*Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);}if(spec.family==='poisson'){if(a[0]>50)throw new Error('P10 simulation currently limits Poisson λ to 50 to avoid silently switching algorithms.');const L=Math.exp(-a[0]);let k=0,p=1;do{k+=1;p*=rng();}while(p>L);return k-1;}return NaN;
}
export function simulateDistribution(node:AstNode,count:number,seed:number):ProbabilityTransform{
  if(!Number.isInteger(count)||count<1||count>10000)throw new Error('Simulation count must be an integer from 1 to 10,000.');if(!Number.isInteger(seed))throw new Error('Simulation seed must be an integer.');const spec=distributionSpec(node);if(spec.family==='binomial' && Number(spec.args[0].n)*count>2000000)throw new Error('Binomial simulation is limited to 2,000,000 Bernoulli trials per run. Reduce n or the number of draws.');const rng=makeRng(seed),samples=Array.from({length:count},()=>simulateOne(spec,rng));const mean=samples.reduce((a,c)=>a+c,0)/count;const variance=samples.reduce((a,c)=>a+(c-mean)**2,0)/count;const moments=distributionMoments(spec);return{display:`${count} deterministic pseudo-random draws`,exactness:'heuristic',warnings:['Simulation results are empirical and seed-dependent. They do not replace exact distribution calculations or statistical inference.'],sections:[section('simulation','Distribution simulation',[{label:'Draws',display:String(count)},{label:'Seed',display:String(seed)},{label:'Empirical mean',display:fixed(mean)},{label:'Empirical variance',display:fixed(variance)},{label:'Theoretical mean',display:'',ast:moments.mean},{label:'Theoretical variance',display:'',ast:moments.variance},{label:'First 10 draws',display:samples.slice(0,10).map(v=>fixed(v,4)).join(', ')}])]};
}

export function probabilityStatisticsOverview(node:AstNode):ProbabilityTransform{
  if(isDistributionCall(simplifyAst(node)))return distributionProfile(node);
  if(isProbabilityCall(simplifyAst(node)))return evaluateProbabilityExpression(node);
  return descriptiveStatistics(node);
}
