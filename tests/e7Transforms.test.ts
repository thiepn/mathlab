import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CATALOG } from '../src/app/allToolCatalog';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { E7MathEngine } from '../src/lib/math/e7Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { MathResult } from '../src/lib/math/types';

const engine = new E7MathEngine();

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

describe('E7 Fourier, Laplace and transform methods', () => {
  it('computes exact Laplace transforms of polynomial and trigonometric combinations', async () => {
    const result = await run('f(t) := t^2 + 3*sin(2*t)', 'laplace-transform');
    expect(result.exactness).toBe('exact');
    expect(result.display).toContain('s');
    expect(result.display).toContain('6');
  });

  it('applies the exponential shift rule exactly', async () => {
    const result = await run('f(t) := exp(2*t)*sin(t)', 'laplace-transform');
    expect(result.exactness).toBe('exact');
    expect(result.display).toContain('s - 2');
  });

  it('inverts supported proper rational Laplace transforms', async () => {
    const sine = await run('1/(s^2+1)', 'inverse-laplace-transform');
    const cosine = await run('s/(s^2+1)', 'inverse-laplace-transform');
    expect(sine.exactness).toBe('exact');
    expect(sine.display).toContain('sin');
    expect(cosine.display).toContain('cos');
  });

  it('uses the convolution theorem and closes repeated-pole examples', async () => {
    const result = await run('f(t) := exp(-t)', 'convolution', { second: 'exp(-t)' });
    expect(result.exactness).toBe('exact');
    expect(result.display).toContain('exp');
    expect(fact(result, 'Product in s')).toContain('s');
  });

  it('solves an initialized second-order ODE through the Laplace domain', async () => {
    const result = await run('ode2(1,0,1,0,0,1,0)', 'laplace-ode-solve');
    expect(result.exactness).toBe('exact');
    expect(fact(result, 'Y(s)')).toContain('s');
    expect(fact(result, 'y(t)')).toContain('cos');
  });

  it('refuses Laplace ODE initial data away from t=0', async () => {
    await expect(run('ode2(1,0,1,0,2,1,0)', 'laplace-ode-solve')).rejects.toThrow('t0=0');
  });

  it('detects odd symmetry and eliminates cosine coefficients in Fourier series', async () => {
    const result = await run('f(t) := t', 'fourier-series', { period: 2 * Math.PI, order: 4, intervals: 1000 });
    expect(result.exactness).toBe('approximate');
    expect(fact(result, 'Detected parity')).toBe('odd');
    expect(fact(result, 'a₀')).toBe('0');
    expect(result.sections?.find(section => section.id === 'fourier-coefficients')?.facts.every(item => item.display.includes('aₙ≈0'))).toBe(true);
  });

  it('detects even symmetry and eliminates sine coefficients in Fourier series', async () => {
    const result = await run('f(t) := t^2', 'fourier-series', { period: 2 * Math.PI, order: 3, intervals: 1000 });
    expect(fact(result, 'Detected parity')).toBe('even');
    expect(result.sections?.find(section => section.id === 'fourier-coefficients')?.facts.every(item => item.display.includes('bₙ≈0'))).toBe(true);
  });

  it('computes the certified exact Gaussian Fourier transform pair', async () => {
    const forward = await run('f(t) := exp(-t^2)', 'fourier-transform');
    const inverse = await run('F(omega) := exp(-omega^2)', 'inverse-fourier-transform');
    expect(forward.exactness).toBe('exact');
    expect(forward.display).toContain('sqrt');
    expect(forward.display).toContain('omega');
    expect(inverse.exactness).toBe('exact');
    expect(inverse.display).toContain('t');
  });

  it('refuses unsupported exact bilateral Fourier transforms instead of fabricating distributions', async () => {
    await expect(run('f(t) := cos(t)', 'fourier-transform')).rejects.toThrow('No exact E7 Fourier-transform rule');
  });

  it('evaluates a finite-window numerical Fourier transform approximately', async () => {
    const result = await run('f(t) := exp(-t^2)', 'numerical-fourier-transform', { lower: -6, upper: 6, frequency: 0, intervals: 1200 });
    expect(result.exactness).toBe('approximate');
    expect(Number(fact(result, 'Real part'))).toBeCloseTo(Math.sqrt(Math.PI), 5);
    expect(Number(fact(result, 'Imaginary part'))).toBeCloseTo(0, 8);
  });

  it('computes a bounded DFT and inverse DFT reconstruction', async () => {
    const dft = await run('[1,0,-1,0]', 'discrete-fourier-transform');
    expect(dft.exactness).toBe('approximate');
    expect(dft.resultAst?.type).toBe('matrix');
    const inverse = await run('[[0,0],[2,0],[0,0],[2,0]]', 'inverse-discrete-fourier-transform');
    expect(inverse.resultAst?.type).toBe('matrix');
    if (inverse.resultAst?.type === 'matrix') {
      expect(Number(inverse.resultAst.rows[0][0].type === 'number' ? inverse.resultAst.rows[0][0].value : NaN)).toBeCloseTo(1, 8);
      expect(Number(inverse.resultAst.rows[2][0].type === 'number' ? inverse.resultAst.rows[2][0].value : NaN)).toBeCloseTo(-1, 8);
    }
  });

  it('surfaces E7 capabilities only on compatible objects', () => {
    const unary = resolveSemanticObject(parseMath('f(t) := exp(-t^2)'), [], []).object!;
    const multivariable = resolveSemanticObject(parseMath('f(x,y) := x+y'), [], []).object!;
    const vector = resolveSemanticObject(parseMath('[1,0,-1,0]'), [], []).object!;
    expect(capabilitiesFor(unary).some(item => item.id === 'laplace-transform' && item.available)).toBe(true);
    expect(capabilitiesFor(multivariable).find(item => item.id === 'laplace-transform')?.available).toBe(false);
    expect(capabilitiesFor(vector).some(item => item.id === 'discrete-fourier-transform' && item.available)).toBe(true);
  });

  it('exposes every E7 operation through the global tool catalog', () => {
    const ids = ALL_TOOL_CATALOG.filter(tool => tool.phase === 'E7').map(tool => tool.operation);
    expect(ids).toContain('laplace-transform');
    expect(ids).toContain('fourier-series');
    expect(ids).toContain('discrete-fourier-transform');
    expect(ids).toContain('laplace-ode-solve');
  });

  it('preserves cumulative E6 routing beneath E7', async () => {
    const result = await run('data(1,2,3,4,5)', 'descriptive-statistics');
    expect(result.sections?.[0].facts.find(item => item.label === 'Mean')?.display).toBe('3');
  });
});
