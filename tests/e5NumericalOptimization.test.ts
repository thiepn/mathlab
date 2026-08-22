import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { E5MathEngine } from '../src/lib/math/e5Engine';
import {
  conjugateGradient,
  constrainedOptimize,
  convexityDiagnostic,
  linearProgram2d,
  nonlinearSystemSolve,
  numericalCholesky,
  numericalEigen,
  numericalLu,
  numericalOptimize,
  numericalQr,
  numericalRank,
  numericalSvd,
  pseudoinverse,
  spectralCondition,
} from '../src/lib/math/e5NumericalOptimization';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { AstNode } from '../src/lib/math/ast';

function ast(source: string): AstNode {
  const parsed = parseMath(source);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  expect(parsed.ast).not.toBeNull();
  return parsed.ast!.type === 'definition' ? parsed.ast!.right : parsed.ast!;
}

function vectorValues(node: AstNode | undefined): number[] {
  expect(node?.type).toBe('matrix');
  if (node?.type !== 'matrix') throw new Error('expected vector AST');
  return node.rows[0].map((cell) => Number(cell.type === 'number' ? cell.value : Number.NaN));
}

describe('E5 numerical linear algebra & optimization', () => {
  it('computes pivoted LU with a small reconstruction residual', () => {
    const out = numericalLu(ast('[[4,2],[1,3]]'));
    expect(out.exactness).toBe('approximate');
    expect(out.sections[0]?.facts.find((f) => f.label === '||PA-LU||F')?.display).toBe('0');
  });

  it('computes Cholesky for SPD matrices and rejects indefinite matrices', () => {
    const out = numericalCholesky(ast('[[4,2],[2,3]]'));
    expect(out.sections[0]?.facts.find((f) => f.label === '||A-LLᵀ||F')?.display).toBe('0');
    expect(() => numericalCholesky(ast('[[1,2],[2,1]]'))).toThrow(/positive definite/i);
  });

  it('computes Householder QR with reconstruction and orthogonality diagnostics', () => {
    const out = numericalQr(ast('[[1,1],[1,-1],[1,2]]'));
    expect(out.exactness).toBe('approximate');
    expect(Number(out.sections[0]?.facts.find((f) => f.label === '||A-QR||F')?.display)).toBeLessThan(1e-8);
    expect(Number(out.sections[0]?.facts.find((f) => f.label === '||QᵀQ-I||F')?.display)).toBeLessThan(1e-8);
  });

  it('computes symmetric eigenpairs', () => {
    const out = numericalEigen(ast('[[2,1],[1,2]]'), 1e-12);
    const values = vectorValues(out.ast);
    expect(values[0]).toBeCloseTo(3, 8);
    expect(values[1]).toBeCloseTo(1, 8);
    expect(() => numericalEigen(ast('[[1,1],[0,1]]'))).toThrow(/symmetric/i);
  });

  it('computes SVD-derived rank, pseudoinverse and spectral conditioning', () => {
    const rank = numericalRank(ast('[[1,2],[2,4]]'), 1e-10);
    expect(rank.display).toContain('= 1');
    const svd = numericalSvd(ast('[[1,2],[2,4],[0,1]]'), 1e-10);
    expect(svd.sections[0]?.facts.find((f) => f.label === 'Tolerance-aware rank')?.display).toBe('2');
    const pinv = pseudoinverse(ast('[[1,0],[0,2]]'), 1e-12);
    expect(pinv.ast?.type).toBe('matrix');
    const condition = spectralCondition(ast('[[1,0],[0,0.001]]'), 1e-12);
    expect(Number(condition.sections[0]?.facts.find((f) => f.label === 'κ₂(A)')?.display)).toBeCloseTo(1000, 4);
  });

  it('solves SPD systems with conjugate gradient', () => {
    const out = conjugateGradient(ast('[[4,1,1],[1,3,2]]'), 1e-12, 50);
    const x = vectorValues(out.ast);
    expect(x[0]).toBeCloseTo(1 / 11, 8);
    expect(x[1]).toBeCloseTo(7 / 11, 8);
  });

  it('solves a square nonlinear system locally with damped Newton', () => {
    const source = 'F(x,y) := [x^2 + y^2 - 1, x-y]';
    const out = nonlinearSystemSolve(ast(source), source, '[0.7,0.7]', 1e-10, 80);
    const x = vectorValues(out.ast);
    expect(x[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(x[1]).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('minimizes a smooth multivariable objective locally with BFGS', () => {
    const source = 'f(x,y) := (x-1)^2 + 2*(y+2)^2';
    const out = numericalOptimize(ast(source), source, { method: 'bfgs', point: '[0,0]', tolerance: 1e-9, maxIterations: 200 });
    const x = vectorValues(out.ast);
    expect(x[0]).toBeCloseTo(1, 5);
    expect(x[1]).toBeCloseTo(-2, 5);
    expect(out.warnings.some((w) => w.includes('local'))).toBe(true);
  });

  it('handles one equality constraint with an explicit local penalty method', () => {
    const source = 'f(x,y) := x^2 + y^2';
    const out = constrainedOptimize(ast(source), source, { constraint: 'x+y-1', point: '[0,0]', tolerance: 1e-8, maxIterations: 300 });
    const x = vectorValues(out.ast);
    expect(x[0]).toBeCloseTo(0.5, 2);
    expect(x[1]).toBeCloseTo(0.5, 2);
    expect(Number(out.sections[0]?.facts.find((f) => f.label === '|g(x)|')?.display)).toBeLessThan(1e-3);
  });

  it('does not infer global convexity from a position-dependent Hessian', () => {
    const variable = 'f(x,y) := x^4 + y^2';
    const global = convexityDiagnostic(ast(variable), variable);
    expect(global.display).toContain('not certified');
    const constant = 'q(x,y) := x^2 + 2*y^2 + x*y';
    const diagnostic = convexityDiagnostic(ast(constant), constant);
    expect(diagnostic.display.toLowerCase()).toContain('convex');
  });

  it('solves a bounded 2D linear program by feasible-vertex enumeration', () => {
    const out = linearProgram2d(ast('[[1,0,4],[0,1,3],[1,1,5]]'), { objective: '[3,2]', sense: 'max' });
    const x = vectorValues(out.ast);
    expect(x[0]).toBeCloseTo(4, 8);
    expect(x[1]).toBeCloseTo(1, 8);
    expect(Number(out.sections[0]?.facts.find((f) => f.label === 'Objective value')?.display)).toBeCloseTo(14, 8);
  });

  it('exposes E5 capabilities only on compatible objects', () => {
    const matrix = resolveSemanticObject(parseMath('A := [[2,1],[1,2]]')).object;
    const matrixCaps = capabilitiesFor(matrix);
    expect(matrixCaps.find((c) => c.id === 'numerical-lu')?.available).toBe(true);
    expect(matrixCaps.find((c) => c.id === 'numerical-eigen')?.available).toBe(true);

    const fn = resolveSemanticObject(parseMath('f(x,y) := x^2+y^2')).object;
    const fnCaps = capabilitiesFor(fn);
    expect(fnCaps.find((c) => c.id === 'numerical-optimize')?.available).toBe(true);
    expect(fnCaps.find((c) => c.id === 'nonlinear-system-solve')?.available).toBe(false);
  });

  it('routes E5 operations through the cumulative production engine', async () => {
    const engine = new E5MathEngine();
    const result = await engine.execute({ id:'e5-test', operation:'numerical-eigen', input:'[[2,1],[1,2]]', ast:ast('[[2,1],[1,2]]'), options:{tolerance:1e-12} });
    expect(result.display).toContain('λ');
    expect(result.exactness).toBe('approximate');
  });
});
