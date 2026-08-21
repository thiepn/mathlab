import type { AstNode, ComparisonOperator } from './ast';
import {
  addPolynomials,
  dividePolynomials,
  multiplyPolynomials,
  polynomialCoefficient,
  polynomialDegree,
  polynomialToAst,
  powerPolynomial,
  rationalValue,
  scalePolynomial,
  simplifyAst,
  symbolsIn,
  toPolynomial,
  type Polynomial,
} from './algebra';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import { ONE, add, div, eq, isZero, mul, rat, rationalToString, sub, type Rational } from './rational';
import { solveEquation, solveInequality, solveLinearSystem } from './solve';
import type { DerivationStep, MathResultSection } from './types';
import { evaluateNumeric } from './visualization';

export type VerificationStatus = 'verified' | 'conditionally-valid' | 'invalid' | 'not-proven';

export interface VerificationTransition {
  status: VerificationStatus;
  beforeAst: AstNode;
  afterAst: AstNode;
  rule: string;
  reference: string;
  explanation: string;
  conditions: string[];
  counterexample?: string;
}

export interface VerificationReport {
  status: VerificationStatus;
  display: string;
  exactness: 'exact' | 'heuristic' | 'unknown';
  transitions: VerificationTransition[];
  warnings: string[];
  sections: MathResultSection[];
  steps: DerivationStep[];
}

type PolyFraction = { numerator: Polynomial; denominator: Polynomial };

const theoremNames: Record<string, string> = {
  'polynomial-identity': 'Polynomial identity theorem / ring laws',
  'rational-identity': 'Field identities on the common domain',
  'equation-scale': 'Equality-preserving multiplication/division by a nonzero constant',
  'equation-factor': 'Zero-product law with a nonzero-factor condition',
  'equation-solutions': 'Equality of solution sets',
  'inequality-solutions': 'Equality of solution sets for inequalities',
  'linear-system-solutions': 'Equivalence of linear-system solution sets',
  'truth-table': 'Truth-functional equivalence by exhaustive truth table',
  counterexample: 'Counterexample principle',
  'same-object': 'Reflexivity of equality',
  'row-operation': 'Elementary row operations preserve the solution set of an augmented linear system',
  unsupported: 'No supported proof rule establishes this transition',
};

function parseRequired(source: string): AstNode {
  const parsed = parseMath(source.trim());
  const error = parsed.diagnostics.find((item) => item.severity === 'error');
  if (!parsed.ast || error) throw new Error(error?.message ?? `Could not parse “${source}”.`);
  return parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
}

function polyZero(poly: Polynomial): boolean {
  const degree = polynomialDegree(poly);
  for (let i = 0; i <= degree; i += 1) if (!isZero(polynomialCoefficient(poly, i))) return false;
  return true;
}

function polyEqual(a: Polynomial, b: Polynomial): boolean {
  const degree = Math.max(polynomialDegree(a), polynomialDegree(b));
  for (let i = 0; i <= degree; i += 1) {
    const x = polynomialCoefficient(a, i); const y = polynomialCoefficient(b, i);
    if (x.n !== y.n || x.d !== y.d) return false;
  }
  return true;
}

function constantPoly(value: Rational): Polynomial { return new Map([[0, value]]); }

function integerExponent(node: AstNode): number | null {
  const value = rationalValue(node);
  if (!value || value.d !== 1n) return null;
  const n = Number(value.n);
  return Number.isSafeInteger(n) && Math.abs(n) <= 16 ? n : null;
}

