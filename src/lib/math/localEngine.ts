import type { AstNode } from './ast';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import {
  decimalAst, expandAst, factorAst, partialFractionsAst, polynomialLongDivisionAst, rationalValue, simplifyAst, substituteAst, symbolsIn,
} from './algebra';
import {
  definiteIntegralAst,
  differentiateAst,
  domainNotes,
  evaluateAt,
  integrateAst,
  parsePoint,
  pointEquations,
  polynomialBehavior,
  stationaryPoints,
} from './calculus';
import { isTerminatingDecimal, isZero, rationalToString } from './rational';
import {
  asMatrix,
  asVector,
  basisSetAst,
  determinantMatrix,
  dotProduct,
  evaluateLinearAst,
  inverseMatrix,
  linearValueToAst,
  matrixToAst,
  rankMatrix,
  rrefMatrix,
  solutionSystemAst,
  solveAugmentedMatrix,
  subspaceAnalysis,
  vectorNorm,
  vectorToAst,
  type LinearStep,
} from './linearAlgebra';
import {
  characteristicPolynomial,
  diagonalizationExact,
  eigenspacesExact,
  eigenvaluesExact,
  gramSchmidtAsts,
  leastSquares,
  materializeComplexLinearAst,
  orthogonalityProfile,
  projectOntoColumnSpace,
  projectVectorOntoVector,
  qrDecompositionAst,
  rationalMatrixFromAst,
  rationalVectorFromAst,
  symmetryProfile,
  transposeAstExact,
} from './advancedLinearAlgebra';
import { solveEquation, solveInequality, solveLinearSystem, type SolveStep } from './solve';
import {
  analysisLimitAst,
  analysisOverview,
  asymptoticProfile,
  continuityAt,
  continuityProfile,
  differentiabilityAt,
  differentiabilityProfile,
  partialSum,
  powerSeriesProfile,
  sequenceConvergence,
  sequenceTerms,
  seriesConvergence,
  taylorPolynomial,
} from './analysis';
import {
  correlationRegression,
  descriptiveStatistics,
  distributionProbability,
  distributionProfile,
  distributionQuantile,
  evaluateProbabilityExpression,
  meanConfidenceInterval,
  meanHypothesisTest,
  proportionConfidenceInterval,
  proportionHypothesisTest,
  samplingMeanProfile,
  simulateDistribution,
} from './probabilityStatistics';
import {
  binarySearchTrace,
  complexityProfile,
  evaluateCombinatorics,
  finiteSetBinary,
  finiteSetPowerSet,
  finiteSetProfile,
  graphProfile,
  graphTraversal,
  hasseProfile,
  heapProfile,
  logicNormalForms,
  logicProfile,
  minimumSpanningTree,
  recurrenceClosedForm,
  recurrenceProfile,
  recurrenceTerms,
  relationClasses,
  relationClosures,
  relationProfile,
  shortestPath,
  sortingTrace,
  topologicalSort,
  type SetBinaryOperation,
  type SortAlgorithm,
} from './discreteAlgorithms';
import {
  conditionEstimate,
  floatingPointProfile,
  interpolationPolynomial,
  iterativeLinearSolve,
  ivpProfile,
  numericalDerivative,
  numericalIntegral,
  numericalLinearSolve,
  numericalRoot,
  solveIvp,
  type OdeMethod,
  type QuadratureMethod,
  type RootMethod,
} from './numerical';
import { verifyChain, verifyPropositionalEntailment, verifySingleTransition } from './proofLab';
import { type MathEngine } from './engine';
import type { DerivationStep, MathOperationRequest, MathResult, MathResultSection } from './types';

function stepToResult(step: SolveStep, index: number): DerivationStep {
  return {
    id: `step-${index + 1}`,
    before: astToPlainText(step.beforeAst),
    after: astToPlainText(step.afterAst),
    beforeAst: step.beforeAst,
    afterAst: step.afterAst,
    rule: step.rule,
    explanation: step.explanation,
    verified: true,
  };
}

function unaryStep(before: AstNode, after: AstNode, rule: string, explanation: string): DerivationStep[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  return [{ id: 'step-1', before: astToPlainText(before), after: astToPlainText(after), beforeAst: before, afterAst: after, rule, explanation, verified: true }];
}

function result(
  request: MathOperationRequest,
  resultAst: AstNode | undefined,
  steps: DerivationStep[],
  warnings: string[] = [],
  exactness: MathResult['exactness'] = 'exact',
  displayOverride?: string,
  sections?: MathResultSection[],
): MathResult {
  return {
    id: request.id,
    operation: request.operation,
    input: request.input,
    exactness,
    value: resultAst ? astToPlainText(resultAst) : displayOverride ?? '',
    display: displayOverride ?? (resultAst ? astToPlainText(resultAst) : ''),
    resultAst,
    variable: request.variable,
    assumptions: request.assumptions ?? [],
    warnings,
    steps,
    sections,
    createdAt: Date.now(),
  };
}

function requestAst(request: MathOperationRequest): AstNode {
  if (request.ast) return request.ast;
  const parsed = parseMath(request.input);
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) {
    throw new Error(parsed.diagnostics[0]?.message ?? 'Could not parse the mathematical input.');
  }
  return parsed.ast;
}

function inlineBindings(ast: AstNode, bindings: MathOperationRequest['bindings']): AstNode {
  if (!bindings?.length) return ast;
  let resolved = ast;
  for (let pass = 0; pass < bindings.length; pass += 1) {
    let changed = false;
    for (const binding of bindings) {
      const next = substituteAst(resolved, binding.name, binding.ast);
      if (JSON.stringify(next) !== JSON.stringify(resolved)) changed = true;
      resolved = next;
    }
    if (!changed) break;
  }
  return resolved;
}

function bindingStep(original: AstNode, resolved: AstNode): DerivationStep[] {
  if (JSON.stringify(original) === JSON.stringify(resolved)) return [];
  return [{
    id: 'step-bindings',
    before: astToPlainText(original),
    after: astToPlainText(resolved),
    beforeAst: original,
    afterAst: resolved,
    rule: 'resolve-workspace-definitions',
    explanation: 'Replace referenced saved scalar/expression definitions with their exact values.',
    verified: true,
  }];
}

function withBindings(original: AstNode, resolved: AstNode, steps: DerivationStep[]): DerivationStep[] {
  const prefix = bindingStep(original, resolved);
  return [...prefix, ...steps].map((step, index) => ({ ...step, id: `step-${index + 1}` }));
}

function calculusSteps(steps: Array<{ beforeAst: AstNode; afterAst: AstNode; rule: string; explanation: string }>): DerivationStep[] {
  return steps.map((step, index) => ({
    id: `step-${index + 1}`,
    before: astToPlainText(step.beforeAst),
    after: astToPlainText(step.afterAst),
    beforeAst: step.beforeAst,
    afterAst: step.afterAst,
    rule: step.rule,
    explanation: step.explanation,
    verified: true,
  }));
}

function linearSteps(steps: LinearStep[]): DerivationStep[] {
  return steps.map((step, index) => ({
    id: `step-${index + 1}`,
    before: astToPlainText(step.beforeAst),
    after: astToPlainText(step.afterAst),
    beforeAst: step.beforeAst,
    afterAst: step.afterAst,
    rule: step.rule,
    explanation: step.explanation,
    verified: true,
  }));
}

function parseLinearOption(source: string, bindings: MathOperationRequest['bindings']): AstNode {
  const parsed = parseMath(source);
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) throw new Error(parsed.diagnostics[0]?.message ?? 'Could not parse the linear-algebra operand.');
  const ast = parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
  return inlineBindings(ast, bindings);
}

function calculusVariable(request: MathOperationRequest, ast: AstNode): string {
  if (request.variable) return request.variable;
  const candidates = [...new Set(((): string[] => {
    const out: string[] = [];
    const visit = (node: AstNode) => {
      switch (node.type) {
        case 'number': break;
        case 'symbol': if (!['pi','e','i','infinity','C'].includes(node.name)) out.push(node.name); break;
        case 'unary': visit(node.operand); break;
        case 'binary': visit(node.left); visit(node.right); break;
        case 'call': node.args.forEach(visit); break;
        case 'equation': case 'comparison': case 'definition': visit(node.left); visit(node.right); break;
        case 'matrix': node.rows.flat().forEach(visit); break;
        case 'system': case 'set': node.items.forEach(visit); break;
      }
    };
    visit(ast);
    return out;
  })())];
  if (candidates.length !== 1) throw new Error('P5 calculus requires exactly one active variable. Define a unary function such as f(x)=... or use a one-variable expression.');
  return candidates[0];
}

