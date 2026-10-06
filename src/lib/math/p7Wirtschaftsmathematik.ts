import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { parseMath } from './parser';
import { rationalToNumber } from './rational';
import type { Exactness, MathResultFact, MathResultSection } from './types';

export interface WirtschaftsmathematikTransform {
  ast?: AstNode;
  display: string;
  exactness: Exactness;
  warnings: string[];
  sections: MathResultSection[];
}

type Matrix = number[][];
type Vector = number[];

const EPS = 1e-10;

function num(value: number): AstNode {
  return { type: 'number', value: Number(value.toPrecision(15)).toString() };
}
function vectorAst(values: Vector): AstNode {
  return { type: 'matrix', rows: [values.map(num)] };
}
function matrixAst(values: Matrix): AstNode {
  return { type: 'matrix', rows: values.map((row) => row.map(num)) };
}
function section(id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection {
  return { id, title, facts, description };
}
function fixed(value: number, digits = 8): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 1e-12) return '0';
  if (Math.abs(value) >= 1e9 || Math.abs(value) < 1e-7) return value.toExponential(6);
  return Number(value.toFixed(digits)).toString();
}
function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}
function dot(a: Vector, b: Vector): number {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}
function numericMatrix(node: AstNode, label = 'Matrix'): Matrix {
  const ast = simplifyAst(node.type === 'definition' ? node.right : node);
  if (ast.type !== 'matrix' || !ast.rows.length || !ast.rows[0]?.length) throw new Error(`${label} requires a nonempty numeric matrix.`);
  const width = ast.rows[0].length;
  if (ast.rows.some((row) => row.length !== width)) throw new Error('Matrix rows must have equal length.');
  return ast.rows.map((row, i) => row.map((cell, j) => {
    const value = rationalValue(simplifyAst(cell));
    if (!value) throw new Error(`${label} entry (${i + 1}, ${j + 1}) must be an exact real rational value.`);
    return finite(rationalToNumber(value), `${label} entry`);
  }));
}
function numericSeries(node: AstNode): Vector {
  const ast = simplifyAst(node.type === 'definition' ? node.right : node);
  let cells: AstNode[];
  if (ast.type === 'call' && ast.name === 'data') cells = ast.args;
  else if (ast.type === 'matrix' && ast.rows.length === 1) cells = ast.rows[0];
  else if (ast.type === 'matrix' && ast.rows.every((row) => row.length === 1)) cells = ast.rows.map((row) => row[0]);
  else throw new Error('Time-series workflows require a dataset data(...) or a one-dimensional vector.');
  if (cells.length < 3) throw new Error('Time-series workflows require at least three observations.');
  if (cells.length > 5000) throw new Error('Post-v2 P7 time-series workflows are bounded to 5,000 observations.');
  return cells.map((cell, i) => {
    const value = rationalValue(simplifyAst(cell));
    if (!value) throw new Error(`Observation ${i + 1} must be an exact real rational value.`);
    return finite(rationalToNumber(value), `Observation ${i + 1}`);
  });
}
function parseVector(source: string | undefined, expected: number, label: string): Vector {
  if (!source?.trim()) throw new Error(`${label} is required.`);
  const parsed = parseMath(source);
  const error = parsed.diagnostics.find((item) => item.severity === 'error');
  if (!parsed.ast || error) throw new Error(error?.message ?? `Could not parse ${label}.`);
  const ast = parsed.ast.type === 'definition' ? parsed.ast.right : parsed.ast;
  const values = numericMatrix(ast, label);
  if (values.length !== 1 || values[0].length !== expected) throw new Error(`${label} must contain exactly ${expected} values.`);
  return values[0];
}
function polynomialAst(coefficients: Vector): AstNode {
  let out: AstNode = num(coefficients[0] ?? 0);
  const x: AstNode = { type: 'symbol', name: 'x' };
  for (let degree = 1; degree < coefficients.length; degree += 1) {
    const coefficient = coefficients[degree];
    if (Math.abs(coefficient) < 1e-14) continue;
    const power: AstNode = degree === 1 ? x : { type: 'binary', operator: '^', left: x, right: num(degree) };
    const term: AstNode = { type: 'binary', operator: '*', left: num(coefficient), right: power };
    out = { type: 'binary', operator: '+', left: out, right: term };
  }
  return simplifyAst(out);
}

