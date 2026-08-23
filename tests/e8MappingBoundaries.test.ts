import { describe, expect, it } from 'vitest';
import { E8MathEngine } from '../src/lib/math/e8Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new E8MathEngine();

async function run(input: string, options: Record<string, string | number | boolean>) {
  const object = resolveSemanticObject(parseMath(input), [], []).object!;
  return engine.execute({ id: `complex-map:${input}`, operation: 'complex-map', input, ast: object.valueAst, variable: object.kind === 'function' ? object.parameters[0] : object.variables[0], options });
}

describe('E8 complex mapping power boundaries', () => {
  it('evaluates nonnegative integer powers algebraically at z=0', async () => {
    const result = await run('f(z) := z^2 + 1', { pointRe: 0, pointIm: 0 });
    const mapped = result.sections?.flatMap(section => section.facts).find(item => item.label === 'f(z)')?.display;
    expect(mapped).toBe('1 + 0i');
  });

  it('still refuses negative powers at z=0 through zero-denominator detection', async () => {
    await expect(run('f(z) := z^-1', { pointRe: 0, pointIm: 0 })).rejects.toThrow('zero denominator');
  });
});
