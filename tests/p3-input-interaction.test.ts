import { describe, expect, it } from 'vitest';
import { simplifyAst } from '../src/lib/math/algebra';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { evaluateAt } from '../src/lib/math/calculus';
import { astToLatex, astToPlainText } from '../src/lib/math/format';
import {
  MATH_INPUT_TEMPLATES,
  applyInputTemplate,
  applyOpeningDelimiter,
  nextInputBoundary,
  removeEmptyDelimiterPair,
  skipClosingDelimiter,
} from '../src/lib/math/inputEditing';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { buildGraphSeries, evaluateNumeric } from '../src/lib/math/visualization';

function ast(source: string) {
  const parsed = parseMath(source);
  expect(parsed.diagnostics).toEqual([]);
  expect(parsed.ast).toBeTruthy();
  return parsed.ast!;
}

describe('P3 structured input editing', () => {
  it('wraps selected text with structural templates', () => {
    const sqrt = MATH_INPUT_TEMPLATES.find((item) => item.id === 'sqrt')!;
    const edit = applyInputTemplate('x+1', 0, 3, sqrt);
    expect(edit.value).toBe('sqrt(x+1)');
    expect(edit.start).toBe(edit.value.length);
  });

  it('inserts a fraction with the caret in the numerator slot', () => {
    const fraction = MATH_INPUT_TEMPLATES.find((item) => item.id === 'fraction')!;
    const edit = applyInputTemplate('', 0, 0, fraction);
    expect(edit.value).toBe('()/()');
    expect(edit.start).toBe(1);
  });

  it('wraps selections with paired delimiters and skips an existing closer', () => {
    const wrapped = applyOpeningDelimiter('x+1', 0, 3, '(');
    expect(wrapped).toEqual({ value: '(x+1)', start: 5, end: 5 });
    expect(skipClosingDelimiter('(x)', 2, ')')).toEqual({ value: '(x)', start: 3, end: 3 });
  });

  it('deletes empty delimiter pairs as one editing unit', () => {
    expect(removeEmptyDelimiterPair('x+()', 3)).toEqual({ value: 'x+', start: 2, end: 2 });
    expect(removeEmptyDelimiterPair('x+[]', 3)).toEqual({ value: 'x+', start: 2, end: 2 });
  });

  it('finds the next structural boundary for Tab navigation', () => {
    expect(nextInputBoundary('sqrt(x)+1', 5)).toBe(7);
    expect(nextInputBoundary('piecewise(x, x<0; 0, x>=0)', 10)).toBeGreaterThan(10);
  });
});

describe('P3 piecewise mathematics', () => {
  it('parses piecewise branches as a first-class AST node', () => {
    const parsed = parseMath('f(x) := piecewise(x^2, x < 0; 2x + 1, x >= 0)');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.ast?.type).toBe('definition');
    if (parsed.ast?.type !== 'definition') throw new Error('Expected definition.');
    expect(parsed.ast.right.type).toBe('piecewise');
    if (parsed.ast.right.type !== 'piecewise') throw new Error('Expected piecewise AST.');
    expect(parsed.ast.right.branches).toHaveLength(2);
    expect(astToPlainText(parsed.ast.right)).toBe('piecewise(x ^ 2, x < 0; 2x + 1, x >= 0)');
    expect(astToLatex(parsed.ast.right)).toContain('\\begin{cases}');
  });

  it('supports an explicit otherwise branch and compound conditions', () => {
    const parsed = parseMath('piecewise(-1, x < 0; 1, and(x >= 0, x < 1); 2)');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.ast?.type).toBe('piecewise');
    if (parsed.ast?.type !== 'piecewise') throw new Error('Expected piecewise AST.');
    expect(parsed.ast.otherwise).toBeDefined();
    expect(parsed.ast.branches[1].condition.type).toBe('call');
  });

  it('rejects a branch without a condition', () => {
    const parsed = parseMath('piecewise(x^2; 0)');
    expect(parsed.diagnostics.some((item) => item.code === 'invalid-piecewise')).toBe(true);
  });

  it('selects exact branches during point evaluation', () => {
    const value = ast('piecewise(x^2, x < 0; 2x + 1, x >= 0)');
    expect(astToPlainText(evaluateAt(value, 'x', ast('-2')))).toBe('4');
    expect(astToPlainText(evaluateAt(value, 'x', ast('3')))).toBe('7');
  });

  it('selects branches in graph evaluation', () => {
    const value = ast('piecewise(x^2, x < 0; 2x + 1, x >= 0)');
    expect(evaluateNumeric(value, 'x', -2)).toBe(4);
    expect(evaluateNumeric(value, 'x', 3)).toBe(7);
  });

  it('segments plotted piecewise functions at exact branch boundaries', () => {
    const value = ast('piecewise(x^2, x < 0; 2x + 1, x >= 0)');
    const model = buildGraphSeries(
      { id: 'piecewise', name: 'f', source: 'piecewise', variable: 'x', ast: value },
      { xMin: -2, xMax: 2, yMin: -1, yMax: 5 },
      { samples: 161, detectNumericZeros: false },
    );
    expect(model.segments.length).toBeGreaterThanOrEqual(2);
    expect(model.segments.some((segment) => {
      const xs = segment.points.map((point) => point.x);
      return Math.min(...xs) < 0 && Math.max(...xs) > 0;
    })).toBe(false);
  });

  it('collapses constant piecewise conditions during simplification', () => {
    const value = ast('piecewise(x, 1 < 0; x + 1, 1 >= 0)');
    expect(astToPlainText(simplifyAst(value))).toBe('x + 1');
  });

  it('creates a semantic function but gates uncertified symbolic calculus', () => {
    const parsed = parseMath('f(x) := piecewise(x^2, x < 0; 2x + 1, x >= 0)');
    const resolution = resolveSemanticObject(parsed);
    expect(resolution.object?.kind).toBe('function');
    expect(resolution.object?.parameters).toEqual(['x']);
    expect(resolution.object?.variables).toEqual([]);
    expect(resolution.diagnostics.some((item) => item.code === 'piecewise-limited')).toBe(true);

    const capabilities = capabilitiesFor(resolution.object);
    expect(capabilities.find((item) => item.id === 'evaluate-function')?.available).toBe(true);
    expect(capabilities.find((item) => item.id === 'graph')?.available).toBe(true);
    expect(capabilities.find((item) => item.id === 'derivative')?.available).toBe(false);
  });
});
