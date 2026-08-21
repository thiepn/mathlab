import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { add, eq, mul, ONE, rationalToNumber, rationalToString, sub, ZERO, type Rational } from './rational';
import type { DerivationStep, Exactness, MathResultSection } from './types';

export interface DiscreteTransform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  sections: MathResultSection[];
  steps?: DerivationStep[];
}

const n = (value: bigint | number | string): AstNode => ({ type: 'number', value: String(value) });
const sym = (name: string): AstNode => ({ type: 'symbol', name });
const bin = (operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode => ({ type: 'binary', operator, left, right });
const section = (id: string, title: string, facts: MathResultSection['facts'], description?: string): MathResultSection => ({ id, title, facts, description });

function exactRational(node: AstNode, label = 'value'): Rational {
  const value = rationalValue(simplifyAst(node));
  if (!value) throw new Error(`${label} must resolve to an exact rational value.`);
  return value;
}

function exactInteger(node: AstNode, label = 'value'): bigint {
  const value = exactRational(node, label);
  if (value.d !== 1n) throw new Error(`${label} must be an integer.`);
  return value.n;
}

function positiveBoundedInteger(node: AstNode, label: string, max: bigint): number {
  const value = exactInteger(node, label);
  if (value < 1n || value > max) throw new Error(`${label} must be an integer in [1, ${max}].`);
  return Number(value);
}

function astKey(node: AstNode): string { return astToPlainText(simplifyAst(node)); }
function uniqueAsts(items: AstNode[]): AstNode[] {
  const seen = new Set<string>();
  const out: AstNode[] = [];
  for (const item of items) {
    const normalized = simplifyAst(item);
    const key = astKey(normalized);
    if (!seen.has(key)) { seen.add(key); out.push(normalized); }
  }
  return out;
}
function setAst(items: AstNode[]): AstNode { return { type: 'set', items: uniqueAsts(items) }; }
function setItems(node: AstNode): AstNode[] {
  const simplified = simplifyAst(node);
  if (simplified.type === 'call' && simplified.name === 'set') return uniqueAsts(simplified.args);
  if (simplified.type === 'set') return uniqueAsts(simplified.items);
  throw new Error('Expected a finite set written as set(a, b, c).');
}
function pairAst(a: AstNode, b: AstNode): AstNode { return { type: 'matrix', rows: [[a, b]] }; }

// ---------------------------------------------------------------------------
// Logic
// ---------------------------------------------------------------------------

const LOGIC_CALLS = new Set(['not', 'and', 'or', 'xor', 'implies', 'iff']);
export function isLogicExpression(node: AstNode): boolean {
  if (node.type === 'symbol') return true;
  return node.type === 'call' && LOGIC_CALLS.has(node.name);
}

function logicVariables(node: AstNode, out = new Set<string>()): Set<string> {
  if (node.type === 'symbol') { out.add(node.name); return out; }
  if (node.type === 'call' && LOGIC_CALLS.has(node.name)) node.args.forEach((arg) => logicVariables(arg, out));
  return out;
}

function evalLogic(node: AstNode, assignment: Record<string, boolean>): boolean {
  if (node.type === 'symbol') {
    if (!(node.name in assignment)) throw new Error(`Missing truth assignment for ${node.name}.`);
    return assignment[node.name];
  }
  if (node.type !== 'call' || !LOGIC_CALLS.has(node.name)) throw new Error('Logical expressions use symbols with not/and/or/xor/implies/iff.');
  if (node.name === 'not') {
    if (node.args.length !== 1) throw new Error('not(p) requires one proposition.');
    return !evalLogic(node.args[0], assignment);
  }
  if (node.name === 'and' || node.name === 'or') {
    if (node.args.length < 2) throw new Error(`${node.name}(...) requires at least two propositions.`);
    return node.name === 'and' ? node.args.every((arg) => evalLogic(arg, assignment)) : node.args.some((arg) => evalLogic(arg, assignment));
  }
  if (node.args.length !== 2) throw new Error(`${node.name}(p, q) requires exactly two propositions.`);
  const a = evalLogic(node.args[0], assignment);
  const b = evalLogic(node.args[1], assignment);
  if (node.name === 'xor') return a !== b;
  if (node.name === 'implies') return !a || b;
  return a === b;
}

function logicText(node: AstNode): string {
  if (node.type === 'symbol') return node.name;
  if (node.type !== 'call') return astToPlainText(node);
  if (node.name === 'not') return `¬${logicText(node.args[0])}`;
  const op = node.name === 'and' ? '∧' : node.name === 'or' ? '∨' : node.name === 'xor' ? '⊕' : node.name === 'implies' ? '→' : node.name === 'iff' ? '↔' : node.name;
  return `(${node.args.map(logicText).join(` ${op} `)})`;
}

interface TruthRow { assignment: Record<string, boolean>; value: boolean }
function truthRows(node: AstNode): { variables: string[]; rows: TruthRow[] } {
  if (!isLogicExpression(node)) throw new Error('Expected a proposition built from symbols and not/and/or/xor/implies/iff.');
  const variables = [...logicVariables(node)].sort();
  if (variables.length > 6) throw new Error('P11 truth tables are currently limited to at most 6 proposition variables (64 rows).');
  const rows: TruthRow[] = [];
  const total = 2 ** variables.length;
  for (let mask = total - 1; mask >= 0; mask -= 1) {
    const assignment: Record<string, boolean> = {};
    variables.forEach((variable, index) => { assignment[variable] = Boolean(mask & (1 << (variables.length - index - 1))); });
    rows.push({ assignment, value: evalLogic(node, assignment) });
  }
  return { variables, rows };
}

export function logicProfile(node: AstNode): DiscreteTransform {
  const { variables, rows } = truthRows(node);
  const trueCount = rows.filter((row) => row.value).length;
  const classification = trueCount === rows.length ? 'Tautology' : trueCount === 0 ? 'Contradiction' : 'Contingency';
  const facts = rows.map((row, index) => ({
    label: variables.length ? variables.map((variable) => `${variable}=${row.assignment[variable] ? 'T' : 'F'}`).join(', ') : `Row ${index + 1}`,
    display: row.value ? 'T' : 'F',
    tone: row.value ? 'positive' as const : 'neutral' as const,
  }));
  return {
    ast: sym(classification === 'Tautology' ? 'true' : classification === 'Contradiction' ? 'false' : 'contingent'),
    display: `${logicText(node)} · ${classification}`,
    exactness: 'exact', warnings: [],
    sections: [
      section('logic-summary', 'Logical classification', [
        { label: 'Expression', display: logicText(node) },
        { label: 'Variables', display: variables.join(', ') || 'None' },
        { label: 'Classification', display: classification, tone: classification === 'Tautology' ? 'positive' : classification === 'Contradiction' ? 'negative' : 'neutral' },
        { label: 'Satisfying assignments', display: `${trueCount} of ${rows.length}` },
      ]),
      section('truth-table', 'Truth table', facts, 'Rows are generated exhaustively; no sampling or SAT heuristic is used.'),
    ],
  };
}

export function logicNormalForms(node: AstNode): DiscreteTransform {
  const { variables, rows } = truthRows(node);
  const trueRows = rows.filter((row) => row.value);
  const falseRows = rows.filter((row) => !row.value);
  const literal = (variable: string, positive: boolean) => positive ? variable : `¬${variable}`;
  const dnf = trueRows.length === 0 ? '⊥' : trueRows.length === rows.length ? '⊤' : trueRows.map((row) => `(${variables.map((v) => literal(v, row.assignment[v])).join(' ∧ ')})`).join(' ∨ ');
  const cnf = falseRows.length === 0 ? '⊤' : falseRows.length === rows.length ? '⊥' : falseRows.map((row) => `(${variables.map((v) => literal(v, !row.assignment[v])).join(' ∨ ')})`).join(' ∧ ');
  return {
    display: `Canonical DNF/CNF for ${logicText(node)}`, exactness: 'exact', warnings: [],
    sections: [section('normal-forms', 'Canonical normal forms', [
      { label: 'DNF', display: dnf },
      { label: 'CNF', display: cnf },
    ], 'Canonical forms are constructed directly from the complete truth table. They are correct but not necessarily minimal.')],
  };
}

// ---------------------------------------------------------------------------
// Finite sets
// ---------------------------------------------------------------------------

export function finiteSetProfile(node: AstNode): DiscreteTransform {
  const items = setItems(node); const normalized = setAst(items);
  return { ast: normalized, display: astToPlainText(normalized), exactness: 'exact', warnings: [], sections: [section('set-profile', 'Finite set', [
    { label: 'Normalized set', display: astToPlainText(normalized), ast: normalized },
    { label: 'Cardinality', display: String(items.length), ast: n(items.length) },
    { label: 'Empty?', display: items.length ? 'No' : 'Yes' },
  ], 'Repeated elements are removed because a set contains each element at most once.')] };
}

export function finiteSetPowerSet(node: AstNode): DiscreteTransform {
  const items = setItems(node);
  if (items.length > 10) throw new Error('P11 explicit power-set expansion is limited to sets of at most 10 elements (1024 subsets).');
  const subsets: AstNode[] = [];
  for (let mask = 0; mask < 2 ** items.length; mask += 1) subsets.push(setAst(items.filter((_item, index) => Boolean(mask & (1 << index)))));
  const result = { type: 'set', items: subsets } satisfies AstNode;
  return { ast: result, display: astToPlainText(result), exactness: 'exact', warnings: [], sections: [section('power-set', 'Power set', [
    { label: '|P(A)|', display: String(subsets.length), ast: n(subsets.length) },
    { label: 'P(A)', display: astToPlainText(result), ast: result },
  ])] };
}

export type SetBinaryOperation = 'union' | 'intersection' | 'difference' | 'symmetric-difference' | 'cartesian' | 'subset';
export function finiteSetBinary(leftNode: AstNode, rightNode: AstNode, operation: SetBinaryOperation): DiscreteTransform {
  const left = setItems(leftNode); const right = setItems(rightNode);
  const lkeys = new Set(left.map(astKey)); const rkeys = new Set(right.map(astKey));
  let ast: AstNode | undefined; let display = '';
  if (operation === 'union') ast = setAst([...left, ...right]);
  else if (operation === 'intersection') ast = setAst(left.filter((item) => rkeys.has(astKey(item))));
  else if (operation === 'difference') ast = setAst(left.filter((item) => !rkeys.has(astKey(item))));
  else if (operation === 'symmetric-difference') ast = setAst([...left.filter((item) => !rkeys.has(astKey(item))), ...right.filter((item) => !lkeys.has(astKey(item)))]);
  else if (operation === 'cartesian') {
    if (left.length * right.length > 400) throw new Error('P11 explicit Cartesian products are limited to at most 400 ordered pairs.');
    ast = setAst(left.flatMap((a) => right.map((b) => pairAst(a, b))));
  } else {
    const subset = left.every((item) => rkeys.has(astKey(item)));
    ast = sym(subset ? 'true' : 'false'); display = subset ? 'Yes — A ⊆ B' : 'No — A ⊄ B';
  }
  display ||= astToPlainText(ast);
  return { ast, display, exactness: 'exact', warnings: [], sections: [section('set-operation', 'Set operation', [
    { label: 'A', display: astToPlainText(setAst(left)), ast: setAst(left) },
    { label: 'B', display: astToPlainText(setAst(right)), ast: setAst(right) },
    { label: operation === 'subset' ? 'A ⊆ B?' : 'Result', display, ast },
  ])] };
}

// ---------------------------------------------------------------------------
// Relations on {1,...,n}
// ---------------------------------------------------------------------------

interface RelationSpec { size: number; pairs: Array<[number, number]> }
export function isRelationCall(node: AstNode): boolean { return node.type === 'call' && node.name === 'relation'; }
function relationSpec(node: AstNode): RelationSpec {
  const simplified = simplifyAst(node);
  if (simplified.type !== 'call' || simplified.name !== 'relation' || simplified.args.length !== 2) throw new Error('Use relation(n, [[a,b], ...]) on the base set {1,…,n}.');
  const size = positiveBoundedInteger(simplified.args[0], 'Relation base-set size n', 30n);
  const edges = simplified.args[1];
  if (edges.type !== 'matrix' || edges.rows.some((row) => row.length !== 2)) throw new Error('Relation pairs must be an m×2 matrix such as [[1,1],[1,2]].');
  const pairs: Array<[number, number]> = [];
  for (const row of edges.rows) {
    const a = Number(exactInteger(row[0], 'Relation element')); const b = Number(exactInteger(row[1], 'Relation element'));
    if (a < 1 || a > size || b < 1 || b > size) throw new Error(`Relation elements must lie in {1,…,${size}}.`);
    if (!pairs.some(([x, y]) => x === a && y === b)) pairs.push([a, b]);
  }
  return { size, pairs };
}
function relationMatrix(spec: RelationSpec): boolean[][] {
  const matrix = Array.from({ length: spec.size }, () => Array<boolean>(spec.size).fill(false));
  spec.pairs.forEach(([a, b]) => { matrix[a - 1][b - 1] = true; }); return matrix;
}
function pairsAst(pairs: Array<[number, number]>): AstNode { return { type: 'matrix', rows: pairs.map(([a, b]) => [n(a), n(b)]) }; }
function relationProperties(spec: RelationSpec) {
  const m = relationMatrix(spec); const N = spec.size;
  const reflexive = Array.from({ length: N }, (_v, i) => m[i][i]).every(Boolean);
  const irreflexive = Array.from({ length: N }, (_v, i) => !m[i][i]).every(Boolean);
  let symmetric = true; let antisymmetric = true; let asymmetric = true; let transitive = true;
  for (let i = 0; i < N; i += 1) for (let j = 0; j < N; j += 1) {
    if (m[i][j] && !m[j][i]) symmetric = false;
    if (i !== j && m[i][j] && m[j][i]) { antisymmetric = false; asymmetric = false; }
    if (m[i][j] && m[j][i]) asymmetric = false;
    if (m[i][j]) for (let k = 0; k < N; k += 1) if (m[j][k] && !m[i][k]) transitive = false;
  }
  const equivalence = reflexive && symmetric && transitive;
  const partialOrder = reflexive && antisymmetric && transitive;
  let totalOrder = partialOrder;
  if (partialOrder) for (let i = 0; i < N; i += 1) for (let j = i + 1; j < N; j += 1) if (!m[i][j] && !m[j][i]) totalOrder = false;
  return { reflexive, irreflexive, symmetric, antisymmetric, asymmetric, transitive, equivalence, partialOrder, totalOrder, matrix: m };
}
export function relationProfile(node: AstNode): DiscreteTransform {
  const spec = relationSpec(node); const p = relationProperties(spec);
  return { ast: pairsAst(spec.pairs), display: p.equivalence ? 'Equivalence relation' : p.totalOrder ? 'Total order' : p.partialOrder ? 'Partial order' : 'General relation', exactness: 'exact', warnings: [], sections: [section('relation-properties', 'Relation properties', [
    { label: 'Base set', display: `{1,…,${spec.size}}` }, { label: 'Pairs', display: astToPlainText(pairsAst(spec.pairs)), ast: pairsAst(spec.pairs) },
    { label: 'Reflexive', display: p.reflexive ? 'Yes' : 'No' }, { label: 'Irreflexive', display: p.irreflexive ? 'Yes' : 'No' },
    { label: 'Symmetric', display: p.symmetric ? 'Yes' : 'No' }, { label: 'Antisymmetric', display: p.antisymmetric ? 'Yes' : 'No' },
    { label: 'Asymmetric', display: p.asymmetric ? 'Yes' : 'No' }, { label: 'Transitive', display: p.transitive ? 'Yes' : 'No' },
    { label: 'Equivalence relation', display: p.equivalence ? 'Yes' : 'No', tone: p.equivalence ? 'positive' : undefined },
    { label: 'Partial order', display: p.partialOrder ? 'Yes' : 'No', tone: p.partialOrder ? 'positive' : undefined },
    { label: 'Total order', display: p.totalOrder ? 'Yes' : 'No', tone: p.totalOrder ? 'positive' : undefined },
  ])] };
}
function boolMatrixPairs(m: boolean[][]): Array<[number, number]> { const out: Array<[number, number]> = []; m.forEach((row, i) => row.forEach((value, j) => { if (value) out.push([i + 1, j + 1]); })); return out; }
export function relationClosures(node: AstNode): DiscreteTransform {
  const spec = relationSpec(node); const base = relationMatrix(spec); const N = spec.size;
  const reflexive = base.map((row) => [...row]); for (let i = 0; i < N; i += 1) reflexive[i][i] = true;
  const symmetric = base.map((row) => [...row]); for (let i = 0; i < N; i += 1) for (let j = 0; j < N; j += 1) if (base[i][j]) symmetric[j][i] = true;
  const transitive = base.map((row) => [...row]); for (let k = 0; k < N; k += 1) for (let i = 0; i < N; i += 1) if (transitive[i][k]) for (let j = 0; j < N; j += 1) transitive[i][j] ||= transitive[k][j];
  return { display: 'Reflexive, symmetric, and transitive closures', exactness: 'exact', warnings: [], sections: [section('closures', 'Relation closures', [
    { label: 'Reflexive closure', display: astToPlainText(pairsAst(boolMatrixPairs(reflexive))), ast: pairsAst(boolMatrixPairs(reflexive)) },
    { label: 'Symmetric closure', display: astToPlainText(pairsAst(boolMatrixPairs(symmetric))), ast: pairsAst(boolMatrixPairs(symmetric)) },
    { label: 'Transitive closure', display: astToPlainText(pairsAst(boolMatrixPairs(transitive))), ast: pairsAst(boolMatrixPairs(transitive)) },
  ], 'The transitive closure is computed deterministically with Warshall’s algorithm.')], steps: [{ id: 'step-1', before: `R with ${spec.pairs.length} pairs`, after: 'R⁺ / closure matrices computed', rule: 'warshall-transitive-closure', explanation: 'Repeatedly allow each vertex as an intermediate relation element.', verified: true }] };
}
export function relationClasses(node: AstNode): DiscreteTransform {
  const spec = relationSpec(node); const p = relationProperties(spec); if (!p.equivalence) throw new Error('Equivalence classes require an equivalence relation (reflexive, symmetric, transitive).');
  const remaining = new Set(Array.from({ length: spec.size }, (_v, i) => i + 1)); const classes: AstNode[] = [];
  while (remaining.size) { const a = remaining.values().next().value as number; const members = Array.from({ length: spec.size }, (_v, i) => i + 1).filter((b) => p.matrix[a - 1][b - 1]); members.forEach((b) => remaining.delete(b)); classes.push(setAst(members.map(n))); }
  const ast = { type: 'set', items: classes } satisfies AstNode;
  return { ast, display: astToPlainText(ast), exactness: 'exact', warnings: [], sections: [section('equivalence-classes', 'Equivalence classes', [{ label: 'Partition', display: astToPlainText(ast), ast }, { label: 'Number of classes', display: String(classes.length) }])] };
}
export function hasseProfile(node: AstNode): DiscreteTransform {
  const spec = relationSpec(node); const p = relationProperties(spec); if (!p.partialOrder) throw new Error('A Hasse profile requires a partial order.'); const N = spec.size;
  const covers: Array<[number, number]> = [];
  for (let a = 1; a <= N; a += 1) for (let b = 1; b <= N; b += 1) if (a !== b && p.matrix[a - 1][b - 1]) {
    let covered = true; for (let c = 1; c <= N; c += 1) if (c !== a && c !== b && p.matrix[a - 1][c - 1] && p.matrix[c - 1][b - 1]) { covered = false; break; }
    if (covered) covers.push([a, b]);
  }
  const minimal = Array.from({ length: N }, (_v, i) => i + 1).filter((a) => !Array.from({ length: N }, (_w, j) => j + 1).some((b) => b !== a && p.matrix[b - 1][a - 1]));
  const maximal = Array.from({ length: N }, (_v, i) => i + 1).filter((a) => !Array.from({ length: N }, (_w, j) => j + 1).some((b) => b !== a && p.matrix[a - 1][b - 1]));
  const least = minimal.find((a) => Array.from({ length: N }, (_v, i) => i + 1).every((b) => p.matrix[a - 1][b - 1]));
  const greatest = maximal.find((a) => Array.from({ length: N }, (_v, i) => i + 1).every((b) => p.matrix[b - 1][a - 1]));
  return { ast: pairsAst(covers), display: `Hasse cover relation has ${covers.length} edges`, exactness: 'exact', warnings: [], sections: [section('hasse', 'Partial-order / Hasse profile', [
    { label: 'Cover pairs', display: astToPlainText(pairsAst(covers)), ast: pairsAst(covers) },
    { label: 'Minimal elements', display: minimal.join(', ') || 'None' }, { label: 'Maximal elements', display: maximal.join(', ') || 'None' },
    { label: 'Least element', display: least ? String(least) : 'None' }, { label: 'Greatest element', display: greatest ? String(greatest) : 'None' },
  ], 'Reflexive edges and edges implied by transitivity are removed from the Hasse cover relation.')] };
}

// ---------------------------------------------------------------------------
// Graphs
// ---------------------------------------------------------------------------

export type GraphKind = 'graph' | 'digraph' | 'wgraph' | 'wdigraph';
interface GraphEdge { u: number; v: number; w: Rational }
interface GraphSpec { kind: GraphKind; vertices: number; directed: boolean; weighted: boolean; edges: GraphEdge[] }
const GRAPH_CALLS = new Set<GraphKind>(['graph', 'digraph', 'wgraph', 'wdigraph']);
export function isGraphCall(node: AstNode): boolean { return node.type === 'call' && GRAPH_CALLS.has(node.name as GraphKind); }
function graphSpec(node: AstNode): GraphSpec {
  const simplified = simplifyAst(node); if (simplified.type !== 'call' || !GRAPH_CALLS.has(simplified.name as GraphKind) || simplified.args.length !== 2) throw new Error('Use graph(n, [[u,v],...]), digraph(...), wgraph(n, [[u,v,w],...]), or wdigraph(...).');
  const kind = simplified.name as GraphKind; const directed = kind === 'digraph' || kind === 'wdigraph'; const weighted = kind === 'wgraph' || kind === 'wdigraph';
  const vertices = positiveBoundedInteger(simplified.args[0], 'Number of graph vertices', 100n); const matrix = simplified.args[1]; const width = weighted ? 3 : 2;
  if (matrix.type !== 'matrix' || matrix.rows.some((row) => row.length !== width)) throw new Error(`${kind} edges must be an m×${width} matrix.`);
  if (matrix.rows.length > 1000) throw new Error('P11 graph algorithms are currently limited to 1000 edges.');
  const edges: GraphEdge[] = [];
  for (const row of matrix.rows) {
    const u = Number(exactInteger(row[0], 'Vertex')); const v = Number(exactInteger(row[1], 'Vertex')); if (u < 1 || u > vertices || v < 1 || v > vertices) throw new Error(`Vertices must lie in {1,…,${vertices}}.`);
    const w = weighted ? exactRational(row[2], 'Edge weight') : ONE;
    const duplicate = edges.some((edge) => directed ? edge.u === u && edge.v === v : (edge.u === u && edge.v === v) || (edge.u === v && edge.v === u));
    if (duplicate) throw new Error('P11 graph constructors model simple graphs; parallel or duplicate edges are not supported.');
    edges.push({ u, v, w });
  }
  return { kind, vertices, directed, weighted, edges };
}
function adjacency(spec: GraphSpec): Array<Array<{ v: number; w: Rational }>> {
  const a = Array.from({ length: spec.vertices + 1 }, () => [] as Array<{ v: number; w: Rational }>);
  for (const e of spec.edges) { a[e.u].push({ v: e.v, w: e.w }); if (!spec.directed && e.u !== e.v) a[e.v].push({ v: e.u, w: e.w }); }
  a.forEach((neighbors) => neighbors.sort((x, y) => x.v - y.v)); return a;
}
function undirectedDegree(spec: GraphSpec, vertex: number): number {
  return spec.edges.reduce((degree, edge) => degree + (edge.u === vertex && edge.v === vertex ? 2 : edge.u === vertex || edge.v === vertex ? 1 : 0), 0);
}
function graphMatrixAst(spec: GraphSpec): AstNode {
  const m = Array.from({ length: spec.vertices }, () => Array.from({ length: spec.vertices }, () => n(0)));
  for (const edge of spec.edges) { m[edge.u - 1][edge.v - 1] = spec.weighted ? n(rationalToString(edge.w)) : n(1); if (!spec.directed) m[edge.v - 1][edge.u - 1] = spec.weighted ? n(rationalToString(edge.w)) : n(1); }
  return { type: 'matrix', rows: m };
}
function componentsUndirected(spec: GraphSpec): number[][] {
  const adj = adjacency(spec); const seen = new Set<number>(); const comps: number[][] = [];
  for (let s = 1; s <= spec.vertices; s += 1) if (!seen.has(s)) { const queue = [s]; seen.add(s); const comp: number[] = []; while (queue.length) { const u = queue.shift()!; comp.push(u); for (const { v } of adj[u]) if (!seen.has(v)) { seen.add(v); queue.push(v); } } comps.push(comp); }
  return comps;
}
function undirectedCycle(spec: GraphSpec): boolean {
  const adj = adjacency(spec); const seen = new Set<number>();
  const dfs = (u: number, parent: number): boolean => { seen.add(u); for (const { v } of adj[u]) { if (!seen.has(v)) { if (dfs(v, u)) return true; } else if (v !== parent || v === u) return true; } return false; };
  for (let s = 1; s <= spec.vertices; s += 1) if (!seen.has(s) && dfs(s, 0)) return true; return false;
}
function directedCycle(spec: GraphSpec): boolean {
  const adj = adjacency(spec); const color = Array(spec.vertices + 1).fill(0);
  const dfs = (u: number): boolean => { color[u] = 1; for (const { v } of adj[u]) { if (color[v] === 1) return true; if (color[v] === 0 && dfs(v)) return true; } color[u] = 2; return false; };
  for (let i = 1; i <= spec.vertices; i += 1) if (color[i] === 0 && dfs(i)) return true; return false;
}
function bipartite(spec: GraphSpec): { ok: boolean; parts: number[][] } {
  if (spec.directed) return { ok: false, parts: [] }; const adj = adjacency(spec); const color = Array(spec.vertices + 1).fill(-1); let ok = true;
  for (let s = 1; s <= spec.vertices; s += 1) if (color[s] === -1) { color[s] = 0; const q = [s]; while (q.length) { const u = q.shift()!; for (const { v } of adj[u]) { if (color[v] === -1) { color[v] = 1 - color[u]; q.push(v); } else if (color[v] === color[u]) ok = false; } } }
  return { ok, parts: ok ? [[...Array(spec.vertices).keys()].map((i) => i + 1).filter((v) => color[v] === 0), [...Array(spec.vertices).keys()].map((i) => i + 1).filter((v) => color[v] === 1)] : [] };
}
function topo(spec: GraphSpec): { order: number[]; cycle: boolean } {
  if (!spec.directed) throw new Error('Topological sorting requires a directed graph.'); const adj = adjacency(spec); const indegree = Array(spec.vertices + 1).fill(0); spec.edges.forEach((e) => { indegree[e.v] += 1; });
  const q = Array.from({ length: spec.vertices }, (_v, i) => i + 1).filter((v) => indegree[v] === 0); const order: number[] = [];
  while (q.length) { q.sort((a, b) => a - b); const u = q.shift()!; order.push(u); for (const { v } of adj[u]) { indegree[v] -= 1; if (indegree[v] === 0) q.push(v); } }
  return { order, cycle: order.length !== spec.vertices };
}
export function graphProfile(node: AstNode): DiscreteTransform {
  const spec = graphSpec(node); const adj = adjacency(spec); const cycle = spec.directed ? directedCycle(spec) : undirectedCycle(spec); const comps = spec.directed ? [] : componentsUndirected(spec); const bi = bipartite(spec);
  const degreeText = spec.directed
    ? Array.from({ length: spec.vertices }, (_v, i) => i + 1).map((v) => { const out = adj[v].length; const inn = spec.edges.filter((e) => e.v === v).length; return `${v}: in ${inn}, out ${out}`; }).join(' · ')
    : Array.from({ length: spec.vertices }, (_v, i) => i + 1).map((v) => `${v}:${undirectedDegree(spec, v)}`).join(', ');
  const connected = spec.directed ? undefined : comps.length === 1; const tree = !spec.directed && connected && !cycle && spec.edges.length === spec.vertices - 1;
  let euler = 'Not classified for directed graphs in P11';
  if (!spec.directed) { const odd = Array.from({ length: spec.vertices }, (_v, i) => i + 1).filter((v) => undirectedDegree(spec, v) % 2 === 1).length; euler = !connected ? 'None (graph is disconnected)' : odd === 0 ? 'Euler circuit exists' : odd === 2 ? 'Euler trail exists, but no circuit' : 'No Euler trail'; }
  return { ast: graphMatrixAst(spec), display: `${spec.directed ? 'Directed' : 'Undirected'} ${spec.weighted ? 'weighted ' : ''}graph · ${spec.vertices} vertices · ${spec.edges.length} edges`, exactness: 'exact', warnings: [], sections: [section('graph-profile', 'Graph profile', [
    { label: 'Vertices', display: String(spec.vertices) }, { label: 'Edges', display: String(spec.edges.length) }, { label: 'Directed?', display: spec.directed ? 'Yes' : 'No' }, { label: 'Weighted?', display: spec.weighted ? 'Yes' : 'No' },
    { label: spec.directed ? 'In/out degrees' : 'Degree sequence', display: degreeText }, { label: 'Cycle?', display: cycle ? 'Yes' : 'No' },
    ...(!spec.directed ? [{ label: 'Connected?', display: connected ? 'Yes' : 'No' }, { label: 'Components', display: comps.map((c) => `{${c.join(', ')}}`).join(' ') }, { label: 'Bipartite?', display: bi.ok ? `Yes: {${bi.parts[0].join(', ')}} | {${bi.parts[1].join(', ')}}` : 'No' }, { label: 'Tree?', display: tree ? 'Yes' : 'No', tone: tree ? 'positive' as const : undefined }, { label: 'Euler', display: euler }] : []),
    { label: 'Adjacency matrix', display: astToPlainText(graphMatrixAst(spec)), ast: graphMatrixAst(spec) },
  ])] };
}
export function graphTraversal(node: AstNode, mode: 'bfs' | 'dfs', start: number): DiscreteTransform {
  const spec = graphSpec(node); if (start < 1 || start > spec.vertices || !Number.isInteger(start)) throw new Error(`Start vertex must lie in {1,…,${spec.vertices}}.`); const adj = adjacency(spec); const seen = new Set<number>([start]); const order: number[] = []; const trace: string[] = [];
  if (mode === 'bfs') { const q = [start]; while (q.length) { const u = q.shift()!; order.push(u); const added: number[] = []; for (const { v } of adj[u]) if (!seen.has(v)) { seen.add(v); q.push(v); added.push(v); } trace.push(`Visit ${u}; enqueue ${added.join(', ') || 'nothing'}; queue = [${q.join(', ')}]`); } }
  else { const visit = (u: number) => { order.push(u); trace.push(`Visit ${u}`); for (const { v } of adj[u]) if (!seen.has(v)) { seen.add(v); visit(v); } }; visit(start); }
  return { ast: { type: 'matrix', rows: [order.map(n)] }, display: `${mode.toUpperCase()} order: ${order.join(' → ')}`, exactness: 'exact', warnings: [], sections: [section(`${mode}-trace`, `${mode.toUpperCase()} trace`, trace.map((line, i) => ({ label: `Step ${i + 1}`, display: line })), 'Neighbors are processed in ascending vertex order, making the trace deterministic.'), section('traversal-result', 'Traversal result', [{ label: 'Visit order', display: order.join(' → ') }, { label: 'Reachable vertices', display: String(order.length) }])], steps: trace.map((line, i) => ({ id: `step-${i + 1}`, before: i === 0 ? `Start at ${start}` : trace[i - 1], after: line, rule: mode === 'bfs' ? 'breadth-first-search' : 'depth-first-search', explanation: line, verified: true })) };
}
function compareRat(a: Rational, b: Rational): number { const diff = a.n * b.d - b.n * a.d; return diff < 0n ? -1 : diff > 0n ? 1 : 0; }
export function shortestPath(node: AstNode, start: number, target: number): DiscreteTransform {
  const spec = graphSpec(node); if (![start, target].every((v) => Number.isInteger(v) && v >= 1 && v <= spec.vertices)) throw new Error(`Start/target vertices must lie in {1,…,${spec.vertices}}.`); if (spec.weighted && spec.edges.some((e) => e.w.n < 0n)) throw new Error('Dijkstra’s algorithm requires nonnegative edge weights. Negative-weight shortest paths are deferred.');
  const adj = adjacency(spec); const previous = Array<number | null>(spec.vertices + 1).fill(null); const trace: string[] = [];
  if (!spec.weighted) {
    const distance = Array<number>(spec.vertices + 1).fill(Infinity); distance[start] = 0; const q = [start];
    while (q.length) { const u = q.shift()!; trace.push(`Dequeue ${u} (distance ${distance[u]})`); if (u === target) break; for (const { v } of adj[u]) if (!Number.isFinite(distance[v])) { distance[v] = distance[u] + 1; previous[v] = u; q.push(v); trace.push(`Discover ${v}: d=${distance[v]}, predecessor=${u}`); } }
    if (!Number.isFinite(distance[target])) return { display: `No path from ${start} to ${target}`, exactness: 'exact', warnings: [], sections: [section('shortest-path', 'Shortest path', [{ label: 'Result', display: 'Unreachable', tone: 'warning' }]), section('trace', 'BFS trace', trace.map((x, i) => ({ label: `Step ${i + 1}`, display: x }))) ] };
    const path: number[] = []; for (let v: number | null = target; v !== null; v = previous[v]) path.push(v); path.reverse(); return { ast: { type: 'matrix', rows: [path.map(n)] }, display: `${path.join(' → ')} · distance ${distance[target]}`, exactness: 'exact', warnings: [], sections: [section('shortest-path', 'Shortest path', [{ label: 'Path', display: path.join(' → ') }, { label: 'Distance', display: String(distance[target]) }]), section('trace', 'BFS shortest-path trace', trace.map((x, i) => ({ label: `Step ${i + 1}`, display: x }))) ] };
  }
  const distance: Array<Rational | null> = Array(spec.vertices + 1).fill(null); distance[start] = ZERO; const used = new Set<number>();
  while (used.size < spec.vertices) { let u = -1; for (let v = 1; v <= spec.vertices; v += 1) if (!used.has(v) && distance[v] && (u === -1 || compareRat(distance[v]!, distance[u]!) < 0)) u = v; if (u === -1) break; used.add(u); trace.push(`Settle ${u} at distance ${rationalToString(distance[u]!)}`); if (u === target) break; for (const edge of adj[u]) { const candidate = add(distance[u]!, edge.w); if (!distance[edge.v] || compareRat(candidate, distance[edge.v]!) < 0) { distance[edge.v] = candidate; previous[edge.v] = u; trace.push(`Relax ${u}→${edge.v}: d=${rationalToString(candidate)}`); } } }
  if (!distance[target]) return { display: `No path from ${start} to ${target}`, exactness: 'exact', warnings: [], sections: [section('shortest-path', 'Shortest path', [{ label: 'Result', display: 'Unreachable', tone: 'warning' }]), section('trace', 'Dijkstra trace', trace.map((x, i) => ({ label: `Step ${i + 1}`, display: x }))) ] };
  const path: number[] = []; for (let v: number | null = target; v !== null; v = previous[v]) path.push(v); path.reverse(); return { ast: { type: 'matrix', rows: [path.map(n)] }, display: `${path.join(' → ')} · distance ${rationalToString(distance[target]!)}`, exactness: 'exact', warnings: [], sections: [section('shortest-path', 'Shortest path', [{ label: 'Path', display: path.join(' → ') }, { label: 'Distance', display: rationalToString(distance[target]!) }]), section('trace', 'Dijkstra trace', trace.map((x, i) => ({ label: `Step ${i + 1}`, display: x }))) ], steps: trace.map((line, i) => ({ id: `step-${i + 1}`, before: i ? trace[i - 1] : `Start at ${start}`, after: line, rule: 'dijkstra-relaxation', explanation: line, verified: true })) };
}
export function topologicalSort(node: AstNode): DiscreteTransform {
  const spec = graphSpec(node); const result = topo(spec); return { ast: result.cycle ? undefined : { type: 'matrix', rows: [result.order.map(n)] }, display: result.cycle ? 'No topological ordering — directed cycle detected' : result.order.join(' → '), exactness: 'exact', warnings: result.cycle ? ['A directed graph has a topological ordering if and only if it is acyclic.'] : [], sections: [section('topological-sort', 'Topological sort', [{ label: 'Cycle detected?', display: result.cycle ? 'Yes' : 'No', tone: result.cycle ? 'negative' : 'positive' }, { label: 'Order', display: result.cycle ? 'None' : result.order.join(' → ') }], 'Kahn’s algorithm processes the smallest available zero-indegree vertex first for deterministic output.')] };
}
export function minimumSpanningTree(node: AstNode): DiscreteTransform {
  const spec = graphSpec(node); if (spec.directed || !spec.weighted) throw new Error('P11 MST requires an undirected weighted graph: wgraph(...).'); if (spec.edges.some((e) => e.u === e.v)) throw new Error('Self-loops are ignored by MST theory; remove them before running this bounded P11 workflow.');
  const parent = Array.from({ length: spec.vertices + 1 }, (_v, i) => i); const rank = Array(spec.vertices + 1).fill(0); const find = (x: number): number => parent[x] === x ? x : (parent[x] = find(parent[x])); const union = (a: number, b: number) => { let ra = find(a), rb = find(b); if (ra === rb) return false; if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra]; parent[rb] = ra; if (rank[ra] === rank[rb]) rank[ra] += 1; return true; };
  const sorted = [...spec.edges].sort((a, b) => compareRat(a.w, b.w) || a.u - b.u || a.v - b.v); const selected: GraphEdge[] = []; let total = ZERO; const trace: string[] = [];
  for (const e of sorted) { const accepted = union(e.u, e.v); trace.push(`${accepted ? 'Take' : 'Skip'} ${e.u}—${e.v} (w=${rationalToString(e.w)})${accepted ? '' : ' — would create a cycle'}`); if (accepted) { selected.push(e); total = add(total, e.w); if (selected.length === spec.vertices - 1) break; } }
  if (selected.length !== spec.vertices - 1) return { display: 'No spanning tree — graph is disconnected', exactness: 'exact', warnings: [], sections: [section('mst', 'Minimum spanning tree', [{ label: 'Result', display: 'No spanning tree', tone: 'warning' }]), section('trace', 'Kruskal trace', trace.map((x, i) => ({ label: `Step ${i + 1}`, display: x }))) ] };
  const edgeAst: AstNode = { type: 'matrix', rows: selected.map((e) => [n(e.u), n(e.v), n(rationalToString(e.w))]) };
  return { ast: edgeAst, display: `MST weight ${rationalToString(total)}`, exactness: 'exact', warnings: [], sections: [section('mst', 'Minimum spanning tree', [{ label: 'Edges', display: astToPlainText(edgeAst), ast: edgeAst }, { label: 'Total weight', display: rationalToString(total) }]), section('trace', 'Kruskal trace', trace.map((x, i) => ({ label: `Step ${i + 1}`, display: x })), 'Edges are processed by nondecreasing exact rational weight; ties use vertex order.')], steps: trace.map((line, i) => ({ id: `step-${i + 1}`, before: i ? trace[i - 1] : 'Sort edges by weight', after: line, rule: 'kruskal-mst', explanation: line, verified: true })) };
}

