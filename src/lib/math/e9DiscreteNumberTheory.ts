import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { add, div, isZero, mul, neg, ONE, rat, rationalToNumber, rationalToString, sub, ZERO, type Rational } from './rational';
import type { DerivationStep, Exactness, MathResultFact, MathResultSection } from './types';

export interface E9Transform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  steps: DerivationStep[];
  sections: MathResultSection[];
}

type GraphKind = 'graph' | 'digraph' | 'wgraph' | 'wdigraph';
interface GraphEdge { u: number; v: number; w: Rational }
interface GraphSpec { kind: GraphKind; vertices: number; directed: boolean; weighted: boolean; edges: GraphEdge[] }
interface RecurrenceSpec { kind: 'linrec' | 'linrec2'; args: Rational[] }

const n = (value: bigint | number | string): AstNode => ({ type: 'number', value: String(value) });
const s = (name: string): AstNode => ({ type: 'symbol', name });
const b = (operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode => ({ type: 'binary', operator, left, right });
const call = (name: string, ...args: AstNode[]): AstNode => ({ type: 'call', name, args });
const matrix = (rows: AstNode[][]): AstNode => ({ type: 'matrix', rows });
const section = (id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection => ({ id, title, facts, description });
const exactStep = (beforeAst: AstNode, afterAst: AstNode, rule: string, explanation: string, index = 1): DerivationStep => ({ id: `e9-step-${index}`, before: astToPlainText(beforeAst), after: astToPlainText(afterAst), beforeAst, afterAst, rule, explanation, verified: true });

function rationalAst(value: Rational): AstNode { return value.d === 1n ? n(value.n) : b('/', n(value.n), n(value.d)); }
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
function compareRat(a: Rational, d: Rational): number {
  const delta = a.n * d.d - d.n * a.d;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}
function normalizeMod(a: bigint, m: bigint): bigint { const r = a % m; return r < 0n ? r + m : r; }
function bigintAbs(x: bigint): bigint { return x < 0n ? -x : x; }
function gcdBig(a0: bigint, b0: bigint): bigint { let a = bigintAbs(a0), d = bigintAbs(b0); while (d) [a, d] = [d, a % d]; return a; }
function egcd(a0: bigint, b0: bigint): { g: bigint; x: bigint; y: bigint } {
  let oldR = a0, r = b0, oldS = 1n, ss = 0n, oldT = 0n, tt = 1n;
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, ss] = [ss, oldS - q * ss];
    [oldT, tt] = [tt, oldT - q * tt];
  }
  if (oldR < 0n) return { g: -oldR, x: -oldS, y: -oldT };
  return { g: oldR, x: oldS, y: oldT };
}
function substitute(node: AstNode, bindings: Record<string, AstNode>): AstNode {
  if (node.type === 'symbol') return bindings[node.name] ?? node;
  if (node.type === 'number') return node;
  if (node.type === 'unary') return { ...node, operand: substitute(node.operand, bindings) };
  if (node.type === 'binary') return { ...node, left: substitute(node.left, bindings), right: substitute(node.right, bindings) };
  if (node.type === 'call') return { ...node, args: node.args.map(arg => substitute(arg, bindings)) };
  if (node.type === 'matrix') return { ...node, rows: node.rows.map(row => row.map(cell => substitute(cell, bindings))) };
  if (node.type === 'system' || node.type === 'set') return { ...node, items: node.items.map(item => substitute(item, bindings)) };
  return { ...node, left: substitute(node.left, bindings), right: substitute(node.right, bindings) };
}
function finiteSetItems(node: AstNode): AstNode[] {
  const q = simplifyAst(node);
  if (q.type === 'call' && q.name === 'set') return q.args;
  if (q.type === 'set') return q.items;
  throw new Error('Finite quantifiers require a finite set written as set(a,b,...).');
}

// ---------------------------------------------------------------------------
// Finite-domain predicate logic
// ---------------------------------------------------------------------------