function rationalPolynomial(node: AstNode, variable: string): PolyFraction | null {
  const direct = toPolynomial(node, variable);
  if (direct) return { numerator: direct, denominator: constantPoly(ONE) };
  if (node.type === 'unary') {
    const value = rationalPolynomial(node.operand, variable); if (!value) return null;
    return node.operator === '-' ? { numerator: scalePolynomial(value.numerator, rat(-1n)), denominator: value.denominator } : value;
  }
  if (node.type !== 'binary') return null;
  const left = rationalPolynomial(node.left, variable); const right = rationalPolynomial(node.right, variable);
  if (!left || !right) return null;
  if (node.operator === '+') return {
    numerator: addPolynomials(multiplyPolynomials(left.numerator, right.denominator), multiplyPolynomials(right.numerator, left.denominator)),
    denominator: multiplyPolynomials(left.denominator, right.denominator),
  };
  if (node.operator === '-') return {
    numerator: addPolynomials(multiplyPolynomials(left.numerator, right.denominator), scalePolynomial(multiplyPolynomials(right.numerator, left.denominator), rat(-1n))),
    denominator: multiplyPolynomials(left.denominator, right.denominator),
  };
  if (node.operator === '*') return { numerator: multiplyPolynomials(left.numerator, right.numerator), denominator: multiplyPolynomials(left.denominator, right.denominator) };
  if (node.operator === '/') {
    if (polyZero(right.numerator)) return null;
    return { numerator: multiplyPolynomials(left.numerator, right.denominator), denominator: multiplyPolynomials(left.denominator, right.numerator) };
  }
  const exponent = integerExponent(node.right);
  if (node.operator === '^' && exponent !== null) {
    if (exponent >= 0) return { numerator: powerPolynomial(left.numerator, exponent), denominator: powerPolynomial(left.denominator, exponent) };
    if (polyZero(left.numerator)) return null;
    return { numerator: powerPolynomial(left.denominator, -exponent), denominator: powerPolynomial(left.numerator, -exponent) };
  }
  return null;
}

function rootsOfPolynomial(poly: Polynomial, variable: string): string[] | null {
  const equation: AstNode = { type:'equation', left:polynomialToAst(poly, variable), right:{ type:'number', value:'0' } };
  const solved = solveEquation(equation, variable);
  if (solved.status === 'none') return [];
  if (solved.status === 'solved') return solved.solutions.map(astToPlainText).sort();
  if (solved.status === 'all-real') return ['all-real'];
  return null;
}

function denominatorConditions(fraction: PolyFraction, variable: string): string[] {
  if (polynomialDegree(fraction.denominator) === 0) return [];
  const roots = rootsOfPolynomial(fraction.denominator, variable);
  if (roots && !roots.includes('all-real')) return roots.map((root) => `${variable} != ${root}`);
  return [`${astToPlainText(polynomialToAst(fraction.denominator, variable))} != 0`];
}

function collectDomainConditions(node: AstNode, variable: string): string[] {
  const out = new Set<string>();
  const fraction = rationalPolynomial(node, variable);
  if (fraction) denominatorConditions(fraction, variable).forEach((item) => out.add(item));
  const visit = (current: AstNode) => {
    if (current.type === 'call' && current.args[0]) {
      const arg = astToPlainText(current.args[0]);
      if (current.name === 'sqrt') out.add(`${arg} >= 0`);
      if (current.name === 'ln' || current.name === 'log') out.add(`${arg} > 0`);
      current.args.forEach(visit); return;
    }
    if (current.type === 'unary') visit(current.operand);
    else if (current.type === 'binary') { visit(current.left); visit(current.right); }
    else if (current.type === 'equation' || current.type === 'comparison' || current.type === 'definition') { visit(current.left); visit(current.right); }
    else if (current.type === 'matrix') current.rows.flat().forEach(visit);
    else if (current.type === 'system' || current.type === 'set') current.items.forEach(visit);
  };
  visit(node);
  return [...out].sort();
}

function normalizedAssumptions(source?: string): Set<string> {
  const out = new Set<string>();
  if (!source?.trim()) return out;
  for (const raw of source.split(/[;\n]+/).map((item) => item.trim()).filter(Boolean)) {
    try { out.add(astToPlainText(parseRequired(raw))); }
    catch { out.add(raw.replace(/\s+/g, ' ').trim()); }
  }
  return out;
}

function conditionsCovered(conditions: string[], assumptions: Set<string>): boolean {
  return conditions.every((condition) => assumptions.has(condition));
}