// ---------------------------------------------------------------------------
// Recurrences
// ---------------------------------------------------------------------------

export type RecurrenceKind = 'linrec' | 'linrec2';
interface RecurrenceSpec { kind: RecurrenceKind; args: Rational[] }
const RECURRENCE_CALLS = new Set<RecurrenceKind>(['linrec', 'linrec2']);
export function isRecurrenceCall(node: AstNode): boolean { return node.type === 'call' && RECURRENCE_CALLS.has(node.name as RecurrenceKind); }
function recurrenceSpec(node: AstNode): RecurrenceSpec {
  const simplified = simplifyAst(node); if (simplified.type !== 'call' || !RECURRENCE_CALLS.has(simplified.name as RecurrenceKind)) throw new Error('Use linrec(a0,c,d) or linrec2(a0,a1,p,q).');
  const kind = simplified.name as RecurrenceKind; if (simplified.args.length !== (kind === 'linrec' ? 3 : 4)) throw new Error(kind === 'linrec' ? 'linrec(a0,c,d) means a_n = c a_(n−1)+d.' : 'linrec2(a0,a1,p,q) means a_n = p a_(n−1)+q a_(n−2).');
  return { kind, args: simplified.args.map((arg, i) => exactRational(arg, `Recurrence parameter ${i + 1}`)) };
}
function rationalAst(value: Rational): AstNode { return value.d === 1n ? n(value.n) : bin('/', n(value.n), n(value.d)); }
function recurrenceTermsInternal(spec: RecurrenceSpec, count: number): Rational[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('P11 recurrence previews require 1–100 terms.'); const out: Rational[] = [];
  if (spec.kind === 'linrec') { const [a0, c, d] = spec.args; out.push(a0); for (let i = 1; i < count; i += 1) out.push(add(mul(c, out[i - 1]), d)); }
  else { const [a0, a1, p, q] = spec.args; out.push(a0); if (count > 1) out.push(a1); for (let i = 2; i < count; i += 1) out.push(add(mul(p, out[i - 1]), mul(q, out[i - 2]))); }
  return out;
}
export function recurrenceProfile(node: AstNode): DiscreteTransform {
  const spec = recurrenceSpec(node); const args = spec.args.map(rationalToString); const terms = recurrenceTermsInternal(spec, 8); const rule = spec.kind === 'linrec' ? `a₀=${args[0]}, aₙ=${args[1]}aₙ₋₁+${args[2]}` : `a₀=${args[0]}, a₁=${args[1]}, aₙ=${args[2]}aₙ₋₁+${args[3]}aₙ₋₂`;
  const facts: MathResultSection['facts'] = [{ label: 'Order', display: spec.kind === 'linrec' ? '1' : '2' }, { label: 'Rule', display: rule }, { label: 'First terms', display: terms.map(rationalToString).join(', ') }];
  if (spec.kind === 'linrec2') facts.push({ label: 'Characteristic polynomial', display: `r² − (${args[2]})r − (${args[3]})` });
  return { ast: { type: 'matrix', rows: [terms.map(rationalAst)] }, display: rule, exactness: 'exact', warnings: [], sections: [section('recurrence-profile', 'Linear recurrence profile', facts)] };
}
export function recurrenceTerms(node: AstNode, count: number): DiscreteTransform {
  const spec = recurrenceSpec(node); const terms = recurrenceTermsInternal(spec, count); const ast: AstNode = { type: 'matrix', rows: [terms.map(rationalAst)] };
  return { ast, display: astToPlainText(ast), exactness: 'exact', warnings: [], sections: [section('recurrence-terms', 'Recurrence terms', terms.map((value, index) => ({ label: `a_${index}`, display: rationalToString(value), ast: rationalAst(value) })))] };
}
export function recurrenceClosedForm(node: AstNode): DiscreteTransform {
  const spec = recurrenceSpec(node); if (spec.kind === 'linrec2') {
    const [, , p, q] = spec.args; const polynomial = bin('-', bin('-', bin('^', sym('r'), n(2)), bin('*', rationalAst(p), sym('r'))), rationalAst(q));
    return { ast: polynomial, display: `Characteristic equation: ${astToPlainText(polynomial)} = 0`, exactness: 'exact', warnings: ['P11 constructs the exact characteristic equation for second-order recurrences but does not claim a general closed form when solving for coefficients would require unsupported algebraic-number arithmetic.'], sections: [section('recurrence-characteristic', 'Characteristic method', [{ label: 'Characteristic polynomial', display: astToPlainText(polynomial), ast: polynomial }, { label: 'Boundary', display: 'General second-order closed-form coefficient solving is deferred', tone: 'warning' }])] };
  }
  const [a0, c, d] = spec.args; const variable = sym('n'); let closed: AstNode;
  if (eq(c, ONE)) closed = bin('+', rationalAst(a0), bin('*', rationalAst(d), variable));
  else {
    // a_n = c^n a0 + d(c^n - 1)/(c - 1)
    const cpow = bin('^', rationalAst(c), variable); closed = bin('+', bin('*', rationalAst(a0), cpow), bin('*', rationalAst(d), bin('/', bin('-', cpow, n(1)), rationalAst(sub(c, ONE)))));
  }
  closed = simplifyAst(closed);
  return { ast: closed, display: `a_n = ${astToPlainText(closed)}`, exactness: 'exact', warnings: [], sections: [section('recurrence-closed-form', 'Closed form', [{ label: 'a_n', display: astToPlainText(closed), ast: closed }, { label: 'Verification basis', display: 'Matches a₀ and satisfies aₙ = c aₙ₋₁ + d algebraically.' }])] };
}