const LOGIC = new Set(['not', 'and', 'or', 'xor', 'implies', 'iff']);
function evalPredicate(node: AstNode, bindings: Record<string, AstNode>): boolean {
  const q = substitute(node, bindings);
  if (q.type === 'symbol') {
    if (q.name === 'true') return true;
    if (q.name === 'false') return false;
    throw new Error(`Unbound proposition symbol ${q.name} remains inside the finite predicate.`);
  }
  if (q.type === 'equation') return compareRat(exactRational(q.left, 'Predicate left side'), exactRational(q.right, 'Predicate right side')) === 0;
  if (q.type === 'comparison') {
    const cmp = compareRat(exactRational(q.left, 'Predicate left side'), exactRational(q.right, 'Predicate right side'));
    if (q.operator === '<') return cmp < 0;
    if (q.operator === '<=') return cmp <= 0;
    if (q.operator === '>') return cmp > 0;
    if (q.operator === '>=') return cmp >= 0;
    return cmp !== 0;
  }
  if (q.type === 'call' && LOGIC.has(q.name)) {
    if (q.name === 'not') { if (q.args.length !== 1) throw new Error('not(...) requires one predicate.'); return !evalPredicate(q.args[0], bindings); }
    if (q.name === 'and' || q.name === 'or') {
      if (q.args.length < 2) throw new Error(`${q.name}(...) requires at least two predicates.`);
      return q.name === 'and' ? q.args.every(arg => evalPredicate(arg, bindings)) : q.args.some(arg => evalPredicate(arg, bindings));
    }
    if (q.args.length !== 2) throw new Error(`${q.name}(...) requires two predicates.`);
    const a = evalPredicate(q.args[0], bindings), d = evalPredicate(q.args[1], bindings);
    return q.name === 'xor' ? a !== d : q.name === 'implies' ? !a || d : a === d;
  }
  if (q.type === 'call' && (q.name === 'forall' || q.name === 'exists')) return evalQuantifier(q, bindings).value;
  throw new Error('Finite predicates currently support exact arithmetic equations/comparisons, Boolean connectives, and nested finite quantifiers.');
}
function evalQuantifier(node: Extract<AstNode, { type: 'call' }>, outer: Record<string, AstNode> = {}): { value: boolean; variable: string; items: AstNode[]; outcomes: boolean[] } {
  if (node.args.length !== 3 || node.args[0].type !== 'symbol') throw new Error(`${node.name}(x,set(...),predicate) requires a bound-variable symbol, finite set, and predicate.`);
  const variable = node.args[0].name;
  const items = finiteSetItems(substitute(node.args[1], outer));
  if (items.length > 256) throw new Error('E9 finite quantifiers are limited to domains of at most 256 elements.');
  const outcomes = items.map(item => evalPredicate(node.args[2], { ...outer, [variable]: item }));
  const value = node.name === 'forall' ? outcomes.every(Boolean) : outcomes.some(Boolean);
  return { value, variable, items, outcomes };
}
export function finiteQuantifierProfile(node: AstNode): E9Transform {
  const q = simplifyAst(node);
  if (q.type !== 'call' || (q.name !== 'forall' && q.name !== 'exists')) throw new Error('Use forall(x,set(...),predicate) or exists(x,set(...),predicate).');
  const out = evalQuantifier(q);
  const witnessIndex = q.name === 'exists' ? out.outcomes.findIndex(Boolean) : out.outcomes.findIndex(v => !v);
  const resultAst = s(out.value ? 'true' : 'false');
  const rows = out.items.map((item, i) => ({ label: `${out.variable}=${astToPlainText(item)}`, display: out.outcomes[i] ? 'True' : 'False', tone: out.outcomes[i] ? 'positive' as const : 'negative' as const }));
  return {
    ast: resultAst,
    display: `${q.name === 'forall' ? '∀' : '∃'} ${out.variable} over ${out.items.length} values: ${out.value ? 'True' : 'False'}`,
    exactness: 'exact', warnings: [],
    steps: [exactStep(q, resultAst, 'finite-domain-quantifier', 'Evaluate the predicate exhaustively on every element of the explicitly represented finite domain.')],
    sections: [
      section('quantifier-summary', 'Finite-domain quantifier', [
        { label: 'Quantifier', display: q.name === 'forall' ? 'Universal (∀)' : 'Existential (∃)' },
        { label: 'Variable', display: out.variable },
        { label: 'Domain size', display: String(out.items.length) },
        { label: 'Result', display: out.value ? 'True' : 'False', tone: out.value ? 'positive' : 'negative' },
        ...(witnessIndex >= 0 ? [{ label: q.name === 'exists' ? 'Witness' : 'Counterexample', display: astToPlainText(out.items[witnessIndex]) }] : []),
      ]),
      section('quantifier-trace', 'Exhaustive evaluation', rows, 'Every represented domain element is checked; no sampling or SAT heuristic is used.'),
    ],
  };
}

// ---------------------------------------------------------------------------
// Recurrences and generating functions
// ---------------------------------------------------------------------------