function expressionEquivalence(before: AstNode, after: AstNode, variable: string, assumptions: Set<string>): VerificationTransition | null {
  const left = rationalPolynomial(before, variable); const right = rationalPolynomial(after, variable);
  if (!left || !right) return null;
  const cross = addPolynomials(
    multiplyPolynomials(left.numerator, right.denominator),
    scalePolynomial(multiplyPolynomials(right.numerator, left.denominator), rat(-1n)),
  );
  if (!polyZero(cross)) return null;
  const beforeDomain = collectDomainConditions(before, variable);
  const afterDomain = collectDomainConditions(after, variable);
  const changed = [...new Set([...beforeDomain, ...afterDomain])].filter((item) => beforeDomain.includes(item) !== afterDomain.includes(item));
  if (!changed.length || conditionsCovered(changed, assumptions)) {
    return {
      status:'verified', beforeAst:before, afterAst:after, rule: beforeDomain.length || afterDomain.length ? 'rational-identity' : 'polynomial-identity',
      reference: theoremNames[beforeDomain.length || afterDomain.length ? 'rational-identity' : 'polynomial-identity'],
      explanation: changed.length ? `The identity is exact under the stated domain assumption${changed.length === 1 ? '' : 's'}: ${changed.join(', ')}.` : 'Both expressions reduce to the same exact rational/polynomial function and preserve the same domain restrictions.',
      conditions: changed,
    };
  }
  return {
    status:'conditionally-valid', beforeAst:before, afterAst:after, rule:'rational-identity', reference:theoremNames['rational-identity'],
    explanation:'The algebraic values agree wherever both expressions are defined, but the written step changes the domain. Preserve the missing restriction(s) explicitly.', conditions:changed,
  };
}

function normalizedEquationPolynomial(node: AstNode, variable: string): Polynomial | null {
  if (node.type !== 'equation') return null;
  const left = toPolynomial(node.left, variable); const right = toPolynomial(node.right, variable);
  if (!left || !right) return null;
  return addPolynomials(left, scalePolynomial(right, rat(-1n)));
}

function quotientCondition(dividend: Polynomial, divisor: Polynomial, variable: string): string[] | null {
  if (polyZero(divisor)) return null;
  const division = dividePolynomials(dividend, divisor);
  if (!polyZero(division.remainder)) return null;
  if (polynomialDegree(division.quotient) === 0) {
    const coefficient = polynomialCoefficient(division.quotient, 0);
    return isZero(coefficient) ? null : [];
  }
  return [`${astToPlainText(polynomialToAst(division.quotient, variable))} != 0`];
}

function equationEquivalence(before: AstNode, after: AstNode, variable: string, assumptions: Set<string>): VerificationTransition | null {
  const a = normalizedEquationPolynomial(before, variable); const b = normalizedEquationPolynomial(after, variable);
  if (a && b) {
    if (polyEqual(a, b) || polyEqual(a, scalePolynomial(b, rat(-1n)))) return {
      status:'verified', beforeAst:before, afterAst:after, rule:'equation-scale', reference:theoremNames['equation-scale'], explanation:'Both equations have exactly the same normalized polynomial equation.', conditions:[],
    };
    const forward = quotientCondition(b, a, variable);
    const backward = forward === null ? quotientCondition(a, b, variable) : null;
    const conditions = forward ?? backward;
    if (conditions !== null) {
      if (!conditions.length || conditionsCovered(conditions, assumptions)) return {
        status:'verified', beforeAst:before, afterAst:after, rule:conditions.length ? 'equation-factor' : 'equation-scale', reference:theoremNames[conditions.length ? 'equation-factor' : 'equation-scale'],
        explanation:conditions.length ? `The transformation is reversible under the stated nonzero condition: ${conditions.join(', ')}.` : 'The two equations differ only by a nonzero constant factor.', conditions,
      };
      return {
        status:'conditionally-valid', beforeAst:before, afterAst:after, rule:'equation-factor', reference:theoremNames['equation-factor'],
        explanation:'A nonconstant factor was introduced or cancelled. The step is reversible only if that factor is known to be nonzero.', conditions,
      };
    }
  }
  const solvedA = solveEquation(before, variable); const solvedB = solveEquation(after, variable);
  if (solvedA.status !== 'unsupported' && solvedB.status !== 'unsupported') {
    const key = (status: string, solutions: AstNode[]) => status === 'solved' ? solutions.map(astToPlainText).sort().join('|') : status;
    if (key(solvedA.status, solvedA.solutions) === key(solvedB.status, solvedB.solutions)) return {
      status:'verified', beforeAst:before, afterAst:after, rule:'equation-solutions', reference:theoremNames['equation-solutions'], explanation:'The deterministic exact solver proves that both equations have the same real solution set.', conditions:[],
    };
  }
  return null;
}

