import { describe, expect, it } from 'vitest';
import { astToPlainText } from '../src/lib/math/format';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';

const engine = new LocalMathEngine();

async function run(input: string, operation: string, options?: Record<string, string | number | boolean>) {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
  const result = await engine.execute({ id: `${operation}:${input}`, operation, input, ast: parsed.ast ?? undefined, options });
  return { result, text: result.resultAst ? astToPlainText(result.resultAst) : result.display };
}

describe('P4 exact algebra engine', () => {
  it('keeps exact rational arithmetic', async () => {
    expect((await run('1/3 + 1/6', 'simplify')).text).toBe('1 / 2');
  });

  it('expands polynomial powers exactly', async () => {
    expect((await run('(x+1)^3', 'expand')).text).toBe('x ^ 3 + 3x ^ 2 + 3x + 1');
  });

  it('factors rational polynomials', async () => {
    expect((await run('x^2 - 5x + 6', 'factor')).text).toBe('(x - 3)(x - 2)');
  });

  it('solves linear and quadratic equations', async () => {
    expect((await run('2x+5=11', 'solve')).text).toBe('{3}');
    expect((await run('x^2-2=0', 'solve')).text).toBe('{sqrt(2), -sqrt(2)}');
  });

  it('reverses an inequality when dividing by a negative coefficient', async () => {
    expect((await run('-3x+2>11', 'solve-inequality')).text).toBe('x < -3');
  });

  it('solves exact linear systems', async () => {
    expect((await run('x+y=3; x-y=1', 'solve-system')).text).toBe('x = 2; y = 1');
  });

  it('supports polynomial long division', async () => {
    expect((await run('(x^3-1)/(x-1)', 'polynomial-division')).text).toBe('x ^ 2 + x + 1');
  });

  it('supports distinct-linear-factor partial fractions', async () => {
    expect((await run('(3x+5)/(2*(x-1)*(x+2))', 'partial-fractions')).text).toBe('4 / 3 / (x - 1) + 1 / 6 / (x + 2)');
  });

  it('supports symbolic substitution', async () => {
    expect((await run('x^2+y', 'substitute', { symbol: 'x', value: '2' })).text).toBe('y + 4');
  });


  it('resolves saved exact bindings before solving', async () => {
    const parsed = parseMath('a*x=6');
    const binding = parseMath('2');
    const result = await engine.execute({
      id: 'binding-solve', operation: 'solve', input: 'a*x=6', ast: parsed.ast ?? undefined,
      bindings: [{ name: 'a', ast: binding.ast! }],
    });
    expect(result.resultAst ? astToPlainText(result.resultAst) : result.display).toBe('{3}');
    expect(result.steps[0]?.rule).toBe('resolve-workspace-definitions');
  });

  it('does not silently cancel domain-sensitive expressions', async () => {
    expect((await run('x/x', 'simplify')).text).toBe('x / x');
    expect((await run('x^0', 'simplify')).text).toBe('x ^ 0');
  });

  it('rejects division by zero', async () => {
    await expect(run('0/0', 'simplify')).rejects.toThrow('Division by zero');
  });
});