function recurrenceSpec(node: AstNode): RecurrenceSpec {
  const q = simplifyAst(node);
  if (q.type !== 'call' || (q.name !== 'linrec' && q.name !== 'linrec2')) throw new Error('Use linrec(a0,c,d) or linrec2(a0,a1,p,q).');
  const expected = q.name === 'linrec' ? 3 : 4;
  if (q.args.length !== expected) throw new Error(q.name === 'linrec' ? 'linrec(a0,c,d) means a_n=c*a_(n-1)+d.' : 'linrec2(a0,a1,p,q) means a_n=p*a_(n-1)+q*a_(n-2).');
  return { kind: q.name, args: q.args.map((arg, i) => exactRational(arg, `Recurrence parameter ${i + 1}`)) };
}
export function recurrenceGeneratingFunction(node: AstNode): E9Transform {
  const spec = recurrenceSpec(node); const x = s('x'); let ast: AstNode;
  if (spec.kind === 'linrec') {
    const [a0, c0, d0] = spec.args;
    const numerator = b('+', b('*', rationalAst(a0), b('-', n(1), x)), b('*', rationalAst(d0), x));
    const denominator = b('*', b('-', n(1), b('*', rationalAst(c0), x)), b('-', n(1), x));
    ast = simplifyAst(b('/', numerator, denominator));
  } else {
    const [a0, a1, p, q] = spec.args;
    const numerator = b('+', rationalAst(a0), b('*', rationalAst(sub(a1, mul(p, a0))), x));
    const denominator = b('-', b('-', n(1), b('*', rationalAst(p), x)), b('*', rationalAst(q), b('^', x, n(2))));
    ast = simplifyAst(b('/', numerator, denominator));
  }
  return {
    ast, display: `A(x) = ${astToPlainText(ast)}`, exactness: 'exact', warnings: [],
    steps: [exactStep(node, ast, 'ordinary-generating-function', 'Multiply the recurrence by x^n, sum over its valid index range, and solve algebraically for A(x).')],
    sections: [section('generating-function', 'Ordinary generating function', [
      { label: 'A(x)', display: astToPlainText(ast), ast },
      { label: 'Convention', display: 'A(x)=Σ_{n≥0} a_n x^n' },
    ])],
  };
}
function squareRootAst(value: Rational): AstNode {
  if (value.n < 0n) return b('*', s('i'), call('sqrt', rationalAst({ n: -value.n, d: value.d })));
  return call('sqrt', rationalAst(value));
}
export function recurrenceClosedFormE9(node: AstNode): E9Transform {
  const spec = recurrenceSpec(node);
  if (spec.kind === 'linrec') {
    const [a0, c0, d0] = spec.args; const k = s('n'); let ast: AstNode;
    if (compareRat(c0, ONE) === 0) ast = b('+', rationalAst(a0), b('*', rationalAst(d0), k));
    else {
      const cp = b('^', rationalAst(c0), k);
      ast = simplifyAst(b('+', b('*', rationalAst(a0), cp), b('*', rationalAst(d0), b('/', b('-', cp, n(1)), rationalAst(sub(c0, ONE))))));
    }
    return { ast, display: `a_n = ${astToPlainText(ast)}`, exactness: 'exact', warnings: [], steps: [exactStep(node, ast, 'first-order-linear-recurrence', 'Solve the affine first-order recurrence by iteration/geometric summation.')], sections: [section('recurrence-closed-form', 'Exact closed form', [{ label: 'a_n', display: astToPlainText(ast), ast }])] };
  }
  const [a0, a1, p, q] = spec.args;
  const disc = add(mul(p, p), mul(rat(4), q));
  const sqrtD = squareRootAst(disc); const two = n(2);
  const r1 = simplifyAst(b('/', b('+', rationalAst(p), sqrtD), two));
  const r2 = simplifyAst(b('/', b('-', rationalAst(p), sqrtD), two));
  const k = s('n');
  if (isZero(disc)) {
    if (isZero(p)) throw new Error('The degenerate double-zero characteristic root needs finite-support/Kronecker-delta semantics that E9 does not yet represent as a single closed-form AST.');
    const root = simplifyAst(b('/', rationalAst(p), two));
    const B = simplifyAst(b('-', b('/', rationalAst(a1), root), rationalAst(a0)));
    const ast = simplifyAst(b('*', b('+', rationalAst(a0), b('*', B, k)), b('^', root, k)));
    return { ast, display: `a_n = ${astToPlainText(ast)}`, exactness: 'exact', warnings: [], steps: [exactStep(node, ast, 'repeated-characteristic-root', 'Use (A+Bn)r^n and solve A,B from a_0,a_1.')], sections: [section('recurrence-closed-form', 'Second-order closed form', [{ label: 'Repeated root', display: astToPlainText(root), ast: root }, { label: 'a_n', display: astToPlainText(ast), ast }])] };
  }
  const A = simplifyAst(b('/', b('-', rationalAst(a1), b('*', rationalAst(a0), r2)), b('-', r1, r2)));
  const B = simplifyAst(b('-', rationalAst(a0), A));
  const ast = simplifyAst(b('+', b('*', A, b('^', r1, k)), b('*', B, b('^', r2, k))));
  return {
    ast, display: `a_n = ${astToPlainText(ast)}`, exactness: 'exact', warnings: disc.n < 0n ? ['The exact characteristic-root form is complex-valued; conjugate terms combine to the real recurrence sequence.'] : [],
    steps: [exactStep(node, ast, 'characteristic-roots', 'Solve the quadratic characteristic equation exactly and determine the two coefficients from a_0 and a_1.')],
    sections: [section('recurrence-closed-form', 'Second-order closed form', [{ label: 'r1', display: astToPlainText(r1), ast: r1 }, { label: 'r2', display: astToPlainText(r2), ast: r2 }, { label: 'a_n', display: astToPlainText(ast), ast }])],
  };
}
export function extendedMasterTheorem(node: AstNode, logPower: number): E9Transform {
  const q = simplifyAst(node);
  if (q.type !== 'call' || q.name !== 'master' || q.args.length !== 3) throw new Error('Extended Master analysis expects master(a,b,k), with an additional configured log-power j for f(n)=Θ(n^k(log n)^j).');
  const a = exactInteger(q.args[0], 'a'), base = exactInteger(q.args[1], 'b'), k = exactInteger(q.args[2], 'k');
  if (a < 1n || base < 2n || k < 0n || k > 30n) throw new Error('master(a,b,k) requires a≥1, b≥2, and 0≤k≤30.');
  if (!Number.isInteger(logPower) || logPower < 0 || logPower > 20) throw new Error('Log power j must be an integer in [0,20].');
  const bk = base ** k; let result: string; let caseText: string;
  if (a < bk) { result = `Θ(n^${k}${logPower ? ` (log n)^${logPower}` : ''})`; caseText = 'Case 3: f(n) polynomially dominates n^(log_b a).'; }
  else if (a > bk) { result = `Θ(n^(log_${base} ${a}))`; caseText = 'Case 1: n^(log_b a) polynomially dominates f(n).'; }
  else { const j = logPower + 1; result = k === 0n ? `Θ((log n)^${j})` : `Θ(n^${k}${j === 1 ? ' log n' : ` (log n)^${j}`})`; caseText = 'Case 2 extension: f(n)=Θ(n^(log_b a)(log n)^j).'; }
  return { display: result, exactness: 'exact', warnings: [], steps: [], sections: [section('extended-master', 'Extended Master theorem', [{ label: 'Recurrence', display: `T(n)=${a}T(n/${base})+Θ(n^${k}(log n)^${logPower})` }, { label: 'Classification', display: caseText }, { label: 'Tight bound', display: result, tone: 'positive' }], 'This bounded extension covers nonnegative integer logarithmic powers only.')] };
}