function section(id: string, title: string, facts: MathResultSection['facts'], description?: string): MathResultSection {
  return { id, title, description, facts };
}

function containsVariable(node: AstNode, variable: string): boolean {
  switch (node.type) {
    case 'number': return false;
    case 'symbol': return node.name === variable;
    case 'unary': return containsVariable(node.operand, variable);
    case 'binary': return containsVariable(node.left, variable) || containsVariable(node.right, variable);
    case 'call': return node.args.some((arg) => containsVariable(arg, variable));
    case 'equation': case 'comparison': case 'definition': return containsVariable(node.left, variable) || containsVariable(node.right, variable);
    case 'matrix': return node.rows.flat().some((cell) => containsVariable(cell, variable));
    case 'system': case 'set': return node.items.some((item) => containsVariable(item, variable));
  }
}

function productFactors(node: AstNode): AstNode[] {
  if (node.type === 'binary' && node.operator === '*') return [...productFactors(node.left), ...productFactors(node.right)];
  return [node];
}

function solveFunctionZeros(ast: AstNode, variable: string): { resultAst?: AstNode; steps: DerivationStep[]; warning?: string; display?: string } {
  const direct = solveEquation({ type: 'equation', left: ast, right: { type: 'number', value: '0' } }, variable);
  if (direct.status !== 'unsupported') {
    return {
      resultAst: direct.resultAst,
      steps: direct.steps.map(stepToResult),
      warning: direct.warning,
      display: direct.status === 'all-real' ? 'Every real input is a zero' : direct.status === 'none' ? 'No real zeros' : undefined,
    };
  }

  const factored = factorAst(ast, variable);
  if (JSON.stringify(factored) === JSON.stringify(ast)) return { steps: [], warning: direct.warning ?? 'Zero finding is outside the current exact solve domain.' };
  const factors = productFactors(factored).filter((factor) => containsVariable(factor, variable));
  if (!factors.length) return { steps: [], warning: direct.warning ?? 'No variable factors were found.' };
  const roots: AstNode[] = [];
  const steps: DerivationStep[] = [{
    id: 'step-1', before: astToPlainText(ast), after: astToPlainText(factored), beforeAst: ast, afterAst: factored,
    rule: 'factor-for-zeros', explanation: 'Factor the polynomial so each supported factor can be solved independently.', verified: true,
  }];
  for (const factor of factors) {
    const solved = solveEquation({ type: 'equation', left: factor, right: { type: 'number', value: '0' } }, variable);
    if (solved.status === 'unsupported') return { steps, warning: 'The polynomial factors partially, but at least one remaining factor is outside the exact degree-2 solver.' };
    if (solved.status === 'all-real') return { resultAst: { type: 'symbol', name: 'R' }, steps, display: 'Every real input is a zero' };
    if (solved.resultAst?.type === 'set') roots.push(...solved.resultAst.items);
    steps.push(...solved.steps.map(stepToResult));
  }
  const unique = roots.filter((root, index, all) => all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(root)) === index);
  const resultAst: AstNode = { type: 'set', items: unique };
  return { resultAst, steps: steps.map((step, index) => ({ ...step, id: `step-${index + 1}` })) };
}

/** P13 deterministic local engine: P4–P12 mathematics plus verification and proof-lab workflows. */
export class LocalMathEngine implements MathEngine {
  readonly id = 'local-p13';
  readonly label = 'MathLab Deterministic Mathematics Engine · P13';

  async isReady(): Promise<boolean> { return true; }

