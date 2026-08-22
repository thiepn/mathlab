import { describe, expect, it } from 'vitest';
import { looksLikeDisplayMath, normalizeDisplayMathSource, parseDisplayMath, splitTopLevel } from '../src/lib/math/displayMath';
import { astToPlainText } from '../src/lib/math/format';

describe('M2 display-math adapter', () => {
  it('upgrades exact rational display strings into mathematical ASTs', () => {
    const ast = parseDisplayMath('1/2');
    expect(ast).toBeDefined();
    expect(astToPlainText(ast!)).toBe('1 / 2');
  });

  it('upgrades equation-like display strings while leaving prose alone', () => {
    expect(parseDisplayMath('x = 2')?.type).toBe('equation');
    expect(parseDisplayMath('Unique solution')).toBeNull();
    expect(looksLikeDisplayMath('Unique solution')).toBe(false);
  });

  it('builds set ASTs from display-only brace notation', () => {
    const ast = parseDisplayMath('{1/2, sqrt(2)}');
    expect(ast?.type).toBe('set');
    if (ast?.type === 'set') expect(ast.items).toHaveLength(2);
  });

  it('normalizes standard mathematical Unicode constants for the existing parser', () => {
    expect(normalizeDisplayMathSource('pi + ∞ + ℝ')).toBe('pi + infinity + R');
  });

  it('splits coordinate and list values only at top level', () => {
    expect(splitTopLevel('1/2, sqrt(1+x), [1,2]')).toEqual(['1/2', 'sqrt(1+x)', '[1,2]']);
  });
});