// ---------------------------------------------------------------------------
// Graph algorithms
// ---------------------------------------------------------------------------

function graphSpec(node: AstNode): GraphSpec {
  const q = simplifyAst(node);
  if (q.type !== 'call' || !['graph', 'digraph', 'wgraph', 'wdigraph'].includes(q.name) || q.args.length !== 2) throw new Error('Use graph/digraph/wgraph/wdigraph(n, edgeMatrix).');
  const kind = q.name as GraphKind; const directed = kind === 'digraph' || kind === 'wdigraph'; const weighted = kind === 'wgraph' || kind === 'wdigraph';
  const verticesBig = exactInteger(q.args[0], 'Vertex count'); if (verticesBig < 1n || verticesBig > 100n) throw new Error('Graph vertex count must be in [1,100].');
  const vertices = Number(verticesBig); const width = weighted ? 3 : 2; const m = q.args[1];
  if (m.type !== 'matrix' || m.rows.some(row => row.length !== width) || m.rows.length > 1000) throw new Error(`${kind} requires an edge matrix with ${width} columns and at most 1000 edges.`);
  const edges: GraphEdge[] = m.rows.map(row => {
    const u = Number(exactInteger(row[0], 'Edge endpoint')), v = Number(exactInteger(row[1], 'Edge endpoint'));
    if (u < 1 || u > vertices || v < 1 || v > vertices) throw new Error(`Graph endpoints must lie in {1,…,${vertices}}.`);
    return { u, v, w: weighted ? exactRational(row[2], 'Edge weight/capacity') : ONE };
  });
  return { kind, vertices, directed, weighted, edges };
}
function directedEdges(spec: GraphSpec): GraphEdge[] { return spec.directed ? spec.edges : spec.edges.flatMap(e => e.u === e.v ? [e] : [e, { u: e.v, v: e.u, w: e.w }]); }
function pathAst(path: number[]): AstNode { return matrix([path.map(n)]); }
export function bellmanFord(node: AstNode, start: number, target: number): E9Transform {
  const spec = graphSpec(node); if (!spec.weighted) throw new Error('Bellman–Ford is exposed for weighted graphs; use wgraph or wdigraph.');
  if (![start, target].every(v => Number.isInteger(v) && v >= 1 && v <= spec.vertices)) throw new Error(`Start and target must lie in {1,…,${spec.vertices}}.`);
  const edges = directedEdges(spec); const dist: Array<Rational | null> = Array(spec.vertices + 1).fill(null); const prev = Array<number | null>(spec.vertices + 1).fill(null); dist[start] = ZERO; const trace: string[] = [];
  for (let pass = 1; pass < spec.vertices; pass += 1) {
    let changed = false; let relaxations = 0;
    for (const e of edges) if (dist[e.u]) {
      const candidate = add(dist[e.u]!, e.w);
      if (!dist[e.v] || compareRat(candidate, dist[e.v]!) < 0) { dist[e.v] = candidate; prev[e.v] = e.u; changed = true; relaxations += 1; }
    }
    trace.push(`Pass ${pass}: ${relaxations} relaxation${relaxations === 1 ? '' : 's'}`); if (!changed) break;
  }
  const cycleEdge = edges.find(e => dist[e.u] && (!dist[e.v] || compareRat(add(dist[e.u]!, e.w), dist[e.v]!) < 0));
  if (cycleEdge) throw new Error(`A negative-weight cycle reachable from ${start} was detected; shortest-path distances are not well-defined.`);
  if (!dist[target]) return { display: `No path from ${start} to ${target}`, exactness: 'exact', warnings: [], steps: [], sections: [section('bellman-ford', 'Bellman–Ford', [{ label: 'Reachable?', display: 'No' }, { label: 'Passes', display: String(trace.length) }]), section('trace', 'Relaxation trace', trace.map((line, i) => ({ label: `Pass ${i + 1}`, display: line })))] };
  const path: number[] = []; let cur: number | null = target; const guard = new Set<number>();
  while (cur !== null) { if (guard.has(cur)) throw new Error('Internal predecessor cycle encountered after Bellman–Ford certification.'); guard.add(cur); path.push(cur); if (cur === start) break; cur = prev[cur]; }
  path.reverse(); const ast = pathAst(path);
  return { ast, display: `${path.join(' → ')} · distance ${rationalToString(dist[target]!)}`, exactness: 'exact', warnings: [], steps: [], sections: [section('bellman-ford', 'Bellman–Ford shortest path', [{ label: 'Path', display: path.join(' → '), ast }, { label: 'Exact distance', display: rationalToString(dist[target]!), ast: rationalAst(dist[target]!) }, { label: 'Negative cycle reachable?', display: 'No' }]), section('trace', 'Relaxation trace', trace.map((line, i) => ({ label: `Pass ${i + 1}`, display: line })))] };
}
function minRat(a: Rational, d: Rational): Rational { return compareRat(a, d) <= 0 ? a : d; }
export function maxFlowMinCut(node: AstNode, source: number, sink: number): E9Transform {
  const spec = graphSpec(node); if (!spec.directed || !spec.weighted) throw new Error('Max-flow/min-cut requires a weighted directed graph written as wdigraph(...), with weights interpreted as capacities.');
  if (![source, sink].every(v => Number.isInteger(v) && v >= 1 && v <= spec.vertices) || source === sink) throw new Error('Source and sink must be distinct valid vertices.');
  if (spec.edges.some(e => e.w.n < 0n)) throw new Error('Flow capacities must be nonnegative.');
  const cap = Array.from({ length: spec.vertices + 1 }, () => Array.from({ length: spec.vertices + 1 }, () => ZERO));
  for (const e of spec.edges) cap[e.u][e.v] = add(cap[e.u][e.v], e.w);
  const residual = cap.map(row => row.map(x => x)); let total = ZERO; const augmentations: string[] = [];
  while (true) {
    const parent = Array(spec.vertices + 1).fill(-1); parent[source] = source; const queue = [source];
    while (queue.length && parent[sink] === -1) { const u = queue.shift()!; for (let v = 1; v <= spec.vertices; v += 1) if (parent[v] === -1 && residual[u][v].n > 0n) { parent[v] = u; queue.push(v); } }
    if (parent[sink] === -1) break;
    let bottleneck: Rational | null = null; const path = [sink];
    for (let v = sink; v !== source; v = parent[v]) { bottleneck = bottleneck ? minRat(bottleneck, residual[parent[v]][v]) : residual[parent[v]][v]; path.push(parent[v]); }
    path.reverse(); const delta = bottleneck!;
    for (let v = sink; v !== source; v = parent[v]) { const u = parent[v]; residual[u][v] = sub(residual[u][v], delta); residual[v][u] = add(residual[v][u], delta); }
    total = add(total, delta); augmentations.push(`${path.join(' → ')} : +${rationalToString(delta)}`);
    if (augmentations.length > 2000) throw new Error('E9 max-flow augmentation limit exceeded.');
  }
  const reachable = new Set<number>([source]); const q = [source]; while (q.length) { const u = q.shift()!; for (let v = 1; v <= spec.vertices; v += 1) if (!reachable.has(v) && residual[u][v].n > 0n) { reachable.add(v); q.push(v); } }
  const cutEdges = spec.edges.filter(e => reachable.has(e.u) && !reachable.has(e.v)); const cutCapacity = cutEdges.reduce((sum, e) => add(sum, e.w), ZERO);
  const cutAst = matrix(cutEdges.map(e => [n(e.u), n(e.v), rationalAst(e.w)]));
  return { ast: rationalAst(total), display: `max flow = min cut = ${rationalToString(total)}`, exactness: 'exact', warnings: [], steps: [], sections: [section('max-flow', 'Maximum flow', [{ label: 'Value', display: rationalToString(total), ast: rationalAst(total) }, { label: 'Augmentations', display: String(augmentations.length) }]), section('min-cut', 'Minimum cut certificate', [{ label: 'Source side', display: `{${[...reachable].sort((a,d)=>a-d).join(', ')}}` }, { label: 'Cut edges', display: astToPlainText(cutAst), ast: cutAst }, { label: 'Cut capacity', display: rationalToString(cutCapacity), ast: rationalAst(cutCapacity) }], compareRat(total, cutCapacity) === 0 ? 'The exact flow value equals the capacity of the residual-reachability cut.' : 'Internal mismatch: flow/cut equality was not certified.'), section('augmentations', 'Edmonds–Karp trace', augmentations.map((line, i) => ({ label: `Augment ${i + 1}`, display: line })))] };
}
export function bipartiteMatching(node: AstNode): E9Transform {
  const spec = graphSpec(node); if (spec.directed || spec.weighted) throw new Error('E9 bipartite matching currently expects an unweighted undirected graph(...).');
  const adj = Array.from({ length: spec.vertices + 1 }, () => [] as number[]); spec.edges.forEach(e => { adj[e.u].push(e.v); if (e.u !== e.v) adj[e.v].push(e.u); });
  const color = Array(spec.vertices + 1).fill(-1);
  for (let start = 1; start <= spec.vertices; start += 1) if (color[start] === -1) { color[start] = 0; const queue = [start]; while (queue.length) { const u = queue.shift()!; for (const v of adj[u]) { if (color[v] === -1) { color[v] = 1 - color[u]; queue.push(v); } else if (color[v] === color[u]) throw new Error('Graph is not bipartite, so a bipartite matching workflow is not applicable.'); } } }
  const left = Array.from({ length: spec.vertices }, (_v, i) => i + 1).filter(v => color[v] === 0); const matchR = Array(spec.vertices + 1).fill(0); const trace: string[] = [];
  const augment = (u: number, seen: boolean[]): boolean => { for (const v of [...adj[u]].sort((a,d)=>a-d)) { if (seen[v]) continue; seen[v] = true; if (matchR[v] === 0 || augment(matchR[v], seen)) { matchR[v] = u; return true; } } return false; };
  let size = 0; for (const u of left) { const ok = augment(u, Array(spec.vertices + 1).fill(false)); if (ok) size += 1; trace.push(`Left vertex ${u}: ${ok ? 'augmenting path found' : 'no augmentation'}`); }
  const pairs = matchR.map((u, v) => ({ u, v })).filter(p => p.u !== 0).map(p => [p.u, p.v] as [number, number]); const ast = matrix(pairs.map(([u,v]) => [n(u), n(v)]));
  return { ast, display: `maximum matching size ${size}`, exactness: 'exact', warnings: [], steps: [], sections: [section('matching', 'Maximum bipartite matching', [{ label: 'Cardinality', display: String(size), ast: n(size) }, { label: 'Matched pairs', display: astToPlainText(ast), ast }]), section('matching-trace', 'Deterministic augmenting-path trace', trace.map((line,i)=>({label:`Step ${i+1}`,display:line})))] };
}

