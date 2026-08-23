import type { AstNode, ParsedMath } from './ast';
import { isKnownFunction, parseMath } from './parser';
import { classifyParsed } from './classify';
import { assumptionsForSubject, domainFromAssumptions } from './assumptions';
import { finiteSetShapeInfo, graphShapeInfo, relationShapeInfo, recurrenceShapeInfo } from './discreteAlgorithms';
import { isOdeConstructorCall, odeIntrinsicSymbols, odeShapeInfo } from './e4Ode';
import { e10PdeIntrinsicSymbols, e10PdeShapeInfo, isE10PdeConstructorCall } from './e10Pde';
import { e10FiniteAlgebraShapeInfo, isE10FiniteAlgebraConstructorCall } from './e10FiniteAlgebra';
import { e10GeometryIntrinsicSymbols, e10GeometryShapeInfo, isE10GeometryConstructorCall } from './e10GeometryTopology';
import type {
  Exactness,
  MathAssumption,
  MathDomain,
  MathObjectKind,
  MathShape,
  SemanticDiagnostic,
  SemanticMathObject,
  SemanticResolution,
} from './types';

const CONSTANTS = new Set(['pi', 'e', 'infinity', 'i']);
const DOMAIN_ORDER: MathDomain[] = ['natural','integer','rational','real','complex'];
const DISTRIBUTIONS = new Set(['bernoulli','binomial','geometric','poisson','uniform','normal','exponential','chisquare','studentt','fdist','jointpmf']);
const P10_PROBABILITY_CALLS = new Set(['choose','permute','conditional','bayes','unionprob','independentjoint','complement']);
const P11_LOGIC_CALLS = new Set(['not','and','or','xor','implies','iff']);
const P11_GRAPH_CALLS = new Set(['graph','digraph','wgraph','wdigraph']);
const P11_COMBINATORICS_CALLS = new Set(['multinomial','starsbars','derangements','stirling2','bell','pigeonhole']);
function isStructuredObjectCall(node: AstNode): boolean {
  return node.type === 'call' && (
    node.name === 'data' || DISTRIBUTIONS.has(node.name) || P10_PROBABILITY_CALLS.has(node.name) ||
    P11_LOGIC_CALLS.has(node.name) || node.name === 'set' || node.name === 'relation' || P11_GRAPH_CALLS.has(node.name) ||
    node.name === 'linrec' || node.name === 'linrec2' || node.name === 'complexity' || node.name === 'master' || P11_COMBINATORICS_CALLS.has(node.name) ||
    isOdeConstructorCall(node) || isE10PdeConstructorCall(node) || isE10FiniteAlgebraConstructorCall(node) || isE10GeometryConstructorCall(node)
  );
}

function stableId(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `obj_${(hash >>> 0).toString(36)}`;
}

function promoteDomain(a: MathDomain, b: MathDomain): MathDomain {
  if (a === 'unknown') return b;
  if (b === 'unknown') return a;
  if (a === 'boolean' || b === 'boolean') return a === b ? 'boolean' : 'unknown';
  return DOMAIN_ORDER[Math.max(DOMAIN_ORDER.indexOf(a), DOMAIN_ORDER.indexOf(b))] ?? 'unknown';
}

function numericDomain(value: string): MathDomain {
  if (value.includes('.')) return 'rational';
  const n = Number(value);
  if (Number.isInteger(n)) return n >= 0 ? 'natural' : 'integer';
  return 'real';
}

export function collectSymbols(node: AstNode, includeCallNames = true): string[] {
  const symbols = new Set<string>();
  const visit = (current: AstNode) => {
    switch (current.type) {
      case 'number': break;
      case 'symbol': symbols.add(current.name); break;
      case 'unary': visit(current.operand); break;
      case 'binary': visit(current.left); visit(current.right); break;
      case 'call':
        if (includeCallNames && !isKnownFunction(current.name)) symbols.add(current.name);
        current.args.forEach(visit);
        break;
      case 'equation':
      case 'comparison':
      case 'definition': visit(current.left); visit(current.right); break;
      case 'matrix': current.rows.flat().forEach(visit); break;
      case 'system':
      case 'set': current.items.forEach(visit); break;
    }
  };
  visit(node);
  return [...symbols];
}

