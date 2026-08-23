import { describe, expect, it } from 'vitest';
import { E7MathEngine } from '../src/lib/math/e7Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new E7MathEngine();

async function run(input: string, operation: string, options?: Record<string, string | number | boolean>) {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter(item => item.severity === 'error')).toHaveLength(0);
  const object = resolveSemanticObject(parsed, [], []).object;
  expect(object).not.toBeNull();
  return engine.execute({
    id: `${operation}:${input}`,
    operation,
    input,
    ast: object!.valueAst,
    variable: object!.kind === 'function' ? object!.parameters[0] : object!.variables[0],
    options,
  });
}

describe('E7 correctness boundaries', () => {
  it('rejects invalid Fourier-series period and harmonic counts', async () => {
    await expect(run('f(t) := t', 'fourier-series', { period: 0, order: 5 })).rejects.toThrow('positive finite');
    await expect(run('f(t) := t', 'fourier-series', { period: 6.28, order: 41 })).rejects.toThrow('1 to 40');
  });

  it('refuses inverse Laplace transforms outside the quadratic-denominator boundary', async () => {
    await expect(run('1/(s^3+1)', 'inverse-laplace-transform')).rejects.toThrow('denominator degree at most two');
  });

  it('refuses nondecaying Gaussian signs in the exact bilateral Fourier table', async () => {
    await expect(run('f(t) := exp(t^2)', 'fourier-transform')).rejects.toThrow('No exact E7 Fourier-transform rule');
  });

  it('requires an ordered finite numerical Fourier window', async () => {
    await expect(run('f(t) := exp(-t^2)', 'numerical-fourier-transform', { lower: 2, upper: -2, frequency: 0 })).rejects.toThrow('lower < upper');
  });

  it('enforces bounded DFT and inverse-DFT representations', async () => {
    await expect(run('[1]', 'discrete-fourier-transform')).rejects.toThrow('2–256');
    await expect(run('[[1,0,2],[0,1,3]]', 'inverse-discrete-fourier-transform')).rejects.toThrow('n×2');
  });
});