// ---------------------------------------------------------------------------
// Dynamic programming traces
// ---------------------------------------------------------------------------

function vectorValues(node: AstNode): Rational[] {
  const q = simplifyAst(node); if (q.type !== 'matrix' || q.rows.length !== 1) throw new Error('Expected a resolved vector [a1,a2,...].');
  if (q.rows[0].length < 1 || q.rows[0].length > 256) throw new Error('E9 vector dynamic programming is limited to 1–256 entries.');
  return q.rows[0].map((x,i)=>exactRational(x,`Vector entry ${i+1}`));
}
export function longestIncreasingSubsequence(node: AstNode): E9Transform {
  const values = vectorValues(node); const len = Array(values.length).fill(1); const prev = Array(values.length).fill(-1); const trace: string[] = [];
  for (let i = 0; i < values.length; i += 1) { for (let j = 0; j < i; j += 1) if (compareRat(values[j], values[i]) < 0 && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; } trace.push(`i=${i}: L=${len[i]}, predecessor=${prev[i] < 0 ? 'none' : prev[i]}`); }
  let end = 0; for (let i = 1; i < len.length; i += 1) if (len[i] > len[end]) end = i; const indices: number[] = []; for (let i = end; i >= 0; i = prev[i]) { indices.push(i); if (prev[i] < 0) break; } indices.reverse(); const seq = indices.map(i => values[i]); const ast = matrix([seq.map(rationalAst)]);
  return { ast, display: `LIS length ${seq.length}: ${seq.map(rationalToString).join(', ')}`, exactness: 'exact', warnings: [], steps: [], sections: [section('lis', 'Longest increasing subsequence', [{ label: 'Length', display: String(seq.length), ast: n(seq.length) }, { label: 'One optimal subsequence', display: astToPlainText(ast), ast }, { label: 'Indices (0-based)', display: indices.join(', ') }]), section('lis-trace','DP trace',trace.map((line,i)=>({label:`State ${i}`,display:line})), 'This O(n²) dynamic program uses strict increasing order and deterministic earliest predecessors.')] };
}
export function knapsackTrace(node: AstNode, capacity: number): E9Transform {
  const q = simplifyAst(node); if (q.type !== 'matrix' || q.rows.some(row => row.length !== 2) || q.rows.length < 1 || q.rows.length > 100) throw new Error('0/1 knapsack expects an n×2 matrix [[weight,value],...] with 1–100 items.');
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 500) throw new Error('Knapsack capacity must be an integer in [0,500].');
  const items = q.rows.map((row,i)=>{ const w=Number(exactInteger(row[0],`Weight ${i+1}`)); if(w<=0||w>capacity&&capacity>0) { if(w<=0) throw new Error('Knapsack item weights must be positive integers.'); } return { w, v: exactRational(row[1],`Value ${i+1}`) }; });
  const dp: Rational[][] = Array.from({length:items.length+1},()=>Array.from({length:capacity+1},()=>ZERO)); const take:boolean[][]=Array.from({length:items.length+1},()=>Array(capacity+1).fill(false));
  for(let i=1;i<=items.length;i++){const item=items[i-1];for(let c0=0;c0<=capacity;c0++){dp[i][c0]=dp[i-1][c0];if(item.w<=c0){const candidate=add(dp[i-1][c0-item.w],item.v);if(compareRat(candidate,dp[i][c0])>0){dp[i][c0]=candidate;take[i][c0]=true;}}}}
  const chosen:number[]=[];let c0=capacity;for(let i=items.length;i>=1;i--)if(take[i][c0]){chosen.push(i);c0-=items[i-1].w;}chosen.reverse(); const ast=matrix([chosen.map(n)]);
  const rowFacts = dp.slice(1).map((row,i)=>({label:`After item ${i+1}`,display:`best at capacity ${capacity}: ${rationalToString(row[capacity])}`}));
  return { ast, display:`optimal value ${rationalToString(dp[items.length][capacity])}`,exactness:'exact',warnings:[],steps:[],sections:[section('knapsack','0/1 knapsack optimum',[{label:'Capacity',display:String(capacity)},{label:'Optimal value',display:rationalToString(dp[items.length][capacity]),ast:rationalAst(dp[items.length][capacity])},{label:'Chosen item indices (1-based)',display:chosen.join(', ')||'None',ast}]),section('knapsack-trace','DP row trace',rowFacts,'The full integer-capacity dynamic program is evaluated exactly; ties keep the earlier solution deterministically.')]};
}