export function simplexLinearProgram(
  node: AstNode,
  options: { objective?: string; sense?: string; maxIterations?: number } = {},
): WirtschaftsmathematikTransform {
  const augmented = numericMatrix(node, 'Linear program');
  const m = augmented.length;
  const n = augmented[0].length - 1;
  if (n < 1) throw new Error('A simplex LP requires at least one decision variable plus a right-hand-side column.');
  if (m > 40 || n > 20) throw new Error('Post-v2 P7 simplex is bounded to at most 40 constraints and 20 decision variables.');
  const A = augmented.map((row) => row.slice(0, n));
  const rhs = augmented.map((row) => row[n]);
  if (rhs.some((value) => value < -EPS)) throw new Error('Canonical P7 simplex requires b ≥ 0 so x=0 with slack variables is an initial feasible solution. Rewrite constraints before solving.');
  const objective = parseVector(options.objective, n, 'Objective vector c');
  const sense = options.sense === 'min' ? 'min' : 'max';
  const effective = sense === 'max' ? objective : objective.map((value) => -value);
  const cols = n + m + 1;
  const tableau = Array.from({ length: m + 1 }, () => Array(cols).fill(0));
  const basis = Array.from({ length: m }, (_, i) => n + i);
  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) tableau[i][j] = A[i][j];
    tableau[i][n + i] = 1;
    tableau[i][cols - 1] = Math.max(0, rhs[i]);
  }
  for (let j = 0; j < n; j += 1) tableau[m][j] = -effective[j];

  const limit = options.maxIterations ?? 1000;
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error('Simplex iteration limit must be an integer from 1 through 10,000.');
  const trace: MathResultFact[] = [];
  let iterations = 0;
  for (; iterations < limit; iterations += 1) {
    let entering = -1;
    for (let j = 0; j < cols - 1; j += 1) {
      if (tableau[m][j] < -EPS) { entering = j; break; } // Bland rule.
    }
    if (entering < 0) break;

    let leaving = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i += 1) {
      const coefficient = tableau[i][entering];
      if (coefficient <= EPS) continue;
      const ratio = tableau[i][cols - 1] / coefficient;
      if (ratio < bestRatio - EPS || (Math.abs(ratio - bestRatio) <= EPS && (leaving < 0 || basis[i] < basis[leaving]))) {
        bestRatio = ratio;
        leaving = i;
      }
    }
    if (leaving < 0) throw new Error('The canonical linear program is unbounded in the requested objective direction.');

    const pivot = tableau[leaving][entering];
    for (let j = 0; j < cols; j += 1) tableau[leaving][j] /= pivot;
    for (let i = 0; i <= m; i += 1) {
      if (i === leaving) continue;
      const factor = tableau[i][entering];
      if (Math.abs(factor) <= EPS) continue;
      for (let j = 0; j < cols; j += 1) tableau[i][j] -= factor * tableau[leaving][j];
    }
    basis[leaving] = entering;
    if (trace.length < 16) trace.push({ label: `Pivot ${iterations + 1}`, display: `enter x${entering + 1}, leave row ${leaving + 1}` });
  }
  if (iterations >= limit) throw new Error('Simplex reached the configured iteration limit before optimality.');

  const solution = Array(n).fill(0);
  for (let i = 0; i < m; i += 1) if (basis[i] < n) solution[basis[i]] = tableau[i][cols - 1];
  const slacks = rhs.map((value, i) => value - dot(A[i], solution));
  const objectiveValue = dot(objective, solution);
  const binding = slacks.map((value, i) => Math.abs(value) <= 1e-8 ? i + 1 : null).filter((value): value is number => value !== null);

  return {
    ast: vectorAst(solution),
    display: `${sense} c·x ≈ ${fixed(objectiveValue, 10)} at [${solution.map((value) => fixed(value, 10)).join(', ')}]`,
    exactness: 'approximate',
    warnings: [
      'P7 simplex solves canonical Ax≤b, b≥0, x≥0 models with a slack-variable initial basis. Equality, ≥, free-variable and artificial-variable phase-I models must be reformulated first.',
      'Floating-point pivoting is deterministic but approximate; inspect constraint slacks when the optimum is nearly degenerate.',
    ],
    sections: [
      section('simplex-result', 'Canonical simplex optimum', [
        { label: 'Sense', display: sense },
        { label: 'Decision vector', display: `[${solution.map((value) => fixed(value, 10)).join(', ')}]`, ast: vectorAst(solution), tone: 'positive' },
        { label: 'Objective value', display: fixed(objectiveValue, 12), tone: 'positive' },
        { label: 'Iterations', display: String(iterations) },
        { label: 'Binding constraints', display: binding.length ? binding.join(', ') : 'None at working tolerance' },
      ]),
      section('simplex-slacks', 'Constraint slacks', slacks.map((value, i) => ({ label: `Constraint ${i + 1}`, display: fixed(value, 10), tone: value < -1e-8 ? 'negative' : Math.abs(value) <= 1e-8 ? 'warning' : 'neutral' }))),
      section('simplex-trace', 'Pivot trace', trace.length ? trace : [{ label: 'Pivots', display: 'Initial slack basis was already optimal.' }], 'Bland-style first-negative entering selection is used to reduce cycling risk.'),
    ],
  };
}

