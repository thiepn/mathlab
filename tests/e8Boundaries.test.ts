import { describe, expect, it } from 'vitest';
import { E8MathEngine } from '../src/lib/math/e8Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new E8MathEngine();
async function run(input: string, operation: string, options?: Record<string, string | number | boolean>) {
  const object = resolveSemanticObject(parseMath(input), [], []).object!;
  return engine.execute({ id: `${operation}:${input}`, operation, input, ast: object.valueAst, variable: object.kind === 'function' ? object.parameters[0] : object.variables[0], options });
}

describe('E8 correctness boundaries', () => {
  it('refuses exact rational series claims for unsupported transcendental forms', async () => {
    await expect(run('f(z) := exp(z)', 'complex-series', { center: 0, order: 6 })).rejects.toThrow('rational function');
  });

  it('bounds local series order explicitly', async () => {
    await expect(run('f(z) := 1/(1-z)', 'complex-series', { center: 0, order: 31 })).rejects.toThrow('0 to 30');
  });

  it('does not certify Cauchy–Riemann identities across unresolved branch cuts', async () => {
    await expect(run('f(z) := ln(z)', 'cauchy-riemann')).rejects.toThrow('branch-sensitive');
  });

  it('does not assign residues to unresolved branch points', async () => {
    await expect(run('f(z) := sqrt(z)', 'complex-residue', { pointRe: 0, pointIm: 0 })).rejects.toThrow('isolated single-valued singularity');
  });

  it('rejects a residue-theorem contour passing through a pole', async () => {
    await expect(run('f(z) := 1/(z-1)', 'residue-theorem', { centerRe: 0, centerIm: 0, radius: 1 })).rejects.toThrow('lies on the contour');
  });

  it('bounds automatic residue-theorem pole discovery to quadratic denominators', async () => {
    await expect(run('f(z) := 1/(z^3-1)', 'residue-theorem', { centerRe: 0, centerIm: 0, radius: 2 })).rejects.toThrow('degree at most two');
  });

  it('rejects invalid circular contour geometry', async () => {
    await expect(run('f(z) := z', 'complex-contour-integral', { path: 'circle', centerRe: 0, centerIm: 0, radius: 0, intervals: 1000 })).rejects.toThrow('radius must be positive');
  });
});
