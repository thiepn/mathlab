import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CATALOG } from '../src/app/allToolCatalog';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { E8MathEngine } from '../src/lib/math/e8Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { MathResult } from '../src/lib/math/types';

const engine = new E8MathEngine();

async function run(input: string, operation: string, options?: Record<string, string | number | boolean>): Promise<MathResult> {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter(item => item.severity === 'error')).toHaveLength(0);
  const object = resolveSemanticObject(parsed, [], []).object;
  expect(object).not.toBeNull();
  return engine.execute({ id: `${operation}:${input}`, operation, input, ast: object!.valueAst, variable: object!.kind === 'function' ? object!.parameters[0] : object!.variables[0], options });
}
function fact(result: MathResult, label: string): string | undefined {
  return result.sections?.flatMap(section => section.facts).find(item => item.label === label)?.display;
}

describe('E8 Complex Analysis', () => {
  it('decomposes z^2 into exact real and imaginary parts', async () => {
    const result = await run('f(z) := z^2', 'complex-decompose');
    expect(result.exactness).toBe('exact');
    expect(fact(result, 'u(x,y)')).toContain('x');
    expect(fact(result, 'u(x,y)')).toContain('y');
    expect(fact(result, 'v(x,y)')).toContain('x');
    expect(fact(result, 'v(x,y)')).toContain('y');
  });

  it('computes an exact complex derivative for elementary holomorphic forms', async () => {
    const result = await run('f(z) := exp(z)*sin(z)', 'complex-derivative');
    expect(result.exactness).toBe('exact');
    expect(result.display).toContain('exp');
    expect(result.display).toContain('cos');
  });

  it('certifies the Cauchy–Riemann identities for z^2', async () => {
    const result = await run('f(z) := z^2', 'cauchy-riemann');
    expect(result.display).toContain('verified');
    expect(fact(result, 'uₓ−vᵧ')).toBe('0');
    expect(fact(result, 'uᵧ+vₓ')).toBe('0');
  });

  it('detects a structural non-holomorphic obstruction for abs(z)', async () => {
    const result = await run('f(z) := abs(z)', 'cauchy-riemann');
    expect(fact(result, 'Holomorphic')).toContain('No');
    await expect(run('f(z) := abs(z)', 'complex-derivative')).rejects.toThrow('not emitted');
  });

  it('maps complex points numerically and reports polar data', async () => {
    const result = await run('f(z) := z^2', 'complex-map', { pointRe: 1, pointIm: 1 });
    expect(result.exactness).toBe('approximate');
    expect(fact(result, 'f(z)')).toContain('2i');
    expect(Number(fact(result, '|f(z)|'))).toBeCloseTo(2, 10);
  });

  it('builds the exact Laurent expansion of 1/(z(1-z)) at zero', async () => {
    const result = await run('f(z) := 1/(z*(1-z))', 'complex-series', { center: 0, order: 4 });
    expect(result.exactness).toBe('exact');
    expect(fact(result, 'Classification')).toContain('pole order 1');
    expect(result.display).toContain('z');
    expect(result.display).toContain('-1');
  });

  it('classifies rational isolated singularities and exposes the residue', async () => {
    const result = await run('f(z) := (z+1)/z^2', 'singularity-profile', { center: 0 });
    expect(result.exactness).toBe('exact');
    expect(fact(result, 'Classification')).toBe('Pole of order 2');
    expect(fact(result, 'Residue')).toBe('1');
  });

  it('extracts exact residues at supported rational real points', async () => {
    const result = await run('f(z) := 1/(z*(z+1))', 'complex-residue', { pointRe: 0, pointIm: 0 });
    expect(result.exactness).toBe('exact');
    expect(result.display).toBe('1');
  });

  it('computes the circular contour integral of 1/z numerically', async () => {
    const result = await run('f(z) := 1/z', 'complex-contour-integral', { path: 'circle', centerRe: 0, centerIm: 0, radius: 1, intervals: 1600 });
    expect(result.exactness).toBe('approximate');
    const display = fact(result, 'Integral') ?? '';
    const match = display.match(/([\d.eE+-]+)i$/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeCloseTo(2 * Math.PI, 6);
  });

  it('integrates an entire derivative along a line segment', async () => {
    const result = await run('f(z) := 2*z', 'complex-contour-integral', { path: 'line', startRe: 0, startIm: 0, endRe: 1, endIm: 1, intervals: 1000 });
    expect(result.exactness).toBe('approximate');
    expect(fact(result, 'Integral')).toContain('2i');
  });

  it('applies the residue theorem on a supported rational circle', async () => {
    const result = await run('f(z) := 1/z', 'residue-theorem', { centerRe: 0, centerIm: 0, radius: 2 });
    expect(result.exactness).toBe('approximate');
    expect(fact(result, 'Sum of enclosed residues')).toContain('1');
    const theorem = fact(result, '∮f(z)dz = 2πi ΣRes') ?? '';
    expect(theorem).toContain('i');
  });

  it('reports branch-sensitive logarithm and square-root structure', async () => {
    const result = await run('f(z) := ln(z) + sqrt(z)', 'branch-diagnostics');
    expect(result.exactness).toBe('exact');
    expect(result.display).toContain('2 branch-sensitive');
  });

  it('allows a local branch derivative while warning about branch choice', async () => {
    const result = await run('f(z) := ln(z)', 'complex-derivative');
    expect(result.exactness).toBe('exact');
    expect(result.display).toContain('1 / z');
    expect(result.warnings.some(warning => warning.includes('branch'))).toBe(true);
  });

  it('surfaces E8 capabilities only for unary scalar functions/expressions', () => {
    const unary = resolveSemanticObject(parseMath('f(z) := z^2'), [], []).object!;
    const multi = resolveSemanticObject(parseMath('f(x,y) := x+y'), [], []).object!;
    expect(capabilitiesFor(unary).some(item => item.id === 'complex-derivative' && item.available)).toBe(true);
    expect(capabilitiesFor(multi).find(item => item.id === 'complex-derivative')?.available).toBe(false);
  });

  it('exposes every E8 operation through global discovery and preserves E7 fallback', async () => {
    const operations = ALL_TOOL_CATALOG.filter(tool => tool.phase === 'E8').map(tool => tool.operation);
    expect(operations).toContain('complex-decompose');
    expect(operations).toContain('complex-series');
    expect(operations).toContain('residue-theorem');
    expect(operations).toContain('branch-diagnostics');
    const inherited = await run('f(t) := exp(-t)', 'laplace-transform');
    expect(inherited.exactness).toBe('exact');
    expect(inherited.display).toContain('s');
  });
});