  async execute(request: MathOperationRequest): Promise<MathResult> {
    const originalAst = requestAst(request);
    const baseAst = originalAst.type === 'definition' ? originalAst.right : originalAst;
    const algebraAst = inlineBindings(baseAst, request.bindings);
    // P8 real matrix expressions can be materialized through the exact P7 evaluator. Complex-rational
    // literal matrices intentionally fall back to their AST so the P8 conjugate-inner-product layer can read i.
    let p8Ast = algebraAst;
    try { p8Ast = linearValueToAst(evaluateLinearAst(algebraAst)); }
    catch {
      try { p8Ast = materializeComplexLinearAst(algebraAst); }
      catch { /* keep unresolved AST so the operation can return a precise boundary error */ }
    }

    switch (request.operation) {
      case 'verify-transition': {
        const next = String(request.options?.next ?? '').trim();
        if (!next) throw new Error('Enter the proposed next mathematical line to verify.');
        const report = verifySingleTransition(request.input, next, String(request.options?.proofAssumptions ?? ''));
        return result(request, undefined, report.steps, report.warnings, report.exactness, report.display, report.sections);
      }
      case 'verify-chain': {
        const work = String(request.options?.work ?? '').trim();
        if (!work) throw new Error('Enter at least two mathematical lines to verify.');
        const report = verifyChain(work, String(request.options?.proofAssumptions ?? ''));
        return result(request, undefined, report.steps, report.warnings, report.exactness, report.display, report.sections);
      }
      case 'verify-entailment': {
        const premises = String(request.options?.premises ?? '').trim();
        const conclusion = String(request.options?.conclusion ?? request.input).trim();
        const report = verifyPropositionalEntailment(premises, conclusion);
        return result(request, undefined, report.steps, report.warnings, report.exactness, report.display, report.sections);
      }
      case 'verify': {
        const candidate = String(request.options?.candidate ?? '').trim();
        if (!candidate) throw new Error('Enter a candidate solution.');
        if (algebraAst.type !== 'equation') throw new Error('Check solution requires an equation.');
        const variable = request.variable ?? symbolsIn(algebraAst)[0];
        if (!variable) throw new Error('Could not determine the equation variable.');
        const candidateAst = parseMath(candidate).ast;
        if (!candidateAst) throw new Error('Could not parse the candidate solution.');
        const solved = solveEquation(algebraAst, variable);
        if (solved.status === 'unsupported') throw new Error(solved.warning ?? 'This equation is outside the deterministic solution-checking boundary.');
        const candidateText = astToPlainText(candidateAst.type === 'definition' ? candidateAst.right : candidateAst);
        const solutionTexts = solved.solutions.map(astToPlainText);
        const valid = solved.status === 'all-real' || (solved.status === 'solved' && solutionTexts.includes(candidateText));
        const display = valid ? 'VERIFIED SOLUTION' : 'INVALID SOLUTION';
        return result(request, undefined, [], [], 'exact', display, [section('solution-check', 'Solution verification', [
          { label:'Status', display, tone:valid ? 'positive' : 'negative' },
          { label:'Candidate', display:candidateText },
          { label:'Variable', display:variable },
          { label:'Exact solution set', display:solved.status === 'all-real' ? 'All real values' : solved.status === 'none' ? 'No real solutions' : solutionTexts.join(', ') || '∅' },
        ], 'The candidate is compared against the exact deterministic solution set; no floating-point tolerance is used.')]);
      }
      case 'inspect-exact': {
        const next = simplifyAst(algebraAst);
        const steps = withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'exact-normalization', 'Normalize exact arithmetic without converting to floating point.'));
        return result(request, next, steps);
      }
      case 'inspect-decimal': {
        const exact = simplifyAst(algebraAst);
        const value = rationalValue(exact);
        const next = decimalAst(exact, Number(request.options?.digits ?? 10));
        const exactDecimal = Boolean(value && isTerminatingDecimal(value));
        const steps = withBindings(baseAst, algebraAst, unaryStep(
          exact,
          next,
          exactDecimal ? 'decimal-representation' : 'decimal-approximation',
          exactDecimal ? 'Convert the exact rational value to its terminating decimal representation.' : 'Convert the exact rational value to a finite decimal approximation.',
        ));
        return result(request, next, steps, [], exactDecimal ? 'exact' : 'approximate');
      }
      case 'simplify': {
        const next = simplifyAst(algebraAst);
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'simplify', 'Apply exact arithmetic, identities, and safe like-term collection.')));
      }
      case 'expand': {
        const next = expandAst(algebraAst, request.variable);
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'expand', 'Distribute products and powers and collect polynomial terms.')));
      }
      case 'factor': {
        const next = factorAst(algebraAst, request.variable);
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'factor', 'Factor the polynomial over the rational numbers where possible.')));
      }
      case 'partial-fractions': {
        const next = partialFractionsAst(algebraAst, request.variable);
        if (!next) throw new Error('P4 partial fractions supports rational functions whose denominator splits into distinct rational linear factors.');
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'partial-fractions', 'Decompose the rational expression into polynomial and simple rational parts.')));
      }
      case 'polynomial-division': {
        if (algebraAst.type !== 'binary' || algebraAst.operator !== '/') throw new Error('Polynomial division expects a quotient such as (x^3 - 1)/(x - 1).');
        const division = polynomialLongDivisionAst(algebraAst.left, algebraAst.right, request.variable);
        if (!division) throw new Error('P4 polynomial division requires univariate polynomials with exact rational coefficients.');
        const next = simplifyAst({ type: 'binary', operator: '+', left: division.quotient, right: { type: 'binary', operator: '/', left: division.remainder, right: algebraAst.right } });
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'polynomial-division', 'Divide the numerator by the denominator and express the remainder over the divisor.')));
      }
      case 'substitute': {
        const symbol = String(request.options?.symbol ?? '').trim();
        const replacementSource = String(request.options?.value ?? '').trim();
        if (!symbol || !replacementSource) throw new Error('Substitution requires a symbol and replacement expression.');
        const replacement = parseMath(replacementSource);
        if (!replacement.ast || replacement.diagnostics.some((item) => item.severity === 'error')) throw new Error(replacement.diagnostics[0]?.message ?? 'Invalid replacement expression.');
        const next = simplifyAst(substituteAst(algebraAst, symbol, replacement.ast));
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'substitution', `Substitute ${symbol} = ${replacementSource} and simplify.`)));
      }
      case 'solve': {
        const solved = solveEquation(algebraAst, request.variable);
        if (solved.status === 'unsupported') throw new Error(solved.warning ?? 'This equation is outside the current P4 solve domain.');
        const display = solved.status === 'all-real' ? 'All real numbers' : solved.status === 'none' ? 'No real solution' : undefined;
        return result(request, solved.resultAst, withBindings(baseAst, algebraAst, solved.steps.map(stepToResult)), solved.warning ? [solved.warning] : [], 'exact', display);
      }
      case 'solve-inequality': {
        const solved = solveInequality(algebraAst, request.variable);
        if (solved.status === 'unsupported') throw new Error(solved.warning ?? 'This inequality is outside the current P4 solve domain.');
        const display = solved.status === 'all-real' ? 'All real numbers' : solved.status === 'none' ? 'No solution' : undefined;
        return result(request, solved.resultAst, withBindings(baseAst, algebraAst, solved.steps.map(stepToResult)), solved.warning ? [solved.warning] : [], 'exact', display);
      }
      case 'solve-system': {
        const solved = solveLinearSystem(algebraAst);
        if (solved.status === 'unsupported') throw new Error(solved.warning ?? 'This system is outside the current P4 solve domain.');
        const display = solved.status === 'none' ? 'No solution' : solved.status === 'infinite' ? 'Infinitely many solutions' : undefined;
        return result(request, solved.resultAst, withBindings(baseAst, algebraAst, solved.steps.map(stepToResult)), solved.warning ? [solved.warning] : [], 'exact', display);
      }
      case 'evaluate-function': {
        const variable = calculusVariable(request, algebraAst);
        const valueSource = String(request.options?.value ?? '').trim();
        if (!valueSource) throw new Error('Function evaluation requires an input value.');
        const point = parsePoint(valueSource);
        const next = evaluateAt(algebraAst, variable, point);
        const step = unaryStep(algebraAst, next, 'function-evaluation', `Substitute ${variable} = ${valueSource} and simplify exactly where possible.`);
        return result(request, next, withBindings(baseAst, algebraAst, step));
      }
      case 'differentiate':
      case 'derivative': {
        const variable = calculusVariable(request, algebraAst);
        const transformed = differentiateAst(algebraAst, variable);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings);
      }
      case 'higher-derivative': {
        const variable = calculusVariable(request, algebraAst);
        const order = Number(request.options?.order ?? 2);
        if (!Number.isInteger(order) || order < 2 || order > 12) throw new Error('Higher derivative order must be an integer from 2 through 12.');
        let current = algebraAst;
        const allSteps: DerivationStep[] = [];
        const warnings: string[] = [];
        for (let index = 1; index <= order; index += 1) {
          const transformed = differentiateAst(current, variable);
          allSteps.push(...calculusSteps(transformed.steps).map((step) => ({ ...step, rule: `order-${index}-${step.rule}` })));
          warnings.push(...transformed.warnings);
          current = transformed.ast;
        }
        return result(request, current, withBindings(baseAst, algebraAst, allSteps), [...new Set(warnings)]);
      }
      case 'integrate': {
        const variable = calculusVariable(request, algebraAst);
        const transformed = integrateAst(algebraAst, variable, true);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings);
      }
      case 'definite-integral': {
        const variable = calculusVariable(request, algebraAst);
        const lowerSource = String(request.options?.lower ?? '').trim();
        const upperSource = String(request.options?.upper ?? '').trim();
        if (!lowerSource || !upperSource) throw new Error('A definite integral requires lower and upper bounds.');
        const transformed = definiteIntegralAst(algebraAst, variable, parsePoint(lowerSource), parsePoint(upperSource));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings);
      }
      case 'limit': {
        const variable = calculusVariable(request, algebraAst);
        const pointSource = String(request.options?.point ?? '').trim();
        if (!pointSource) throw new Error('A limit requires a target point such as 0, 2, infinity, or -infinity.');
        const direction = String(request.options?.direction ?? 'both');
        if (!['both','left','right'].includes(direction)) throw new Error('Limit direction must be both, left, or right.');
        const transformed = analysisLimitAst(algebraAst, variable, parsePoint(pointSource), direction as 'both' | 'left' | 'right');
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, 'exact', transformed.display);
      }
      case 'zeros': {
        const variable = calculusVariable(request, algebraAst);
        const solved = solveFunctionZeros(algebraAst, variable);
        if (!solved.resultAst && solved.warning) throw new Error(solved.warning);
        return result(request, solved.resultAst, withBindings(baseAst, algebraAst, solved.steps), solved.warning ? [solved.warning] : [], 'exact', solved.display);
      }
      case 'critical-points': {
        const variable = calculusVariable(request, algebraAst);
        const derivative = differentiateAst(algebraAst, variable);
        const points = stationaryPoints(algebraAst, variable);
        const resultAst = { type: 'set', items: points.map((point) => point.x) } as AstNode;
        const sections = [section('critical-points', 'Stationary points', points.length ? points.map((point) => ({
          label: `${variable} = ${astToPlainText(point.x)}`,
          display: `f(${astToPlainText(point.x)}) = ${astToPlainText(point.y)}`,
          ast: point.y,
        })) : [{ label: 'Result', display: 'No stationary points' }], 'P5 currently finds differentiable stationary points by solving f′(x)=0 in its verified polynomial domain.')];
        return result(request, resultAst, withBindings(baseAst, algebraAst, calculusSteps(derivative.steps)), derivative.warnings, 'exact', undefined, sections);
      }
      case 'extrema': {
        const variable = calculusVariable(request, algebraAst);
        const points = stationaryPoints(algebraAst, variable);
        const resultAst = points.length ? pointEquations(points, variable) : { type: 'set', items: [] } as AstNode;
        const sections = [section('extrema', 'Extrema classification', points.length ? points.map((point) => ({
          label: point.classification,
          display: `(${astToPlainText(point.x)}, ${astToPlainText(point.y)})`,
          tone: point.classification === 'local minimum' ? 'positive' : point.classification === 'local maximum' ? 'negative' : 'warning',
        })) : [{ label: 'Result', display: 'No stationary points to classify' }], 'Classification uses the sign of f″ at stationary points. A zero/inconclusive second derivative is not guessed.')];
        return result(request, resultAst, withBindings(baseAst, algebraAst, []), [], 'exact', undefined, sections);
      }
      case 'monotonicity': {
        const variable = calculusVariable(request, algebraAst);
        const facts = polynomialBehavior(algebraAst, variable, 'monotonicity');
        const sections = [section('monotonicity', 'Monotonicity intervals', facts.map((fact) => ({ label: fact.interval, display: fact.behavior, tone: fact.behavior === 'increasing' ? 'positive' : fact.behavior === 'decreasing' ? 'negative' : 'neutral' })))];
        return result(request, undefined, withBindings(baseAst, algebraAst, []), [], 'exact', 'Interval analysis complete', sections);
      }
      case 'concavity': {
        const variable = calculusVariable(request, algebraAst);
        const facts = polynomialBehavior(algebraAst, variable, 'concavity');
        const sections = [section('concavity', 'Concavity intervals', facts.map((fact) => ({ label: fact.interval, display: fact.behavior.replace('-', ' '), tone: fact.behavior === 'concave-up' ? 'positive' : fact.behavior === 'concave-down' ? 'negative' : 'neutral' })))];
        return result(request, undefined, withBindings(baseAst, algebraAst, []), [], 'exact', 'Interval analysis complete', sections);
      }
      case 'function-profile': {
        const variable = calculusVariable(request, algebraAst);
        const warnings: string[] = [];
        const sections: MathResultSection[] = [];
        const domain = domainNotes(algebraAst, variable);
        sections.push(section('definition', 'Function', [
          { label: 'Variable', display: variable },
          { label: 'Domain restrictions', display: domain.length ? domain.join(' · ') : 'No restriction detected by the P5 rule set' },
        ]));

        const first = differentiateAst(algebraAst, variable);
        const second = differentiateAst(first.ast, variable);
        sections.push(section('derivatives', 'Derivatives', [
          { label: 'f′', display: astToPlainText(first.ast), ast: first.ast },
          { label: 'f″', display: astToPlainText(second.ast), ast: second.ast },
        ]));

        const solved = solveFunctionZeros(algebraAst, variable);
        if (solved.resultAst || solved.display) sections.push(section('zeros', 'Zeros', [{ label: 'f(x) = 0', display: solved.resultAst ? astToPlainText(solved.resultAst) : solved.display ?? 'No real zeros', ast: solved.resultAst }]));
        else if (solved.warning) warnings.push(solved.warning);

        try {
          const points = stationaryPoints(algebraAst, variable);
          sections.push(section('stationary', 'Stationary points & extrema', points.length ? points.map((point) => ({ label: point.classification, display: `(${astToPlainText(point.x)}, ${astToPlainText(point.y)})` })) : [{ label: 'Result', display: 'No stationary points' }]));
        } catch (error) { warnings.push(error instanceof Error ? error.message : 'Stationary-point analysis unavailable.'); }
        try {
          const facts = polynomialBehavior(algebraAst, variable, 'monotonicity');
          sections.push(section('monotonicity', 'Monotonicity', facts.map((fact) => ({ label: fact.interval, display: fact.behavior }))));
        } catch (error) { warnings.push(error instanceof Error ? error.message : 'Monotonicity analysis unavailable.'); }
        try {
          const facts = polynomialBehavior(algebraAst, variable, 'concavity');
          sections.push(section('concavity', 'Concavity', facts.map((fact) => ({ label: fact.interval, display: fact.behavior.replace('-', ' ') }))));
        } catch (error) { warnings.push(error instanceof Error ? error.message : 'Concavity analysis unavailable.'); }

        return result(request, algebraAst, withBindings(baseAst, algebraAst, [...calculusSteps(first.steps), ...calculusSteps(second.steps)]), [...new Set(warnings)], 'exact', undefined, sections);
      }
      case 'analysis-limit': {
        const variable = calculusVariable(request, algebraAst);
        const pointSource = String(request.options?.point ?? '').trim();
        if (!pointSource) throw new Error('Rigorous limit analysis requires a target point such as 0, 2, infinity, or -infinity.');
        const direction = String(request.options?.direction ?? 'both');
        if (!['both','left','right'].includes(direction)) throw new Error('Limit direction must be both, left, or right.');
        const transformed = analysisLimitAst(algebraAst, variable, parsePoint(pointSource), direction as 'both' | 'left' | 'right');
        const sections = [section('limit-theorem', 'Limit analysis', [
          { label: 'Target', display: `${variable} → ${pointSource}${direction === 'left' ? '⁻' : direction === 'right' ? '⁺' : ''}` },
          { label: 'Result', display: transformed.display ?? (transformed.ast ? astToPlainText(transformed.ast) : 'Not resolved'), ast: transformed.ast, tone: transformed.ast?.type === 'symbol' && transformed.ast.name === 'DNE' ? 'negative' : 'positive' },
        ], 'P9 first uses direct continuity/cancellation and then bounded local-order reasoning for rational poles. Opposite one-sided limits are reported as nonexistence, not averaged.')]
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, 'exact', transformed.display, sections);
      }
      case 'continuity-profile': {
        const variable = calculusVariable(request, algebraAst);
        const transformed = continuityProfile(algebraAst, variable);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display, transformed.sections);
      }
      case 'continuity-at': {
        const variable = calculusVariable(request, algebraAst);
        const pointSource = String(request.options?.point ?? '').trim();
        if (!pointSource) throw new Error('Continuity-at analysis requires a point.');
        const transformed = continuityAt(algebraAst, variable, parsePoint(pointSource));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display, transformed.sections);
      }
      case 'differentiability-profile': {
        const variable = calculusVariable(request, algebraAst);
        const transformed = differentiabilityProfile(algebraAst, variable);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display ?? 'Differentiability profile complete', transformed.sections);
      }
      case 'differentiability-at': {
        const variable = calculusVariable(request, algebraAst);
        const pointSource = String(request.options?.point ?? '').trim();
        if (!pointSource) throw new Error('Differentiability-at analysis requires a point.');
        const transformed = differentiabilityAt(algebraAst, variable, parsePoint(pointSource));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display, transformed.sections);
      }
      case 'taylor-polynomial': {
        const variable = calculusVariable(request, algebraAst);
        const centerSource = String(request.options?.center ?? '0').trim();
        const order = Number(request.options?.order ?? 5);
        const transformed = taylorPolynomial(algebraAst, variable, parsePoint(centerSource), order);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display, transformed.sections);
      }
      case 'power-series-profile': {
        const variable = calculusVariable(request, algebraAst);
        const centerSource = String(request.options?.center ?? '0').trim();
        const transformed = powerSeriesProfile(algebraAst, variable, parsePoint(centerSource));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display ?? 'Power-series profile complete', transformed.sections);
      }
      case 'asymptotic-profile': {
        const variable = calculusVariable(request, algebraAst);
        const transformed = asymptoticProfile(algebraAst, variable);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display ?? 'Asymptotic profile complete', transformed.sections);
      }
      case 'analysis-profile': {
        const variable = calculusVariable(request, algebraAst);
        const transformed = analysisOverview(algebraAst, variable);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, calculusSteps(transformed.steps)), transformed.warnings, transformed.exactness ?? 'exact', transformed.display ?? 'Analysis profile complete', transformed.sections);
      }
      case 'sequence-terms': {
        const index = request.variable ?? 'n';
        const start = Number(request.options?.start ?? 1);
        const count = Number(request.options?.count ?? 8);
        const terms = sequenceTerms(algebraAst, index, start, count);
        const resultAst: AstNode = { type:'set', items:terms };
        const facts = terms.map((term, offset) => ({ label:`a_${start + offset}`, display:astToPlainText(term), ast:term }));
        return result(request, resultAst, withBindings(baseAst, algebraAst, []), [], 'exact', undefined, [section('sequence-terms','Sequence terms',facts,`Exact substitution into the sequence rule using ${index} = ${start}, …, ${start + count - 1}.`)]);
      }
      case 'sequence-limit': {
        const index = request.variable ?? 'n';
        const convergence = sequenceConvergence(algebraAst, index);
        const outputAst = convergence.limitAst ?? { type:'symbol', name:convergence.status === 'divergent' ? 'DNE' : 'unknown' } as AstNode;
        const sections = [section('sequence-limit','Sequence limit',[
          { label:`lim ${index}→∞ a_${index}`, display:convergence.limitAst ? astToPlainText(convergence.limitAst) : convergence.display, ast:convergence.limitAst, tone:convergence.status === 'convergent' ? 'positive' : convergence.status === 'divergent' ? 'negative' : 'warning' },
          { label:'Reason', display:convergence.reason },
        ])];
        return result(request, outputAst, withBindings(baseAst, algebraAst, calculusSteps(convergence.steps)), convergence.warnings, 'exact', convergence.display, sections);
      }
      case 'sequence-convergence': {
        const index = request.variable ?? 'n';
        const convergence = sequenceConvergence(algebraAst, index);
        const sections = [section('sequence-convergence','Sequence convergence',[
          { label:'Status', display:convergence.display, tone:convergence.status === 'convergent' ? 'positive' : convergence.status === 'divergent' ? 'negative' : 'warning' },
          { label:'Verified reason', display:convergence.reason },
          ...(convergence.limitAst ? [{ label:'Limit', display:astToPlainText(convergence.limitAst), ast:convergence.limitAst }] : []),
        ], 'P9 reports unknown when its bounded theorem set cannot prove a claim; unknown is never silently treated as divergence.')]
        return result(request, convergence.limitAst, withBindings(baseAst, algebraAst, calculusSteps(convergence.steps)), convergence.warnings, 'exact', convergence.display, sections);
      }
      case 'partial-sum': {
        const index = request.variable ?? 'n';
        const start = Number(request.options?.start ?? 1);
        const end = Number(request.options?.end ?? 10);
        const sumAst = partialSum(algebraAst, index, start, end);
        const beforeAst: AstNode = { type:'call', name:'sum', args:[algebraAst, {type:'number',value:String(start)}, {type:'number',value:String(end)}] };
        const steps: DerivationStep[] = [{ id:'step-1', before:astToPlainText(beforeAst), after:astToPlainText(sumAst), beforeAst, afterAst:sumAst, rule:'finite-partial-sum', explanation:`Evaluate and add the exact terms from ${index} = ${start} through ${end}.`, verified:true }];
        return result(request, sumAst, withBindings(baseAst, algebraAst, steps), [], 'exact', undefined, [section('partial-sum','Partial sum',[{ label:`Σ ${index}=${start}…${end}`, display:astToPlainText(sumAst), ast:sumAst, tone:'positive' }])]);
      }
      case 'series-convergence': {
        const index = request.variable ?? 'n';
        const start = Number(request.options?.start ?? 1);
        const convergence = seriesConvergence(algebraAst, index, start);
        const display = convergence.sumAst ? `${convergence.display}; sum = ${astToPlainText(convergence.sumAst)}` : convergence.display;
        const sections = [...convergence.sections];
        if (convergence.sumAst) sections.push(section('series-sum','Exact series sum',[{ label:`Σ from ${index} = ${start}`, display:astToPlainText(convergence.sumAst), ast:convergence.sumAst, tone:'positive' }]));
        return result(request, convergence.sumAst, withBindings(baseAst, algebraAst, []), convergence.warnings, 'exact', display, sections);
      }
      case 'sequence-series-profile': {
        const index = request.variable ?? 'n';
        const start = Number(request.options?.start ?? 1);
        const sequence = sequenceConvergence(algebraAst, index);
        const series = seriesConvergence(algebraAst, index, start);
        const terms = sequenceTerms(algebraAst, index, start, 6);
        const sections: MathResultSection[] = [
          section('terms','First terms',terms.map((term,offset)=>({ label:`a_${start+offset}`, display:astToPlainText(term), ast:term }))),
          section('sequence','Sequence behavior',[{ label:'Convergence', display:sequence.display, tone:sequence.status === 'convergent' ? 'positive' : sequence.status === 'divergent' ? 'negative' : 'warning' },{ label:'Reason', display:sequence.reason }]),
          ...series.sections,
          section('theorem-guard','Theorem guard',[{ label:'Important', display:'a_n → 0 is necessary for Σa_n to converge, but it is not sufficient.', tone:'warning' }],'This prevents the common false converse “terms go to zero, therefore the series converges.”'),
        ];
        return result(request, series.sumAst ?? sequence.limitAst, withBindings(baseAst, algebraAst, calculusSteps(sequence.steps)), [...new Set([...sequence.warnings,...series.warnings])], 'exact', `Sequence: ${sequence.display} · Series: ${series.display}`, sections);
      }
      case 'descriptive-statistics': {
        const transformed = descriptiveStatistics(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'evaluate-probability': {
        const transformed = evaluateProbabilityExpression(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'distribution-profile': {
        const transformed = distributionProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'distribution-probability': {
        const event = String(request.options?.event ?? 'eq') as 'eq' | 'le' | 'ge' | 'between';
        if (!['eq','le','ge','between'].includes(event)) throw new Error('Probability event must be =, ≤, ≥, or between.');
        const transformed = distributionProbability(algebraAst, event, String(request.options?.value ?? '0'), String(request.options?.lower ?? '0'), String(request.options?.upper ?? '1'));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'distribution-quantile': {
        const transformed = distributionQuantile(algebraAst, String(request.options?.probability ?? '0.5'));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'sampling-mean-profile': {
        const transformed = samplingMeanProfile(algebraAst, Number(request.options?.sampleSize ?? 30));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'simulate-distribution': {
        const transformed = simulateDistribution(algebraAst, Number(request.options?.count ?? 1000), Number(request.options?.seed ?? 42));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'mean-confidence-interval': {
        const transformed = meanConfidenceInterval(algebraAst, Number(request.options?.confidence ?? 0.95));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'mean-hypothesis-test': {
        const alternative = String(request.options?.alternative ?? 'two-sided') as 'two-sided' | 'less' | 'greater';
        if (!['two-sided','less','greater'].includes(alternative)) throw new Error('Alternative must be two-sided, less, or greater.');
        const transformed = meanHypothesisTest(algebraAst, Number(request.options?.nullValue ?? 0), alternative);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'proportion-confidence-interval': {
        const transformed = proportionConfidenceInterval(algebraAst, Number(request.options?.confidence ?? 0.95));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'proportion-hypothesis-test': {
        const alternative = String(request.options?.alternative ?? 'two-sided') as 'two-sided' | 'less' | 'greater';
        if (!['two-sided','less','greater'].includes(alternative)) throw new Error('Alternative must be two-sided, less, or greater.');
        const transformed = proportionHypothesisTest(algebraAst, Number(request.options?.nullValue ?? 0.5), alternative);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'correlation-regression': {
        const transformed = correlationRegression(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'logic-profile': {
        const transformed = logicProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'logic-normal-forms': {
        const transformed = logicNormalForms(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'set-profile': {
        const transformed = finiteSetProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'power-set': {
        const transformed = finiteSetPowerSet(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'set-union':
      case 'set-intersection':
      case 'set-difference':
      case 'set-symmetric-difference':
      case 'cartesian-product':
      case 'subset-check': {
        const otherSource = String(request.options?.other ?? '').trim();
        if (!otherSource) throw new Error('This set operation requires a second set such as set(2,3,4).');
        const otherAst = parseLinearOption(otherSource, request.bindings);
        const op: SetBinaryOperation = request.operation === 'set-union' ? 'union'
          : request.operation === 'set-intersection' ? 'intersection'
          : request.operation === 'set-difference' ? 'difference'
          : request.operation === 'set-symmetric-difference' ? 'symmetric-difference'
          : request.operation === 'cartesian-product' ? 'cartesian' : 'subset';
        const transformed = finiteSetBinary(algebraAst, otherAst, op);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'relation-profile': {
        const transformed = relationProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'relation-closures': {
        const transformed = relationClosures(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'equivalence-classes': {
        const transformed = relationClasses(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'hasse-profile': {
        const transformed = hasseProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'graph-profile': {
        const transformed = graphProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'graph-bfs':
      case 'graph-dfs': {
        const transformed = graphTraversal(algebraAst, request.operation === 'graph-bfs' ? 'bfs' : 'dfs', Number(request.options?.start ?? 1));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'shortest-path': {
        const transformed = shortestPath(algebraAst, Number(request.options?.start ?? 1), Number(request.options?.target ?? 2));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'topological-sort': {
        const transformed = topologicalSort(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'minimum-spanning-tree': {
        const transformed = minimumSpanningTree(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'recurrence-profile': {
        const transformed = recurrenceProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'recurrence-terms': {
        const transformed = recurrenceTerms(algebraAst, Number(request.options?.count ?? 10));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'recurrence-closed-form': {
        const transformed = recurrenceClosedForm(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'complexity-profile': {
        const transformed = complexityProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'evaluate-combinatorics': {
        const transformed = evaluateCombinatorics(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'sorting-trace': {
        const algorithm = String(request.options?.algorithm ?? 'insertion') as SortAlgorithm;
        if (!['insertion','selection','bubble','merge'].includes(algorithm)) throw new Error('Sorting algorithm must be insertion, selection, bubble, or merge.');
        const transformed = sortingTrace(algebraAst, algorithm);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'binary-search': {
        const targetSource = String(request.options?.target ?? '').trim();
        if (!targetSource) throw new Error('Binary search requires a target value.');
        const targetAst = parseLinearOption(targetSource, request.bindings);
        const transformed = binarySearchTrace(algebraAst, targetAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'heap-profile': {
        const transformed = heapProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, transformed.steps ?? []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'floating-point-profile': {
        const transformed = floatingPointProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'numerical-root': {
        const variable = calculusVariable(request, algebraAst);
        const method = String(request.options?.method ?? 'bisection') as RootMethod;
        if (!['bisection','newton','secant'].includes(method)) throw new Error('Numerical root method must be bisection, newton, or secant.');
        const transformed = numericalRoot(algebraAst, variable, method, {
          a: Number(request.options?.a), b: Number(request.options?.b), x0: Number(request.options?.x0), x1: Number(request.options?.x1),
          tolerance: Number(request.options?.tolerance ?? 1e-10), maxIterations: Number(request.options?.maxIterations ?? 60),
        });
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'numerical-derivative': {
        const variable = calculusVariable(request, algebraAst);
        const point = Number(request.options?.point ?? 0); const hSource = request.options?.step;
        const transformed = numericalDerivative(algebraAst, variable, point, hSource === undefined || hSource === '' ? undefined : Number(hSource));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'numerical-integral': {
        const variable = calculusVariable(request, algebraAst);
        const method = String(request.options?.method ?? 'adaptive-simpson') as QuadratureMethod;
        if (!['adaptive-simpson','simpson','trapezoid'].includes(method)) throw new Error('Numerical integration method must be adaptive-simpson, simpson, or trapezoid.');
        const transformed = numericalIntegral(algebraAst, variable, method, Number(request.options?.lower ?? 0), Number(request.options?.upper ?? 1), { tolerance: Number(request.options?.tolerance ?? 1e-9), panels: Number(request.options?.panels ?? 100) });
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'interpolation-polynomial': {
        const transformed = interpolationPolynomial(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'numerical-linear-solve': {
        const transformed = numericalLinearSolve(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'iterative-linear-solve': {
        const method = String(request.options?.method ?? 'gauss-seidel') as 'jacobi' | 'gauss-seidel';
        if (!['jacobi','gauss-seidel'].includes(method)) throw new Error('Iterative linear method must be jacobi or gauss-seidel.');
        const transformed = iterativeLinearSolve(algebraAst, method, Number(request.options?.tolerance ?? 1e-10), Number(request.options?.maxIterations ?? 500));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'condition-estimate': {
        const transformed = conditionEstimate(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'ivp-profile': {
        const transformed = ivpProfile(algebraAst);
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'ode-solve': {
        const method = String(request.options?.method ?? 'rk4') as OdeMethod;
        if (!['euler','heun','rk4'].includes(method)) throw new Error('ODE method must be euler, heun, or rk4.');
        const transformed = solveIvp(algebraAst, method, Number(request.options?.endpoint ?? 1), Number(request.options?.step ?? 0.1));
        return result(request, transformed.ast, withBindings(baseAst, algebraAst, []), transformed.warnings, transformed.exactness, transformed.display, transformed.sections);
      }
      case 'evaluate-linear-algebra': {
        const evaluated = evaluateLinearAst(algebraAst);
        const next = linearValueToAst(evaluated);
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, 'evaluate-linear-algebra', 'Evaluate vector/matrix arithmetic exactly over the rational numbers.')));
      }
      case 'norm': {
        const vector = asVector(evaluateLinearAst(algebraAst));
        const next = vectorNorm(vector);
        const step = unaryStep(algebraAst, next, 'euclidean-norm', 'Compute √(v·v) exactly, simplifying rational square factors where possible.');
        return result(request, next, withBindings(baseAst, algebraAst, step));
      }
      case 'dot-product': {
        const otherSource = String(request.options?.other ?? '').trim();
        if (!otherSource) throw new Error('Dot product requires a second vector.');
        const left = asVector(evaluateLinearAst(algebraAst));
        const otherAst = parseLinearOption(otherSource, request.bindings);
        const right = asVector(evaluateLinearAst(otherAst));
        const value = dotProduct(left, right);
        const next = linearValueToAst({ kind: 'scalar', value });
        const beforeAst: AstNode = { type: 'binary', operator: '*', left: algebraAst, right: otherAst };
        const steps = [{ id: 'step-1', before: astToPlainText(beforeAst), after: astToPlainText(next), beforeAst, afterAst: next, rule: 'dot-product', explanation: 'Multiply corresponding vector components and add the products.', verified: true } satisfies DerivationStep];
        return result(request, next, withBindings(baseAst, algebraAst, steps));
      }
      case 'rref': {
        const matrix = asMatrix(evaluateLinearAst(algebraAst));
        const reduced = rrefMatrix(matrix);
        const next = matrixToAst(reduced.matrix);
        const sections = [section('pivots', 'Pivot structure', [
          { label: 'Pivot columns', display: reduced.pivots.length ? reduced.pivots.map((pivot) => String(pivot + 1)).join(', ') : 'None' },
          { label: 'Rank', display: String(reduced.pivots.length) },
        ], 'Pivot column numbers are reported using 1-based mathematical indexing.')];
        return result(request, next, withBindings(baseAst, algebraAst, linearSteps(reduced.steps)), [], 'exact', undefined, sections);
      }
      case 'rank': {
        const matrix = asMatrix(evaluateLinearAst(algebraAst));
        const ranked = rankMatrix(matrix);
        const next: AstNode = { type: 'number', value: String(ranked.rank) };
        const sections = [section('rank', 'Rank analysis', [
          { label: 'Rank', display: String(ranked.rank), ast: next },
          { label: 'Pivot columns', display: ranked.pivots.length ? ranked.pivots.map((pivot) => String(pivot + 1)).join(', ') : 'None' },
          { label: 'RREF', display: astToPlainText(matrixToAst(ranked.rref)), ast: matrixToAst(ranked.rref) },
        ])];
        return result(request, next, withBindings(baseAst, algebraAst, linearSteps(ranked.steps)), [], 'exact', undefined, sections);
      }
      case 'det': {
        const matrix = asMatrix(evaluateLinearAst(algebraAst));
        const determinant = determinantMatrix(matrix);
        const next: AstNode = determinant.value.d === 1n
          ? { type: 'number', value: determinant.value.n.toString() }
          : { type: 'binary', operator: '/', left: { type: 'number', value: determinant.value.n.toString() }, right: { type: 'number', value: determinant.value.d.toString() } };
        const sections = [section('determinant', 'Determinant', [
          { label: 'det(A)', display: rationalToString(determinant.value), ast: next },
          { label: 'Invertibility', display: isZero(determinant.value) ? 'Singular' : 'Invertible', tone: isZero(determinant.value) ? 'warning' : 'positive' },
        ])];
        return result(request, next, withBindings(baseAst, algebraAst, linearSteps(determinant.steps)), [], 'exact', undefined, sections);
      }
      case 'inverse': {
        const matrix = asMatrix(evaluateLinearAst(algebraAst));
        const inverse = inverseMatrix(matrix);
        const next = matrixToAst(inverse.matrix);
        return result(request, next, withBindings(baseAst, algebraAst, linearSteps(inverse.steps)), [], 'exact', undefined, [
          section('inverse', 'Inverse verification', [{ label: 'Status', display: 'Unique exact inverse found', tone: 'positive' }], 'Computed by exact Gauss–Jordan reduction of [A | I].'),
        ]);
      }
      case 'solve-augmented': {
        const matrix = asMatrix(evaluateLinearAst(algebraAst));
        const solved = solveAugmentedMatrix(matrix);
        const rrefAst = matrixToAst(solved.rref);
        if (solved.status === 'inconsistent') {
          return result(request, rrefAst, withBindings(baseAst, algebraAst, linearSteps(solved.steps)), ['The augmented system is inconsistent and has no solution.'], 'exact', 'No solution', [
            section('system-status', 'System status', [{ label: 'Classification', display: 'Inconsistent', tone: 'negative' }, { label: 'RREF', display: astToPlainText(rrefAst), ast: rrefAst }]),
          ]);
        }
        const particular = solved.particular ?? [];
        const unique = solved.status === 'unique';
        const answerAst = unique ? solutionSystemAst(particular) : rrefAst;
        const sections: MathResultSection[] = [section('system-status', 'System status', [
          { label: 'Classification', display: unique ? 'Unique solution' : 'Underdetermined / infinitely many solutions', tone: unique ? 'positive' : 'warning' },
          { label: 'Particular solution', display: astToPlainText(vectorToAst(particular)), ast: vectorToAst(particular) },
          { label: 'Null-space directions', display: solved.nullBasis.length ? astToPlainText(basisSetAst(solved.nullBasis)) : 'Empty basis (nullity 0)', ast: solved.nullBasis.length ? basisSetAst(solved.nullBasis) : undefined },
          { label: 'RREF', display: astToPlainText(rrefAst), ast: rrefAst },
        ], unique ? 'The augmented matrix has a pivot in every variable column.' : 'Every solution equals the particular solution plus an arbitrary linear combination of the listed null-space directions.')];
        return result(request, answerAst, withBindings(baseAst, algebraAst, linearSteps(solved.steps)), [], 'exact', unique ? undefined : 'Particular solution + null-space span', sections);
      }
      case 'column-space':
      case 'null-space':
      case 'row-space':
      case 'linear-profile': {
        const matrix = asMatrix(evaluateLinearAst(algebraAst));
        const analysis = subspaceAnalysis(matrix);
        const columnAst = basisSetAst(analysis.columnBasis);
        const nullAst = basisSetAst(analysis.nullBasis);
        const rowAst = basisSetAst(analysis.rowBasis);
        if (request.operation === 'column-space') {
          return result(request, columnAst, withBindings(baseAst, algebraAst, linearSteps(analysis.steps)), [], 'exact', undefined, [section('column-space', 'Column space', [
            { label: 'Dimension', display: String(analysis.rank) },
            { label: 'Pivot columns', display: analysis.pivots.length ? analysis.pivots.map((pivot) => String(pivot + 1)).join(', ') : 'None' },
            { label: 'Basis', display: analysis.columnBasis.length ? astToPlainText(columnAst) : 'Empty basis', ast: analysis.columnBasis.length ? columnAst : undefined },
          ], 'Basis vectors are taken from the original matrix columns corresponding to RREF pivot columns.')]);
        }
        if (request.operation === 'null-space') {
          return result(request, nullAst, withBindings(baseAst, algebraAst, linearSteps(analysis.steps)), [], 'exact', analysis.nullBasis.length ? undefined : 'Empty basis', [section('null-space', 'Null space', [
            { label: 'Nullity', display: String(analysis.nullity) },
            { label: 'Basis', display: analysis.nullBasis.length ? astToPlainText(nullAst) : 'Empty basis — N(A) = {0}', ast: analysis.nullBasis.length ? nullAst : undefined },
          ], 'Free variables in RREF generate an exact basis for solutions of Ax = 0.')]);
        }
        if (request.operation === 'row-space') {
          return result(request, rowAst, withBindings(baseAst, algebraAst, linearSteps(analysis.steps)), [], 'exact', undefined, [section('row-space', 'Row space', [
            { label: 'Dimension', display: String(analysis.rank) },
            { label: 'Basis', display: analysis.rowBasis.length ? astToPlainText(rowAst) : 'Empty basis', ast: analysis.rowBasis.length ? rowAst : undefined },
          ], 'The nonzero rows of RREF form a basis for the row space.')]);
        }
        const sections: MathResultSection[] = [
          section('dimensions', 'Dimensions & rank', [
            { label: 'Matrix shape', display: `${analysis.rows}×${analysis.columns}` },
            { label: 'Rank', display: String(analysis.rank) },
            { label: 'Nullity', display: String(analysis.nullity) },
            { label: 'Rank–nullity', display: `${analysis.rank} + ${analysis.nullity} = ${analysis.columns}`, tone: 'positive' },
          ]),
          section('column-space', 'Column space', [
            { label: 'Basis', display: analysis.columnBasis.length ? astToPlainText(columnAst) : 'Empty basis', ast: analysis.columnBasis.length ? columnAst : undefined },
            { label: 'Independent columns?', display: analysis.rank === analysis.columns ? 'Yes' : 'No', tone: analysis.rank === analysis.columns ? 'positive' : 'warning' },
          ]),
          section('null-space', 'Null space', [
            { label: 'Basis', display: analysis.nullBasis.length ? astToPlainText(nullAst) : 'Empty basis — only the zero vector', ast: analysis.nullBasis.length ? nullAst : undefined },
          ]),
          section('row-space', 'Row space', [{ label: 'Basis', display: analysis.rowBasis.length ? astToPlainText(rowAst) : 'Empty basis', ast: analysis.rowBasis.length ? rowAst : undefined }]),
        ];
        if (analysis.rows === analysis.columns) {
          const determinant = determinantMatrix(matrix).value;
          sections[0].facts.push({ label: 'Invertible?', display: isZero(determinant) ? 'No' : 'Yes', tone: isZero(determinant) ? 'warning' : 'positive' });
        }
        return result(request, matrixToAst(analysis.steps.length ? rrefMatrix(matrix).matrix : matrix), withBindings(baseAst, algebraAst, linearSteps(analysis.steps)), [], 'exact', 'Linear algebra profile complete', sections);
      }
      case 'transpose':
      case 'conjugate-transpose': {
        const next = transposeAstExact(p8Ast, request.operation === 'conjugate-transpose');
        return result(request, next, withBindings(baseAst, algebraAst, unaryStep(algebraAst, next, request.operation, request.operation === 'conjugate-transpose' ? 'Transpose the matrix/vector and conjugate every complex entry.' : 'Swap rows and columns.')));
      }
      case 'projection': {
        const targetSource = String(request.options?.target ?? '').trim();
        if (!targetSource) throw new Error('Projection requires a target vector.');
        const basis = rationalVectorFromAst(p8Ast);
        const targetAst = parseLinearOption(targetSource, request.bindings);
        const target = rationalVectorFromAst(targetAst);
        const projected = projectVectorOntoVector(target, basis);
        const next = vectorToAst(projected);
        return result(request, next, withBindings(baseAst, algebraAst, [{
          id:'step-1', before:astToPlainText(targetAst), after:astToPlainText(next), beforeAst:targetAst, afterAst:next,
          rule:'orthogonal-projection', explanation:'Use proj_u(v) = (v·u)/(u·u) u with exact rational inner products.', verified:true,
        }]), [], 'exact', undefined, [section('projection','Orthogonal projection',[
          {label:'Target',display:astToPlainText(targetAst),ast:targetAst},
          {label:'Onto',display:astToPlainText(algebraAst),ast:algebraAst},
          {label:'Projection',display:astToPlainText(next),ast:next},
        ])]);
      }
      case 'project-column-space': {
        const targetSource = String(request.options?.target ?? '').trim();
        if (!targetSource) throw new Error('Column-space projection requires a target vector.');
        const matrix = rationalMatrixFromAst(p8Ast);
        const targetAst = parseLinearOption(targetSource, request.bindings);
        const target = rationalVectorFromAst(targetAst);
        const projected = projectOntoColumnSpace(matrix,target);
        const next = vectorToAst(projected.projection);
        return result(request,next,withBindings(baseAst,algebraAst,[]),[], 'exact', undefined,[section('column-projection','Projection onto Col(A)',[
          {label:'Projection',display:astToPlainText(next),ast:next},
          {label:'Coordinates in pivot-column basis',display:astToPlainText(vectorToAst(projected.coefficients)),ast:vectorToAst(projected.coefficients)},
          {label:'Basis',display:projected.basis.length?astToPlainText(basisSetAst(projected.basis)):'Empty basis',ast:projected.basis.length?basisSetAst(projected.basis):undefined},
        ],'A pivot-column basis is used, so the projection remains well-defined even when the original matrix columns are dependent.')]);
      }
      case 'gram-schmidt': {
        const gs = gramSchmidtAsts(p8Ast);
        const warnings = gs.analysis.dependentColumns.length ? [`Columns ${gs.analysis.dependentColumns.map(i=>i+1).join(', ')} were linearly dependent on earlier columns and were omitted from the basis.`] : [];
        return result(request,gs.orthonormalAst,withBindings(baseAst,algebraAst,linearSteps(gs.analysis.steps)),warnings,'exact',undefined,[section('gram-schmidt','Gram–Schmidt',[
          {label:'Orthogonal basis',display:astToPlainText(gs.orthogonalAst),ast:gs.orthogonalAst},
          {label:'Orthonormal basis',display:astToPlainText(gs.orthonormalAst),ast:gs.orthonormalAst},
          {label:'Independent source columns',display:gs.analysis.sourceColumns.map(i=>i+1).join(', ')||'None'},
        ],'Columns are processed left to right. Complex inputs use the conjugate inner product; normalization keeps square roots exact.')]);
      }
      case 'orthogonality-profile': {
        const profile=orthogonalityProfile(p8Ast);
        return result(request,profile.gram,withBindings(baseAst,algebraAst,[]),[], 'exact','Orthogonality profile complete',[section('orthogonality','Inner-product structure',[
          {label:'Gram matrix',display:astToPlainText(profile.gram),ast:profile.gram},
          {label:'Mutually orthogonal?',display:profile.orthogonal?'Yes':'No',tone:profile.orthogonal?'positive':'warning'},
          {label:'Orthonormal?',display:profile.orthonormal?'Yes':'No',tone:profile.orthonormal?'positive':'warning'},
          ...(profile.square?[{label:profile.real?'Orthogonal matrix?':'Unitary matrix?',display:profile.unitary?'Yes':'No',tone:profile.unitary?'positive':'warning'} as const]:[]),
        ],'The Gram matrix is A* A (conjugate-transpose times A), so complex inner products are handled correctly.')]);
      }
      case 'qr': {
        const qr=qrDecompositionAst(p8Ast);
        return result(request,qr.q,withBindings(baseAst,algebraAst,linearSteps(qr.steps)),[], 'exact','A = QR',[section('qr','Reduced QR decomposition',[
          {label:'Q',display:astToPlainText(qr.q),ast:qr.q},
          {label:'R',display:astToPlainText(qr.r),ast:qr.r},
          {label:'Identity',display:'A = QR',tone:'positive'},
        ],'Q has orthonormal columns. R is upper triangular. Square roots remain symbolic rather than being rounded.')]);
      }
      case 'least-squares': {
        const targetSource=String(request.options?.target??'').trim(); if(!targetSource)throw new Error('Least squares requires a target vector b.');
        const matrix=rationalMatrixFromAst(p8Ast); const targetAst=parseLinearOption(targetSource,request.bindings); const target=rationalVectorFromAst(targetAst); const ls=leastSquares(matrix,target);
        const next=vectorToAst(ls.solution);
        return result(request,next,withBindings(baseAst,algebraAst,[]),[], 'exact',undefined,[section('least-squares','Least-squares solution',[
          {label:'Minimizer x̂',display:astToPlainText(next),ast:next},
          {label:'Fitted vector A x̂',display:astToPlainText(vectorToAst(ls.fitted)),ast:vectorToAst(ls.fitted)},
          {label:'Residual b − A x̂',display:astToPlainText(vectorToAst(ls.residual)),ast:vectorToAst(ls.residual)},
          {label:'Residual norm',display:astToPlainText(ls.residualNorm),ast:ls.residualNorm},
        ],'Solve the normal equations AᵀA x̂ = Aᵀb exactly. P8 requires full column rank so the minimizer is unique.')]);
      }
      case 'characteristic-polynomial': {
        const matrix=rationalMatrixFromAst(p8Ast); const char=characteristicPolynomial(matrix);
        return result(request,char.ast,withBindings(baseAst,algebraAst,[]),[], 'exact',undefined,[section('characteristic','Characteristic polynomial',[
          {label:'χ_A(lambda)',display:astToPlainText(char.ast),ast:char.ast},
          {label:'Degree',display:String(matrix.length)},
        ],'Computed exactly with the Faddeev–LeVerrier recurrence, avoiding floating-point determinant sampling.')]);
      }
      case 'eigen': {
        const matrix=rationalMatrixFromAst(p8Ast); const eigen=eigenvaluesExact(matrix); const setAst:AstNode={type:'set',items:eigen.values};
        const warnings=eigen.warning?[eigen.warning]:[];
        return result(request,eigen.values.length?setAst:eigen.characteristic,withBindings(baseAst,algebraAst,[]),warnings,'exact',eigen.values.length?undefined:'Characteristic polynomial computed; exact roots unresolved',[section('eigenvalues','Eigenvalues',[
          {label:'Characteristic polynomial',display:astToPlainText(eigen.characteristic),ast:eigen.characteristic},
          {label:'Spectrum',display:eigen.values.length?astToPlainText(setAst):'Not resolved exactly',ast:eigen.values.length?setAst:undefined},
          ...eigen.values.map((value,i)=>({label:`Algebraic multiplicity of ${astToPlainText(value)}`,display:String(eigen.algebraicMultiplicities[i])})),
        ])]);
      }
      case 'eigenspaces': {
        const matrix=rationalMatrixFromAst(p8Ast); const es=eigenspacesExact(matrix); const warnings=[es.warning].filter((x):x is string=>Boolean(x));
        const facts=es.spaces.flatMap((space)=>[
          {label:`λ = ${astToPlainText(space.value)}`,display:`algebraic multiplicity ${space.multiplicity}${space.dimension!==undefined?`, geometric multiplicity ${space.dimension}`:''}`},
          ...(space.basisAst?[{label:'Eigenspace basis',display:astToPlainText(space.basisAst),ast:space.basisAst}]:space.symbolicVector?[{label:'Eigenvector',display:astToPlainText(space.symbolicVector),ast:space.symbolicVector}]:[]),
        ]);
        return result(request,es.eigen.characteristic,withBindings(baseAst,algebraAst,[]),warnings,'exact','Eigenspace analysis complete',[section('eigenspaces','Eigenspaces',facts.length?facts:[{label:'Result',display:'No exact eigenspaces resolved'}])]);
      }
      case 'diagonalize': {
        const matrix=rationalMatrixFromAst(p8Ast); const diag=diagonalizationExact(matrix); const warnings=diag.warning?[diag.warning]:[];
        const facts:MathResultSection['facts']=[{label:'Diagonalizable?',display:diag.diagonalizable?'Yes':'No / unresolved',tone:diag.diagonalizable?'positive':'warning'}];
        if(diag.p)facts.push({label:'P',display:astToPlainText(diag.p),ast:diag.p}); if(diag.d)facts.push({label:'D',display:astToPlainText(diag.d),ast:diag.d}); if(diag.pinv)facts.push({label:'P⁻¹',display:astToPlainText(diag.pinv),ast:diag.pinv});
        return result(request,diag.d,withBindings(baseAst,algebraAst,[]),warnings,'exact',diag.diagonalizable?'A = P D P⁻¹':'Diagonalization unavailable',[section('diagonalization','Diagonalization',facts,'Exact diagonalization is exposed only when P8 can construct a complete eigenbasis without numerical eigensolvers.')]);
      }
      case 'symmetry-profile': {
        const profile=symmetryProfile(p8Ast);
        return result(request,profile.adjoint,withBindings(baseAst,algebraAst,[]),[], 'exact','Symmetry profile complete',[section('symmetry','Symmetry / Hermitian profile',[
          {label:'Adjoint A*',display:astToPlainText(profile.adjoint),ast:profile.adjoint},
          {label:'Real symmetric?',display:profile.symmetric?'Yes':'No',tone:profile.symmetric?'positive':undefined},
          {label:'Hermitian?',display:profile.hermitian?'Yes':'No',tone:profile.hermitian?'positive':undefined},
          {label:'Skew-Hermitian?',display:profile.skewHermitian?'Yes':'No'},
          {label:'Normal?',display:profile.normal?'Yes':'No',tone:profile.normal?'positive':undefined},
          ...(profile.hermitian?[{label:'Spectral theorem',display:'Real spectrum and orthogonal/unitary diagonalizability',tone:'positive'} as const]:[]),
        ])]);
      }
      case 'span-vector': {
        const vector = asVector(evaluateLinearAst(algebraAst));
        const zero = vector.every(isZero);
        const basis = zero ? [] : [vector];
        const basisAst = basisSetAst(basis);
        return result(request, undefined, withBindings(baseAst, algebraAst, []), [], 'exact', zero ? 'Span is the zero subspace' : 'One-dimensional span', [section('vector-span', 'Span profile', [
          { label: 'Dimension', display: zero ? '0' : '1' },
          { label: 'Basis', display: zero ? 'Empty basis' : astToPlainText(basisAst), ast: zero ? undefined : basisAst },
          { label: 'Subspace', display: zero ? '{0}' : `span(${astToPlainText(vectorToAst(vector))})` },
        ], zero ? 'The zero vector generates only the zero subspace; its basis is empty.' : 'Any single nonzero vector is linearly independent and forms a basis for the one-dimensional subspace it spans.')]);
      }
      default:
        throw new Error(`Operation “${request.operation}” is not implemented by the P14 local mathematics engine.`);
    }
  }
}
