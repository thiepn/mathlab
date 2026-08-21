import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';

describe('P4 relation syntax', () => {
  it.each([
    ['x < 2', '<'],
    ['x <= 2', '<='],
    ['x ≥ 2', '>='],
    ['x ≠ 2', '!='],
  ])('parses %s', (source, operator) => {
    const parsed = parseMath(source);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.ast?.type).toBe('comparison');
    if (parsed.ast?.type === 'comparison') expect(parsed.ast.operator).toBe(operator);
  });

  it('parses semicolon-separated systems', () => {
    const parsed = parseMath('x+y=3; x-y=1');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.ast?.type).toBe('system');
    if (parsed.ast?.type === 'system') expect(parsed.ast.items).toHaveLength(2);
  });
});
