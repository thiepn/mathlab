import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { E1MathEngine } from '../src/lib/math/e1Engine';
import { astToPlainText } from '../src/lib/math/format';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new E1MathEngine();

async function run(input: string, operation: string, options?: Record<string, string | number | boolean>) {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
  const resolved = resolveSemanticObject(parsed, [], []);
  expect(resolved.object).not.toBeNull();
  const object = resolved.object!;
  const result = await engine.execute({
    id: `${operation}:${input}`,
    operation,
    input: object.source,
    ast: object.valueAst,
    assumptions: object.assumptions,
    options,
  });
  return { object, result, text: result.resultAst ? astToPlainText(result.resultAst) : result.display };
}

describe('E1 multivariable calculus foundation', () => {
  it('preserves first-class multi-parameter function semantics and E1 capabilities', () => {
    const resolved = resolveSemanticObject(parseMath('f(x,y) := x^2 + x*y + y^2'), [], []).object!;
    expect(resolved.kind).toBe('function');
    expect(resolved.parameters).toEqual(['x', 'y']);
    expect(resolved.shape).toEqual({ type: 'function', arity: 2 });
    expect(resolved.variables).toEqual([]);
    const available = capabilitiesFor(resolved).filter((item) => item.available).map((item) => item.id);
    expect(available).toContain('gradient');
    expect(available).toContain('jacobian');
    expect(available).toContain('hessian');
    expect(available).toContain('lagrange-multipliers');
    expect(capabilitiesFor(resolved).find((item) => item.id === 'graph')?.available).toBe(false);
  });

  it('computes exact partial and mixed derivatives while holding other parameters constant', async () => {
    const partial = await run('f(x,y) := x^2*y + 3*y^2', 'partial-derivative', { partialVariable: 'x' });
    expect(partial.text).toContain('2x');
    expect(partial.text).toContain('y');
    const mixed = await run('f(x,y) := x^2*y^3', 'mixed-partial', { partialVariables: 'x, y' });
    expect(mixed.text).toContain('x');
    expect(mixed.text).toContain('y');
    expect(mixed.result.warnings.join(' ')).toContain('Differentiation order');
  });

  it('builds the gradient and Hessian of a scalar function', async () => {
    const gradient = await run('f(x,y) := x^2 + 3*x*y + y^2', 'gradient');
    expect(gradient.result.resultAst?.type).toBe('matrix');
    expect(gradient.result.sections?.[0].facts.map((fact) => fact.label)).toEqual(['∂f/∂x', '∂f/∂y']);
    const hessian = await run('f(x,y) := x^2 + 3*x*y + y^2', 'hessian');
    expect(hessian.text).toContain('[[2, 3], [3, 2]]');
  });

  it('builds Jacobians for scalar and vector-valued functions', async () => {
    const scalar = await run('f(x,y) := x*y', 'jacobian');
    expect(scalar.result.resultAst?.type).toBe('matrix');
    const vector = await run('F(x,y) := [x^2 + y, x - y^2]', 'jacobian');
    expect(vector.text).toContain('2x');
    expect(vector.text).toContain('-2y');
    expect(vector.text).toContain('1');
  });

  it('evaluates multivariable functions in declared parameter order', async () => {
    const evaluated = await run('f(x,y) := x^2 + y', 'evaluate-function', { value: '3, 4' });
    expect(evaluated.text).toBe('13');
    expect(evaluated.result.sections?.[0].facts[0]?.display).toContain('x = 3');
  });

  it('computes a directional derivative with an explicitly normalized direction', async () => {
    const directional = await run('f(x,y) := 3*x + 4*y', 'directional-derivative', { point: '2, -1', direction: '3, 4' });
    expect(directional.text).toContain('sqrt');
    expect(directional.result.warnings.join(' ')).toContain('normalized');
  });

  it('constructs first-order linearizations and tangent planes', async () => {
    const linear = await run('f(x,y) := x^2 + y^2', 'linearization', { point: '1, 2' });
    expect(linear.text).toContain('x');
    expect(linear.text).toContain('y');
    const plane = await run('f(x,y) := x^2 + y^2', 'tangent-plane', { point: '1, 2' });
    expect(plane.result.resultAst?.type).toBe('equation');
    expect(plane.text).toContain('z =');
  });

  it('finds and classifies an exact two-variable local minimum', async () => {
    const analysis = await run('f(x,y) := x^2 + y^2 - 2*x + 4*y', 'second-derivative-test');
    expect(analysis.result.sections?.[0].facts.some((fact) => fact.display === 'local minimum')).toBe(true);
    expect(analysis.text).toContain('1');
    expect(analysis.text).toContain('-2');
  });

  it('distinguishes a saddle point with the Hessian determinant test', async () => {
    const analysis = await run('f(x,y) := x^2 - y^2', 'multivariable-critical-points');
    expect(analysis.result.sections?.[0].facts.some((fact) => fact.display === 'saddle point')).toBe(true);
    expect(analysis.result.sections?.[0].facts.some((fact) => fact.label.startsWith('det H') && fact.display.startsWith('-'))).toBe(true);
  });

  it('supports multiple separable critical points without numerical guessing', async () => {
    const analysis = await run('f(x,y) := x^3 - 3*x + y^2', 'multivariable-critical-points');
    const pointFacts = analysis.result.sections?.[0].facts.filter((fact) => fact.label.startsWith('Point ')) ?? [];
    expect(pointFacts).toHaveLength(2);
  });

  it('solves a bounded exact one-constraint Lagrange system', async () => {
    const lagrange = await run('f(x,y) := x^2 + y^2', 'lagrange-multipliers', { constraint: 'x + y = 2' });
    const facts = lagrange.result.sections?.[0].facts ?? [];
    expect(facts.find((fact) => fact.label === 'Point')?.display).toContain('x = 1');
    expect(facts.find((fact) => fact.label === 'Point')?.display).toContain('y = 1');
    expect(facts.find((fact) => fact.label === 'Objective value')?.display).toBe('2');
    expect(lagrange.result.warnings.join(' ')).toContain('Global optimality');
  });

  it('rejects Lagrange systems outside the exact E1 stationarity boundary', async () => {
    await expect(run('f(x,y) := x^2 + y^2', 'lagrange-multipliers', { constraint: 'x^2 + y^2 = 1' })).rejects.toThrow();
  });

  it('supports anonymous two-variable expressions for derivative structures', async () => {
    const gradient = await run('x^2 + y^2', 'gradient');
    expect(gradient.result.resultAst?.type).toBe('matrix');
    expect(gradient.result.sections?.[0].facts).toHaveLength(2);
  });

  it('keeps scalar-only and exact two-variable boundaries explicit', () => {
    const vectorFunction = resolveSemanticObject(parseMath('F(x,y) := [x,y]'), [], []).object!;
    expect(capabilitiesFor(vectorFunction).find((item) => item.id === 'jacobian')?.available).toBe(true);
    expect(capabilitiesFor(vectorFunction).find((item) => item.id === 'gradient')?.available).toBe(false);
    const threeVariables = resolveSemanticObject(parseMath('f(x,y,z) := x+y+z'), [], []).object!;
    expect(capabilitiesFor(threeVariables).find((item) => item.id === 'hessian')?.available).toBe(true);
    expect(capabilitiesFor(threeVariables).find((item) => item.id === 'tangent-plane')?.available).toBe(false);
  });
});
