import { describe, expect, it } from 'vitest';
import { astToPlainText } from '../src/lib/math/format';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new LocalMathEngine();

async function run(input: string, operation: string, options?: Record<string, string | number | boolean>, bindings?: Array<{ name: string; ast: NonNullable<ReturnType<typeof parseMath>['ast']> }>) {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
  const result = await engine.execute({ id: `${operation}:${input}`, operation, input, ast: parsed.ast ?? undefined, options, bindings });
  return { result, text: result.resultAst ? astToPlainText(result.resultAst) : result.display };
}

describe('P7 exact linear algebra foundation', () => {
  it('classifies matrix expressions using saved matrix dimensions', () => {
    const A = resolveSemanticObject(parseMath('A = [[1,2],[3,4]]')).object!;
    const B = resolveSemanticObject(parseMath('B = [[2,0],[1,2]]'), [A]).object!;
    const product = resolveSemanticObject(parseMath('A*B'), [A, B]).object!;
    expect(product.kind).toBe('matrix');
    expect(product.shape).toEqual({ type: 'matrix', rows: 2, columns: 2 });
  });

  it('evaluates matrix arithmetic through workspace bindings', async () => {
    const A = parseMath('[[1,2],[3,4]]').ast!;
    const B = parseMath('[[2,0],[1,2]]').ast!;
    expect((await run('A*B', 'evaluate-linear-algebra', undefined, [{ name: 'A', ast: A }, { name: 'B', ast: B }])).text).toBe('[[4, 4], [10, 8]]');
  });

  it('supports exact vector norm and dot product', async () => {
    expect((await run('[3,4]', 'norm')).text).toBe('5');
    expect((await run('[1,2,3]', 'dot-product', { other: '[4,5,6]' })).text).toBe('32');
  });

  it('computes exact RREF and rank', async () => {
    expect((await run('[[1,2,3],[2,4,6]]', 'rref')).text).toBe('[[1, 2, 3], [0, 0, 0]]');
    expect((await run('[[1,2,3],[2,4,6]]', 'rank')).text).toBe('1');
  });

  it('computes determinants and inverses over rationals', async () => {
    expect((await run('[[1,2],[3,4]]', 'det')).text).toBe('-2');
    expect((await run('[[1,2],[3,4]]', 'inverse')).text).toBe('[[-2, 1], [3 / 2, -(1 / 2)]]');
  });

  it('rejects singular inverse requests', async () => {
    await expect(run('[[1,2],[2,4]]', 'inverse')).rejects.toThrow('singular');
  });

  it('solves unique augmented systems exactly', async () => {
    expect((await run('[[1,1,3],[1,-1,1]]', 'solve-augmented')).text).toBe('x_1 = 2; x_2 = 1');
  });

  it('distinguishes underdetermined and inconsistent augmented systems', async () => {
    const under = await run('[[1,1,2],[2,2,4]]', 'solve-augmented');
    expect(under.result.sections?.[0].facts[0].display).toContain('Underdetermined');
    const inconsistent = await run('[[1,1,2],[1,1,3]]', 'solve-augmented');
    expect(inconsistent.result.warnings[0]).toContain('inconsistent');
  });

  it('derives exact column-space, row-space, and null-space bases', async () => {
    expect((await run('[[1,2],[2,4]]', 'column-space')).text).toBe('{[1, 2]}');
    expect((await run('[[1,2],[2,4]]', 'row-space')).text).toBe('{[1, 2]}');
    expect((await run('[[1,2],[2,4]]', 'null-space')).text).toBe('{[-2, 1]}');
  });

  it('reports rank-nullity in the linear profile', async () => {
    const profile = await run('[[1,2,3],[2,4,6]]', 'linear-profile');
    const dimensions = profile.result.sections?.find((section) => section.id === 'dimensions');
    expect(dimensions?.facts.find((fact) => fact.label === 'Rank–nullity')?.display).toBe('1 + 2 = 3');
  });

  it('supports exact negative matrix powers through inversion', async () => {
    expect((await run('[[1,0],[0,2]]^-1', 'evaluate-linear-algebra')).text).toBe('[[1, 0], [0, 1 / 2]]');
  });

  it('rejects incompatible matrix products', async () => {
    await expect(run('[[1,2,3],[4,5,6]]*[[1,2],[3,4]]', 'evaluate-linear-algebra')).rejects.toThrow('cannot multiply');
  });
});
