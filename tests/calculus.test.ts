import { describe, expect, it } from 'vitest';
import { astToPlainText } from '../src/lib/math/format';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';

const engine = new LocalMathEngine();

async function run(input: string, operation: string, variable = 'x', options?: Record<string, string | number | boolean>) {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
  const result = await engine.execute({ id: `${operation}:${input}`, operation, input, ast: parsed.ast ?? undefined, variable, options });
  return { result, text: result.resultAst ? astToPlainText(result.resultAst) : result.display };
}

describe('P5 functions and calculus engine', () => {
  it('differentiates polynomials exactly', async () => {
    expect((await run('x^3+2x', 'differentiate')).text).toBe('3x ^ 2 + 2');
  });

  it('applies the chain rule to elementary functions', async () => {
    expect((await run('sin(x^2)', 'differentiate')).text).toBe('cos(x ^ 2) * 2x');
  });

  it('computes higher derivatives', async () => {
    expect((await run('x^3', 'higher-derivative', 'x', { order: 2 })).text).toBe('6x');
  });

  it('computes elementary antiderivatives with an explicit integration constant', async () => {
    expect((await run('3x^2+2x+1', 'integrate')).text).toBe('x ^ 3 + x ^ 2 + x + C');
  });

  it('uses the fundamental theorem for supported definite integrals', async () => {
    expect((await run('sin(x)', 'definite-integral', 'x', { lower: '0', upper: 'pi' })).text).toBe('2');
  });

  it('rejects a definite integral that crosses a pole', async () => {
    await expect(run('1/x', 'definite-integral', 'x', { lower: '-1', upper: '1' })).rejects.toThrow('denominator zero');
  });

  it('rejects function evaluation outside supported real domains', async () => {
    await expect(run('ln(x)', 'evaluate-function', 'x', { value: '-1' })).rejects.toThrow('logarithm domain');
    await expect(run('sqrt(x)', 'evaluate-function', 'x', { value: '-1' })).rejects.toThrow('square-root domain');
  });

  it('preserves inherited derivative domain restrictions', async () => {
    const { result, text } = await run('x/x', 'differentiate');
    expect(text).toBe('0');
    expect(result.warnings.join(' ')).toContain('x ≠ 0');
  });

  it('computes removable rational limits without changing the original domain', async () => {
    const { result, text } = await run('(x^2-1)/(x-1)', 'limit', 'x', { point: '1' });
    expect(text).toBe('2');
    expect(result.warnings.join(' ')).toContain('only for the limit');
  });

  it('knows selected fundamental limits', async () => {
    expect((await run('sin(x)/x', 'limit', 'x', { point: '0' })).text).toBe('1');
  });

  it('compares polynomial degrees for limits at infinity', async () => {
    expect((await run('(2x^2+3)/(x^2-4)', 'limit', 'x', { point: 'infinity' })).text).toBe('2');
  });

  it('finds zeros beyond degree two when exact factoring reduces the problem', async () => {
    const text = (await run('x^3-3x', 'zeros')).text;
    expect(text).toContain('0');
    expect(text).toContain('sqrt(3)');
    expect(text).toContain('-sqrt(3)');
  });

  it('finds and classifies stationary points', async () => {
    expect((await run('x^3-3x', 'critical-points')).text).toBe('{-1, 1}');
    const extrema = await run('x^3-3x', 'extrema');
    expect(extrema.result.sections?.[0]?.facts.map((fact) => fact.label)).toEqual(['local maximum', 'local minimum']);
  });

  it('returns structured monotonicity and concavity intervals', async () => {
    const monotonicity = await run('x^3-3x', 'monotonicity');
    expect(monotonicity.result.sections?.[0]?.facts).toHaveLength(3);
    const concavity = await run('x^3-3x', 'concavity');
    expect(concavity.result.sections?.[0]?.facts).toHaveLength(2);
  });

  it('builds a reusable function profile for P6 visualization', async () => {
    const { result } = await run('x^3-3x', 'function-profile');
    expect(result.sections?.map((section) => section.id)).toEqual(['definition','derivatives','zeros','stationary','monotonicity','concavity']);
    expect(result.warnings).toEqual([]);
  });

  it('refuses unsafe global abs differentiation without sign information', async () => {
    await expect(run('abs(x)', 'differentiate')).rejects.toThrow('sign assumption');
  });

  it('refuses general variable-to-variable powers instead of hiding real-domain assumptions', async () => {
    await expect(run('x^x', 'differentiate')).rejects.toThrow('real-domain conditions');
  });
});