export function assignmentProblem(node: AstNode, sense: 'min' | 'max' = 'min'): WirtschaftsmathematikTransform {
  const costs = numericMatrix(node, 'Assignment problem');
  const n = costs.length;
  if (n < 2 || costs.some((row) => row.length !== n)) throw new Error('Assignment requires a square n×n cost/profit matrix with n≥2.');
  if (n > 30) throw new Error('Post-v2 P7 assignment is bounded to 30×30 matrices.');
  const maxValue = Math.max(...costs.flat());
  const work = sense === 'max' ? costs.map((row) => row.map((value) => maxValue - value)) : costs.map((row) => [...row]);

  const u = Array(n + 1).fill(0);
  const v = Array(n + 1).fill(0);
  const p = Array(n + 1).fill(0);
  const way = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(Infinity);
    const used = Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j += 1) {
        if (used[j]) continue;
        const cur = work[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j += 1) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const assignment = Array(n).fill(-1);
  for (let j = 1; j <= n; j += 1) assignment[p[j] - 1] = j - 1;
  const objective = assignment.reduce((sum, column, row) => sum + costs[row][column], 0);
  const indicator = Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, column) => assignment[row] === column ? 1 : 0));

  return {
    ast: matrixAst(indicator),
    display: `${sense} assignment value = ${fixed(objective, 10)}`,
    exactness: 'approximate',
    warnings: ['The Hungarian algorithm is run in binary64 arithmetic. Matrix entries may be negative; ties are resolved deterministically by column order.'],
    sections: [
      section('assignment-result', 'Optimal assignment', [
        { label: 'Sense', display: sense },
        { label: 'Total value', display: fixed(objective, 12), tone: 'positive' },
        { label: 'Assignment matrix', display: `[${indicator.map((row) => `[${row.join(', ')}]`).join(', ')}]`, ast: matrixAst(indicator) },
      ]),
      section('assignment-pairs', 'Assigned pairs', assignment.map((column, row) => ({ label: `Row ${row + 1} → column ${column + 1}`, display: fixed(costs[row][column], 10) }))),
    ],
  };
}

interface FlowEdge {
  to: number;
  rev: number;
  cap: number;
  cost: number;
  initial: number;
}
function addFlowEdge(graph: FlowEdge[][], from: number, to: number, cap: number, cost: number): number {
  const index = graph[from].length;
  const reverse = graph[to].length;
  graph[from].push({ to, rev: reverse, cap, cost, initial: cap });
  graph[to].push({ to: from, rev: index, cap: 0, cost: -cost, initial: 0 });
  return index;
}

