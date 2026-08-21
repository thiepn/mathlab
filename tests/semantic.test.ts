import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { parseAssumption } from '../src/lib/math/assumptions';
import { recomputeSemanticObjects, resolveSemanticObject, upsertSemanticObject } from '../src/lib/math/semantic';

describe('P2 semantic object resolution', () => {
  it('distinguishes explicit scalar definitions from equations', () => {
    const definition = resolveSemanticObject(parseMath('a := 2'));
    expect(definition.isDefinition).toBe(true);
    expect(definition.object?.name).toBe('a');
    expect(definition.object?.kind).toBe('scalar');
    expect(definition.object?.domain).toBe('natural');

    const equation = resolveSemanticObject(parseMath('x = 2'));
    expect(equation.isDefinition).toBe(false);
    expect(equation.object?.kind).toBe('equation');
  });

  it('recognizes natural function definitions and their parameters', () => {
    const resolved = resolveSemanticObject(parseMath('f(x) = x^3 - 3x'));
    expect(resolved.object?.kind).toBe('function');
    expect(resolved.object?.parameters).toEqual(['x']);
    expect(resolved.object?.variables).toEqual([]);
    expect(resolved.object?.domain).toBe('real');
  });

  it('infers matrix shape and real ambient domain', () => {
    const resolved = resolveSemanticObject(parseMath('A = [[1,2],[3,4]]'));
    expect(resolved.object?.shape).toEqual({ type:'matrix', rows:2, columns:2 });
    expect(resolved.object?.domain).toBe('real');
  });

  it('resolves dependencies and preserves alias shape', () => {
    const matrix = resolveSemanticObject(parseMath('A = [[1,2],[3,4]]')).object!;
    const alias = resolveSemanticObject(parseMath('B := A'), [matrix]).object!;
    expect(alias.dependencies).toEqual(['A']);
    expect(alias.kind).toBe('matrix');
    expect(alias.shape).toEqual(matrix.shape);
  });

  it('recognizes sequence definitions', () => {
    const assumption = parseAssumption('n integer').assumption!;
    const sequence = resolveSemanticObject(parseMath('a_n := 1/n'), [], [assumption]).object!;
    expect(sequence.kind).toBe('sequence');
    expect(sequence.shape).toEqual({ type:'sequence', index:'n' });
    expect(sequence.assumptions.map((item) => item.label)).toContain('n ∈ ℤ');
  });

  it('rejects recursive definitions', () => {
    const resolved = resolveSemanticObject(parseMath('a := a + 1'));
    expect(resolved.diagnostics.some((item) => item.code === 'recursive-definition')).toBe(true);
  });

  it('propagates assumptions through dependent objects', () => {
    const matrix = resolveSemanticObject(parseMath('A = [[1,2],[3,4]]')).object!;
    const alias = resolveSemanticObject(parseMath('B := A'), [matrix]).object!;
    let objects = upsertSemanticObject([], matrix);
    objects = upsertSemanticObject(objects, alias);
    const assumption = parseAssumption('A in C').assumption!;
    objects = recomputeSemanticObjects(objects, [assumption]);
    expect(objects.find((item) => item.name === 'A')?.domain).toBe('complex');
    expect(objects.find((item) => item.name === 'B')?.domain).toBe('complex');
  });
});

describe('P2 capability applicability', () => {
  it('marks square-only matrix operations inapplicable for rectangular matrices', async () => {
    const { capabilitiesFor } = await import('../src/lib/math/capabilities');
    const matrix = resolveSemanticObject(parseMath('A = [[1,2,3],[4,5,6]]')).object!;
    const actions = capabilitiesFor(matrix);
    expect(actions.find((item) => item.id === 'det')?.applicable).toBe(false);
    expect(actions.find((item) => item.id === 'rank')?.applicable).toBe(true);
  });
});