function inequalityEquivalence(before: AstNode, after: AstNode, variable: string): VerificationTransition | null {
  const first = solveInequality(before, variable); const second = solveInequality(after, variable);
  if (first.status === 'unsupported' || second.status === 'unsupported') return null;
  const a = `${first.status}:${first.resultAst ? astToPlainText(first.resultAst) : ''}`;
  const b = `${second.status}:${second.resultAst ? astToPlainText(second.resultAst) : ''}`;
  if (a !== b) return null;
  return { status:'verified', beforeAst:before, afterAst:after, rule:'inequality-solutions', reference:theoremNames['inequality-solutions'], explanation:'Solving both inequalities exactly yields the same real solution set, including the correct inequality direction.', conditions:[] };
}

function systemEquivalence(before: AstNode, after: AstNode): VerificationTransition | null {
  const first = solveLinearSystem(before); const second = solveLinearSystem(after);
  if (first.status === 'unsupported' || second.status === 'unsupported') return null;
  if (first.status !== second.status) return null;
  if (first.status === 'unique' && first.resultAst && second.resultAst && astToPlainText(first.resultAst) === astToPlainText(second.resultAst)) return {
    status:'verified', beforeAst:before, afterAst:after, rule:'linear-system-solutions', reference:theoremNames['linear-system-solutions'], explanation:'Exact Gaussian elimination gives the same unique solution for both systems.', conditions:[],
  };
  if (first.status === 'none' && second.status === 'none') return { status:'verified', beforeAst:before, afterAst:after, rule:'linear-system-solutions', reference:theoremNames['linear-system-solutions'], explanation:'Both systems are exactly inconsistent.', conditions:[] };
  return null;
}


function rationalMatrix(node: AstNode): Rational[][] | null {
  if (node.type !== 'matrix' || !node.rows.length || !node.rows[0]?.length) return null;
  const out: Rational[][] = [];
  const width = node.rows[0].length;
  if (!node.rows.every((row) => row.length === width)) return null;
  for (const row of node.rows) {
    const values: Rational[] = [];
    for (const cell of row) { const value = rationalValue(cell); if (!value) return null; values.push(value); }
    out.push(values);
  }
  return out;
}

function rationalRowsEqual(a: Rational[], b: Rational[]): boolean { return a.length === b.length && a.every((value, index) => eq(value, b[index])); }

function rowScaleFactor(before: Rational[], after: Rational[]): Rational | null {
  let factor: Rational | null = null;
  for (let i = 0; i < before.length; i += 1) {
    if (isZero(before[i])) { if (!isZero(after[i])) return null; continue; }
    const candidate = div(after[i], before[i]);
    if (factor === null) factor = candidate; else if (!eq(factor, candidate)) return null;
  }
  return factor && !isZero(factor) ? factor : null;
}

function rowReplacementFactor(targetBefore: Rational[], source: Rational[], targetAfter: Rational[]): Rational | null {
  let factor: Rational | null = null;
  for (let i = 0; i < targetBefore.length; i += 1) {
    const delta = sub(targetAfter[i], targetBefore[i]);
    if (isZero(source[i])) { if (!isZero(delta)) return null; continue; }
    const candidate = div(delta, source[i]);
    if (factor === null) factor = candidate; else if (!eq(factor, candidate)) return null;
  }
  if (factor === null) return null;
  return targetBefore.every((value, index) => eq(add(value, mul(factor!, source[index])), targetAfter[index])) ? factor : null;
}