export function transportationProblem(
  node: AstNode,
  supplySource?: string,
  demandSource?: string,
): WirtschaftsmathematikTransform {
  const costs = numericMatrix(node, 'Transportation problem');
  const suppliers = costs.length;
  const customers = costs[0].length;
  if (suppliers > 12 || customers > 12) throw new Error('Post-v2 P7 transportation is bounded to 12 suppliers and 12 demand nodes.');
  const supply = parseVector(supplySource, suppliers, 'Supply vector');
  const demand = parseVector(demandSource, customers, 'Demand vector');
  if (supply.some((value) => value < -EPS) || demand.some((value) => value < -EPS)) throw new Error('Supply and demand must be nonnegative.');
  const totalSupply = supply.reduce((a, b) => a + b, 0);
  const totalDemand = demand.reduce((a, b) => a + b, 0);
  if (Math.abs(totalSupply - totalDemand) > 1e-8 * Math.max(1, totalSupply, totalDemand)) throw new Error('Transportation requires a balanced model: total supply must equal total demand.');
  if (totalSupply <= EPS) throw new Error('Transportation requires positive total supply/demand.');

  const source = 0;
  const supplierOffset = 1;
  const customerOffset = supplierOffset + suppliers;
  const sink = customerOffset + customers;
  const graph: FlowEdge[][] = Array.from({ length: sink + 1 }, () => []);
  for (let i = 0; i < suppliers; i += 1) addFlowEdge(graph, source, supplierOffset + i, supply[i], 0);
  for (let j = 0; j < customers; j += 1) addFlowEdge(graph, customerOffset + j, sink, demand[j], 0);
  const refs: Array<Array<{ node: number; edge: number }>> = Array.from({ length: suppliers }, () => []);
  for (let i = 0; i < suppliers; i += 1) {
    for (let j = 0; j < customers; j += 1) {
      const node = supplierOffset + i;
      const edge = addFlowEdge(graph, node, customerOffset + j, totalSupply, costs[i][j]);
      refs[i][j] = { node, edge };
    }
  }

  let flow = 0;
  let totalCost = 0;
  let augmentations = 0;
  const nodeCount = graph.length;
  while (flow < totalSupply - EPS) {
    const dist = Array(nodeCount).fill(Infinity);
    const prevNode = Array(nodeCount).fill(-1);
    const prevEdge = Array(nodeCount).fill(-1);
    dist[source] = 0;
    for (let pass = 0; pass < nodeCount - 1; pass += 1) {
      let changed = false;
      for (let uNode = 0; uNode < nodeCount; uNode += 1) {
        if (!Number.isFinite(dist[uNode])) continue;
        graph[uNode].forEach((edge, edgeIndex) => {
          if (edge.cap <= EPS) return;
          const candidate = dist[uNode] + edge.cost;
          if (candidate < dist[edge.to] - EPS) {
            dist[edge.to] = candidate;
            prevNode[edge.to] = uNode;
            prevEdge[edge.to] = edgeIndex;
            changed = true;
          }
        });
      }
      if (!changed) break;
    }
    if (!Number.isFinite(dist[sink])) throw new Error('Transportation residual network cannot route all required flow.');
    let amount = totalSupply - flow;
    for (let nodeId = sink; nodeId !== source; nodeId = prevNode[nodeId]) {
      if (nodeId < 0 || prevNode[nodeId] < 0) throw new Error('Transportation path reconstruction failed.');
      amount = Math.min(amount, graph[prevNode[nodeId]][prevEdge[nodeId]].cap);
    }
    if (amount <= EPS) throw new Error('Transportation solver stalled on a zero-capacity augmentation.');
    for (let nodeId = sink; nodeId !== source; nodeId = prevNode[nodeId]) {
      const edge = graph[prevNode[nodeId]][prevEdge[nodeId]];
      edge.cap -= amount;
      graph[nodeId][edge.rev].cap += amount;
    }
    flow += amount;
    totalCost += amount * dist[sink];
    augmentations += 1;
    if (augmentations > 500) throw new Error('Transportation solver exceeded its bounded augmentation limit.');
  }

  const allocation = refs.map((row) => row.map(({ node, edge }) => graph[node][edge].initial - graph[node][edge].cap));
  const rowTotals = allocation.map((row) => row.reduce((a, b) => a + b, 0));
  const columnTotals = Array.from({ length: customers }, (_, j) => allocation.reduce((sum, row) => sum + row[j], 0));

  return {
    ast: matrixAst(allocation),
    display: `minimum transportation cost ≈ ${fixed(totalCost, 10)}`,
    exactness: 'approximate',
    warnings: ['Transportation is solved as a balanced min-cost flow in binary64 arithmetic. Fixed charges, route lower bounds and integer-only shipment constraints are outside this workflow.'],
    sections: [
      section('transport-result', 'Optimal transportation plan', [
        { label: 'Minimum total cost', display: fixed(totalCost, 12), tone: 'positive' },
        { label: 'Total shipped', display: fixed(flow, 10) },
        { label: 'Augmenting paths', display: String(augmentations) },
        { label: 'Allocation matrix', display: `[${allocation.map((row) => `[${row.map((v) => fixed(v, 8)).join(', ')}]`).join(', ')}]`, ast: matrixAst(allocation) },
      ]),
      section('transport-balance', 'Balance verification', [
        ...rowTotals.map((value, i) => ({ label: `Supplier ${i + 1}`, display: `${fixed(value)} / ${fixed(supply[i])}`, tone: Math.abs(value - supply[i]) <= 1e-7 ? 'positive' as const : 'warning' as const })),
        ...columnTotals.map((value, j) => ({ label: `Demand ${j + 1}`, display: `${fixed(value)} / ${fixed(demand[j])}`, tone: Math.abs(value - demand[j]) <= 1e-7 ? 'positive' as const : 'warning' as const })),
      ]),
    ],
  };
}

