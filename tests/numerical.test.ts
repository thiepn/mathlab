import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import {
  conditionEstimate,
  floatingPointProfile,
  interpolationPolynomial,
  iterativeLinearSolve,
  numericalDerivative,
  numericalIntegral,
  numericalLinearSolve,
  numericalRoot,
  solveIvp,
} from '../src/lib/math/numerical';
import type { AstNode } from '../src/lib/math/ast';

function ast(source: string): AstNode {
  const parsed = parseMath(source);
  if (!parsed.ast) throw new Error(`Could not parse ${source}`);
  return parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
}

describe('P12 numerical mathematics', () => {

  it('decodes binary64 representation error exactly', () => {
    const out = floatingPointProfile(ast('1/10'));
    expect(out.exactness).toBe('approximate');
    expect(out.sections[0].facts.find((fact) => fact.label === 'Exactly representable?')?.display).toBe('No');
  });

  it('finds a bracketed root with an explicit error bound', () => {
    const out = numericalRoot(ast('x^2-2'), 'x', 'bisection', { a: 1, b: 2, tolerance: 1e-12, maxIterations: 100 });
    expect(out.exactness).toBe('approximate');
    expect(Number((out.ast as { type: 'number'; value: string }).value)).toBeCloseTo(Math.SQRT2, 10);
  });

  it('uses centered differences plus Richardson refinement', () => {
    const out = numericalDerivative(ast('sin(x)'), 'x', 0, 1e-3);
    expect(Number((out.ast as { type: 'number'; value: string }).value)).toBeCloseTo(1, 9);
  });

  it('integrates smooth functions adaptively', () => {
    const out = numericalIntegral(ast('sin(x)'), 'x', 'adaptive-simpson', 0, Math.PI, { tolerance: 1e-10 });
    expect(Number((out.ast as { type: 'number'; value: string }).value)).toBeCloseTo(2, 9);
  });

  it('constructs the exact rational interpolation polynomial', () => {
    const out = interpolationPolynomial(ast('[[0,1],[1,3],[2,7]]'));
    expect(out.exactness).toBe('exact');
    expect(out.display).toContain('x ^ 2 + x + 1');
  });

  it('solves augmented systems numerically with pivoting', () => {
    const out = numericalLinearSolve(ast('[[2,1,5],[1,-1,1]]'));
    const row = (out.ast as { type: 'matrix'; rows: Array<Array<{ type: 'number'; value: string }>> }).rows[0];
    expect(Number(row[0].value)).toBeCloseTo(2, 10);
    expect(Number(row[1].value)).toBeCloseTo(1, 10);
  });


  it('runs convergent Gauss-Seidel iteration with diagnostics', () => {
    const out = iterativeLinearSolve(ast('[[4,1,9],[1,3,7]]'), 'gauss-seidel', 1e-12, 1000);
    const row = (out.ast as { type: 'matrix'; rows: Array<Array<{ type: 'number'; value: string }>> }).rows[0];
    expect(Number(row[0].value)).toBeCloseTo(20/11, 9);
    expect(Number(row[1].value)).toBeCloseTo(19/11, 9);
  });

  it('estimates an infinity-norm condition number', () => {
    const out = conditionEstimate(ast('[[1,0],[0,2]]'));
    expect(Number((out.ast as { type: 'number'; value: string }).value)).toBeCloseTo(2, 10);
  });

  it('models ivp(...) as a first-class ODE with internal x/y variables', () => {
    const resolved = resolveSemanticObject(parseMath('Y := ivp(x+y,0,1)'), [], []);
    expect(resolved.object?.kind).toBe('ode');
    expect(resolved.object?.variables).toEqual([]);
  });

  it('solves y′=y with RK4 and step-doubling diagnostics', () => {
    const out = solveIvp(ast('ivp(y,0,1)'), 'rk4', 1, 0.1);
    expect(Number((out.ast as { type: 'number'; value: string }).value)).toBeCloseTo(Math.E, 6);
    expect(out.exactness).toBe('approximate');
  });
});
