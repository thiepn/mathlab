import type { AstNode } from './ast';
import { rationalToAst, rationalValue, simplifyAst, substituteAst, symbolsIn } from './algebra';
import { differentiateAst, evaluateAt, type CalculusStep } from './calculus';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import { ONE, ZERO, add, isZero, mul, sign, sub, type Rational } from './rational';
import { solveEquation, solveLinearSystem, type SolveStep } from './solve';

export interface MultivariableTransform {
  ast: AstNode;
  steps: CalculusStep[];
  warnings: string[];
}

export interface CriticalPointRecord {
  point: AstNode[];
  value: AstNode;
  classification: 'local minimum' | 'local maximum' | 'saddle point' | 'inconclusive';
  hessianDeterminant?: AstNode;
  fxx?: AstNode;
}

export interface CriticalPointAnalysis {
  pointsAst: AstNode;
  records: CriticalPointRecord[];
  steps: Array<CalculusStep | SolveStep>;
  warnings: string[];
}

export interface LagrangeAnalysis {
  resultAst: AstNode;
  point: AstNode[];
  lambda: AstNode;
  objectiveValue: AstNode;
  constraintAst: AstNode;
  steps: SolveStep[];
  warnings: string[];
}

const CONSTANTS = new Set(['pi', 'e', 'i', 'infinity', 'C']);

function n(value: string | number): AstNode { return { type: 'number', value: String(value) }; }
function s(name: string): AstNode { return { type: 'symbol', name }; }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode, implicit = false): AstNode {
  return { type: 'binary', operator, left, right, implicit };
}
function call(name: string, ...args: AstNode[]): AstNode { return { type: 'call', name, args }; }
function equation(left: AstNode, right: AstNode): AstNode { return { type: 'equation', left, right }; }
function vector(items: AstNode[]): AstNode { return { type: 'matrix', rows: [items] }; }
function matrix(rows: AstNode[][]): AstNode { return { type: 'matrix', rows }; }
function set(items: AstNode[]): AstNode { return { type: 'set', items }; }

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

export function functionParametersFromSource(source: string, fallbackAst?: AstNode): string[] {
  const parsed = parseMath(source);
  const ast = parsed.ast;
  if (ast && (ast.type === 'definition' || ast.type === 'equation') && ast.left.type === 'call') {
    const parameters = ast.left.args
      .filter((arg): arg is Extract<AstNode, { type: 'symbol' }> => arg.type === 'symbol')
      .map((arg) => arg.name);
    if (parameters.length) return unique(parameters);
  }
  if (!fallbackAst) return [];
  return unique(symbolsIn(fallbackAst).filter((name) => !CONSTANTS.has(name)));
}

export function scalarFunctionValue(node: AstNode): boolean {
  return node.type !== 'matrix';
}

export function functionComponents(node: AstNode): AstNode[] {
  if (node.type !== 'matrix') return [node];
  if (node.rows.length !== 1) throw new Error('E1 Jacobians support scalar-valued functions and vector-valued functions written as [f1, f2, …]. Matrix-valued functions are deferred.');
  return node.rows[0];
}

function parseScalar(source: string): AstNode {
  const parsed = parseMath(source.trim());
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) {
    throw new Error(parsed.diagnostics.find((item) => item.severity === 'error')?.message ?? `Could not parse “${source}”.`);
  }
  const ast = parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
  if (['equation','comparison','system','set','matrix','definition'].includes(ast.type)) throw new Error(`“${source}” is not a scalar point coordinate.`);
  return ast;
}

