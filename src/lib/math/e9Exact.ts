import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { ONE, type Rational } from './rational';
import type { DerivationStep, MathResultFact, MathResultSection } from './types';

export type GraphKind = 'graph' | 'digraph' | 'wgraph' | 'wdigraph';
export interface GraphEdge { u: number; v: number; w: Rational }
export interface GraphSpec { kind: GraphKind; vertices: number; directed: boolean; weighted: boolean; edges: GraphEdge[] }
export interface RecurrenceSpec { kind: 'linrec' | 'linrec2'; args: Rational[] }

export const n = (value: bigint | number | string): AstNode => ({ type: 'number', value: String(value) });
export const s = (name: string): AstNode => ({ type: 'symbol', name });
export const b = (operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode => ({ type: 'binary', operator, left, right });
export const call = (name: string, ...args: AstNode[]): AstNode => ({ type: 'call', name, args });
export const matrix = (rows: AstNode[][]): AstNode => ({ type: 'matrix', rows });
export const section = (id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection => ({ id, title, facts, description });
export const exactStep = (beforeAst: AstNode, afterAst: AstNode, rule: string, explanation: string, index = 1): DerivationStep => ({ id: `e9-step-${index}`, before: astToPlainText(beforeAst), after: astToPlainText(afterAst), beforeAst, afterAst, rule, explanation, verified: true });

export function rationalAst(value: Rational): AstNode { return value.d === 1n ? n(value.n) : b('/', n(value.n), n(value.d)); }
export function exactRational(node: AstNode, label = 'value'): Rational {
  const value = rationalValue(simplifyAst(node));
  if (!value) throw new Error(`${label} must resolve to an exact rational value.`);
  return value;
}
export function exactInteger(node: AstNode, label = 'value'): bigint {
  const value = exactRational(node, label);
  if (value.d !== 1n) throw new Error(`${label} must be an integer.`);
  return value.n;
}
export function compareRat(a: Rational, d: Rational): number {
  const delta = a.n * d.d - d.n * a.d;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}
export function normalizeMod(a: bigint, m: bigint): bigint { const r = a % m; return r < 0n ? r + m : r; }
export function bigintAbs(x: bigint): bigint { return x < 0n ? -x : x; }
export function gcdBig(a0: bigint, b0: bigint): bigint { let a = bigintAbs(a0), d = bigintAbs(b0); while (d) [a, d] = [d, a % d]; return a; }
export function egcd(a0: bigint, b0: bigint): { g: bigint; x: bigint; y: bigint } {
  let oldR = a0, r = b0, oldS = 1n, ss = 0n, oldT = 0n, tt = 1n;
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, ss] = [ss, oldS - q * ss];
    [oldT, tt] = [tt, oldT - q * tt];
  }
  return oldR < 0n ? { g: -oldR, x: -oldS, y: -oldT } : { g: oldR, x: oldS, y: oldT };
}
export function minRat(a: Rational, d: Rational): Rational { return compareRat(a, d) <= 0 ? a : d; }

export function recurrenceSpec(node: AstNode): RecurrenceSpec {
  const q = simplifyAst(node);
  if (q.type !== 'call' || (q.name !== 'linrec' && q.name !== 'linrec2')) throw new Error('Use linrec(a0,c,d) or linrec2(a0,a1,p,q).');
  const expected = q.name === 'linrec' ? 3 : 4;
  if (q.args.length !== expected) throw new Error(q.name === 'linrec' ? 'linrec(a0,c,d) means a_n=c*a_(n-1)+d.' : 'linrec2(a0,a1,p,q) means a_n=p*a_(n-1)+q*a_(n-2).');
  return { kind: q.name, args: q.args.map((arg, i) => exactRational(arg, `Recurrence parameter ${i + 1}`)) };
}

export function graphSpec(node: AstNode): GraphSpec {
  const q = simplifyAst(node);
  if (q.type !== 'call' || !['graph', 'digraph', 'wgraph', 'wdigraph'].includes(q.name) || q.args.length !== 2) throw new Error('Use graph/digraph/wgraph/wdigraph(n, edgeMatrix).');
  const kind = q.name as GraphKind;
  const directed = kind === 'digraph' || kind === 'wdigraph';
  const weighted = kind === 'wgraph' || kind === 'wdigraph';
  const verticesBig = exactInteger(q.args[0], 'Vertex count');
  if (verticesBig < 1n || verticesBig > 100n) throw new Error('Graph vertex count must be in [1,100].');
  const vertices = Number(verticesBig), width = weighted ? 3 : 2, m = q.args[1];
  if (m.type !== 'matrix' || m.rows.some(row => row.length !== width) || m.rows.length > 1000) throw new Error(`${kind} requires an edge matrix with ${width} columns and at most 1000 edges.`);
  const edges: GraphEdge[] = m.rows.map(row => {
    const u = Number(exactInteger(row[0], 'Edge endpoint')), v = Number(exactInteger(row[1], 'Edge endpoint'));
    if (u < 1 || u > vertices || v < 1 || v > vertices) throw new Error(`Graph endpoints must lie in {1,…,${vertices}}.`);
    return { u, v, w: weighted ? exactRational(row[2], 'Edge weight/capacity') : ONE };
  });
  return { kind, vertices, directed, weighted, edges };
}
export function directedEdges(spec: GraphSpec): GraphEdge[] { return spec.directed ? spec.edges : spec.edges.flatMap(e => e.u === e.v ? [e] : [e, { u: e.v, v: e.u, w: e.w }]); }