function matrixRowOperation(before: AstNode, after: AstNode): VerificationTransition | null {
  const a = rationalMatrix(before); const b = rationalMatrix(after);
  if (!a || !b || a.length !== b.length || a[0].length !== b[0].length) return null;
  const changed = a.map((row, index) => rationalRowsEqual(row, b[index]) ? -1 : index).filter((index) => index >= 0);
  if (changed.length === 2) {
    const [i,j] = changed;
    if (rationalRowsEqual(a[i], b[j]) && rationalRowsEqual(a[j], b[i])) return {
      status:'verified', beforeAst:before, afterAst:after, rule:'row-operation', reference:theoremNames['row-operation'],
      explanation:`Swap rows R${i + 1} and R${j + 1}. Row swaps are reversible elementary row operations.`, conditions:[],
    };
  }
  if (changed.length === 1) {
    const i = changed[0]; const scale = rowScaleFactor(a[i], b[i]);
    if (scale) return {
      status:'verified', beforeAst:before, afterAst:after, rule:'row-operation', reference:theoremNames['row-operation'],
      explanation:`Scale R${i + 1} by the nonzero factor ${rationalToString(scale)}. Nonzero row scaling is reversible.`, conditions:[],
    };
    for (let j = 0; j < a.length; j += 1) if (j !== i) {
      const factor = rowReplacementFactor(a[i], a[j], b[i]);
      if (factor) return {
        status:'verified', beforeAst:before, afterAst:after, rule:'row-operation', reference:theoremNames['row-operation'],
        explanation:`Replace R${i + 1} by R${i + 1} + (${rationalToString(factor)})R${j + 1}. Row replacement is a reversible elementary row operation.`, conditions:[],
      };
    }
  }
  return null;
}

function boolVariables(node: AstNode): string[] {
  return symbolsIn(node).filter((name) => !['true','false'].includes(name)).sort();
}

function evalBool(node: AstNode, values: Record<string, boolean>): boolean | null {
  if (node.type === 'symbol') {
    if (node.name === 'true') return true; if (node.name === 'false') return false;
    return Object.prototype.hasOwnProperty.call(values, node.name) ? values[node.name] : null;
  }
  if (node.type !== 'call') return null;
  const args = node.args.map((arg) => evalBool(arg, values));
  if (args.some((value) => value === null)) return null;
  const b = args as boolean[];
  if (node.name === 'not' && b.length === 1) return !b[0];
  if (node.name === 'and' && b.length >= 2) return b.every(Boolean);
  if (node.name === 'or' && b.length >= 2) return b.some(Boolean);
  if (node.name === 'xor' && b.length === 2) return b[0] !== b[1];
  if (node.name === 'implies' && b.length === 2) return !b[0] || b[1];
  if (node.name === 'iff' && b.length === 2) return b[0] === b[1];
  return null;
}

function logicalEquivalence(before: AstNode, after: AstNode): VerificationTransition | null {
  const variables = [...new Set([...boolVariables(before), ...boolVariables(after)])];
  if (variables.length > 6) return null;
  for (let mask = 0; mask < 2 ** variables.length; mask += 1) {
    const values: Record<string, boolean> = {};
    variables.forEach((name, index) => { values[name] = Boolean(mask & (1 << index)); });
    const a = evalBool(before, values); const b = evalBool(after, values);
    if (a === null || b === null) return null;
    if (a !== b) return null;
  }
  return { status:'verified', beforeAst:before, afterAst:after, rule:'truth-table', reference:theoremNames['truth-table'], explanation:`All ${2 ** variables.length} truth assignments agree, so the propositions are logically equivalent.`, conditions:[] };
}

function truthAt(node: AstNode, variable: string, x: number): boolean | null {
  if (node.type === 'equation') {
    const a = evaluateNumeric(node.left, variable, x); const b = evaluateNumeric(node.right, variable, x);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) : null;
  }
  if (node.type === 'comparison') {
    const a = evaluateNumeric(node.left, variable, x); const b = evaluateNumeric(node.right, variable, x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const op: ComparisonOperator = node.operator;
    if (op === '<') return a < b; if (op === '<=') return a <= b; if (op === '>') return a > b; if (op === '>=') return a >= b; return Math.abs(a - b) > 1e-10;
  }
  return null;
}

function numericCounterexample(before: AstNode, after: AstNode, variable: string): string | null {
  const samples = [-7,-5,-3,-2,-1,-0.5,0,0.5,1,2,3,5,7];
  for (const x of samples) {
    if (before.type === 'equation' || before.type === 'comparison' || after.type === 'equation' || after.type === 'comparison') {
      const a = truthAt(before, variable, x); const b = truthAt(after, variable, x);
      if (a !== null && b !== null && a !== b) return `${variable} = ${x} makes the two statements have different truth values.`;
      if (a !== b && (a === null || b === null)) return `${variable} = ${x} lies in the domain of only one side of the proposed transformation.`;
      continue;
    }
    const a = evaluateNumeric(before, variable, x); const b = evaluateNumeric(after, variable, x);
    if (Number.isFinite(a) !== Number.isFinite(b)) return `${variable} = ${x} lies in the domain of only one expression.`;
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1e-8 * Math.max(1, Math.abs(a), Math.abs(b))) return `${variable} = ${x}: ${astToPlainText(before)} ≈ ${a}, but ${astToPlainText(after)} ≈ ${b}.`;
  }
  return null;
}

