import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new LocalMathEngine();
async function run(input: string, operation: string, options: Record<string, string | number | boolean> = {}) {
  const parsed = parseMath(input);
  if (!parsed.ast) throw new Error('Expected parsed AST.');
  return engine.execute({ id: `p11-${operation}`, operation, input, ast: parsed.ast, options });
}

describe('P11 discrete mathematics and algorithms', () => {
  it('creates first-class P11 semantic objects and capabilities', () => {
    const proposition = resolveSemanticObject(parseMath('P := implies(and(p,q),p)'), [], []).object!;
    const graph = resolveSemanticObject(parseMath('G := graph(3, [[1,2],[2,3]])'), [], []).object!;
    const recurrence = resolveSemanticObject(parseMath('R := linrec2(0,1,1,1)'), [], []).object!;
    expect(proposition.kind).toBe('proposition');
    expect(proposition.domain).toBe('boolean');
    expect(graph.kind).toBe('graph');
    expect(recurrence.kind).toBe('recurrence');
    expect(capabilitiesFor(graph).some((item) => item.id === 'graph-bfs' && item.available)).toBe(true);
  });

  it('builds exhaustive truth tables and canonical normal forms', async () => {
    expect((await run('implies(and(p,q),p)', 'logic-profile')).display).toContain('Tautology');
    const xor = await run('xor(p,q)', 'logic-normal-forms');
    expect(xor.sections?.[0].facts.some((fact) => fact.label === 'DNF')).toBe(true);
  });

  it('normalizes finite sets and performs exact set algebra', async () => {
    expect((await run('set(1,2,2,3)', 'set-profile')).display).toBe('{1, 2, 3}');
    expect((await run('set(1,2,3)', 'set-union', { other: 'set(3,4)' })).display).toBe('{1, 2, 3, 4}');
    expect((await run('set(1,2)', 'subset-check', { other: 'set(1,2,3)' })).display).toContain('A ⊆ B');
    expect((await run('set(1,2,3)', 'power-set')).display).toContain('{1, 2, 3}');
  });

  it('classifies relations, equivalence classes, and partial orders', async () => {
    const equivalence = 'relation(3, [[1,1],[1,2],[2,1],[2,2],[3,3]])';
    expect((await run(equivalence, 'relation-profile')).display).toBe('Equivalence relation');
    expect((await run(equivalence, 'equivalence-classes')).display).toBe('{{1, 2}, {3}}');
    const order = 'relation(3, [[1,1],[1,2],[1,3],[2,2],[2,3],[3,3]])';
    expect((await run(order, 'hasse-profile')).display).toContain('2 edges');
  });

  it('runs deterministic graph analysis and algorithms', async () => {
    const tree = await run('graph(4, [[1,2],[2,3],[3,4]])', 'graph-profile');
    expect(tree.sections?.[0].facts.some((fact) => fact.label === 'Tree?' && fact.display === 'Yes')).toBe(true);
    expect((await run('graph(5, [[1,2],[1,3],[2,4],[3,5]])', 'graph-bfs', { start: 1 })).display).toContain('1 → 2 → 3 → 4 → 5');
    expect((await run('wgraph(4, [[1,2,3],[1,3,1],[3,2,1],[2,4,2],[3,4,10]])', 'shortest-path', { start: 1, target: 4 })).display).toBe('1 → 3 → 2 → 4 · distance 4');
    expect((await run('digraph(4, [[1,2],[1,3],[2,4],[3,4]])', 'topological-sort')).display).toBe('1 → 2 → 3 → 4');
    expect((await run('wgraph(4, [[1,2,1],[2,3,2],[3,4,1],[1,4,10],[1,3,4]])', 'minimum-spanning-tree')).display).toBe('MST weight 4');
  });

  it('generates exact recurrence terms and bounded closed forms', async () => {
    expect((await run('linrec(1,2,1)', 'recurrence-terms', { count: 5 })).display).toBe('[1, 3, 7, 15, 31]');
    expect((await run('linrec2(0,1,1,1)', 'recurrence-terms', { count: 8 })).display).toBe('[0, 1, 1, 2, 3, 5, 8, 13]');
    expect((await run('linrec(1,2,1)', 'recurrence-closed-form')).display).toContain('a_n =');
  });

  it('classifies common asymptotic forms and Master-theorem recurrences', async () => {
    expect((await run('complexity(n^2+3*n+1)', 'complexity-profile')).display).toBe('Θ(n^2)');
    expect((await run('complexity(n*log(n))', 'complexity-profile')).display).toBe('Θ(n log n)');
    expect((await run('master(2,2,1)', 'complexity-profile')).display).toBe('Θ(n log n)');
  });

  it('evaluates non-probability combinatorics exactly', async () => {
    expect((await run('derangements(4)', 'evaluate-combinatorics')).display).toBe('9');
    expect((await run('stirling2(5,2)', 'evaluate-combinatorics')).display).toBe('15');
    expect((await run('bell(4)', 'evaluate-combinatorics')).display).toBe('15');
    expect((await run('starsbars(5,3)', 'evaluate-combinatorics')).display).toBe('21');
    expect((await run('pigeonhole(10,3)', 'evaluate-combinatorics')).display).toBe('4');
  });

  it('traces array algorithms and heap structure without floating point', async () => {
    expect((await run('[5,2,4,1]', 'sorting-trace', { algorithm: 'merge' })).display).toBe('[1, 2, 4, 5]');
    expect((await run('[1,2,4,5,9]', 'binary-search', { target: '5' })).display).toBe('Found at position 4');
    expect((await run('[1,3,2,7,6,4]', 'heap-profile')).display).toBe('Valid min-heap');
  });
});
