import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { buildGraphSeries, evaluateNumeric } from '../src/lib/math/visualization';
import {
  buildExplorationTable,
  dynamicParameterNames,
  evaluateExplorationAt,
  initializeDynamicParameters,
  parameterValues,
  resolveDynamicAst,
  updateDynamicParameter,
} from '../src/app/dynamicExploration';
import type { SemanticMathObject } from '../src/lib/math/types';

function object(source: string, objects: SemanticMathObject[] = []): SemanticMathObject {
  const parsed = parseMath(source);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const resolved = resolveSemanticObject(parsed, objects, []);
  expect(resolved.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  expect(resolved.object).not.toBeNull();
  return resolved.object!;
}

describe('P6 dynamic exploration', () => {
  it('detects visual parameters separately from independent variables', () => {
    const a = object('a := 2');
    const f = object('f(x) := a*x^2 + b', [a]);
    expect(dynamicParameterNames(f)).toEqual(['a', 'b']);

    const parameters = initializeDynamicParameters(f, [a]);
    expect(parameters.map((item) => [item.name, item.value, item.origin])).toEqual([
      ['a', 2, 'workspace'],
      ['b', 1, 'implicit'],
    ]);
  });

  it('lets dynamic values override workspace bindings without mutating the workspace object', () => {
    const a = object('a := 2');
    const f = object('f(x) := a*x^2 + b', [a]);
    const resolved = resolveDynamicAst(f, [a], { a: 3, b: -1 });

    expect(evaluateNumeric(resolved, 'x', 2)).toBe(11);
    expect(evaluateNumeric(a.valueAst, '__constant__', 0)).toBe(2);
  });

  it('updates and clamps slider state deterministically', () => {
    const f = object('f(x) := a*x');
    const parameters = initializeDynamicParameters(f, []);
    const name = parameters[0].name;

    const changed = updateDynamicParameter(parameters, name, { min: -2, max: 2, value: 8, step: 0.25 });
    expect(changed[0].value).toBe(2);
    expect(changed[0].step).toBe(0.25);

    const invalid = updateDynamicParameter(changed, name, { min: 5, max: 1 });
    expect(invalid[0]).toEqual(changed[0]);
  });

  it('builds a linked table and exact point evaluation from graph models', () => {
    const f = object('f(x) := a*x', []);
    const parameters = initializeDynamicParameters(f, []);
    const values = { ...parameterValues(parameters), a: 2 };
    const ast = resolveDynamicAst(f, [], values);
    const model = buildGraphSeries(
      { id: f.id, name: f.name ?? 'f', source: f.source, variable: 'x', ast },
      { xMin: -2, xMax: 2, yMin: -5, yMax: 5 },
    );

    const rows = buildExplorationTable([model], -2, 2, 5);
    expect(rows).toHaveLength(5);
    expect(rows[2].x).toBe(0);
    expect(rows[4].values[0].y).toBe(4);

    const evaluation = evaluateExplorationAt([model], 1.5);
    expect(evaluation?.values[0].y).toBe(3);
  });
});