function splitTopLevel(source: string): string[] {
  const trimmed = source.trim();
  if (!trimmed) return [];
  const unwrapped = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed;
  const parts: string[] = [];
  let start = 0;
  let round = 0;
  let square = 0;
  for (let i = 0; i < unwrapped.length; i += 1) {
    const ch = unwrapped[i];
    if (ch === '(') round += 1;
    else if (ch === ')') round -= 1;
    else if (ch === '[') square += 1;
    else if (ch === ']') square -= 1;
    else if (ch === ',' && round === 0 && square === 0) {
      parts.push(unwrapped.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(unwrapped.slice(start).trim());
  return parts.filter(Boolean);
}

export function parseCoordinateList(source: string, expected: number, label = 'point'): AstNode[] {
  const parts = splitTopLevel(source);
  if (parts.length !== expected) throw new Error(`E1 ${label} requires ${expected} coordinate${expected === 1 ? '' : 's'} in parameter order.`);
  return parts.map(parseScalar);
}

export function evaluateAtPoint(node: AstNode, parameters: string[], point: AstNode[]): AstNode {
  if (parameters.length !== point.length) throw new Error('Point dimension must match the function arity.');
  let out = node;
  parameters.forEach((parameter, index) => { out = evaluateAt(out, parameter, point[index]); });
  return simplifyAst(out);
}

function componentwiseDerivative(node: AstNode, variable: string): MultivariableTransform {
  if (node.type !== 'matrix') return differentiateAst(node, variable);
  if (node.rows.length !== 1) throw new Error('E1 componentwise partial derivatives currently support vector-valued functions written as one-row vectors.');
  const steps: CalculusStep[] = [];
  const warnings: string[] = [];
  const row = node.rows[0].map((component) => {
    const transformed = differentiateAst(component, variable);
    steps.push(...transformed.steps);
    warnings.push(...transformed.warnings);
    return transformed.ast;
  });
  return { ast: vector(row), steps, warnings: unique(warnings) };
}

export function partialDerivative(node: AstNode, parameters: string[], variable: string): MultivariableTransform {
  if (!parameters.includes(variable)) throw new Error(`Partial derivative variable “${variable}” must be one of ${parameters.join(', ')}.`);
  const transformed = componentwiseDerivative(node, variable);
  return {
    ...transformed,
    warnings: unique([`All other independent variables are held constant while differentiating with respect to ${variable}.`, ...transformed.warnings]),
  };
}

export function mixedPartialDerivative(node: AstNode, parameters: string[], variables: string[]): MultivariableTransform {
  if (variables.length < 2) throw new Error('Mixed partial differentiation requires at least two differentiation variables.');
  variables.forEach((variable) => {
    if (!parameters.includes(variable)) throw new Error(`Mixed-partial variable “${variable}” must be one of ${parameters.join(', ')}.`);
  });
  let current = node;
  const steps: CalculusStep[] = [];
  const warnings: string[] = [];
  for (const variable of variables) {
    const transformed = componentwiseDerivative(current, variable);
    current = transformed.ast;
    steps.push(...transformed.steps);
    warnings.push(...transformed.warnings);
  }
  return { ast: current, steps, warnings: unique([`Differentiation order: ${variables.join(' → ')}.`, ...warnings]) };
}

export function gradient(node: AstNode, parameters: string[]): MultivariableTransform {
  if (!scalarFunctionValue(node)) throw new Error('The gradient is defined here for scalar-valued functions. Use Jacobian for vector-valued functions.');
  if (parameters.length < 2) throw new Error('E1 gradient requires at least two independent variables.');
  const steps: CalculusStep[] = [];
  const warnings: string[] = [];
  const row = parameters.map((parameter) => {
    const transformed = differentiateAst(node, parameter);
    steps.push(...transformed.steps);
    warnings.push(...transformed.warnings);
    return transformed.ast;
  });
  return { ast: vector(row), steps, warnings: unique(warnings) };
}

export function jacobian(node: AstNode, parameters: string[]): MultivariableTransform {
  if (parameters.length < 2) throw new Error('E1 Jacobian requires at least two independent variables.');
  const components = functionComponents(node);
  const steps: CalculusStep[] = [];
  const warnings: string[] = [];
  const rows = components.map((component) => parameters.map((parameter) => {
    const transformed = differentiateAst(component, parameter);
    steps.push(...transformed.steps);
    warnings.push(...transformed.warnings);
    return transformed.ast;
  }));
  return { ast: matrix(rows), steps, warnings: unique(warnings) };
}

export function hessian(node: AstNode, parameters: string[]): MultivariableTransform {
  if (!scalarFunctionValue(node)) throw new Error('The Hessian is defined here for scalar-valued functions.');
  if (parameters.length < 2) throw new Error('E1 Hessian requires at least two independent variables.');
  const first = parameters.map((parameter) => differentiateAst(node, parameter));
  const steps: CalculusStep[] = first.flatMap((item) => item.steps);
  const warnings: string[] = first.flatMap((item) => item.warnings);
  const rows = first.map((partial) => parameters.map((parameter) => {
    const transformed = differentiateAst(partial.ast, parameter);
    steps.push(...transformed.steps);
    warnings.push(...transformed.warnings);
    return transformed.ast;
  }));
  return { ast: matrix(rows), steps, warnings: unique(warnings) };
}

function addAst(left: AstNode, right: AstNode): AstNode { return simplifyAst(b('+', left, right)); }
function mulAst(left: AstNode, right: AstNode): AstNode { return simplifyAst(b('*', left, right)); }

export function directionalDerivative(node: AstNode, parameters: string[], pointSource: string, directionSource: string): MultivariableTransform {
  if (!scalarFunctionValue(node)) throw new Error('E1 directional derivatives currently target scalar-valued functions.');
  const point = parseCoordinateList(pointSource, parameters.length, 'point');
  const direction = parseCoordinateList(directionSource, parameters.length, 'direction vector');
  const grad = gradient(node, parameters);
  const gradRow = grad.ast.type === 'matrix' ? grad.ast.rows[0] : [];
  const evaluatedGradient = gradRow.map((component) => evaluateAtPoint(component, parameters, point));
  let normSquared: AstNode = n(0);
  for (const component of direction) normSquared = addAst(normSquared, b('^', component, n(2)));
  normSquared = simplifyAst(normSquared);
  const zeroNorm = rationalValue(normSquared);
  if (zeroNorm && isZero(zeroNorm)) throw new Error('Directional derivative requires a nonzero direction vector.');
  const norm = call('sqrt', normSquared);
  let dot: AstNode = n(0);
  for (let i = 0; i < direction.length; i += 1) {
    dot = addAst(dot, mulAst(evaluatedGradient[i], b('/', direction[i], norm)));
  }
  const ast = simplifyAst(dot);
  return {
    ast,
    steps: grad.steps,
    warnings: unique([`Direction ${directionSource} is normalized before taking ∇f · u.`, ...grad.warnings]),
  };
}

export function linearization(node: AstNode, parameters: string[], pointSource: string): MultivariableTransform {
  if (!scalarFunctionValue(node)) throw new Error('E1 linearization currently targets scalar-valued functions.');
  const point = parseCoordinateList(pointSource, parameters.length, 'linearization point');
  const value = evaluateAtPoint(node, parameters, point);
  const grad = gradient(node, parameters);
  const gradRow = grad.ast.type === 'matrix' ? grad.ast.rows[0] : [];
  let out = value;
  for (let i = 0; i < parameters.length; i += 1) {
    const slope = evaluateAtPoint(gradRow[i], parameters, point);
    out = addAst(out, mulAst(slope, b('-', s(parameters[i]), point[i])));
  }
  return { ast: simplifyAst(out), steps: grad.steps, warnings: grad.warnings };
}

export function tangentPlane(node: AstNode, parameters: string[], pointSource: string): MultivariableTransform {
  if (parameters.length !== 2) throw new Error('E1 tangent-plane output currently supports scalar functions of exactly two variables.');
  const linear = linearization(node, parameters, pointSource);
  return { ...linear, ast: equation(s('z'), linear.ast) };
}

function pointVector(point: AstNode[]): AstNode { return vector(point); }

function solutionPointFromLinearSystem(resultAst: AstNode | undefined, parameters: string[]): AstNode[] | null {
  if (!resultAst || resultAst.type !== 'system') return null;
  const map = new Map<string, AstNode>();
  for (const item of resultAst.items) {
    if (item.type === 'equation' && item.left.type === 'symbol') map.set(item.left.name, item.right);
  }
  const point = parameters.map((parameter) => map.get(parameter));
  return point.every(Boolean) ? point as AstNode[] : null;
}

function independentGradientSolutions(gradientAsts: AstNode[], parameters: string[]): AstNode[][] | null {
  const solutions = new Map<string, AstNode[]>();
  for (const parameter of parameters) {
    const candidates = gradientAsts.filter((gradientAst) => {
      const vars = symbolsIn(gradientAst).filter((name) => parameters.includes(name));
      return vars.length === 1 && vars[0] === parameter;
    });
    if (candidates.length !== 1) return null;
    const solved = solveEquation(equation(candidates[0], n(0)), parameter);
    if (solved.status !== 'solved' || !solved.solutions.length) return null;
    solutions.set(parameter, solved.solutions);
  }
  const product: AstNode[][] = [[]];
  for (const parameter of parameters) {
    const values = solutions.get(parameter)!;
    const next: AstNode[][] = [];
    for (const prefix of product) for (const value of values) next.push([...prefix, value]);
    product.splice(0, product.length, ...next);
  }
  return product;
}

function classifyTwoVariablePoint(node: AstNode, parameters: string[], point: AstNode[]): Omit<CriticalPointRecord, 'point' | 'value'> {
  const [x, y] = parameters;
  const fx = differentiateAst(node, x).ast;
  const fy = differentiateAst(node, y).ast;
  const fxxAst = differentiateAst(fx, x).ast;
  const fxyAst = differentiateAst(fx, y).ast;
  const fyyAst = differentiateAst(fy, y).ast;
  const fxx = rationalValue(evaluateAtPoint(fxxAst, parameters, point));
  const fxy = rationalValue(evaluateAtPoint(fxyAst, parameters, point));
  const fyy = rationalValue(evaluateAtPoint(fyyAst, parameters, point));
  if (!fxx || !fxy || !fyy) return { classification: 'inconclusive' };
  const determinant: Rational = sub(mul(fxx, fyy), mul(fxy, fxy));
  const detAst = rationalToAst(determinant);
  const fxxAstAtPoint = rationalToAst(fxx);
  const detSign = sign(determinant);
  if (detSign < 0) return { classification: 'saddle point', hessianDeterminant: detAst, fxx: fxxAstAtPoint };
  if (detSign > 0 && sign(fxx) > 0) return { classification: 'local minimum', hessianDeterminant: detAst, fxx: fxxAstAtPoint };
  if (detSign > 0 && sign(fxx) < 0) return { classification: 'local maximum', hessianDeterminant: detAst, fxx: fxxAstAtPoint };
  return { classification: 'inconclusive', hessianDeterminant: detAst, fxx: fxxAstAtPoint };
}

export function criticalPointAnalysis(node: AstNode, parameters: string[]): CriticalPointAnalysis {
  if (!scalarFunctionValue(node)) throw new Error('E1 critical-point analysis requires a scalar-valued function.');
  if (parameters.length !== 2) throw new Error('E1 exact critical-point solving and the second-derivative test are currently bounded to two variables.');
  const partials = parameters.map((parameter) => differentiateAst(node, parameter));
  const gradientAsts = partials.map((item) => item.ast);
  const steps: Array<CalculusStep | SolveStep> = partials.flatMap((item) => item.steps);
  const warnings: string[] = partials.flatMap((item) => item.warnings);

  let points = independentGradientSolutions(gradientAsts, parameters);
  if (!points) {
    const systemAst: AstNode = { type: 'system', items: gradientAsts.map((partial) => equation(partial, n(0))) };
    const solved = solveLinearSystem(systemAst);
    steps.push(...solved.steps);
    if (solved.status !== 'unique') {
      throw new Error(solved.warning ?? 'E1 exact critical-point solving currently supports separable degree-2 gradients or coupled linear gradient systems.');
    }
    const point = solutionPointFromLinearSystem(solved.resultAst, parameters);
    if (!point) throw new Error('Could not recover the critical point from the exact linear-system solution.');
    points = [point];
  }

  const records: CriticalPointRecord[] = points.map((point) => ({
    point,
    value: evaluateAtPoint(node, parameters, point),
    ...classifyTwoVariablePoint(node, parameters, point),
  }));
  return {
    pointsAst: set(points.map(pointVector)),
    records,
    steps,
    warnings: unique(warnings),
  };
}

function constraintZeroExpression(source: string): { expression: AstNode; original: AstNode } {
  const parsed = parseMath(source.trim());
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) {
    throw new Error(parsed.diagnostics.find((item) => item.severity === 'error')?.message ?? 'Could not parse the constraint.');
  }
  const ast = parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
  if (ast.type === 'equation') return { expression: simplifyAst(b('-', ast.left, ast.right)), original: ast };
  if (ast.type === 'comparison' || ast.type === 'system' || ast.type === 'set' || ast.type === 'matrix') throw new Error('Lagrange multipliers require one equality constraint such as x + y = 1.');
  return { expression: ast, original: equation(ast, n(0)) };
}

export function lagrangeMultipliers(node: AstNode, parameters: string[], constraintSource: string): LagrangeAnalysis {
  if (!scalarFunctionValue(node)) throw new Error('E1 Lagrange multipliers require a scalar objective function.');
  if (parameters.length !== 2) throw new Error('E1 Lagrange multipliers are currently bounded to two variables and one equality constraint.');
  const { expression: constraint, original: constraintAst } = constraintZeroExpression(constraintSource);
  const constraintVariables = symbolsIn(constraint).filter((name) => !CONSTANTS.has(name));
  if (constraintVariables.some((name) => !parameters.includes(name))) throw new Error(`Constraint may use only ${parameters.join(', ')}.`);

  const lambda = s('lambda');
  const equations: AstNode[] = parameters.map((parameter) => {
    const objectivePartial = differentiateAst(node, parameter).ast;
    const constraintPartial = differentiateAst(constraint, parameter).ast;
    return equation(b('-', objectivePartial, b('*', lambda, constraintPartial)), n(0));
  });
  equations.push(equation(constraint, n(0)));
  const solved = solveLinearSystem({ type: 'system', items: equations });
  if (solved.status !== 'unique' || !solved.resultAst) {
    throw new Error(solved.warning ?? 'E1 exact Lagrange solving currently supports cases whose stationarity equations reduce to a unique exact linear system (for example a quadratic objective with a linear constraint).');
  }
  const map = new Map<string, AstNode>();
  if (solved.resultAst.type === 'system') {
    for (const item of solved.resultAst.items) if (item.type === 'equation' && item.left.type === 'symbol') map.set(item.left.name, item.right);
  }
  const point = parameters.map((parameter) => map.get(parameter));
  const lambdaValue = map.get('lambda');
  if (!point.every(Boolean) || !lambdaValue) throw new Error('Could not recover the exact Lagrange solution from the stationarity system.');
  const objectiveValue = evaluateAtPoint(node, parameters, point as AstNode[]);
  return {
    resultAst: solved.resultAst,
    point: point as AstNode[],
    lambda: lambdaValue,
    objectiveValue,
    constraintAst,
    steps: solved.steps,
    warnings: ['A stationary constrained point is returned. Global optimality still depends on the feasible set and objective geometry.'],
  };
}

export function substituteExternalBindings(node: AstNode, parameters: string[], bindings: Array<{ name: string; ast: AstNode }> | undefined): AstNode {
  if (!bindings?.length) return node;
  let out = node;
  for (const binding of bindings) {
    if (!parameters.includes(binding.name)) out = substituteAst(out, binding.name, binding.ast);
  }
  return simplifyAst(out);
}

export function pointDisplay(parameters: string[], point: AstNode[]): string {
  return `(${parameters.map((parameter, index) => `${parameter} = ${astToPlainText(point[index])}`).join(', ')})`;
}
