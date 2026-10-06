import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import {
  assignmentProblem,
  exponentialSmoothing,
  polynomialLeastSquares,
  simplexLinearProgram,
  timeSeriesProfile,
  transportationProblem,
} from '../src/lib/math/p7Wirtschaftsmathematik';
import { P7MathEngine } from '../src/lib/math/p7Engine';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { resolveCapabilitiesForObject } from '../src/app/capabilityRegistry';
import type { AstNode } from '../src/lib/math/ast';

function ast(source: string): AstNode {
  const parsed = parseMath(source);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  expect(parsed.ast).not.toBeNull();
  return parsed.ast!;
}
function matrixValues(node: AstNode | undefined): number[][] {
  expect(node?.type).toBe('matrix');
  if (!node || node.type !== 'matrix') return [];
  return node.rows.map((row) => row.map((cell) => {
    expect(cell.type).toBe('number');
    return cell.type === 'number' ? Number(cell.value) : Number.NaN;
  }));
}

describe('Post-v2 P7 Wirtschaftsmathematik', () => {
  it('solves a canonical multi-constraint simplex model globally', () => {
    const result = simplexLinearProgram(ast('[[1,1,4],[1,0,2],[0,1,3]]'), {
      objective:'[3,2]',
      sense:'max',
    });
    const solution = matrixValues(result.ast)[0];
    expect(solution[0]).toBeCloseTo(2, 9);
    expect(solution[1]).toBeCloseTo(2, 9);
    expect(result.display).toContain('10');
  });

  it('detects an unbounded canonical simplex model', () => {
    expect(() => simplexLinearProgram(ast('[[-1,1]]'), { objective:'[1]', sense:'max' }))
      .toThrow(/unbounded/i);
  });

  it('finds the minimum-cost Hungarian assignment', () => {
    const result = assignmentProblem(ast('[[9,2,7],[6,4,3],[5,8,1]]'), 'min');
    expect(result.display).toContain('9');
    const assignment = matrixValues(result.ast);
    expect(assignment.flat().reduce((a, b) => a + b, 0)).toBe(3);
    expect(assignment.every((row) => row.reduce((a, b) => a + b, 0) === 1)).toBe(true);
  });

  it('solves and balance-checks a transportation model', () => {
    const result = transportationProblem(ast('[[2,3,1],[5,4,8]]'), '[20,30]', '[10,15,25]');
    expect(result.display).toContain('170');
    const allocation = matrixValues(result.ast);
    expect(allocation[0].reduce((a, b) => a + b, 0)).toBeCloseTo(20, 8);
    expect(allocation[1].reduce((a, b) => a + b, 0)).toBeCloseTo(30, 8);
    expect(allocation[0][0] + allocation[1][0]).toBeCloseTo(10, 8);
    expect(allocation[0][1] + allocation[1][1]).toBeCloseTo(15, 8);
    expect(allocation[0][2] + allocation[1][2]).toBeCloseTo(25, 8);
  });

  it('profiles an ordered series with trend and autocorrelation', () => {
    const result = timeSeriesProfile(ast('data(1,2,3,4,5)'), 2);
    expect(result.display).toContain('next ≈ 6');
    const acf = matrixValues(result.ast)[0];
    expect(acf[0]).toBeCloseTo(0.4, 9);
  });

  it('produces deterministic simple exponential smoothing forecasts', () => {
    const result = exponentialSmoothing(ast('data(1,2,3)'), 0.5, 3);
    const forecast = matrixValues(result.ast)[0];
    expect(forecast).toHaveLength(3);
    forecast.forEach((value) => expect(value).toBeCloseTo(2.25, 9));
  });

  it('fits polynomial least squares with QR and predicts from the fitted model', () => {
    const result = polynomialLeastSquares(ast('[[0,1],[1,2],[2,5],[3,10],[4,17]]'), 2, 5);
    expect(result.display).toContain('R²=1');
    const modelText = result.sections[0].facts.find((fact) => fact.label === 'Model')?.display ?? '';
    expect(modelText.replace(/\s+/g, '')).toContain('x^2');
    const prediction = result.sections[0].facts.find((fact) => fact.label.includes('Prediction'))?.display;
    expect(Number(prediction)).toBeCloseTo(26, 8);
  });

  it('registers P7 operations through the same semantic capability architecture', () => {
    const parsed = parseMath('[[1,1,4],[1,0,2],[0,1,3]]');
    const object = resolveSemanticObject(parsed, [], []).object;
    expect(object).not.toBeNull();
    const ids = resolveCapabilitiesForObject(object).filter((item) => item.available).map((item) => item.operation);
    expect(ids).toContain('simplex-linear-program');
    expect(ids).toContain('transportation-problem');
  });

  it('executes P7 through the production engine inheritance chain', async () => {
    const engine = new P7MathEngine();
    const parsed = parseMath('data(1,2,3,4,5)');
    const object = resolveSemanticObject(parsed, [], []).object!;
    const result = await engine.execute({
      id:'p7-engine-test',
      operation:'exponential-smoothing',
      input:object.source,
      ast:object.valueAst,
      options:{alpha:0.5,horizon:2},
    });
    expect(result.operation).toBe('exponential-smoothing');
    expect(result.sections?.[0].title).toBe('Simple exponential smoothing');
  });
});
