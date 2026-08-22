import type { AstNode } from './ast';
import { rationalValue, simplifyAst, substituteAst, symbolsIn } from './algebra';
import { definiteIntegralAst, differentiateAst, integrateAst, type CalculusStep } from './calculus';
import { astToPlainText } from './format';
import { functionComponents, scalarFunctionValue } from './multivariable';
import { parseMath } from './parser';
import { isZero } from './rational';

export type E2Exactness = 'exact' | 'approximate';
export type CoordinateSystem = 'cartesian' | 'polar' | 'cylindrical' | 'spherical';

export interface IteratedBound {
  variable: string;
  lower: AstNode;
  upper: AstNode;
}

export interface IntegrationOutcome {
  ast: AstNode;
  exactness: E2Exactness;
  steps: CalculusStep[];
  warnings: string[];
  integrandAst: AstNode;
  bounds: IteratedBound[];
}

export interface CoordinateTransformOutcome {
  ast: AstNode;
  transformedIntegrand: AstNode;
  jacobian: AstNode;
  variables: string[];
  substitutions: Array<{ parameter: string; ast: AstNode }>;
  warnings: string[];
}

export interface VectorFieldProfile {
  dimension: 2 | 3;
  components: AstNode[];
  divergence: AstNode;
  curl: AstNode;
  conservative: boolean;
  potential?: AstNode;
  warnings: string[];
}

export interface TheoremVerification {
  theorem: 'Green' | 'Gauss' | 'Stokes';
  left: AstNode;
  right: AstNode;
  difference: AstNode;
  exactness: E2Exactness;
  verified: boolean;
  steps: CalculusStep[];
  warnings: string[];
}

const CONSTANTS = new Set(['pi', 'e', 'i', 'infinity', 'C']);

function n(value: string | number): AstNode { return { type: 'number', value: String(value) }; }
function s(name: string): AstNode { return { type: 'symbol', name }; }
function b(operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode, implicit = false): AstNode {
  return { type: 'binary', operator, left, right, implicit };
}
function u(operator: '+' | '-', operand: AstNode): AstNode { return { type: 'unary', operator, operand }; }
function call(name: string, ...args: AstNode[]): AstNode { return { type: 'call', name, args }; }
function vector(items: AstNode[]): AstNode { return { type: 'matrix', rows: [items] }; }
function equation(left: AstNode, right: AstNode): AstNode { return { type: 'equation', left, right }; }

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }
function addAst(left: AstNode, right: AstNode): AstNode { return simplifyAst(b('+', left, right)); }
function subAst(left: AstNode, right: AstNode): AstNode { return simplifyAst(b('-', left, right)); }
function mulAst(left: AstNode, right: AstNode): AstNode { return simplifyAst(b('*', left, right)); }
function divAst(left: AstNode, right: AstNode): AstNode { return simplifyAst(b('/', left, right)); }
function negAst(value: AstNode): AstNode { return simplifyAst(u('-', value)); }
function sameAst(left: AstNode, right: AstNode): boolean { return JSON.stringify(simplifyAst(left)) === JSON.stringify(simplifyAst(right)); }
function isZeroAst(node: AstNode): boolean { const value = rationalValue(simplifyAst(node)); return Boolean(value && isZero(value)); }

export function parseE2Scalar(source: string, label = 'expression'): AstNode {
  const parsed = parseMath(source.trim());
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) {
    throw new Error(parsed.diagnostics.find((item) => item.severity === 'error')?.message ?? `Could not parse ${label} “${source}”.`);
  }
  const ast = parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
  if (['equation','comparison','definition','system','set','matrix'].includes(ast.type)) throw new Error(`${label} must be a scalar expression.`);
  return ast;
}

export function parseE2Vector(source: string, expected?: number, label = 'vector'): AstNode[] {
  const parsed = parseMath(source.trim());
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) {
    throw new Error(parsed.diagnostics.find((item) => item.severity === 'error')?.message ?? `Could not parse ${label} “${source}”.`);
  }
  const ast = parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
  if (ast.type !== 'matrix' || ast.rows.length !== 1) throw new Error(`${label} must be written as a one-row vector such as [t, t^2].`);
  const components = ast.rows[0];
  if (expected !== undefined && components.length !== expected) throw new Error(`${label} requires ${expected} components.`);
  return components;
}