export function timeSeriesProfile(node: AstNode, maxLag = 6): WirtschaftsmathematikTransform {
  const values = numericSeries(node);
  if (!Number.isInteger(maxLag) || maxLag < 1 || maxLag > Math.min(50, values.length - 1)) throw new Error(`Maximum lag must be an integer from 1 through ${Math.min(50, values.length - 1)}.`);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, n - 1);
  const times = Array.from({ length: n }, (_, i) => i + 1);
  const tMean = (n + 1) / 2;
  const sxx = times.reduce((sum, t) => sum + (t - tMean) ** 2, 0);
  const slope = times.reduce((sum, t, i) => sum + (t - tMean) * (values[i] - mean), 0) / sxx;
  const intercept = mean - slope * tMean;
  const fitted = times.map((t) => intercept + slope * t);
  const sse = values.reduce((sum, value, i) => sum + (value - fitted[i]) ** 2, 0);
  const sst = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const r2 = sst <= EPS ? 1 : 1 - sse / sst;
  const rmse = Math.sqrt(sse / n);
  const denom = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const acf = Array.from({ length: maxLag }, (_, index) => {
    const lag = index + 1;
    const numerator = values.slice(lag).reduce((sum, value, i) => sum + (value - mean) * (values[i] - mean), 0);
    return denom <= EPS ? 0 : numerator / denom;
  });
  const nextTrend = intercept + slope * (n + 1);

  return {
    ast: vectorAst(acf),
    display: `trend yₜ ≈ ${fixed(intercept, 6)} + ${fixed(slope, 6)}t · next ≈ ${fixed(nextTrend, 8)}`,
    exactness: 'approximate',
    warnings: ['Trend and autocorrelation are descriptive diagnostics. The linear trend is not a causal model, and the next-period trend extrapolation has no automatic seasonality or structural-break correction.'],
    sections: [
      section('timeseries-summary', 'Time-series summary', [
        { label: 'Observations', display: String(n) },
        { label: 'Mean', display: fixed(mean, 10) },
        { label: 'Sample standard deviation', display: fixed(Math.sqrt(variance), 10) },
        { label: 'Last observation', display: fixed(values[n - 1], 10) },
      ]),
      section('timeseries-trend', 'Linear time trend', [
        { label: 'Intercept', display: fixed(intercept, 10) },
        { label: 'Slope per period', display: fixed(slope, 10) },
        { label: 'R²', display: fixed(r2, 8) },
        { label: 'Trend RMSE', display: fixed(rmse, 10) },
        { label: 'Next-period trend extrapolation', display: fixed(nextTrend, 10), tone: 'positive' },
      ]),
      section('timeseries-acf', 'Autocorrelation', acf.map((value, i) => ({ label: `Lag ${i + 1}`, display: fixed(value, 8), tone: Math.abs(value) >= 0.5 ? 'warning' : 'neutral' })), 'ACF uses the full-series mean and denominator Σ(yₜ−ȳ)².'),
    ],
  };
}