// ---------------------------------------------------------------------------
// Number theory
// ---------------------------------------------------------------------------

function factorInteger(value: bigint): Array<[bigint,bigint]> {
  let x=bigintAbs(value); if(x===0n) throw new Error('Prime factorization is undefined for 0.'); if(x>1_000_000_000_000n) throw new Error('E9 bounded trial factorization is limited to |n|≤10^12.');
  const out:Array<[bigint,bigint]>=[]; const take=(p:bigint)=>{let e=0n;while(x%p===0n){x/=p;e+=1n;}if(e)out.push([p,e]);}; take(2n); for(let p=3n;p*p<=x;p+=2n)take(p); if(x>1n)out.push([x,1n]); return out;
}
function factorText(value:bigint,factors:Array<[bigint,bigint]>):string{if(value===1n)return'1';if(value===-1n)return'-1';return `${value<0n?'-1 · ':''}${factors.map(([p,e])=>e===1n?String(p):`${p}^${e}`).join(' · ')}`;}
function factorAst(value:bigint,factors:Array<[bigint,bigint]>):AstNode{let terms:AstNode[]=[];if(value<0n)terms.push(n(-1));terms.push(...factors.map(([p,e])=>e===1n?n(p):b('^',n(p),n(e))));if(!terms.length)return n(1);return terms.reduce((a,d)=>b('*',a,d));}
export function numberTheoryProfile(node:AstNode):E9Transform{
  const value=exactInteger(node,'n'); if(value===0n)throw new Error('Number-theory factor/arithmetic-function profile requires n≠0.'); const factors=factorInteger(value); const abs=bigintAbs(value); const prime=value>1n&&factors.length===1&&factors[0][1]===1n;
  let phi=abs,tau=1n,sigma=1n,mu=1n; for(const[p,e]of factors){phi=phi/p*(p-1n);tau*=e+1n;let geom=1n,term=1n;for(let i=0n;i<e;i++){term*=p;geom+=term;}sigma*=geom;if(e>1n)mu=0n;else if(mu!==0n)mu=-mu;}
  const ast=factorAst(value,factors); return{ast,display:factorText(value,factors),exactness:'exact',warnings:[],steps:[exactStep(node,ast,'bounded-prime-factorization','Factor |n| exactly by deterministic trial division inside the certified E9 bound.')],sections:[section('factorization','Integer factorization',[{label:'n',display:String(value)},{label:'Prime factorization',display:factorText(value,factors),ast},{label:'Prime?',display:prime?'Yes':'No'}]),section('arithmetic-functions','Arithmetic functions',[{label:'Euler φ(|n|)',display:String(phi),ast:n(phi)},{label:'τ(|n|) divisors',display:String(tau),ast:n(tau)},{label:'σ(|n|) divisor sum',display:String(sigma),ast:n(sigma)},{label:'μ(|n|)',display:String(mu),ast:n(mu)}]) ]};
}
export function extendedGcd(node:AstNode,other:bigint):E9Transform{const a=exactInteger(node,'a');const out=egcd(a,other);const ast=matrix([[n(out.g),n(out.x),n(out.y)]]);return{ast,display:`gcd=${out.g}; ${a}·(${out.x}) + ${other}·(${out.y}) = ${out.g}`,exactness:'exact',warnings:[],steps:[],sections:[section('egcd','Extended Euclidean algorithm',[{label:'gcd(a,b)',display:String(out.g),ast:n(out.g)},{label:'Bézout x',display:String(out.x),ast:n(out.x)},{label:'Bézout y',display:String(out.y),ast:n(out.y)},{label:'Certificate',display:`${a}(${out.x}) + ${other}(${out.y}) = ${out.g}`}]) ]};}
export function modularInverse(node:AstNode,modulus:bigint):E9Transform{const a=exactInteger(node,'a');if(modulus<=1n)throw new Error('Modulus must be an integer >1.');const out=egcd(a,modulus);if(out.g!==1n)throw new Error(`No modular inverse exists because gcd(${a},${modulus})=${out.g}≠1.`);const inv=normalizeMod(out.x,modulus);return{ast:n(inv),display:`${a}^(-1) mod ${modulus} = ${inv}`,exactness:'exact',warnings:[],steps:[],sections:[section('mod-inverse','Modular inverse',[{label:'Inverse',display:String(inv),ast:n(inv)},{label:'Verification',display:`${a}·${inv} ≡ 1 (mod ${modulus})`}]) ]};}
export function solveLinearCongruence(node:AstNode,rhs:bigint,modulus:bigint):E9Transform{const a=exactInteger(node,'a');if(modulus<=0n)throw new Error('Congruence modulus m must be positive.');const g=gcdBig(a,modulus);if(rhs%g!==0n)throw new Error(`No solution: gcd(a,m)=${g} does not divide b=${rhs}.`);const aa=a/g,bb=rhs/g,mm=modulus/g;const inv=normalizeMod(egcd(aa,mm).x,mm);const x0=normalizeMod(inv*bb,mm);const solutions=Array.from({length:Number(g)},(_v,k)=>normalizeMod(x0+BigInt(k)*mm,modulus)).sort((x,y)=>x<y?-1:x>y?1:0);const ast=matrix([solutions.map(n)]);return{ast,display:`x ≡ ${solutions.join(', ')} (mod ${modulus})`,exactness:'exact',warnings:[],steps:[],sections:[section('linear-congruence','Linear congruence',[{label:'Equation',display:`${a}x ≡ ${rhs} (mod ${modulus})`},{label:'gcd(a,m)',display:String(g)},{label:'Solution classes',display:solutions.join(', '),ast}]) ]};}
export function chineseRemainder(node:AstNode):E9Transform{const q=simplifyAst(node);if(q.type!=='matrix'||q.rows.length<1||q.rows.length>20||q.rows.some(r=>r.length!==2))throw new Error('CRT expects a matrix [[residue,modulus],...] with 1–20 congruences.');const pairs=q.rows.map((r,i)=>{const a=exactInteger(r[0],`Residue ${i+1}`),m=exactInteger(r[1],`Modulus ${i+1}`);if(m<=1n)throw new Error('CRT moduli must be >1.');return{a:normalizeMod(a,m),m};});let a=pairs[0].a,m=pairs[0].m;const trace:string[]=[];for(let i=1;i<pairs.length;i++){const p=pairs[i],g=gcdBig(m,p.m),diff=p.a-a;if(diff%g!==0n)throw new Error(`CRT system is inconsistent at congruence ${i+1}.`);const m1=m/g,n1=p.m/g;const inv=normalizeMod(egcd(m1,n1).x,n1);const t=normalizeMod((diff/g)*inv,n1);a=normalizeMod(a+m*t,m*n1);m=m*n1;trace.push(`Merge ${i+1}: x ≡ ${a} (mod ${m})`);}const ast=matrix([[n(a),n(m)]]);return{ast,display:`x ≡ ${a} (mod ${m})`,exactness:'exact',warnings:[],steps:[],sections:[section('crt','Chinese remainder theorem',[{label:'Canonical solution',display:String(a),ast:n(a)},{label:'Combined modulus',display:String(m),ast:n(m)},{label:'Solution',display:`x ≡ ${a} (mod ${m})`}]),section('crt-trace','Congruence merge trace',trace.map((line,i)=>({label:`Merge ${i+1}`,display:line})), 'The generalized CRT path also supports compatible non-coprime moduli.')]};}
export function linearDiophantine(node:AstNode,bCoef:bigint,cValue:bigint):E9Transform{const a=exactInteger(node,'a');const out=egcd(a,bCoef);if(cValue%out.g!==0n)throw new Error(`No integer solution because gcd(${a},${bCoef})=${out.g} does not divide ${cValue}.`);const scale=cValue/out.g,x0=out.x*scale,y0=out.y*scale,dx=bCoef/out.g,dy=-(a/out.g);const ast=matrix([[n(x0),n(y0),n(dx),n(dy)]]);return{ast,display:`x=${x0}+(${dx})t, y=${y0}+(${dy})t`,exactness:'exact',warnings:[],steps:[],sections:[section('diophantine','Linear Diophantine equation',[{label:'Equation',display:`${a}x + ${bCoef}y = ${cValue}`},{label:'One solution',display:`(x0,y0)=(${x0},${y0})`},{label:'All solutions',display:`x=${x0}+(${dx})t, y=${y0}+(${dy})t, t∈Z`},{label:'gcd(a,b)',display:String(out.g)}]) ]};}