// ---------------------------------------------------------------------------
// Complexity + Master theorem
// ---------------------------------------------------------------------------

export function isComplexityCall(node: AstNode): boolean { return node.type === 'call' && (node.name === 'complexity' || node.name === 'master'); }
interface Growth { poly: number; log: number; exp?: number; text: string }
function growth(node: AstNode): Growth | null {
  const s = simplifyAst(node); if (rationalValue(s)) return { poly: 0, log: 0, text: '1' };
  if (s.type === 'symbol' && s.name === 'n') return { poly: 1, log: 0, text: 'n' };
  if (s.type === 'call' && (s.name === 'log' || s.name === 'ln') && s.args.length === 1 && s.args[0].type === 'symbol' && s.args[0].name === 'n') return { poly: 0, log: 1, text: 'log n' };
  if (s.type === 'binary' && s.operator === '^') {
    if (s.left.type === 'symbol' && s.left.name === 'n') { const k = rationalValue(s.right); if (k && k.d === 1n && k.n >= 0n && k.n <= 100n) return { poly: Number(k.n), log: 0, text: `n^${k.n}` }; }
    if (s.left.type === 'call' && (s.left.name === 'log' || s.left.name === 'ln') && s.left.args[0]?.type === 'symbol' && s.left.args[0].name === 'n') { const k = rationalValue(s.right); if (k && k.d === 1n && k.n >= 0n && k.n <= 100n) return { poly: 0, log: Number(k.n), text: `(log n)^${k.n}` }; }
    const base = rationalValue(s.left); if (base && base.n > base.d && s.right.type === 'symbol' && s.right.name === 'n') return { poly: Infinity, log: 0, exp: rationalToNumber(base), text: `${rationalToString(base)}^n` };
  }
  if (s.type === 'binary' && s.operator === '*') { const a = growth(s.left), b = growth(s.right); if (!a || !b) return null; if (a.exp || b.exp) return { poly: Infinity, log: a.log + b.log, exp: Math.max(a.exp ?? 0, b.exp ?? 0), text: `${a.text}·${b.text}` }; return { poly: a.poly + b.poly, log: a.log + b.log, text: `${a.text}·${b.text}` }; }
  if (s.type === 'binary' && (s.operator === '+' || s.operator === '-')) { const a = growth(s.left), b = growth(s.right); if (!a || !b) return null; const compare = (x: Growth, y: Growth) => (x.exp ?? 0) - (y.exp ?? 0) || x.poly - y.poly || x.log - y.log; return compare(a, b) >= 0 ? a : b; }
  return null;
}
export function complexityProfile(node: AstNode): DiscreteTransform {
  const s = simplifyAst(node); if (s.type !== 'call' || !['complexity', 'master'].includes(s.name)) throw new Error('Use complexity(f(n)) or master(a,b,k).');
  if (s.name === 'master') {
    if (s.args.length !== 3) throw new Error('master(a,b,k) represents T(n)=aT(n/b)+Θ(n^k).'); const a = exactInteger(s.args[0], 'Master a'); const b = exactInteger(s.args[1], 'Master b'); const k = exactInteger(s.args[2], 'Master k');
    if (a < 1n || b < 2n || k < 0n || k > 30n) throw new Error('master(a,b,k) requires a≥1, b≥2 and integer 0≤k≤30.'); const bk = b ** k;
    let caseNo: number; let theta: string; let reason: string;
    if (a < bk) { caseNo = 3; theta = k === 0n ? 'Θ(1)' : k === 1n ? 'Θ(n)' : `Θ(n^${k})`; reason = `a=${a} < b^k=${bk}; f(n)=n^k polynomially dominates n^(log_b a), and the polynomial regularity condition holds.`; }
    else if (a === bk) { caseNo = 2; theta = k === 0n ? 'Θ(log n)' : k === 1n ? 'Θ(n log n)' : `Θ(n^${k} log n)`; reason = `a=b^k=${a}; n^(log_b a)=n^${k} matches f(n).`; }
    else { caseNo = 1; theta = `Θ(n^(log_${b} ${a}))`; reason = `a=${a} > b^k=${bk}; n^(log_b a) polynomially dominates f(n)=n^k.`; }
    return { display: theta, exactness: 'exact', warnings: [], sections: [section('master-theorem', 'Master theorem', [{ label: 'Recurrence', display: `T(n) = ${a}T(n/${b}) + Θ(n^${k})` }, { label: 'Case', display: String(caseNo) }, { label: 'Result', display: theta, tone: 'positive' }, { label: 'Reason', display: reason }], 'This bounded form covers polynomial f(n)=Θ(n^k). Log-factor extensions are deferred.')] };
  }
  if (s.args.length !== 1) throw new Error('complexity(f(n)) requires one expression.'); const g = growth(s.args[0]); if (!g) throw new Error('P11 complexity classification currently supports constants, polynomial powers, logarithms, their products/sums, and a^n with rational a>1.');
  let theta: string; if (g.exp) theta = `Θ(${g.text})`; else if (g.poly === 0 && g.log === 0) theta = 'Θ(1)'; else { const factors = [g.poly ? (g.poly === 1 ? 'n' : `n^${g.poly}`) : '', g.log ? (g.log === 1 ? 'log n' : `(log n)^${g.log}`) : ''].filter(Boolean); theta = `Θ(${factors.join(' ')})`; }
  return { ast: s.args[0], display: theta, exactness: 'exact', warnings: [], sections: [section('complexity', 'Asymptotic complexity', [{ label: 'Expression', display: astToPlainText(s.args[0]), ast: s.args[0] }, { label: 'Tight bound', display: theta, tone: 'positive' }, { label: 'Interpretation', display: 'Lower-order terms and positive constant factors do not change Θ-class.' }])] };
}