function parseSurfaceGraph(source: string, verticalVariable: string): AstNode {
  const parsed = parseMath(source.trim());
  if (!parsed.ast || parsed.diagnostics.some((item) => item.severity === 'error')) {
    throw new Error(parsed.diagnostics.find((item) => item.severity === 'error')?.message ?? `Could not parse surface “${source}”.`);
  }
  const ast = parsed.ast;
  if (ast.type === 'equation') {
    if (ast.left.type === 'symbol' && ast.left.name === verticalVariable) return ast.right;
    if (ast.right.type === 'symbol' && ast.right.name === verticalVariable) return ast.left;
    throw new Error(`Graph surface equation must isolate ${verticalVariable}, for example ${verticalVariable}=x+y.`);
  }
  if (['comparison','definition','system','set','matrix'].includes(ast.type)) throw new Error('Graph surface must be a scalar expression or an isolated graph equation.');
  return ast;
}

function substituteMany(node: AstNode, names: string[], values: AstNode[]): AstNode {
  let current = node;
  names.forEach((name, index) => { current = substituteAst(current, name, values[index]); });
  return simplifyAst(current);
}

function validateBoundDependency(bounds: IteratedBound[]): void {
  bounds.forEach((bound, index) => {
    const allowed = new Set(bounds.slice(index + 1).map((item) => item.variable));
    for (const endpoint of [bound.lower, bound.upper]) {
      for (const symbol of symbolsIn(endpoint)) {
        if (CONSTANTS.has(symbol)) continue;
        if (!allowed.has(symbol)) {
          throw new Error(`The ${bound.variable} bounds may depend only on outer integration variables (${[...allowed].join(', ') || 'none'}). Found ${symbol}.`);
        }
      }
    }
  });
}

function numericScalar(node: AstNode, bindings: Record<string, number>): number {
  if (node.type === 'number') {
    const value = Number(node.value);
    if (!Number.isFinite(value)) throw new Error(`Could not numerically evaluate ${node.value}.`);
    return value;
  }
  if (node.type === 'symbol') {
    if (node.name in bindings) return bindings[node.name];
    if (node.name === 'pi') return Math.PI;
    if (node.name === 'e') return Math.E;
    throw new Error(`No numerical value is available for ${node.name}.`);
  }
  if (node.type === 'unary') {
    const value = numericScalar(node.operand, bindings);
    return node.operator === '-' ? -value : value;
  }
  if (node.type === 'binary') {
    const left = numericScalar(node.left, bindings);
    const right = numericScalar(node.right, bindings);
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') {
      if (Math.abs(right) < 1e-15) throw new Error('Numerical integration sampled a denominator zero.');
      return left / right;
    }
    const value = left ** right;
    if (!Number.isFinite(value)) throw new Error('Numerical integration sampled an undefined power.');
    return value;
  }
  if (node.type === 'call') {
    if (node.args.length !== 1) throw new Error(`Numerical E2 fallback does not evaluate ${node.name} with ${node.args.length} arguments.`);
    const x = numericScalar(node.args[0], bindings);
    const table: Record<string, (value: number) => number> = {
      sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log10,
      sqrt: Math.sqrt, abs: Math.abs, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
      asin: Math.asin, acos: Math.acos, atan: Math.atan,
    };
    const fn = table[node.name];
    if (!fn) throw new Error(`Numerical E2 fallback does not support ${node.name}(...).`);
    const value = fn(x);
    if (!Number.isFinite(value)) throw new Error(`Numerical integration sampled an undefined ${node.name}(...) value.`);
    return value;
  }
  throw new Error('Numerical E2 fallback evaluates scalar expressions only.');
}