function inferDomain(node: AstNode, objects: SemanticMathObject[], assumptions: MathAssumption[]): MathDomain {
  switch (node.type) {
    case 'number': return numericDomain(node.value);
    case 'symbol': {
      if (node.name === 'i') return 'complex';
      if (node.name === 'pi' || node.name === 'e') return 'real';
      if (node.name === 'infinity') return 'real';
      const assumed = domainFromAssumptions(assumptions, node.name);
      if (assumed) return assumed;
      return objects.find((item) => item.name === node.name)?.domain ?? 'real';
    }
    case 'unary': return inferDomain(node.operand, objects, assumptions);
    case 'binary': {
      const left = inferDomain(node.left, objects, assumptions);
      const right = inferDomain(node.right, objects, assumptions);
      if (node.operator === '/') return promoteDomain('rational', promoteDomain(left, right));
      if (node.operator === '^') return promoteDomain(left, right === 'complex' ? 'complex' : left);
      return promoteDomain(left, right);
    }
    case 'call': {
      const args = node.args.map((arg) => inferDomain(arg, objects, assumptions)).reduce(promoteDomain, 'unknown' as MathDomain);
      const dependency = objects.find((item) => item.name === node.name && item.kind === 'function');
      return dependency?.domain ?? (args === 'complex' ? 'complex' : 'real');
    }
    case 'matrix': return node.rows.flat().map((cell) => inferDomain(cell, objects, assumptions)).reduce(promoteDomain, 'unknown' as MathDomain);
    case 'system': return node.items.map((item) => inferDomain(item, objects, assumptions)).reduce(promoteDomain, 'unknown' as MathDomain);
    case 'set': return node.items.map((item) => inferDomain(item, objects, assumptions)).reduce(promoteDomain, 'unknown' as MathDomain);
    case 'equation':
    case 'comparison':
    case 'definition': return promoteDomain(inferDomain(node.left, objects, assumptions), inferDomain(node.right, objects, assumptions));
  }
}

function getDefinition(parsed: ParsedMath): { name?: string; parameters: string[]; valueAst: AstNode; style: 'explicit' | 'natural' | 'anonymous' } {
  const ast = parsed.ast!;
  if (ast.type === 'definition') {
    if (ast.left.type === 'symbol') return { name: ast.left.name, parameters: [], valueAst: ast.right, style: 'explicit' };
    if (ast.left.type === 'call') {
      const parameters = ast.left.args.filter((arg): arg is Extract<AstNode,{type:'symbol'}> => arg.type === 'symbol').map((arg) => arg.name);
      return { name: ast.left.name, parameters, valueAst: ast.right, style: 'explicit' };
    }
  }
  if (ast.type === 'equation' && ast.left.type === 'call') {
    const parameters = ast.left.args.filter((arg): arg is Extract<AstNode,{type:'symbol'}> => arg.type === 'symbol').map((arg) => arg.name);
    return { name: ast.left.name, parameters, valueAst: ast.right, style: 'natural' };
  }
  if (ast.type === 'equation' && ast.left.type === 'symbol' && (ast.right.type === 'matrix' || isStructuredObjectCall(ast.right))) {
    return { name: ast.left.name, parameters: [], valueAst: ast.right, style: 'natural' };
  }
  if (ast.type === 'equation' && ast.left.type === 'symbol' && ast.left.name.includes('_n') && collectSymbols(ast.right).includes('n')) {
    return { name: ast.left.name, parameters: [], valueAst: ast.right, style: 'natural' };
  }
  return { parameters: [], valueAst: ast, style: 'anonymous' };
}

interface LinearShapeInference { shape: MathShape; usesCollection: boolean }

