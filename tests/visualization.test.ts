import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import {
  buildGraphSeries,
  defaultGraphViewport,
  evaluateNumeric,
  fitGraphViewport,
  niceTicks,
  panViewport,
  zoomViewport,
} from '../src/lib/math/visualization';

function ast(source: string) {
  const parsed = parseMath(source);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
  return parsed.ast!;
}

describe('P6 visualization engine', () => {
  it('evaluates supported elementary functions numerically', () => {
    expect(evaluateNumeric(ast('sin(x)^2+cos(x)^2'), 'x', 0.7)).toBeCloseTo(1, 10);
    expect(evaluateNumeric(ast('ln(x)'), 'x', -1)).toBeNaN();
  });

  it('samples a continuous function into a drawable segment', () => {
    const model = buildGraphSeries({ id: 'f', name: 'f', source: 'x^2', variable: 'x', ast: ast('x^2') }, defaultGraphViewport());
    expect(model.segments).toHaveLength(1);
    expect(model.segments[0].points.length).toBeGreaterThan(500);
  });

  it('does not draw through rational discontinuities', () => {
    const model = buildGraphSeries({ id: 'r', name: 'r', source: '1/x', variable: 'x', ast: ast('1/x') }, defaultGraphViewport());
    expect(model.segments.length).toBeGreaterThanOrEqual(2);
    expect(model.annotations.some((item) => item.kind === 'vertical-asymptote' && item.x === 0)).toBe(true);
  });

  it('classifies a removable denominator zero as a hole', () => {
    const model = buildGraphSeries({ id: 'h', name: 'h', source: '(x^2-1)/(x-1)', variable: 'x', ast: ast('(x^2-1)/(x-1)') }, defaultGraphViewport());
    expect(model.annotations.some((item) => item.kind === 'hole' && item.x === 1)).toBe(true);
  });

  it('derives exact zeros, extrema and inflection annotations when P5 supports them', () => {
    const model = buildGraphSeries({ id: 'c', name: 'c', source: 'x^3-3x', variable: 'x', ast: ast('x^3-3x') }, defaultGraphViewport());
    expect(model.annotations.filter((item) => item.kind === 'extremum')).toHaveLength(2);
    expect(model.annotations.some((item) => item.kind === 'inflection' && Math.abs((item.x ?? 1)) < 1e-9)).toBe(true);
    expect(model.annotations.filter((item) => item.kind === 'zero' && item.exact)).toHaveLength(3);
    expect(model.annotations.some((item) => item.kind === 'zero' && Math.abs((item.x ?? 1)) < 1e-9)).toBe(true);
  });

  it('derives a horizontal asymptote for supported rational functions', () => {
    const model = buildGraphSeries({ id: 'q', name: 'q', source: '(2x^2+1)/(x^2-4)', variable: 'x', ast: ast('(2x^2+1)/(x^2-4)') }, defaultGraphViewport());
    expect(model.annotations.some((item) => item.kind === 'horizontal-asymptote' && item.y === 2)).toBe(true);
  });


  it('resolves workspace scalar/expression bindings before graph evaluation', () => {
    const model = buildGraphSeries({ id: 'bound', name: 'bound', source: 'a*x', variable: 'x', ast: ast('a*x'), bindings: [{ name: 'a', ast: ast('2') }] }, defaultGraphViewport());
    expect(evaluateNumeric(model.ast, 'x', 3)).toBe(6);
  });

  it('keeps real-domain failures out of rendered segments', () => {
    const model = buildGraphSeries({ id: 'log', name: 'log', source: 'ln(x)', variable: 'x', ast: ast('ln(x)') }, defaultGraphViewport());
    expect(model.segments.length).toBeGreaterThanOrEqual(1);
    expect(model.segments.flatMap((segment) => segment.points).every((point) => point.x > 0)).toBe(true);
  });

  it('labels sampled transcendental roots as numeric fallbacks', () => {
    const model = buildGraphSeries({ id: 'sin', name: 'sin', source: 'sin(x)', variable: 'x', ast: ast('sin(x)') }, { xMin: -4, xMax: 4, yMin: -2, yMax: 2 });
    expect(model.annotations.some((item) => item.kind === 'zero' && item.exact === false)).toBe(true);
  });

  it('supports stable pan, zoom, fit and tick utilities', () => {
    const base = defaultGraphViewport();
    expect(panViewport(base, 2, -3)).toEqual({ xMin: -8, xMax: 12, yMin: -13, yMax: 7 });
    expect(zoomViewport(base, 0.5, 0, 0)).toEqual({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
    const fit = fitGraphViewport([{ id: 'f', name: 'f', source: 'x', variable: 'x', ast: ast('x') }], { xMin: -2, xMax: 2 });
    expect(fit.xMin).toBe(-2); expect(fit.xMax).toBe(2); expect(fit.yMin).toBeLessThan(-1.8); expect(fit.yMax).toBeGreaterThan(1.8);
    expect(niceTicks(-10, 10)).toContain(0);
  });
});