export function verifyTransition(beforeSource: string, afterSource: string, assumptionSource?: string): VerificationTransition {
  const before = parseRequired(beforeSource); const after = parseRequired(afterSource);
  if (JSON.stringify(simplifyAst(before)) === JSON.stringify(simplifyAst(after))) return { status:'verified', beforeAst:before, afterAst:after, rule:'same-object', reference:theoremNames['same-object'], explanation:'The two parsed mathematical objects are identical after safe exact simplification.', conditions:[] };
  const assumptions = normalizedAssumptions(assumptionSource);
  if (before.type === 'matrix' && after.type === 'matrix') { const rowOperation = matrixRowOperation(before, after); if (rowOperation) return rowOperation; }
  const variables = [...new Set([...symbolsIn(before), ...symbolsIn(after)].filter((name) => !['pi','e','i','infinity','C','true','false'].includes(name)))];
  const logical = logicalEquivalence(before, after); if (logical) return logical;
  if (variables.length === 1) {
    const variable = variables[0];
    if (before.type === 'equation' && after.type === 'equation') {
      const exact = equationEquivalence(before, after, variable, assumptions); if (exact) return exact;
    } else if (before.type === 'comparison' && after.type === 'comparison') {
      const exact = inequalityEquivalence(before, after, variable); if (exact) return exact;
    } else if (before.type !== 'equation' && before.type !== 'comparison' && after.type !== 'equation' && after.type !== 'comparison') {
      const exact = expressionEquivalence(before, after, variable, assumptions); if (exact) return exact;
    }
    const counterexample = numericCounterexample(before, after, variable);
    if (counterexample) return { status:'invalid', beforeAst:before, afterAst:after, rule:'counterexample', reference:theoremNames.counterexample, explanation:'A single valid counterexample is enough to disprove equivalence.', conditions:[], counterexample };
  }
  if (before.type === 'system' && after.type === 'system') {
    const exact = systemEquivalence(before, after); if (exact) return exact;
  }
  return { status:'not-proven', beforeAst:before, afterAst:after, rule:'unsupported', reference:theoremNames.unsupported, explanation:'MathLab found no supported exact rule that proves this transition, and no bounded counterexample search established that it is wrong. This is not a correctness certificate.', conditions:[] };
}

function statusTone(status: VerificationStatus): 'positive' | 'warning' | 'negative' | 'neutral' {
  if (status === 'verified') return 'positive'; if (status === 'conditionally-valid') return 'warning'; if (status === 'invalid') return 'negative'; return 'neutral';
}

function aggregateStatus(transitions: VerificationTransition[]): VerificationStatus {
  if (transitions.some((item) => item.status === 'invalid')) return 'invalid';
  if (transitions.some((item) => item.status === 'not-proven')) return 'not-proven';
  if (transitions.some((item) => item.status === 'conditionally-valid')) return 'conditionally-valid';
  return 'verified';
}