function inferLinearShape(node: AstNode, objects: SemanticMathObject[]): LinearShapeInference | null {
  if (node.type === 'number') return { shape: { type: 'scalar' }, usesCollection: false };
  if (node.type === 'matrix') {
    return node.rows.length === 1
      ? { shape: { type: 'vector', length: node.rows[0]?.length ?? 0 }, usesCollection: true }
      : { shape: { type: 'matrix', rows: node.rows.length, columns: node.rows[0]?.length ?? 0 }, usesCollection: true };
  }
  if (node.type === 'symbol') {
    const dependency = objects.find((item) => item.name === node.name);
    if (dependency?.shape.type === 'vector' || dependency?.shape.type === 'matrix') return { shape: dependency.shape, usesCollection: true };
    return { shape: { type: 'scalar' }, usesCollection: false };
  }
  if (node.type === 'call') return { shape: { type: 'scalar' }, usesCollection: false };
  if (node.type === 'unary') return inferLinearShape(node.operand, objects);
  if (node.type !== 'binary') return null;

  const left = inferLinearShape(node.left, objects);
  const right = inferLinearShape(node.right, objects);
  if (!left || !right) return null;
  const usesCollection = left.usesCollection || right.usesCollection;
  const l = left.shape; const r = right.shape;

  if (node.operator === '+' || node.operator === '-') {
    if (l.type === 'vector' && r.type === 'vector' && l.length === r.length) return { shape: l, usesCollection };
    if (l.type === 'matrix' && r.type === 'matrix' && l.rows === r.rows && l.columns === r.columns) return { shape: l, usesCollection };
    if (l.type === 'scalar' && r.type === 'scalar') return { shape: { type: 'scalar' }, usesCollection };
    return null;
  }
  if (node.operator === '/') {
    if (r.type !== 'scalar') return null;
    if (l.type === 'vector' || l.type === 'matrix' || l.type === 'scalar') return { shape: l, usesCollection };
    return null;
  }
  if (node.operator === '^') {
    if (l.type === 'matrix' && l.rows === l.columns && r.type === 'scalar') return { shape: l, usesCollection };
    if (l.type === 'scalar' && r.type === 'scalar') return { shape: { type: 'scalar' }, usesCollection };
    return null;
  }
  if (node.operator === '*') {
    if (l.type === 'scalar' && (r.type === 'vector' || r.type === 'matrix' || r.type === 'scalar')) return { shape: r, usesCollection };
    if (r.type === 'scalar' && (l.type === 'vector' || l.type === 'matrix' || l.type === 'scalar')) return { shape: l, usesCollection };
    if (l.type === 'vector' && r.type === 'vector' && l.length === r.length) return { shape: { type: 'scalar' }, usesCollection: true };
    if (l.type === 'matrix' && r.type === 'vector' && l.columns === r.length) return { shape: { type: 'vector', length: l.rows }, usesCollection: true };
    if (l.type === 'vector' && r.type === 'matrix' && l.length === r.rows) return { shape: { type: 'vector', length: r.columns }, usesCollection: true };
    if (l.type === 'matrix' && r.type === 'matrix' && l.columns === r.rows) return { shape: { type: 'matrix', rows: l.rows, columns: r.columns }, usesCollection: true };
  }
  return null;
}