// ---------------------------------------------------------------------------
// Combinatorics beyond probability
// ---------------------------------------------------------------------------

const COMBINATORICS_CALLS = new Set(['multinomial', 'starsbars', 'derangements', 'stirling2', 'bell', 'pigeonhole']);
export function isCombinatoricsCall(node: AstNode): boolean { return node.type === 'call' && COMBINATORICS_CALLS.has(node.name); }
function factorial(value: bigint): bigint { let out = 1n; for (let i = 2n; i <= value; i += 1n) out *= i; return out; }
function choose(nv: bigint, kv: bigint): bigint { if (kv < 0n || kv > nv) return 0n; let k = kv > nv - kv ? nv - kv : kv; let out = 1n; for (let i = 1n; i <= k; i += 1n) out = out * (nv - k + i) / i; return out; }
function stirling2(nv: number, kv: number): bigint { const dp = Array.from({ length: kv + 1 }, () => 0n); dp[0] = 1n; for (let i = 1; i <= nv; i += 1) { for (let j = Math.min(i, kv); j >= 1; j -= 1) dp[j] = dp[j - 1] + BigInt(j) * dp[j]; dp[0] = 0n; } return dp[kv]; }
function derangement(nv: number): bigint { if (nv === 0) return 1n; let a = 1n, b = 0n; for (let i = 2; i <= nv; i += 1) { const c = BigInt(i - 1) * (a + b); a = b; b = c; } return nv === 1 ? 0n : b; }
export function evaluateCombinatorics(node: AstNode): DiscreteTransform {
  const s = simplifyAst(node); if (s.type !== 'call' || !COMBINATORICS_CALLS.has(s.name)) throw new Error('Expected a P11 combinatorics constructor.'); let value = 0n; let rule = '';
  if (s.name === 'multinomial') { if (s.args.length < 2) throw new Error('multinomial(n1,n2,...) requires at least two group sizes.'); const parts = s.args.map((arg, i) => exactInteger(arg, `Group size ${i + 1}`)); if (parts.some((x) => x < 0n) || parts.reduce((a, b) => a + b, 0n) > 500n) throw new Error('Multinomial group sizes must be nonnegative with total ≤ 500.'); const total = parts.reduce((a, b) => a + b, 0n); value = factorial(total) / parts.reduce((p, x) => p * factorial(x), 1n); rule = `${total}! / (${parts.map((x) => `${x}!`).join(' ')})`; }
  else if (s.name === 'starsbars') { if (s.args.length !== 2) throw new Error('starsbars(n,k) counts nonnegative solutions to x1+...+xk=n.'); const items = exactInteger(s.args[0], 'n'), boxes = exactInteger(s.args[1], 'k'); if (items < 0n || boxes < 1n || items + boxes > 100000n) throw new Error('starsbars requires n≥0, k≥1 and n+k≤100000.'); value = choose(items + boxes - 1n, boxes - 1n); rule = `C(${items + boxes - 1n}, ${boxes - 1n})`; }
  else if (s.name === 'derangements') { if (s.args.length !== 1) throw new Error('derangements(n) requires one integer.'); const nv = Number(exactInteger(s.args[0], 'n')); if (nv < 0 || nv > 200) throw new Error('derangements(n) is limited to 0≤n≤200.'); value = derangement(nv); rule = '!n = (n−1)(!(n−1)+!(n−2))'; }
  else if (s.name === 'stirling2') { if (s.args.length !== 2) throw new Error('stirling2(n,k) requires n and k.'); const nv = Number(exactInteger(s.args[0], 'n')), kv = Number(exactInteger(s.args[1], 'k')); if (nv < 0 || kv < 0 || kv > nv || nv > 150) throw new Error('stirling2 requires 0≤k≤n≤150.'); value = stirling2(nv, kv); rule = 'S(n,k)=S(n−1,k−1)+kS(n−1,k)'; }
  else if (s.name === 'bell') { if (s.args.length !== 1) throw new Error('bell(n) requires one integer.'); const nv = Number(exactInteger(s.args[0], 'n')); if (nv < 0 || nv > 60) throw new Error('bell(n) is limited to 0≤n≤60.'); value = Array.from({ length: nv + 1 }, (_v, k) => stirling2(nv, k)).reduce((a, b) => a + b, 0n); rule = 'B_n = Σ_k S(n,k)'; }
  else { if (s.args.length !== 2) throw new Error('pigeonhole(n,k) requires objects n and boxes k.'); const objects = exactInteger(s.args[0], 'n'), boxes = exactInteger(s.args[1], 'k'); if (objects < 0n || boxes < 1n) throw new Error('pigeonhole requires n≥0 and k≥1.'); value = (objects + boxes - 1n) / boxes; rule = `ceil(${objects}/${boxes})`; }
  const ast = n(value); return { ast, display: value.toString(), exactness: 'exact', warnings: [], sections: [section('combinatorics', 'Discrete combinatorics', [{ label: 'Result', display: value.toString(), ast, tone: 'positive' }, { label: 'Rule', display: rule }])] };
}