function reportFromTransitions(transitions: VerificationTransition[]): VerificationReport {
  const status = aggregateStatus(transitions);
  const statusLabel = status === 'verified' ? 'VERIFIED' : status === 'conditionally-valid' ? 'CONDITIONALLY VALID' : status === 'invalid' ? 'INVALID' : 'NOT PROVEN';
  const steps: DerivationStep[] = transitions.map((item, index) => ({
    id:`verify-step-${index + 1}`, before:astToPlainText(item.beforeAst), after:astToPlainText(item.afterAst), beforeAst:item.beforeAst, afterAst:item.afterAst,
    rule:item.rule, explanation:`${item.explanation}${item.counterexample ? ` Counterexample: ${item.counterexample}` : ''}`, verified:item.status === 'verified', verificationStatus:item.status,
  }));
  const sections: MathResultSection[] = [
    { id:'verification-summary', title:'Verification verdict', description:'A verified result uses a supported exact proof method. Numerical sampling is used only to find counterexamples, never to certify a proof.', facts:[
      { label:'Overall status', display:statusLabel, tone:statusTone(status) },
      { label:'Transitions', display:String(transitions.length) },
      { label:'Verified', display:String(transitions.filter((item) => item.status === 'verified').length), tone:'positive' },
      { label:'Conditional', display:String(transitions.filter((item) => item.status === 'conditionally-valid').length), tone:'warning' },
      { label:'Invalid', display:String(transitions.filter((item) => item.status === 'invalid').length), tone:transitions.some((item) => item.status === 'invalid') ? 'negative' : 'neutral' },
      { label:'Not proven', display:String(transitions.filter((item) => item.status === 'not-proven').length) },
    ]},
    ...transitions.map((item, index) => ({ id:`transition-${index + 1}`, title:`Step ${index + 1}: ${item.status === 'verified' ? 'Verified' : item.status === 'conditionally-valid' ? 'Conditionally valid' : item.status === 'invalid' ? 'Invalid' : 'Not proven'}`, facts:[
      { label:'Rule', display:item.rule },
      { label:'Reference', display:item.reference },
      { label:'Reason', display:item.explanation },
      ...(item.conditions.length ? [{ label:'Required condition', display:item.conditions.join(' · '), tone:'warning' as const }] : []),
      ...(item.counterexample ? [{ label:'Counterexample', display:item.counterexample, tone:'negative' as const }] : []),
    ] })),
  ];
  return { status, display:statusLabel, exactness:status === 'not-proven' ? 'unknown' : 'exact', transitions, warnings:status === 'conditionally-valid' ? ['At least one transformation is reversible only under an explicit condition. Carry that condition forward in the proof.'] : status === 'not-proven' ? ['Not proven does not mean false. The current deterministic rule set could not certify the step.'] : [], sections, steps };
}

export function verifyChain(work: string, assumptions?: string): VerificationReport {
  const lines = work.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('A verification chain needs at least two non-empty mathematical lines.');
  if (lines.length > 40) throw new Error('P13 proof-chain verification is limited to 40 lines per run.');
  return reportFromTransitions(lines.slice(0, -1).map((line, index) => verifyTransition(line, lines[index + 1], assumptions)));
}

export function verifySingleTransition(before: string, after: string, assumptions?: string): VerificationReport {
  return reportFromTransitions([verifyTransition(before, after, assumptions)]);
}

export function verifyPropositionalEntailment(premiseSource: string, conclusionSource: string): VerificationReport {
  const premiseLines = premiseSource.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
  if (!premiseLines.length) throw new Error('Enter at least one premise.');
  const premises = premiseLines.map(parseRequired); const conclusion = parseRequired(conclusionSource);
  const variables = [...new Set([...premises.flatMap(boolVariables), ...boolVariables(conclusion)])].sort();
  if (variables.length > 6) throw new Error('P13 exhaustive propositional entailment is limited to at most 6 variables.');
  let counterexample: string | undefined;
  for (let mask = 0; mask < 2 ** variables.length; mask += 1) {
    const values: Record<string, boolean> = {};
    variables.forEach((name, index) => { values[name] = Boolean(mask & (1 << index)); });
    const p = premises.map((node) => evalBool(node, values)); const c = evalBool(conclusion, values);
    if (p.some((value) => value === null) || c === null) throw new Error('Entailment mode supports propositions built from not/and/or/xor/implies/iff.');
    if (p.every(Boolean) && !c) { counterexample = variables.map((name) => `${name}=${values[name] ? 'T' : 'F'}`).join(', '); break; }
  }
  const beforeAst: AstNode = premises.length === 1 ? premises[0] : { type:'call', name:'and', args:premises };
  const transition: VerificationTransition = counterexample ? {
    status:'invalid', beforeAst, afterAst:conclusion, rule:'counterexample', reference:theoremNames.counterexample, explanation:'The conclusion is false under an assignment where every premise is true.', conditions:[], counterexample,
  } : {
    status:'verified', beforeAst, afterAst:conclusion, rule:'truth-table', reference:'Semantic entailment by exhaustive truth table', explanation:`Every one of the ${2 ** variables.length} truth assignments was checked; no assignment makes all premises true and the conclusion false.`, conditions:[],
  };
  return reportFromTransitions([transition]);
}