function shapeFor(kind: MathObjectKind, valueAst: AstNode, parameters: string[], objects: SemanticMathObject[]): MathShape {
  if (kind === 'vector' && valueAst.type === 'matrix') return { type: 'vector', length: valueAst.rows[0]?.length ?? 0 };
  if (kind === 'matrix' && valueAst.type === 'matrix') return { type: 'matrix', rows: valueAst.rows.length, columns: valueAst.rows[0]?.length ?? 0 };
  const linear = inferLinearShape(valueAst, objects);
  if (linear?.usesCollection) return linear.shape;
  if (kind === 'function') return { type: 'function', arity: parameters.length };
  if (kind === 'sequence') return { type: 'sequence', index: 'n' };
  if (kind === 'dataset' && valueAst.type === 'call' && valueAst.name === 'data') return { type: 'dataset', size: valueAst.args.length };
  if (kind === 'distribution' && valueAst.type === 'call') return { type: 'distribution', family: valueAst.name };
  if (kind === 'probability') return { type: 'probability' };
  if (kind === 'proposition') return { type: 'proposition', variables: collectSymbols(valueAst).length };
  if (kind === 'finite-set') return { type: 'finite-set', size: finiteSetShapeInfo(valueAst)?.size ?? 0 };
  if (kind === 'relation') return { type: 'relation', size: relationShapeInfo(valueAst)?.size ?? 0 };
  if (kind === 'graph') { const info = graphShapeInfo(valueAst); return info ? { type: 'graph', ...info } : { type: 'graph', vertices: 0, edges: 0, directed: false, weighted: false }; }
  if (kind === 'recurrence') return { type: 'recurrence', order: recurrenceShapeInfo(valueAst)?.order ?? (valueAst.type === 'call' && valueAst.name === 'linrec2' ? 2 : 1) };
  if (kind === 'complexity' && valueAst.type === 'call') return { type: 'complexity', family: valueAst.name };
  if (kind === 'combinatorics') return { type: 'combinatorics' };
  if (kind === 'ode') return { type: 'ode', variables: odeShapeInfo(valueAst)?.variables ?? 1 };
  if (kind === 'pde') { const info=e10PdeShapeInfo(valueAst); return { type:'pde', family:info?.family??'pde', modes:info?.modes??0 }; }
  if (kind === 'finite-group') { const info=e10FiniteAlgebraShapeInfo(valueAst); return { type:'finite-group', order:info?.order??0 }; }
  if (kind === 'finite-ring') { const info=e10FiniteAlgebraShapeInfo(valueAst); return { type:'finite-ring', order:info?.order??0 }; }
  if (kind === 'homomorphism') { const info=e10FiniteAlgebraShapeInfo(valueAst); return { type:'homomorphism', sourceOrder:info?.order??0, targetOrder:info?.targetOrder??0 }; }
  if (kind === 'metric-space') { const info=e10GeometryShapeInfo(valueAst); return { type:'metric-space', size:info?.size??0 }; }
  if (kind === 'topology') { const info=e10GeometryShapeInfo(valueAst); return { type:'topology', points:info?.size??0, opens:info?.opens??0 }; }
  if (kind === 'point-set') { const info=e10GeometryShapeInfo(valueAst); return { type:'point-set', points:info?.size??0, dimension:info?.dimension??0 }; }
  if (kind === 'geometry') { const info=e10GeometryShapeInfo(valueAst); return { type:'geometry', family:info?.family??'geometry', dimension:info?.dimension??0 }; }
  if (valueAst.type === 'symbol') {
    const dependency = objects.find((item) => item.name === valueAst.name);
    if (dependency) return dependency.shape;
  }
  if (kind === 'equation') return { type: 'equation' };
  if (kind === 'inequality') return { type: 'inequality' };
  if (kind === 'system' && valueAst.type === 'system') return { type: 'system', count: valueAst.items.length };
  if (kind === 'scalar') return { type: 'scalar' };
  return { type: 'unknown' };
}

function inferKind(parsed: ParsedMath, valueAst: AstNode, name: string | undefined, parameters: string[], objects: SemanticMathObject[]): MathObjectKind {
  const initial = classifyParsed(parsed);
  if (parameters.length) return 'function';
  if (valueAst.type === 'call' && valueAst.name === 'data') return 'dataset';
  if (valueAst.type === 'call' && DISTRIBUTIONS.has(valueAst.name)) return 'distribution';
  if (valueAst.type === 'call' && P10_PROBABILITY_CALLS.has(valueAst.name)) return 'probability';
  if (valueAst.type === 'call' && P11_LOGIC_CALLS.has(valueAst.name)) return 'proposition';
  if (valueAst.type === 'call' && valueAst.name === 'set') return 'finite-set';
  if (valueAst.type === 'call' && valueAst.name === 'relation') return 'relation';
  if (valueAst.type === 'call' && P11_GRAPH_CALLS.has(valueAst.name)) return 'graph';
  if (valueAst.type === 'call' && (valueAst.name === 'linrec' || valueAst.name === 'linrec2')) return 'recurrence';
  if (valueAst.type === 'call' && (valueAst.name === 'complexity' || valueAst.name === 'master')) return 'complexity';
  if (valueAst.type === 'call' && P11_COMBINATORICS_CALLS.has(valueAst.name)) return 'combinatorics';
  if (isOdeConstructorCall(valueAst)) return 'ode';
  if (isE10PdeConstructorCall(valueAst)) return 'pde';
  if (valueAst.type==='call'&&valueAst.name==='group') return 'finite-group';
  if (valueAst.type==='call'&&valueAst.name==='ring') return 'finite-ring';
  if (valueAst.type==='call'&&valueAst.name==='grouphom') return 'homomorphism';
  if (valueAst.type==='call'&&valueAst.name==='metricspace') return 'metric-space';
  if (valueAst.type==='call'&&valueAst.name==='topology') return 'topology';
  if (valueAst.type==='call'&&valueAst.name==='pointset') return 'point-set';
  if (valueAst.type==='call'&&['rectregion','paramcurve','graphsurface'].includes(valueAst.name)) return 'geometry';
  if (valueAst.type === 'matrix') return valueAst.rows.length === 1 ? 'vector' : 'matrix';
  const linear = inferLinearShape(valueAst, objects);
  if (linear?.usesCollection && linear.shape.type === 'vector') return 'vector';
  if (linear?.usesCollection && linear.shape.type === 'matrix') return 'matrix';
  if (valueAst.type === 'symbol') {
    const dependency = objects.find((item) => item.name === valueAst.name);
    if (dependency) return dependency.kind;
  }
  if (name?.includes('_n') && collectSymbols(valueAst).includes('n')) return 'sequence';
  if (initial === 'equation') return 'equation';
  if (initial === 'inequality') return 'inequality';
  if (initial === 'system') return 'system';
  if (valueAst.type === 'number') return 'scalar';
  const free = collectSymbols(valueAst).filter((symbol) => !CONSTANTS.has(symbol));
  if (!free.length && valueAst.type !== 'call') return 'scalar';
  return initial === 'unknown' ? 'expression' : initial;
}