export function exponentialSmoothing(
  node: AstNode,
  alpha = 0.3,
  horizon = 1,
): WirtschaftsmathematikTransform {
  const values = numericSeries(node);
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1) throw new Error('Simple exponential smoothing requires 0 < α ≤ 1.');
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 100) throw new Error('Forecast horizon must be an integer from 1 through 100.');
  let level = values[0];
  let squaredError = 0;
  const fitted = [values[0]];
  const trace: MathResultFact[] = [{ label: 't=1', display: `level=${fixed(level, 8)}` }];
  for (let i = 1; i < values.length; i += 1) {
    const forecast = level;
    fitted.push(forecast);
    const error = values[i] - forecast;
    squaredError += error * error;
    level = alpha * values[i] + (1 - alpha) * level;
    if (trace.length < 12) trace.push({ label: `t=${i + 1}`, display: `forecast=${fixed(forecast, 8)}, level=${fixed(level, 8)}, error=${fixed(error, 8)}` });
  }
  const rmse = Math.sqrt(squaredError / Math.max(1, values.length - 1));
  const forecasts = Array(horizon).fill(level);

  return {
    ast: vectorAst(forecasts),
    display: `SES forecast ≈ ${fixed(level, 10)} for the next ${horizon} period${horizon === 1 ? '' : 's'}`,
    exactness: 'approximate',
    warnings: ['Simple exponential smoothing models a changing level only. It does not model explicit trend or seasonality; use the time-series profile to inspect trend/autocorrelation before interpreting forecasts.'],
    sections: [
      section('ses-result', 'Simple exponential smoothing', [
        { label: 'α', display: fixed(alpha, 6) },
        { label: 'Final level', display: fixed(level, 10), tone: 'positive' },
        { label: 'One-step RMSE', display: fixed(rmse, 10) },
        { label: `${horizon}-period forecast`, display: `[${forecasts.map((value) => fixed(value, 8)).join(', ')}]`, ast: vectorAst(forecasts) },
      ]),
      section('ses-trace', 'Smoothing trace', trace, 'Trace output is capped to the first 12 updates.'),
    ],
  };
}

