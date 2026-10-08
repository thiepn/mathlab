import { describe, expect, it } from 'vitest';
import { astToPlainText } from '../src/lib/math/format';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';

// Historical *official* exercise, not a 2026/27 sheet:
// University of Cologne, Kunoth/Boschert, Algorithmische Mathematik und
// Programmieren, WS 2017/18, Übungsblatt 3, Aufgabe 13(d).
// https://numana.uni-koeln.de/sites/kunoth/user_upload/Algo_17_18/Blatt3.pdf
//
// The exercise's one-byte signed fixed-point format uses 4 integer bits and
// 3 fractional bits. On this format the nearest value to 1/3 is 3/8.
// MathLab does NOT currently emulate this custom machine. These assertions
// certify only the exact-rational subcalculations used to check the answer.
const engine = new LocalMathEngine();

async function simplify(source: string): Promise<string> {
  const parsed = parseMath(source);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const result = await engine.execute({
    id: 'amp-ws1718-sheet3-task13d:' + source,
    operation: 'simplify',
    input: source,
    ast: parsed.ast ?? undefined,
  });
  expect(result.exactness).toBe('exact');
  return result.resultAst ? astToPlainText(result.resultAst) : result.display;
}

describe('Official historical AMP worksheet — supported exact subcalculations', () => {
  it('computes the exact rounding error for 1/3 after independently choosing the 3/8 grid point', async () => {
    expect(await simplify('3/8-1/3')).toBe('1 / 24');
  });

  it('computes the exact relative rounding error from the same worksheet', async () => {
    expect(await simplify('(3/8-1/3)/(1/3)')).toBe('1 / 8');
  });
});