// ---------------------------------------------------------------------------
// Algorithm traces on numeric vectors
// ---------------------------------------------------------------------------

function vectorRationals(node: AstNode): Rational[] {
  const s = simplifyAst(node); if (s.type !== 'matrix' || s.rows.length !== 1) throw new Error('Algorithm traces require a numeric vector such as [5,2,4,1].'); if (s.rows[0].length > 100) throw new Error('P11 vector algorithm traces are limited to 100 elements.'); return s.rows[0].map((item, i) => exactRational(item, `Vector entry ${i + 1}`));
}
function vectorAst(values: Rational[]): AstNode { return { type: 'matrix', rows: [values.map(rationalAst)] }; }
export type SortAlgorithm = 'insertion' | 'selection' | 'bubble' | 'merge';
export function sortingTrace(node: AstNode, algorithm: SortAlgorithm): DiscreteTransform {
  const values = vectorRationals(node); const a = [...values]; const trace: string[] = []; let comparisons = 0; let writes = 0;
  const show = () => `[${a.map(rationalToString).join(', ')}]`;
  if (algorithm === 'insertion') for (let i = 1; i < a.length; i += 1) { const key = a[i]; let j = i - 1; while (j >= 0) { comparisons += 1; if (compareRat(a[j], key) <= 0) break; a[j + 1] = a[j]; writes += 1; j -= 1; } a[j + 1] = key; writes += 1; trace.push(`Insert position ${i + 1}: ${show()}`); }
  else if (algorithm === 'selection') for (let i = 0; i < a.length; i += 1) { let m = i; for (let j = i + 1; j < a.length; j += 1) { comparisons += 1; if (compareRat(a[j], a[m]) < 0) m = j; } if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; writes += 2; } trace.push(`Place minimum at position ${i + 1}: ${show()}`); }
  else if (algorithm === 'bubble') for (let end = a.length - 1; end > 0; end -= 1) { let swapped = false; for (let i = 0; i < end; i += 1) { comparisons += 1; if (compareRat(a[i], a[i + 1]) > 0) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; writes += 2; swapped = true; } } trace.push(`Pass to position ${end + 1}: ${show()}`); if (!swapped) break; }
  else {
    const mergeSort = (arr: Rational[], depth = 0): Rational[] => { if (arr.length <= 1) return arr; const mid = Math.floor(arr.length / 2); const left = mergeSort(arr.slice(0, mid), depth + 1), right = mergeSort(arr.slice(mid), depth + 1); const out: Rational[] = []; let i = 0, j = 0; while (i < left.length && j < right.length) { comparisons += 1; if (compareRat(left[i], right[j]) <= 0) out.push(left[i++]); else out.push(right[j++]); writes += 1; } while (i < left.length) { out.push(left[i++]); writes += 1; } while (j < right.length) { out.push(right[j++]); writes += 1; } trace.push(`Merge depth ${depth}: [${out.map(rationalToString).join(', ')}]`); return out; };
    const sorted = mergeSort(a); a.splice(0, a.length, ...sorted);
  }
  const complexity = algorithm === 'merge' ? 'Θ(n log n)' : algorithm === 'insertion' ? 'O(n²) worst, Θ(n) best' : algorithm === 'bubble' ? 'O(n²) worst, Θ(n) best with early exit' : 'Θ(n²) comparisons'; const ast = vectorAst(a);
  return { ast, display: astToPlainText(ast), exactness: 'exact', warnings: [], sections: [section('sort-result', `${algorithm[0].toUpperCase() + algorithm.slice(1)} sort`, [{ label: 'Sorted', display: astToPlainText(ast), ast }, { label: 'Comparisons', display: String(comparisons) }, { label: 'Writes/moves', display: String(writes) }, { label: 'Asymptotic bound', display: complexity }]), section('sort-trace', 'Deterministic trace', trace.map((line, i) => ({ label: `Step ${i + 1}`, display: line })))], steps: trace.map((line, i) => ({ id: `step-${i + 1}`, before: i ? trace[i - 1] : astToPlainText(node), after: line, rule: `${algorithm}-sort-step`, explanation: line, verified: true })) };
}
export function binarySearchTrace(node: AstNode, targetNode: AstNode): DiscreteTransform {
  const values = vectorRationals(node); for (let i = 1; i < values.length; i += 1) if (compareRat(values[i - 1], values[i]) > 0) throw new Error('Binary search requires the vector to be sorted in nondecreasing order.');
  const target = exactRational(targetNode, 'Target');
  let lo = 0, hi = values.length - 1, found = -1; const trace: string[] = [];
  while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); const cmp = compareRat(values[mid], target); trace.push(`Search positions ${lo + 1}…${hi + 1}; mid=${mid + 1}, value=${rationalToString(values[mid])}`); if (cmp === 0) { found = mid; break; } if (cmp < 0) lo = mid + 1; else hi = mid - 1; }
  return { ast: found >= 0 ? n(found + 1) : undefined, display: found >= 0 ? `Found at position ${found + 1}` : 'Target not found', exactness: 'exact', warnings: [], sections: [section('binary-search', 'Binary search', [{ label: 'Target', display: rationalToString(target) }, { label: 'Result', display: found >= 0 ? `Position ${found + 1}` : 'Not found', tone: found >= 0 ? 'positive' : 'warning' }, { label: 'Comparisons', display: String(trace.length) }, { label: 'Worst-case complexity', display: 'O(log n)' }]), section('binary-search-trace', 'Trace', trace.map((line, i) => ({ label: `Step ${i + 1}`, display: line })))], steps: trace.map((line, i) => ({ id: `step-${i + 1}`, before: i ? trace[i - 1] : `Search for ${rationalToString(target)}`, after: line, rule: 'binary-search-halving', explanation: line, verified: true })) };
}
export function heapProfile(node: AstNode): DiscreteTransform {
  const values = vectorRationals(node); let minHeap = true, maxHeap = true; const violations: string[] = [];
  for (let i = 0; i < values.length; i += 1) for (const child of [2 * i + 1, 2 * i + 2]) if (child < values.length) { if (compareRat(values[i], values[child]) > 0) { minHeap = false; violations.push(`min-heap: parent ${i + 1} > child ${child + 1}`); } if (compareRat(values[i], values[child]) < 0) { maxHeap = false; violations.push(`max-heap: parent ${i + 1} < child ${child + 1}`); } }
  return { display: minHeap && maxHeap ? 'Both min-heap and max-heap (all comparable parent/child values equal)' : minHeap ? 'Valid min-heap' : maxHeap ? 'Valid max-heap' : 'Not a binary min/max heap', exactness: 'exact', warnings: [], sections: [section('heap-profile', 'Binary heap profile', [{ label: 'Array representation', display: astToPlainText(vectorAst(values)), ast: vectorAst(values) }, { label: 'Min-heap?', display: minHeap ? 'Yes' : 'No' }, { label: 'Max-heap?', display: maxHeap ? 'Yes' : 'No' }, { label: 'Height', display: values.length ? String(Math.floor(Math.log2(values.length))) : '0' }, { label: 'Index convention', display: '1-based display: children of i are 2i and 2i+1 when present' }, ...(violations.length ? [{ label: 'First violation', display: violations[0], tone: 'warning' as const }] : [])])] };
}

export function graphShapeInfo(node: AstNode): { vertices: number; edges: number; directed: boolean; weighted: boolean } | null {
  try { const spec = graphSpec(node); return { vertices: spec.vertices, edges: spec.edges.length, directed: spec.directed, weighted: spec.weighted }; } catch { return null; }
}
export function relationShapeInfo(node: AstNode): { size: number } | null { try { return { size: relationSpec(node).size }; } catch { return null; } }
export function recurrenceShapeInfo(node: AstNode): { order: number } | null { try { return { order: recurrenceSpec(node).kind === 'linrec' ? 1 : 2 }; } catch { return null; } }

export function finiteSetShapeInfo(node: AstNode): { size: number } | null { try { return { size: setItems(node).length }; } catch { return null; } }