function exactnessFor(node: AstNode): Exactness {
  if (node.type === 'call' && ['floor','ceil'].includes(node.name)) return 'exact';
  return 'exact';
}

export function resolveSemanticObject(
  parsed: ParsedMath,
  objects: SemanticMathObject[] = [],
  assumptions: MathAssumption[] = [],
): SemanticResolution {
  const parseErrors = parsed.diagnostics.filter((item) => item.severity === 'error');
  if (!parsed.ast || parseErrors.length) return { object: null, diagnostics: [], isDefinition: false };

  const diagnostics: SemanticDiagnostic[] = [];
  const definition = getDefinition(parsed);
  const { name, parameters, valueAst, style } = definition;
  const isDefinition = style !== 'anonymous';

  if ((parsed.ast.type === 'definition' || (parsed.ast.type === 'equation' && parsed.ast.left.type === 'call')) && parsed.ast.left.type === 'call') {
    if (parsed.ast.left.args.some((arg) => arg.type !== 'symbol')) {
      diagnostics.push({ severity: 'error', code: 'invalid-definition-head', message: 'Function parameters must be simple symbols such as f(x, y).' });
    }
    const duplicate = parameters.find((item, index) => parameters.indexOf(item) !== index);
    if (duplicate) diagnostics.push({ severity: 'error', code: 'duplicate-parameter', symbol: duplicate, message: `Function parameter “${duplicate}” is listed more than once.` });
  }

  const symbols = collectSymbols(valueAst).filter((symbol) => !CONSTANTS.has(symbol));
  const intrinsicParameters = [...new Set([...odeIntrinsicSymbols(valueAst),...e10PdeIntrinsicSymbols(valueAst),...e10GeometryIntrinsicSymbols(valueAst)])];
  const variables = symbols.filter((symbol) => !parameters.includes(symbol) && !intrinsicParameters.includes(symbol) && !objects.some((item) => item.name === symbol));
  const dependencies = symbols.filter((symbol) => !intrinsicParameters.includes(symbol) && objects.some((item) => item.name === symbol));
  if (name && (variables.includes(name) || dependencies.includes(name))) {
    diagnostics.push({ severity: 'error', code: 'recursive-definition', symbol: name, message: `“${name}” depends on itself. Recursive definitions are not enabled in the current MathLab core.` });
  }

  const existing = name ? objects.find((item) => item.name === name) : undefined;
  if (existing) diagnostics.push({ severity: 'info', code: 'name-conflict', symbol: name, message: `Committing this definition will update the existing object “${name}”.` });

  const kind = inferKind(parsed, valueAst, name, parameters, objects);
  const now = Date.now();
  const subjectAssumptions = name ? assumptionsForSubject(assumptions, name) : [];
  const objectAssumptions = [
    ...subjectAssumptions,
    ...variables.flatMap((variable) => assumptionsForSubject(assumptions, variable)),
    ...parameters.flatMap((parameter) => assumptionsForSubject(assumptions, parameter)),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);

  let domain = name ? (domainFromAssumptions(assumptions, name) ?? inferDomain(valueAst, objects, assumptions)) : inferDomain(valueAst, objects, assumptions);
  if (kind === 'proposition') domain = 'boolean';
  else if ((kind === 'matrix' || kind === 'vector' || kind === 'function' || kind === 'sequence' || kind === 'dataset' || kind === 'distribution' || kind === 'probability' || kind === 'finite-set' || kind === 'relation' || kind === 'graph' || kind === 'recurrence' || kind === 'complexity' || kind === 'combinatorics' || kind === 'ode' || kind === 'pde' || kind === 'finite-group' || kind === 'finite-ring' || kind === 'homomorphism' || kind === 'metric-space' || kind === 'topology' || kind === 'point-set' || kind === 'geometry') && domain !== 'complex') domain = 'real';

  const object: SemanticMathObject = {
    id: existing?.id ?? stableId(`${name ?? 'anonymous'}:${now}:${parsed.normalizedSource}`),
    name,
    kind,
    domain,
    source: parsed.source.trim(),
    ast: parsed.ast,
    valueAst,
    shape: shapeFor(kind, valueAst, parameters, objects),
    exactness: exactnessFor(valueAst),
    parameters,
    variables,
    dependencies,
    assumptions: objectAssumptions,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    definitionStyle: style,
  };

  return { object, diagnostics, isDefinition, shadowedObjectId: existing?.id };
}