function constantNumeric(node: AstNode): number | null {
  try {
    if (symbolsIn(node).some((name) => !CONSTANTS.has(name))) return null;
    const value = numericScalar(node, {});
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function simpsonWeight(index: number, panels: number): number {
  if (index === 0 || index === panels) return 1;
  return index % 2 === 0 ? 2 : 4;
}

function normalizePanels(raw: number | undefined, dimensions: number): number {
  const fallback = dimensions === 3 ? 8 : 16;
  const max = dimensions === 3 ? 20 : 48;
  let value = Number.isFinite(raw) ? Math.floor(raw!) : fallback;
  value = Math.max(4, Math.min(max, value));
  if (value % 2) value += 1;
  return Math.min(max, value);
}

function approximateRectangular(node: AstNode, bounds: IteratedBound[], panelsRaw?: number): number {
  const intervals = bounds.map((bound) => {
    const lower = constantNumeric(bound.lower); const upper = constantNumeric(bound.upper);
    if (lower === null || upper === null) throw new Error('Approximate E2 fallback currently requires constant rectangular bounds. Variable-dependent regions remain exact-only.');
    if (lower === upper) return { ...bound, lowerNumber: lower, upperNumber: upper };
    return { ...bound, lowerNumber: lower, upperNumber: upper };
  });
  const dimensions = bounds.length;
  const panels = normalizePanels(panelsRaw, dimensions);
  if (dimensions === 1) {
    const interval = intervals[0]; const h = (interval.upperNumber - interval.lowerNumber) / panels;
    let sum = 0;
    for (let i = 0; i <= panels; i += 1) {
      const x = interval.lowerNumber + i * h;
      sum += simpsonWeight(i, panels) * numericScalar(node, { [interval.variable]: x });
    }
    return (h / 3) * sum;
  }
  if (dimensions === 2) {
    const [a, c] = intervals;
    const hx = (a.upperNumber - a.lowerNumber) / panels;
    const hy = (c.upperNumber - c.lowerNumber) / panels;
    let sum = 0;
    for (let i = 0; i <= panels; i += 1) {
      const x = a.lowerNumber + i * hx;
      for (let j = 0; j <= panels; j += 1) {
        const y = c.lowerNumber + j * hy;
        sum += simpsonWeight(i, panels) * simpsonWeight(j, panels) * numericScalar(node, { [a.variable]: x, [c.variable]: y });
      }
    }
    return (hx * hy / 9) * sum;
  }
  if (dimensions === 3) {
    const [a, c, e] = intervals;
    const hx = (a.upperNumber - a.lowerNumber) / panels;
    const hy = (c.upperNumber - c.lowerNumber) / panels;
    const hz = (e.upperNumber - e.lowerNumber) / panels;
    let sum = 0;
    for (let i = 0; i <= panels; i += 1) {
      const x = a.lowerNumber + i * hx;
      for (let j = 0; j <= panels; j += 1) {
        const y = c.lowerNumber + j * hy;
        for (let k = 0; k <= panels; k += 1) {
          const z = e.lowerNumber + k * hz;
          sum += simpsonWeight(i, panels) * simpsonWeight(j, panels) * simpsonWeight(k, panels) * numericScalar(node, { [a.variable]: x, [c.variable]: y, [e.variable]: z });
        }
      }
    }
    return (hx * hy * hz / 27) * sum;
  }
  throw new Error('E2 numerical cubature is limited to one, two, or three dimensions.');
}

function approximateAst(value: number): AstNode {
  const normalized = Math.abs(value) < 5e-14 ? 0 : value;
  return n(Number(normalized.toPrecision(12)).toString());
}

export function parseIteratedBounds(specs: Array<{ variable: string; lower: string; upper: string }>): IteratedBound[] {
  const bounds = specs.map((spec) => ({
    variable: spec.variable.trim(),
    lower: parseE2Scalar(spec.lower, `${spec.variable} lower bound`),
    upper: parseE2Scalar(spec.upper, `${spec.variable} upper bound`),
  }));
  if (bounds.some((bound) => !bound.variable)) throw new Error('Every integration bound requires a variable.');
  if (new Set(bounds.map((bound) => bound.variable)).size !== bounds.length) throw new Error('Iterated integration variables must be distinct.');
  validateBoundDependency(bounds);
  return bounds;
}

export function integrateIterated(node: AstNode, bounds: IteratedBound[], panels?: number): IntegrationOutcome {
  if (bounds.length < 1 || bounds.length > 3) throw new Error('E2 iterated integration supports one through three nested variables.');
  validateBoundDependency(bounds);
  let current = node;
  const steps: CalculusStep[] = [];
  const warnings: string[] = [];
  try {
    for (const bound of bounds) {
      const transformed = definiteIntegralAst(current, bound.variable, bound.lower, bound.upper);
      current = transformed.ast;
      steps.push(...transformed.steps);
      warnings.push(...transformed.warnings);
    }
    return { ast: simplifyAst(current), exactness: 'exact', steps, warnings: unique(warnings), integrandAst: node, bounds };
  } catch (error) {
    const estimate = approximateRectangular(node, bounds, panels);
    return {
      ast: approximateAst(estimate), exactness: 'approximate', steps: [],
      warnings: [`Exact iterated antiderivative unavailable (${error instanceof Error ? error.message : 'unsupported exact form'}). Deterministic composite Simpson cubature was used over constant rectangular bounds.`, `Composite Simpson fallback used ${normalizePanels(panels, bounds.length)} panels per axis.`],
      integrandAst: node, bounds,
    };
  }
}

export function coordinateTransform(node: AstNode, parameters: string[], system: CoordinateSystem): CoordinateTransformOutcome {
  if (system === 'cartesian') return { ast: node, transformedIntegrand: node, jacobian: n(1), variables: parameters, substitutions: parameters.map((parameter) => ({ parameter, ast: s(parameter) })), warnings: [] };
  if (system === 'polar') {
    if (parameters.length !== 2) throw new Error('Polar coordinates require a scalar function of exactly two Cartesian coordinate slots.');
    const r = s('r'); const theta = s('theta');
    const substitutions = [
      { parameter: parameters[0], ast: mulAst(r, call('cos', theta)) },
      { parameter: parameters[1], ast: mulAst(r, call('sin', theta)) },
    ];
    const transformedIntegrand = substituteMany(node, parameters, substitutions.map((item) => item.ast));
    return { ast: mulAst(transformedIntegrand, r), transformedIntegrand, jacobian: r, variables: ['r','theta'], substitutions, warnings: ['Polar map uses the first two function parameters as Cartesian x/y coordinate slots and includes the Jacobian factor r.'] };
  }
  if (system === 'cylindrical') {
    if (parameters.length !== 3) throw new Error('Cylindrical coordinates require exactly three Cartesian coordinate slots.');
    const r = s('r'); const theta = s('theta'); const z = s('z');
    const substitutions = [
      { parameter: parameters[0], ast: mulAst(r, call('cos', theta)) },
      { parameter: parameters[1], ast: mulAst(r, call('sin', theta)) },
      { parameter: parameters[2], ast: z },
    ];
    const transformedIntegrand = substituteMany(node, parameters, substitutions.map((item) => item.ast));
    return { ast: mulAst(transformedIntegrand, r), transformedIntegrand, jacobian: r, variables: ['r','theta','z'], substitutions, warnings: ['Cylindrical map uses the first three function parameters as Cartesian x/y/z coordinate slots and includes the Jacobian factor r.'] };
  }
  if (parameters.length !== 3) throw new Error('Spherical coordinates require exactly three Cartesian coordinate slots.');
  const rho = s('rho'); const phi = s('phi'); const theta = s('theta');
  const rhoSinPhi = mulAst(rho, call('sin', phi));
  const substitutions = [
    { parameter: parameters[0], ast: mulAst(rhoSinPhi, call('cos', theta)) },
    { parameter: parameters[1], ast: mulAst(rhoSinPhi, call('sin', theta)) },
    { parameter: parameters[2], ast: mulAst(rho, call('cos', phi)) },
  ];
  const jacobian = mulAst(b('^', rho, n(2)), call('sin', phi));
  const transformedIntegrand = substituteMany(node, parameters, substitutions.map((item) => item.ast));
  return { ast: mulAst(transformedIntegrand, jacobian), transformedIntegrand, jacobian, variables: ['rho','phi','theta'], substitutions, warnings: ['Spherical convention: rho ≥ 0, phi is the polar angle from +z, theta is the azimuth; Jacobian rho^2 sin(phi) is included.'] };
}

function requireVectorField(node: AstNode, parameters: string[]): { components: AstNode[]; dimension: 2 | 3 } {
  if (scalarFunctionValue(node)) throw new Error('This E2 operation requires a vector-valued function such as F(x,y)=[P,Q] or F(x,y,z)=[P,Q,R].');
  const components = functionComponents(node);
  if (parameters.length !== 2 && parameters.length !== 3) throw new Error('E2 vector fields are currently two- or three-dimensional.');
  if (components.length !== parameters.length) throw new Error(`A ${parameters.length}D vector field requires exactly ${parameters.length} components; received ${components.length}.`);
  return { components, dimension: parameters.length as 2 | 3 };
}

export function divergence(node: AstNode, parameters: string[]): { ast: AstNode; steps: CalculusStep[]; warnings: string[] } {
  const { components } = requireVectorField(node, parameters);
  let out = n(0); const steps: CalculusStep[] = []; const warnings: string[] = [];
  components.forEach((component, index) => {
    const transformed = differentiateAst(component, parameters[index]);
    out = addAst(out, transformed.ast); steps.push(...transformed.steps); warnings.push(...transformed.warnings);
  });
  return { ast: simplifyAst(out), steps, warnings: unique(warnings) };
}

export function curl(node: AstNode, parameters: string[]): { ast: AstNode; steps: CalculusStep[]; warnings: string[] } {
  const { components, dimension } = requireVectorField(node, parameters);
  const steps: CalculusStep[] = []; const warnings: string[] = [];
  const d = (component: AstNode, variable: string): AstNode => {
    const transformed = differentiateAst(component, variable); steps.push(...transformed.steps); warnings.push(...transformed.warnings); return transformed.ast;
  };
  if (dimension === 2) {
    const ast = subAst(d(components[1], parameters[0]), d(components[0], parameters[1]));
    return { ast, steps, warnings: unique(warnings) };
  }
  const [x,y,z] = parameters; const [p,q,r] = components;
  const ast = vector([
    subAst(d(r,y), d(q,z)),
    subAst(d(p,z), d(r,x)),
    subAst(d(q,x), d(p,y)),
  ]);
  return { ast, steps, warnings: unique(warnings) };
}

function zeroCurl(ast: AstNode): boolean {
  if (ast.type === 'matrix') return ast.rows.flat().every(isZeroAst);
  return isZeroAst(ast);
}

function dependsOnlyOn(node: AstNode, allowed: string[]): boolean {
  const set = new Set(allowed);
  return symbolsIn(node).every((name) => CONSTANTS.has(name) || set.has(name));
}

export function scalarPotential(node: AstNode, parameters: string[]): { ast: AstNode; steps: CalculusStep[]; warnings: string[] } {
  const { components, dimension } = requireVectorField(node, parameters);
  const curlResult = curl(node, parameters);
  if (!zeroCurl(curlResult.ast)) throw new Error('No exact scalar potential is emitted because the computed curl is not identically zero on the represented domain.');
  const steps: CalculusStep[] = [...curlResult.steps]; const warnings = [...curlResult.warnings];
  const first = integrateAst(components[0], parameters[0], false); steps.push(...first.steps); warnings.push(...first.warnings);
  let potential = first.ast;
  for (let index = 1; index < dimension; index += 1) {
    const variable = parameters[index];
    const derivative = differentiateAst(potential, variable); steps.push(...derivative.steps); warnings.push(...derivative.warnings);
    const residual = subAst(components[index], derivative.ast);
    const allowed = parameters.slice(index);
    if (!dependsOnlyOn(residual, allowed)) throw new Error(`Potential reconstruction stopped because the ${variable}-component residual still depends on an already integrated coordinate.`);
    if (!isZeroAst(residual)) {
      const correction = integrateAst(residual, variable, false); steps.push(...correction.steps); warnings.push(...correction.warnings);
      potential = addAst(potential, correction.ast);
    }
  }
  const verification = parameters.map((parameter, index) => subAst(differentiateAst(potential, parameter).ast, components[index]));
  if (!verification.every(isZeroAst)) throw new Error('A candidate potential was constructed but exact differentiation did not reproduce every field component.');
  return { ast: simplifyAst(potential), steps, warnings: unique(['Potential is determined up to an additive constant on a simply connected region where the field is defined.', ...warnings]) };
}

export function vectorFieldProfile(node: AstNode, parameters: string[]): VectorFieldProfile {
  const field = requireVectorField(node, parameters);
  const div = divergence(node, parameters);
  const rot = curl(node, parameters);
  const conservative = zeroCurl(rot.ast);
  let potential: AstNode | undefined; const warnings = [...div.warnings, ...rot.warnings];
  if (conservative) {
    try { potential = scalarPotential(node, parameters).ast; }
    catch (error) { warnings.push(error instanceof Error ? error.message : 'Potential reconstruction was inconclusive.'); }
  }
  return { dimension: field.dimension, components: field.components, divergence: div.ast, curl: rot.ast, conservative, potential, warnings: unique(warnings) };
}

function curveIntegralIntegrand(fieldOrScalar: AstNode, parameters: string[], curve: AstNode[], curveParameter: string, scalarArcLength: boolean): { ast: AstNode; steps: CalculusStep[]; warnings: string[] } {
  const derivatives = curve.map((component) => differentiateAst(component, curveParameter));
  const steps = derivatives.flatMap((item) => item.steps); const warnings = derivatives.flatMap((item) => item.warnings);
  if (scalarArcLength) {
    if (!scalarFunctionValue(fieldOrScalar)) throw new Error('Scalar line integral requires a scalar-valued function.');
    const sampled = substituteMany(fieldOrScalar, parameters, curve);
    let speedSquared = n(0);
    derivatives.forEach((item) => { speedSquared = addAst(speedSquared, b('^', item.ast, n(2))); });
    return { ast: mulAst(sampled, call('sqrt', simplifyAst(speedSquared))), steps, warnings: unique(warnings) };
  }
  const components = requireVectorField(fieldOrScalar, parameters).components;
  let dot = n(0);
  components.forEach((component, index) => {
    dot = addAst(dot, mulAst(substituteMany(component, parameters, curve), derivatives[index].ast));
  });
  return { ast: simplifyAst(dot), steps, warnings: unique(warnings) };
}

function integrateCurveIntegrand(integrand: AstNode, curveParameter: string, lower: AstNode, upper: AstNode, panels?: number): IntegrationOutcome {
  return integrateIterated(integrand, [{ variable: curveParameter, lower, upper }], panels);
}

export function lineIntegral(node: AstNode, parameters: string[], curveSource: string, curveParameter: string, lowerSource: string, upperSource: string, scalarArcLength = false, panels?: number): IntegrationOutcome {
  const curve = parseE2Vector(curveSource, parameters.length, 'curve');
  const lower = parseE2Scalar(lowerSource, 'curve lower bound'); const upper = parseE2Scalar(upperSource, 'curve upper bound');
  const built = curveIntegralIntegrand(node, parameters, curve, curveParameter, scalarArcLength);
  const outcome = integrateCurveIntegrand(built.ast, curveParameter, lower, upper, panels);
  return { ...outcome, steps: [...built.steps, ...outcome.steps], warnings: unique([...built.warnings, ...outcome.warnings]), integrandAst: built.ast };
}

function parseGraphAndNormal(surfaceSource: string, parameters: string[], orientation: 'up' | 'down'): { graph: AstNode; normal: AstNode[]; steps: CalculusStep[]; warnings: string[] } {
  if (parameters.length !== 3) throw new Error('Graph-surface workflows require three Cartesian coordinate parameters.');
  const [x,y,z] = parameters;
  const graph = parseSurfaceGraph(surfaceSource, z);
  if (symbolsIn(graph).some((name) => !CONSTANTS.has(name) && name !== x && name !== y)) throw new Error(`Graph surface ${z}=g(${x},${y}) may depend only on ${x} and ${y}.`);
  const gx = differentiateAst(graph, x); const gy = differentiateAst(graph, y);
  let normal = [negAst(gx.ast), negAst(gy.ast), n(1)];
  if (orientation === 'down') normal = normal.map(negAst);
  return { graph, normal, steps: [...gx.steps, ...gy.steps], warnings: unique([...gx.warnings, ...gy.warnings]) };
}

function rectangularSurfaceBounds(parameters: string[], xLower: string, xUpper: string, yLower: string, yUpper: string): IteratedBound[] {
  return parseIteratedBounds([
    { variable: parameters[0], lower: xLower, upper: xUpper },
    { variable: parameters[1], lower: yLower, upper: yUpper },
  ]);
}

export function fluxIntegral(node: AstNode, parameters: string[], surfaceSource: string, xLower: string, xUpper: string, yLower: string, yUpper: string, orientation: 'up' | 'down' = 'up', panels?: number): IntegrationOutcome {
  const components = requireVectorField(node, parameters).components;
  if (parameters.length !== 3) throw new Error('Graph flux integral currently supports three-dimensional vector fields.');
  const surface = parseGraphAndNormal(surfaceSource, parameters, orientation);
  const values = components.map((component) => substituteAst(component, parameters[2], surface.graph));
  let dot = n(0); values.forEach((component, index) => { dot = addAst(dot, mulAst(component, surface.normal[index])); });
  const outcome = integrateIterated(dot, rectangularSurfaceBounds(parameters, xLower, xUpper, yLower, yUpper), panels);
  return { ...outcome, steps: [...surface.steps, ...outcome.steps], warnings: unique([...surface.warnings, ...outcome.warnings]), integrandAst: dot };
}

export function scalarSurfaceIntegral(node: AstNode, parameters: string[], surfaceSource: string, xLower: string, xUpper: string, yLower: string, yUpper: string, panels?: number): IntegrationOutcome {
  if (!scalarFunctionValue(node) || parameters.length !== 3) throw new Error('Scalar surface integral requires a scalar function f(x,y,z).');
  const surface = parseGraphAndNormal(surfaceSource, parameters, 'up');
  const sampled = substituteAst(node, parameters[2], surface.graph);
  const metricSquared = surface.normal.reduce((sum, component) => addAst(sum, b('^', component, n(2))), n(0));
  const integrand = mulAst(sampled, call('sqrt', simplifyAst(metricSquared)));
  const outcome = integrateIterated(integrand, rectangularSurfaceBounds(parameters, xLower, xUpper, yLower, yUpper), panels);
  return { ...outcome, steps: [...surface.steps, ...outcome.steps], warnings: unique([...surface.warnings, ...outcome.warnings]), integrandAst: integrand };
}

function sumOutcomes(outcomes: IntegrationOutcome[]): { ast: AstNode; exactness: E2Exactness; steps: CalculusStep[]; warnings: string[] } {
  const exactness: E2Exactness = outcomes.every((item) => item.exactness === 'exact') ? 'exact' : 'approximate';
  if (exactness === 'exact') {
    const ast = outcomes.reduce((sum, item) => addAst(sum, item.ast), n(0));
    return { ast, exactness, steps: outcomes.flatMap((item) => item.steps), warnings: unique(outcomes.flatMap((item) => item.warnings)) };
  }
  const total = outcomes.reduce((sum, item) => sum + numericScalar(item.ast, {}), 0);
  return { ast: approximateAst(total), exactness, steps: outcomes.flatMap((item) => item.steps), warnings: unique(outcomes.flatMap((item) => item.warnings)) };
}

function constantRectangle(parameters: string[], xLower: string, xUpper: string, yLower: string, yUpper: string): { x0: AstNode; x1: AstNode; y0: AstNode; y1: AstNode } {
  const x0=parseE2Scalar(xLower,'x lower bound'); const x1=parseE2Scalar(xUpper,'x upper bound'); const y0=parseE2Scalar(yLower,'y lower bound'); const y1=parseE2Scalar(yUpper,'y upper bound');
  for (const endpoint of [x0,x1,y0,y1]) if (symbolsIn(endpoint).some((name)=>!CONSTANTS.has(name))) throw new Error('Theorem verification currently requires constant rectangular bounds.');
  if (parameters.length < 2) throw new Error('Rectangle requires two coordinate parameters.');
  return {x0,x1,y0,y1};
}

function directCurveLineIntegral(node: AstNode, parameters: string[], curve: AstNode[], t: string, lower: AstNode, upper: AstNode, panels?: number): IntegrationOutcome {
  const built = curveIntegralIntegrand(node, parameters, curve, t, false);
  const outcome = integrateCurveIntegrand(built.ast, t, lower, upper, panels);
  return { ...outcome, steps:[...built.steps,...outcome.steps], warnings:unique([...built.warnings,...outcome.warnings]), integrandAst:built.ast };
}

function verifyDifference(left: AstNode, right: AstNode, exactness: E2Exactness): { difference: AstNode; verified: boolean } {
  if (exactness === 'exact') {
    const difference = subAst(left,right);
    return { difference, verified:isZeroAst(difference) || sameAst(left,right) };
  }
  const leftNumber=numericScalar(left,{}); const rightNumber=numericScalar(right,{}); const delta=leftNumber-rightNumber;
  return { difference:approximateAst(delta), verified:Math.abs(delta)<=1e-7*Math.max(1,Math.abs(leftNumber),Math.abs(rightNumber)) };
}

export function verifyGreen(node: AstNode, parameters: string[], xLower: string, xUpper: string, yLower: string, yUpper: string, panels?: number): TheoremVerification {
  const field=requireVectorField(node,parameters); if(field.dimension!==2)throw new Error("Green's theorem workflow requires a 2D vector field F(x,y)=[P,Q].");
  const {x0,x1,y0,y1}=constantRectangle(parameters,xLower,xUpper,yLower,yUpper); const t='t';
  const boundary=sumOutcomes([
    directCurveLineIntegral(node,parameters,[s(t),y0],t,x0,x1,panels),
    directCurveLineIntegral(node,parameters,[x1,s(t)],t,y0,y1,panels),
    directCurveLineIntegral(node,parameters,[s(t),y1],t,x1,x0,panels),
    directCurveLineIntegral(node,parameters,[x0,s(t)],t,y1,y0,panels),
  ]);
  const rot=curl(node,parameters);
  const area=integrateIterated(rot.ast,[{variable:parameters[0],lower:x0,upper:x1},{variable:parameters[1],lower:y0,upper:y1}],panels);
  const exactness:E2Exactness=boundary.exactness==='exact'&&area.exactness==='exact'?'exact':'approximate';
  const check=verifyDifference(boundary.ast,area.ast,exactness);
  return { theorem:'Green',left:boundary.ast,right:area.ast,difference:check.difference,exactness,verified:check.verified,steps:[...boundary.steps,...rot.steps,...area.steps],warnings:unique(['Positive boundary orientation is counterclockwise.',...boundary.warnings,...rot.warnings,...area.warnings]) };
}

function faceIntegral(component: AstNode, fixedVariable: string, fixedValue: AstNode, sign: 1|-1, bounds: IteratedBound[], panels?: number): IntegrationOutcome {
  const sampled=mulAst(n(sign),substituteAst(component,fixedVariable,fixedValue));
  return integrateIterated(sampled,bounds,panels);
}

export function verifyGauss(node: AstNode, parameters: string[], xLower: string, xUpper: string, yLower: string, yUpper: string, zLower: string, zUpper: string, panels?: number): TheoremVerification {
  const field=requireVectorField(node,parameters); if(field.dimension!==3)throw new Error("Gauss' divergence theorem workflow requires a 3D vector field.");
  const [x,y,z]=parameters;
  const x0=parseE2Scalar(xLower);const x1=parseE2Scalar(xUpper);const y0=parseE2Scalar(yLower);const y1=parseE2Scalar(yUpper);const z0=parseE2Scalar(zLower);const z1=parseE2Scalar(zUpper);
  for(const endpoint of [x0,x1,y0,y1,z0,z1])if(symbolsIn(endpoint).some((name)=>!CONSTANTS.has(name)))throw new Error('Gauss verification currently requires a constant rectangular box.');
  const [p,q,r]=field.components;
  const yz=[{variable:y,lower:y0,upper:y1},{variable:z,lower:z0,upper:z1}];
  const xz=[{variable:x,lower:x0,upper:x1},{variable:z,lower:z0,upper:z1}];
  const xy=[{variable:x,lower:x0,upper:x1},{variable:y,lower:y0,upper:y1}];
  const boundary=sumOutcomes([
    faceIntegral(p,x,x0,-1,yz,panels), faceIntegral(p,x,x1,1,yz,panels),
    faceIntegral(q,y,y0,-1,xz,panels), faceIntegral(q,y,y1,1,xz,panels),
    faceIntegral(r,z,z0,-1,xy,panels), faceIntegral(r,z,z1,1,xy,panels),
  ]);
  const div=divergence(node,parameters);
  const volume=integrateIterated(div.ast,[{variable:x,lower:x0,upper:x1},{variable:y,lower:y0,upper:y1},{variable:z,lower:z0,upper:z1}],panels);
  const exactness:E2Exactness=boundary.exactness==='exact'&&volume.exactness==='exact'?'exact':'approximate'; const check=verifyDifference(boundary.ast,volume.ast,exactness);
  return {theorem:'Gauss',left:boundary.ast,right:volume.ast,difference:check.difference,exactness,verified:check.verified,steps:[...boundary.steps,...div.steps,...volume.steps],warnings:unique(['Flux uses outward orientation on all six box faces.',...boundary.warnings,...div.warnings,...volume.warnings])};
}

export function verifyStokes(node: AstNode, parameters: string[], surfaceSource: string, xLower: string, xUpper: string, yLower: string, yUpper: string, orientation:'up'|'down'='up', panels?:number):TheoremVerification{
  const field=requireVectorField(node,parameters);if(field.dimension!==3)throw new Error("Stokes' theorem workflow requires a 3D vector field.");
  const {x0,x1,y0,y1}=constantRectangle(parameters,xLower,xUpper,yLower,yUpper);const [x,y,z]=parameters;const surface=parseGraphAndNormal(surfaceSource,parameters,orientation);const t='t';
  const graphAt=(xValue:AstNode,yValue:AstNode)=>substituteMany(surface.graph,[x,y],[xValue,yValue]);
  const upCurves:Array<{curve:AstNode[];lower:AstNode;upper:AstNode}>=[
    {curve:[s(t),y0,graphAt(s(t),y0)],lower:x0,upper:x1},
    {curve:[x1,s(t),graphAt(x1,s(t))],lower:y0,upper:y1},
    {curve:[s(t),y1,graphAt(s(t),y1)],lower:x1,upper:x0},
    {curve:[x0,s(t),graphAt(x0,s(t))],lower:y1,upper:y0},
  ];
  const curves=orientation==='up'?upCurves:upCurves.map((item)=>({curve:item.curve,lower:item.upper,upper:item.lower})).reverse();
  const boundary=sumOutcomes(curves.map((item)=>directCurveLineIntegral(node,parameters,item.curve,t,item.lower,item.upper,panels)));
  const rot=curl(node,parameters);if(rot.ast.type!=='matrix')throw new Error('3D Stokes workflow requires vector curl output.');
  const curlComponents=rot.ast.rows[0].map((component)=>substituteAst(component,z,surface.graph));let fluxIntegrand=n(0);curlComponents.forEach((component,index)=>{fluxIntegrand=addAst(fluxIntegrand,mulAst(component,surface.normal[index]));});
  const surfaceIntegral=integrateIterated(fluxIntegrand,[{variable:x,lower:x0,upper:x1},{variable:y,lower:y0,upper:y1}],panels);
  const exactness:E2Exactness=boundary.exactness==='exact'&&surfaceIntegral.exactness==='exact'?'exact':'approximate';const check=verifyDifference(boundary.ast,surfaceIntegral.ast,exactness);
  return {theorem:'Stokes',left:boundary.ast,right:surfaceIntegral.ast,difference:check.difference,exactness,verified:check.verified,steps:[...boundary.steps,...surface.steps,...rot.steps,...surfaceIntegral.steps],warnings:unique([`Boundary orientation follows the ${orientation} graph normal by the right-hand rule.`,...boundary.warnings,...surface.warnings,...rot.warnings,...surfaceIntegral.warnings])};
}

export function integralDisplay(bounds: IteratedBound[]): string {
  return bounds.map((bound)=>`${bound.variable}: ${astToPlainText(bound.lower)}..${astToPlainText(bound.upper)}`).join('; ');
}

export function transformedCoordinateEquations(outcome: CoordinateTransformOutcome): AstNode {
  return { type:'system', items:outcome.substitutions.map((item)=>equation(s(item.parameter),item.ast)) };
}
