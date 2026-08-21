import { describe, expect, it } from 'vitest';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { capabilitiesFor } from '../src/lib/math/capabilities';

const engine = new LocalMathEngine();

async function run(input: string, operation: string, options?: Record<string, string | number | boolean>) {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
  const object = resolveSemanticObject(parsed, [], []).object;
  expect(object).not.toBeNull();
  return engine.execute({
    id: `${operation}:${input}`,
    operation,
    input,
    ast: object!.valueAst,
    variable: object!.kind === 'function' ? object!.parameters[0] : object!.variables.length === 1 ? object!.variables[0] : undefined,
    options,
  });
}

describe('P9 analysis', () => {
  it('activates sequence semantics and P9 capabilities', () => {
    const object = resolveSemanticObject(parseMath('a_n := 1/n'), [], []).object!;
    const naturalObject = resolveSemanticObject(parseMath('a_n = 1/n'), [], []).object!;
    expect(object.kind).toBe('sequence');
    expect(naturalObject.kind).toBe('sequence');
    expect(naturalObject.name).toBe('a_n');
    expect(object.shape).toEqual({ type: 'sequence', index: 'n' });
    expect(capabilitiesFor(object).filter((item) => item.available).map((item) => item.id)).toContain('series-convergence');
  });

  it('generates exact sequence terms and partial sums', async () => {
    expect((await run('a_n := 1/n', 'sequence-terms', { start: 1, count: 4 })).display).toBe('{1, 1 / 2, 1 / 3, 1 / 4}');
    expect((await run('a_n := 1/n', 'partial-sum', { start: 1, end: 4 })).display).toBe('25 / 12');
  });

  it('proves sequence limits with degree, geometric, alternating, and squeeze rules', async () => {
    expect((await run('a_n := 1/n', 'sequence-limit')).display).toContain('Convergent to 0');
    expect((await run('a_n := 2^n', 'sequence-limit')).display).toContain('infinity');
    expect((await run('a_n := (-1)^n/n', 'sequence-limit')).display).toContain('Convergent to 0');
    expect((await run('a_n := sin(n)/n', 'sequence-limit')).display).toContain('Convergent to 0');
  });

  it('distinguishes divergent, absolute, and conditional series', async () => {
    expect((await run('a_n := 1/n', 'series-convergence')).display).toContain('Divergent');
    expect((await run('a_n := 1/n^2', 'series-convergence')).display).toContain('Absolutely convergent');
    expect((await run('a_n := (-1)^(n+1)/n', 'series-convergence')).display).toContain('Conditionally convergent');
    expect((await run('a_n := n^2*(1/2)^n', 'series-convergence')).display).toContain('ratio test');
  });

  it('computes exact geometric sums with the configured start index', async () => {
    expect((await run('a_n := (1/2)^n', 'series-convergence', { start: 0 })).display).toContain('sum = 2');
  });

  it('classifies rational holes separately from poles', async () => {
    const result = await run('(x^2-1)/(x-1)', 'continuity-profile');
    expect(result.sections?.[0].facts.find((fact) => fact.label === 'Removable discontinuities')?.display).toBe('1');
    expect((await run('(x^2-1)/(x-1)', 'continuity-at', { point: '1' })).display).toBe('Not continuous at the point');
  });

  it('computes one-sided rational pole limits and refuses incompatible two-sided limits', async () => {
    expect((await run('1/(x-1)', 'analysis-limit', { point: '1', direction: 'left' })).display).toBe('-infinity');
    expect((await run('1/(x-1)', 'analysis-limit', { point: '1', direction: 'right' })).display).toBe('infinity');
    expect((await run('1/(x-1)', 'analysis-limit', { point: '1', direction: 'both' })).display).toContain('Does not exist');
    expect((await run('abs(x)/x', 'analysis-limit', { point: '0', direction: 'both' })).display).toContain('Does not exist');
  });

  it('separates continuity from differentiability', async () => {
    expect((await run('abs(x)', 'differentiability-at', { point: '0' })).display).toBe('Not differentiable at the point');
    expect((await run('x^2', 'differentiability-at', { point: '0' })).display).toContain('derivative = 0');
    expect((await run('sqrt(x)', 'differentiability-at', { point: '0' })).display).toBe('Not differentiable at the point');
  });

  it('builds exact Taylor polynomials without claiming infinite-series equality', async () => {
    const result = await run('exp(x)', 'taylor-polynomial', { center: '0', order: 4 });
    expect(result.display).toContain('1 / 24x ^ 4');
    expect(result.warnings.join(' ')).toContain('does not claim');
  });

  it('reports verified power-series radii and intervals', async () => {
    const geometric = await run('1/(1-x)', 'power-series-profile', { center: '0' });
    expect(geometric.sections?.[0].facts.find((fact) => fact.label === 'Interval of convergence')?.display).toBe('(-1, 1)');
    const logarithm = await run('ln(1+x)', 'power-series-profile', { center: '0' });
    expect(logarithm.sections?.[0].facts.find((fact) => fact.label === 'Interval')?.display).toBe('(-1, 1]');
  });

  it('derives rational asymptotes by exact polynomial division', async () => {
    const result = await run('(2*x^2+1)/(x-3)', 'asymptotic-profile');
    expect(result.sections?.[0].facts.find((fact) => fact.label === 'Oblique asymptote')?.display).toBe('y = 2x + 6');
    expect(result.sections?.[0].facts.find((fact) => fact.label === 'Vertical asymptotes')?.display).toBe('x = 3');
  });
});