function householderLeastSquares(A0: Matrix, b0: Vector): { x: Vector; diagonalRatio: number } {
  const A = A0.map((row) => [...row]);
  const b = [...b0];
  const rows = A.length;
  const cols = A[0].length;
  for (let k = 0; k < cols; k += 1) {
    const x = Array.from({ length: rows - k }, (_, i) => A[k + i][k]);
    const norm = Math.hypot(...x);
    if (norm <= 1e-14) throw new Error('Polynomial least squares is rank-deficient for the requested degree.');
    const alpha = x[0] >= 0 ? -norm : norm;
    const v = [...x];
    v[0] -= alpha;
    const vNorm = Math.hypot(...v);
    if (vNorm <= 1e-14) throw new Error('Polynomial least-squares Householder step became numerically singular.');
    for (let i = 0; i < v.length; i += 1) v[i] /= vNorm;
    for (let j = k; j < cols; j += 1) {
      let projection = 0;
      for (let i = 0; i < v.length; i += 1) projection += v[i] * A[k + i][j];
      for (let i = 0; i < v.length; i += 1) A[k + i][j] -= 2 * v[i] * projection;
    }
    let projection = 0;
    for (let i = 0; i < v.length; i += 1) projection += v[i] * b[k + i];
    for (let i = 0; i < v.length; i += 1) b[k + i] -= 2 * v[i] * projection;
  }
  const x = Array(cols).fill(0);
  for (let i = cols - 1; i >= 0; i -= 1) {
    if (Math.abs(A[i][i]) <= 1e-14) throw new Error('Polynomial least squares is numerically rank-deficient.');
    let rhs = b[i];
    for (let j = i + 1; j < cols; j += 1) rhs -= A[i][j] * x[j];
    x[i] = rhs / A[i][i];
  }
  const diagonal = Array.from({ length: cols }, (_, i) => Math.abs(A[i][i]));
  return { x, diagonalRatio: Math.max(...diagonal) / Math.min(...diagonal) };
}

export function polynomialLeastSquares(
  node: AstNode,
  degree = 2,
  predictAt?: number,
): WirtschaftsmathematikTransform {
  const points = numericMatrix(node, 'Polynomial least squares');
  if (points.some((row) => row.length !== 2) || points.length < 2) throw new Error('Polynomial least squares requires an n×2 matrix [[x1,y1], …].');
  if (points.length > 2000) throw new Error('Post-v2 P7 polynomial fitting is bounded to 2,000 observations.');
  if (!Number.isInteger(degree) || degree < 1 || degree > 6 || degree >= points.length) throw new Error('Polynomial degree must be an integer from 1 through min(6, n−1).');
  const X = points.map(([x]) => Array.from({ length: degree + 1 }, (_, power) => x ** power));
  const y = points.map((row) => row[1]);
  const solved = householderLeastSquares(X, y);
  const fitted = X.map((row) => dot(row, solved.x));
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  const sse = y.reduce((sum, value, i) => sum + (value - fitted[i]) ** 2, 0);
  const sst = y.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const r2 = sst <= EPS ? 1 : 1 - sse / sst;
  const rmse = Math.sqrt(sse / y.length);
  const ast = polynomialAst(solved.x);
  const prediction = predictAt === undefined ? undefined : solved.x.reduce((sum, coefficient, power) => sum + coefficient * predictAt ** power, 0);

  return {
    ast,
    display: `p(x) ≈ ${astToPlainText(ast)} · R²=${fixed(r2, 6)}`,
    exactness: 'approximate',
    warnings: [
      'Polynomial regression is fitted with Householder QR rather than normal equations, but high degree or poorly scaled x-values can still be ill-conditioned.',
      'R² measures in-sample fit and does not by itself establish predictive validity.',
    ],
    sections: [
      section('polyfit-result', 'Polynomial least-squares fit', [
        { label: 'Degree', display: String(degree) },
        { label: 'Coefficients [β₀…βd]', display: `[${solved.x.map((value) => fixed(value, 10)).join(', ')}]`, ast: vectorAst(solved.x) },
        { label: 'Model', display: astToPlainText(ast), ast },
        { label: 'R²', display: fixed(r2, 8), tone: r2 >= 0.8 ? 'positive' : 'neutral' },
        { label: 'RMSE', display: fixed(rmse, 10) },
        { label: 'QR diagonal ratio', display: fixed(solved.diagonalRatio, 8), tone: solved.diagonalRatio > 1e8 ? 'warning' : 'neutral' },
        ...(prediction === undefined ? [] : [{ label: `Prediction at x=${fixed(predictAt!, 8)}`, display: fixed(prediction, 10), tone: 'positive' as const }]),
      ]),
    ],
  };
}