export function upsertSemanticObject(objects: SemanticMathObject[], object: SemanticMathObject): SemanticMathObject[] {
  if (!object.name) return [...objects.filter((item) => item.id !== object.id), object];
  const existingIndex = objects.findIndex((item) => item.name === object.name);
  if (existingIndex === -1) return [...objects, object];
  return objects.map((item, index) => index === existingIndex ? { ...object, id: item.id, createdAt: item.createdAt } : item);
}

export function recomputeSemanticObjects(objects: SemanticMathObject[], assumptions: MathAssumption[]): SemanticMathObject[] {
  return objects.map((existing) => {
    const context = objects.filter((item) => item.id !== existing.id);
    const resolution = resolveSemanticObject(parseMath(existing.source), context, assumptions);
    if (!resolution.object || resolution.diagnostics.some((item) => item.severity === 'error')) return existing;
    return { ...resolution.object, id: existing.id, createdAt: existing.createdAt, updatedAt: Date.now() };
  });
}

export function shapeLabel(shape: MathShape): string {
  switch (shape.type) {
    case 'scalar': return 'Scalar';
    case 'vector': return `Vector · ${shape.length}`;
    case 'matrix': return `Matrix · ${shape.rows}×${shape.columns}`;
    case 'function': return `Function · ${shape.arity} variable${shape.arity === 1 ? '' : 's'}`;
    case 'sequence': return `Sequence · index ${shape.index}`;
    case 'dataset': return `Dataset · ${shape.size} observation${shape.size === 1 ? '' : 's'}`;
    case 'distribution': return `Distribution · ${shape.family}`;
    case 'probability': return 'Probability';
    case 'proposition': return `Proposition · ${shape.variables} variable${shape.variables === 1 ? '' : 's'}`;
    case 'finite-set': return `Finite set · ${shape.size} element${shape.size === 1 ? '' : 's'}`;
    case 'relation': return `Relation · base size ${shape.size || '?'}`;
    case 'graph': return `Graph · ${shape.vertices || '?'} vertices · ${shape.edges} edges${shape.directed ? ' · directed' : ''}${shape.weighted ? ' · weighted' : ''}`;
    case 'recurrence': return `Recurrence · order ${shape.order}`;
    case 'complexity': return `Complexity · ${shape.family}`;
    case 'combinatorics': return 'Discrete combinatorics';
    case 'ode': return `ODE · ${shape.variables} state${shape.variables === 1 ? '' : 's'}`;
    case 'pde': return `PDE · ${shape.family} · ${shape.modes} mode${shape.modes===1?'':'s'}`;
    case 'finite-group': return `Finite group · order ${shape.order || '?'}`;
    case 'finite-ring': return `Finite ring · order ${shape.order || '?'}`;
    case 'homomorphism': return `Group homomorphism · ${shape.sourceOrder || '?'} → ${shape.targetOrder || '?'}`;
    case 'metric-space': return `Metric space · ${shape.size || '?'} points`;
    case 'topology': return `Topology · ${shape.points || '?'} points · ${shape.opens} open sets`;
    case 'point-set': return `Point set · ${shape.points || '?'} points in R^${shape.dimension || '?'}`;
    case 'geometry': return `Geometry · ${shape.family} · dimension ${shape.dimension || '?'}`;
    case 'equation': return 'Equation';
    case 'inequality': return 'Inequality';
    case 'system': return `System · ${shape.count} relations`;
    case 'unknown': return 'Expression';
  }
}
