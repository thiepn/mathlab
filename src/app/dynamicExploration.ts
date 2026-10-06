import { substituteAst, symbolsIn } from '../lib/math/algebra';
import type { AstNode } from '../lib/math/ast';
import type { SemanticMathObject } from '../lib/math/types';
import { evaluateNumeric, formatNumeric, type GraphSeriesModel } from '../lib/math/visualization';
import { visualizationVariables } from './visualizationModes';

export interface DynamicParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  origin: 'workspace' | 'implicit';
}

export type DynamicParameterValues = Record<string, number>;

export interface ExplorationTableRow {
  x: number;
  displayX: string;
  values: Array<{
    id: string;
    name: string;
    y: number;
    displayY: string;
    defined: boolean;
  }>;
}

export interface ExplorationEvaluation {
  x: number;
  displayX: string;
  values: Array<{
    id: string;
    name: string;
    y: number;
    displayY: string;
    defined: boolean;
  }>;
}

function finiteNumberFromAst(ast: AstNode): number | null {
  const value = evaluateNumeric(ast, '__mathlab_dynamic_constant__', 0);
  return Number.isFinite(value) ? value : null;
}

function rangeAround(value: number): Pick<DynamicParameter, 'min' | 'max' | 'step'> {
  const magnitude = Math.max(1, Math.abs(value));
  const span = Math.max(5, magnitude * 2.5);
  const min = value - span;
  const max = value + span;
  const rawStep = (max - min) / 100;
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-9))));
  const normalized = rawStep / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return { min, max, step: multiplier * power };
}

export function dynamicParameterNames(object: SemanticMathObject): string[] {
  const independent = new Set(visualizationVariables(object));
  return symbolsIn(object.valueAst)
    .filter((name) => !independent.has(name))
    .sort((a, b) => a.localeCompare(b));
}

export function initializeDynamicParameters(
  object: SemanticMathObject,
  objects: SemanticMathObject[],
  previous: readonly DynamicParameter[] = [],
): DynamicParameter[] {
  const previousByName = new Map(previous.map((item) => [item.name, item] as const));
  return dynamicParameterNames(object).map((name) => {
    const prior = previousByName.get(name);
    if (prior) return prior;

    const binding = objects.find((item) =>
      item.id !== object.id
      && item.name === name
      && ['scalar', 'expression'].includes(item.kind));
    const workspaceValue = binding ? finiteNumberFromAst(binding.valueAst) : null;
    const value = workspaceValue ?? 1;
    const range = rangeAround(value);
    return {
      name,
      value,
      ...range,
      origin: workspaceValue === null ? 'implicit' : 'workspace',
    };
  });
}

export function parameterValues(parameters: readonly DynamicParameter[]): DynamicParameterValues {
  return Object.fromEntries(parameters.map((parameter) => [parameter.name, parameter.value]));
}

export function resolveDynamicAst(
  object: SemanticMathObject,
  objects: SemanticMathObject[],
  values: DynamicParameterValues,
): AstNode {
  let ast = object.valueAst;
  const protectedNames = new Set([...visualizationVariables(object), ...Object.keys(values)]);

  for (const binding of objects) {
    if (
      !binding.name
      || binding.id === object.id
      || protectedNames.has(binding.name)
      || !['scalar', 'expression'].includes(binding.kind)
    ) continue;
    ast = substituteAst(ast, binding.name, binding.valueAst);
  }

  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) continue;
    ast = substituteAst(ast, name, { type: 'number', value: String(value) });
  }

  return ast;
}

export function updateDynamicParameter(
  parameters: readonly DynamicParameter[],
  name: string,
  patch: Partial<Pick<DynamicParameter, 'value' | 'min' | 'max' | 'step'>>,
): DynamicParameter[] {
  return parameters.map((parameter) => {
    if (parameter.name !== name) return parameter;
    const next = { ...parameter, ...patch };
    if (!Number.isFinite(next.min) || !Number.isFinite(next.max) || next.min >= next.max) return parameter;
    const step = Number.isFinite(next.step) && next.step > 0 ? next.step : parameter.step;
    const value = Math.min(next.max, Math.max(next.min, Number.isFinite(next.value) ? next.value : parameter.value));
    return { ...next, step, value };
  });
}

export function resetDynamicParameter(parameter: DynamicParameter): DynamicParameter {
  const range = rangeAround(1);
  return { ...parameter, value: 1, ...range, origin: 'implicit' };
}

export function buildExplorationTable(
  series: readonly GraphSeriesModel[],
  xMin: number,
  xMax: number,
  count = 9,
): ExplorationTableRow[] {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || !(xMin < xMax)) return [];
  const rows = Math.max(3, Math.min(41, Math.round(count)));
  return Array.from({ length: rows }, (_, index) => {
    const x = rows === 1 ? xMin : xMin + (xMax - xMin) * index / (rows - 1);
    return {
      x,
      displayX: formatNumeric(x, 7),
      values: series.map((item) => {
        const y = evaluateNumeric(item.ast, item.variable, x);
        return {
          id: item.id,
          name: item.name,
          y,
          displayY: formatNumeric(y, 7),
          defined: Number.isFinite(y),
        };
      }),
    };
  });
}

export function evaluateExplorationAt(
  series: readonly GraphSeriesModel[],
  x: number,
): ExplorationEvaluation | null {
  if (!Number.isFinite(x)) return null;
  return {
    x,
    displayX: formatNumeric(x, 8),
    values: series.map((item) => {
      const y = evaluateNumeric(item.ast, item.variable, x);
      return {
        id: item.id,
        name: item.name,
        y,
        displayY: formatNumeric(y, 8),
        defined: Number.isFinite(y),
      };
    }),
  };
}
