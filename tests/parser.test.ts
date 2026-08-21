import { describe, expect, it } from 'vitest';
import { classifyParsed } from '../src/lib/math/classify';
import { astToLatex } from '../src/lib/math/format';
import { parseMath } from '../src/lib/math/parser';

describe('P1 universal mathematical parser', () => {
  it('respects conventional operator precedence and right-associative powers', () => {
    const parsed = parseMath('-x^2 + 2^-3');
    expect(parsed.diagnostics).toHaveLength(0);
    expect(astToLatex(parsed.ast!)).toContain('x^{2}');
    expect(astToLatex(parsed.ast!)).toContain('2^{-3}');
  });

  it('supports implicit multiplication without confusing x(y+1) with a function call', () => {
    const parsed = parseMath('3x + 2(x - 1) + x(y+1)');
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.tokens.some((token) => token.implicit)).toBe(true);
  });

  it('recognizes standard functions and function definitions', () => {
    const parsed = parseMath('f(x) = sin(x^2)');
    expect(parsed.diagnostics).toHaveLength(0);
    expect(classifyParsed(parsed)).toBe('function');
  });

  it('normalizes common pasted LaTeX', () => {
    const parsed = parseMath('\\frac{1}{2}x + \\sqrt{x^{2}} + \\pi');
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.normalizedSource).toContain('sqrt');
    expect(astToLatex(parsed.ast!)).toContain('\\frac{1}{2}');
    expect(astToLatex(parsed.ast!)).toContain('\\pi');
  });

  it('parses rectangular matrix syntax and classifies it', () => {
    const parsed = parseMath('A = [[1,2],[3,4]]');
    expect(parsed.diagnostics).toHaveLength(0);
    expect(classifyParsed(parsed)).toBe('matrix');
  });

  it('rejects ragged matrices', () => {
    const parsed = parseMath('[[1,2],[3]]');
    expect(parsed.diagnostics.some((diagnostic) => diagnostic.code === 'invalid-matrix')).toBe(true);
  });

  it('reports a missing closing delimiter with a source location', () => {
    const parsed = parseMath('sin(x^2');
    const diagnostic = parsed.diagnostics.find((item) => item.code === 'missing-closing-delimiter');
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.start).toBeGreaterThanOrEqual(0);
  });

  it('accepts Unicode letter identifiers', () => {
    const parsed = parseMath('λ^2 + αλ + β');
    expect(parsed.diagnostics).toHaveLength(0);
  });

  it('parses explicit definitions with :=', () => {
    const parsed = parseMath('a := 2');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.ast?.type).toBe('definition');
  });
});
