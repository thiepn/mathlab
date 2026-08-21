import type { AstNode } from './ast';
import {
  factorAst,
  polynomialCoefficient,
  polynomialDegree,
  rationalValue,
  substituteAst,
  symbolsIn,
  toPolynomial,
} from './algebra';
import { differentiateAst, evaluateAt, stationaryPoints } from './calculus';
import { astToPlainText } from './format';
import { div, rationalToNumber } from './rational';
import { solveEquation } from './solve';

export interface GraphViewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphSegment {
  points: GraphPoint[];
}

export type GraphAnnotationKind = 'zero' | 'extremum' | 'inflection' | 'vertical-asymptote' | 'horizontal-asymptote' | 'hole';

export interface GraphAnnotation {
  id: string;
  kind: GraphAnnotationKind;
  label: string;
  exact: boolean;
  x?: number;
  y?: number;
  value?: number;
  exactX?: string;
  exactY?: string;
}

export interface GraphSeriesModel {
  id: string;
  name: string;
  source: string;
  variable: string;
  ast: AstNode;
  segments: GraphSegment[];
  annotations: GraphAnnotation[];
  warnings: string[];
  sampleCount: number;
}

export interface GraphSeriesInput {
  id: string;
  name: string;
  source: string;
  variable: string;
  ast: AstNode;
  bindings?: Array<{ name: string; ast: AstNode }>;
}

export interface GraphBuildOptions {
  samples?: number;
  detectNumericZeros?: boolean;
}

const DEFAULT_SAMPLES = 641;
const MAX_ABS_VALUE = 1e12;
const EPSILON = 1e-10;

function finite(value: number): number {
  return Number.isFinite(value) && Math.abs(value) <= MAX_ABS_VALUE ? value : Number.NaN;
}

export function evaluateNumeric(node: AstNode, variable: string, x: number): number {
  switch (node.type) {
    case 'number': return finite(Number(node.value));
    case 'symbol': {
      if (node.name === variable) return x;
      if (node.name === 'pi') return Math.PI;
      if (node.name === 'e') return Math.E;
      if (node.name === 'infinity') return Number.POSITIVE_INFINITY;
      return Number.NaN;
    }
    case 'unary': {
      const value = evaluateNumeric(node.operand, variable, x);
      return finite(node.operator === '-' ? -value : value);
    }
    case 'binary': {
      const left = evaluateNumeric(node.left, variable, x);
      const right = evaluateNumeric(node.right, variable, x);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.NaN;
      switch (node.operator) {
        case '+': return finite(left + right);
        case '-': return finite(left - right);
        case '*': return finite(left * right);
        case '/': return Math.abs(right) <= Number.EPSILON ? Number.NaN : finite(left / right);
        case '^': return finite(Math.pow(left, right));
      }
    }
    case 'call': {
      if (node.args.length !== 1) return Number.NaN;
      const arg = evaluateNumeric(node.args[0], variable, x);
      if (!Number.isFinite(arg)) return Number.NaN;
      let value: number;
      switch (node.name) {
        case 'sin': value = Math.sin(arg); break;
        case 'cos': value = Math.cos(arg); break;
        case 'tan': value = Math.tan(arg); break;
        case 'asin': value = Math.asin(arg); break;
        case 'acos': value = Math.acos(arg); break;
        case 'atan': value = Math.atan(arg); break;
        case 'sinh': value = Math.sinh(arg); break;
        case 'cosh': value = Math.cosh(arg); break;
        case 'tanh': value = Math.tanh(arg); break;
        case 'exp': value = Math.exp(arg); break;
        case 'ln': value = Math.log(arg); break;
        case 'log': value = Math.log10(arg); break;
        case 'sqrt': value = Math.sqrt(arg); break;
        case 'abs': value = Math.abs(arg); break;
        default: return Number.NaN;
      }
      return finite(value);
    }
    case 'definition': return evaluateNumeric(node.right, variable, x);
    case 'equation':
    case 'comparison':
    case 'matrix':
    case 'system':
    case 'set': return Number.NaN;
  }
}

export function inlineGraphBindings(ast: AstNode, bindings: GraphSeriesInput['bindings']): AstNode {
  if (!bindings?.length) return ast;
  let resolved = ast;
  for (let pass = 0; pass < bindings.length; pass += 1) {
    let changed = false;
    for (const binding of bindings) {
      const next = substituteAst(resolved, binding.name, binding.ast);
      if (JSON.stringify(next) !== JSON.stringify(resolved)) changed = true;
      resolved = next;
    }
    if (!changed) break;
  }
  return resolved;
}

function numericAst(node: AstNode): number | null {
  const exact = rationalValue(node);
  if (exact) return rationalToNumber(exact);
  if (node.type === 'symbol') {
    if (node.name === 'pi') return Math.PI;
    if (node.name === 'e') return Math.E;
    return null;
  }
  if (node.type === 'unary') {
    const value = numericAst(node.operand);
    return value === null ? null : node.operator === '-' ? -value : value;
  }
  if (node.type === 'binary') {
    const left = numericAst(node.left); const right = numericAst(node.right);
    if (left === null || right === null) return null;
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return right === 0 ? null : left / right;
    if (node.operator === '^') {
      const value = Math.pow(left, right);
      return Number.isFinite(value) ? value : null;
    }
  }
  if (node.type === 'call' && node.args.length === 1) {
    const arg = numericAst(node.args[0]);
    if (arg === null) return null;
    if (node.name === 'sqrt' && arg >= 0) return Math.sqrt(arg);
  }
  return null;
}

function productFactors(node: AstNode): AstNode[] {
  return node.type === 'binary' && node.operator === '*' ? [...productFactors(node.left), ...productFactors(node.right)] : [node];
}

function exactZeroRoots(ast: AstNode, variable: string): AstNode[] {
  const direct = solveEquation({ type: 'equation', left: ast, right: { type: 'number', value: '0' } }, variable);
  if (direct.status === 'solved') return direct.solutions;
  if (direct.status !== 'unsupported') return [];
  const factored = factorAst(ast, variable);
  if (JSON.stringify(factored) === JSON.stringify(ast)) return [];
  const roots: AstNode[] = [];
  for (const factor of productFactors(factored).filter((item) => symbolsIn(item).includes(variable))) {
    const solved = solveEquation({ type: 'equation', left: factor, right: { type: 'number', value: '0' } }, variable);
    if (solved.status !== 'solved') return [];
    roots.push(...solved.solutions);
  }
  return roots.filter((root, index, all) => all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(root)) === index);
}

function exactRootAnnotations(ast: AstNode, variable: string): GraphAnnotation[] {
  return exactZeroRoots(ast, variable).flatMap((root, index) => {
    const x = numericAst(root);
    if (x === null || !Number.isFinite(x)) return [];
    return [{
      id: `zero-exact-${index}-${astToPlainText(root)}`,
      kind: 'zero' as const,
      label: `${variable} = ${astToPlainText(root)}`,
      exact: true,
      x,
      y: 0,
      exactX: astToPlainText(root),
      exactY: '0',
    }];
  });
}

function exactExtremaAnnotations(ast: AstNode, variable: string): GraphAnnotation[] {
  try {
    return stationaryPoints(ast, variable).flatMap((point, index) => {
      const x = numericAst(point.x); const y = numericAst(point.y);
      if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) return [];
      return [{
        id: `extremum-${index}-${astToPlainText(point.x)}`,
        kind: 'extremum' as const,
        label: point.classification,
        exact: true,
        x,
        y,
        exactX: astToPlainText(point.x),
        exactY: astToPlainText(point.y),
      }];
    });
  } catch {
    return [];
  }
}

function inflectionAnnotations(ast: AstNode, variable: string): GraphAnnotation[] {
  try {
    const first = differentiateAst(ast, variable).ast;
    const second = differentiateAst(first, variable).ast;
    const solved = solveEquation({ type: 'equation', left: second, right: { type: 'number', value: '0' } }, variable);
    if (solved.status !== 'solved') return [];
    return solved.solutions.flatMap((root, index) => {
      const x = numericAst(root);
      if (x === null || !Number.isFinite(x)) return [];
      const exactYAst = evaluateAt(ast, variable, root);
      const y = numericAst(exactYAst);
      if (y === null || !Number.isFinite(y)) return [];
      const delta = Math.max(1e-4, Math.abs(x) * 1e-4);
      const left = evaluateNumeric(second, variable, x - delta);
      const right = evaluateNumeric(second, variable, x + delta);
      if (!Number.isFinite(left) || !Number.isFinite(right) || Math.sign(left) === Math.sign(right)) return [];
      return [{
        id: `inflection-${index}-${astToPlainText(root)}`,
        kind: 'inflection' as const,
        label: 'inflection point',
        exact: true,
        x,
        y,
        exactX: astToPlainText(root),
        exactY: astToPlainText(exactYAst),
      }];
    });
  } catch {
    return [];
  }
}

function denominatorDiscontinuities(ast: AstNode, variable: string): GraphAnnotation[] {
  const out: GraphAnnotation[] = [];
  const visit = (node: AstNode) => {
    if (node.type === 'binary') {
      if (node.operator === '/') {
        const solved = solveEquation({ type: 'equation', left: node.right, right: { type: 'number', value: '0' } }, variable);
        if (solved.status === 'solved') {
          for (const root of solved.solutions) {
            const x = numericAst(root);
            if (x === null || !Number.isFinite(x)) continue;
            const numerator = evaluateNumeric(node.left, variable, x);
            const kind: GraphAnnotationKind = Number.isFinite(numerator) && Math.abs(numerator) <= 1e-8 ? 'hole' : 'vertical-asymptote';
            const rootText = astToPlainText(root);
            out.push({
              id: `${kind}-${rootText}-${out.length}`,
              kind,
              label: kind === 'hole' ? `hole at ${variable} = ${rootText}` : `${variable} = ${rootText}`,
              exact: true,
              x,
              exactX: rootText,
            });
          }
        }
      }
      visit(node.left); visit(node.right);
    } else if (node.type === 'unary') visit(node.operand);
    else if (node.type === 'call') node.args.forEach(visit);
  };
  visit(ast);
  return out;
}

function horizontalAsymptote(ast: AstNode, variable: string): GraphAnnotation[] {
  if (ast.type !== 'binary' || ast.operator !== '/') return [];
  const numerator = toPolynomial(ast.left, variable); const denominator = toPolynomial(ast.right, variable);
  if (!numerator || !denominator) return [];
  const nDegree = polynomialDegree(numerator); const dDegree = polynomialDegree(denominator);
  let y: number | null = null;
  let exactY = '';
  if (nDegree < dDegree) {
    y = 0; exactY = '0';
  } else if (nDegree === dDegree) {
    const nLead = polynomialCoefficient(numerator, nDegree); const dLead = polynomialCoefficient(denominator, dDegree);
    if (dLead.n === 0n) return [];
    y = rationalToNumber(nLead) / rationalToNumber(dLead);
    const ratio = div(nLead, dLead);
    exactY = ratio.d === 1n ? String(ratio.n) : `${ratio.n}/${ratio.d}`;
  }
  if (y === null || !Number.isFinite(y)) return [];
  return [{ id: `horizontal-${exactY}`, kind: 'horizontal-asymptote', label: `y = ${exactY}`, exact: true, y, value: y, exactY }];
}

function mergeAnnotations(items: GraphAnnotation[]): GraphAnnotation[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.x === undefined ? '' : item.x.toPrecision(12)}:${item.y === undefined ? '' : item.y.toPrecision(12)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}


const graphAnalysisCache = new Map<string, GraphAnnotation[]>();

function cachedExactAnnotations(ast: AstNode, variable: string): GraphAnnotation[] {
  const key = `${variable}:${JSON.stringify(ast)}`;
  const cached = graphAnalysisCache.get(key);
  if (cached) return cached;
  const annotations = mergeAnnotations([
    ...exactRootAnnotations(ast, variable),
    ...exactExtremaAnnotations(ast, variable),
    ...inflectionAnnotations(ast, variable),
    ...denominatorDiscontinuities(ast, variable),
    ...horizontalAsymptote(ast, variable),
  ]);
  if (graphAnalysisCache.size >= 128) graphAnalysisCache.delete(graphAnalysisCache.keys().next().value as string);
  graphAnalysisCache.set(key, annotations);
  return annotations;
}

function knownBreaks(annotations: GraphAnnotation[]): number[] {
  return annotations
    .filter((item) => (item.kind === 'vertical-asymptote' || item.kind === 'hole') && item.x !== undefined)
    .map((item) => item.x!)
    .sort((a, b) => a - b);
}

function crossesBreak(a: number, b: number, breaks: number[]): boolean {
  return breaks.some((value) => value > Math.min(a, b) && value < Math.max(a, b));
}

function shouldBreak(previous: GraphPoint, current: GraphPoint, midpoint: GraphPoint | null, viewport: GraphViewport): boolean {
  const ySpan = viewport.yMax - viewport.yMin;
  if (!Number.isFinite(previous.y) || !Number.isFinite(current.y)) return true;
  if (midpoint && !Number.isFinite(midpoint.y)) return true;
  const jump = Math.abs(current.y - previous.y);
  const bothFar = Math.abs(previous.y) > ySpan * 2 && Math.abs(current.y) > ySpan * 2;
  if (jump > ySpan * 5 && bothFar) return true;
  if (midpoint) {
    const linearMid = (previous.y + current.y) / 2;
    if (Math.abs(midpoint.y - linearMid) > ySpan * 6 && Math.abs(midpoint.y) > ySpan * 2) return true;
  }
  return false;
}

function sampleSegments(ast: AstNode, variable: string, viewport: GraphViewport, samples: number, breaks: number[]): GraphSegment[] {
  const segments: GraphSegment[] = [];
  let current: GraphPoint[] = [];
  const step = (viewport.xMax - viewport.xMin) / Math.max(2, samples - 1);
  const breakTolerance = Math.max(Math.abs(step) * 0.12, 1e-12);
  let previous: GraphPoint | null = null;

  const flush = () => {
    if (current.length >= 2) segments.push({ points: current });
    current = [];
    previous = null;
  };

  for (let index = 0; index < samples; index += 1) {
    const x = index === samples - 1 ? viewport.xMax : viewport.xMin + index * step;
    const nearBreak = breaks.some((value) => Math.abs(value - x) <= breakTolerance);
    const y = nearBreak ? Number.NaN : evaluateNumeric(ast, variable, x);
    if (!Number.isFinite(y)) { flush(); continue; }
    const point = { x, y };
    if (previous) {
      if (crossesBreak(previous.x, x, breaks)) { flush(); }
      else {
        const midX = (previous.x + x) / 2;
        const midpoint = { x: midX, y: evaluateNumeric(ast, variable, midX) };
        if (shouldBreak(previous, point, midpoint, viewport)) flush();
      }
    }
    current.push(point);
    previous = point;
  }
  flush();
  return segments;
}

function bisectZero(ast: AstNode, variable: string, leftX: number, rightX: number): number | null {
  let left = leftX; let right = rightX;
  let leftY = evaluateNumeric(ast, variable, left); let rightY = evaluateNumeric(ast, variable, right);
  if (!Number.isFinite(leftY) || !Number.isFinite(rightY) || Math.sign(leftY) === Math.sign(rightY)) return null;
  for (let i = 0; i < 45; i += 1) {
    const mid = (left + right) / 2; const midY = evaluateNumeric(ast, variable, mid);
    if (!Number.isFinite(midY)) return null;
    if (Math.abs(midY) < 1e-12) return mid;
    if (Math.sign(midY) === Math.sign(leftY)) { left = mid; leftY = midY; }
    else { right = mid; rightY = midY; }
  }
  return (left + right) / 2;
}

function numericZeroAnnotations(ast: AstNode, variable: string, segments: GraphSegment[], exact: GraphAnnotation[], viewport: GraphViewport): GraphAnnotation[] {
  const out: GraphAnnotation[] = [];
  const xTolerance = (viewport.xMax - viewport.xMin) / 500;
  for (const segment of segments) {
    for (let i = 1; i < segment.points.length; i += 1) {
      const a = segment.points[i - 1]; const b = segment.points[i];
      if (a.y === 0) {
        if (!exact.some((item) => item.x !== undefined && Math.abs(item.x - a.x) < xTolerance)) out.push({ id: `zero-numeric-${a.x}`, kind: 'zero', label: `${variable} ≈ ${formatNumeric(a.x)}`, exact: false, x: a.x, y: 0 });
        continue;
      }
      if (Math.sign(a.y) === Math.sign(b.y)) continue;
      const x = bisectZero(ast, variable, a.x, b.x);
      if (x === null || exact.some((item) => item.x !== undefined && Math.abs(item.x - x) < xTolerance) || out.some((item) => item.x !== undefined && Math.abs(item.x - x) < xTolerance)) continue;
      out.push({ id: `zero-numeric-${x}`, kind: 'zero', label: `${variable} ≈ ${formatNumeric(x)}`, exact: false, x, y: 0 });
    }
  }
  return out;
}

export function formatNumeric(value: number, digits = 6): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : value < 0 ? '−∞' : 'undefined';
  if (Math.abs(value) < 1e-12) return '0';
  if (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-4) return value.toExponential(Math.min(4, digits));
  return Number(value.toPrecision(digits)).toString();
}

export function buildGraphSeries(input: GraphSeriesInput, viewport: GraphViewport, options: GraphBuildOptions = {}): GraphSeriesModel {
  if (!(viewport.xMin < viewport.xMax) || !(viewport.yMin < viewport.yMax)) throw new Error('Graph viewport bounds must be increasing.');
  const ast = inlineGraphBindings(input.ast, input.bindings);
  const annotations = cachedExactAnnotations(ast, input.variable);
  const exactZeros = annotations.filter((item) => item.kind === 'zero' && item.exact);
  const samples = Math.max(81, Math.min(2401, Math.round(options.samples ?? DEFAULT_SAMPLES)));
  const segments = sampleSegments(ast, input.variable, viewport, samples, knownBreaks(annotations));
  const numericZeros = options.detectNumericZeros === false ? [] : numericZeroAnnotations(ast, input.variable, segments, exactZeros, viewport);
  const finalAnnotations = mergeAnnotations([...annotations, ...numericZeros]);
  const warnings: string[] = [];
  if (segments.length === 0) warnings.push('No real finite values were found in the current viewport.');
  if (segments.length > 18) warnings.push('This function contains many discontinuities in the current viewport; rendering is intentionally segmented.');
  return {
    id: input.id,
    name: input.name,
    source: input.source,
    variable: input.variable,
    ast,
    segments,
    annotations: finalAnnotations,
    warnings,
    sampleCount: samples,
  };
}

export function defaultGraphViewport(): GraphViewport {
  return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
}

export function zoomViewport(viewport: GraphViewport, factor: number, centerX: number, centerY: number): GraphViewport {
  const safeFactor = Math.min(5, Math.max(0.1, factor));
  return {
    xMin: centerX + (viewport.xMin - centerX) * safeFactor,
    xMax: centerX + (viewport.xMax - centerX) * safeFactor,
    yMin: centerY + (viewport.yMin - centerY) * safeFactor,
    yMax: centerY + (viewport.yMax - centerY) * safeFactor,
  };
}

export function panViewport(viewport: GraphViewport, deltaX: number, deltaY: number): GraphViewport {
  return {
    xMin: viewport.xMin + deltaX,
    xMax: viewport.xMax + deltaX,
    yMin: viewport.yMin + deltaY,
    yMax: viewport.yMax + deltaY,
  };
}

export function fitGraphViewport(inputs: GraphSeriesInput[], xViewport: Pick<GraphViewport, 'xMin' | 'xMax'> = { xMin: -10, xMax: 10 }): GraphViewport {
  const probe: GraphViewport = { ...xViewport, yMin: -10, yMax: 10 };
  const values: number[] = [];
  for (const input of inputs.slice(0, 8)) {
    const ast = inlineGraphBindings(input.ast, input.bindings);
    const count = 241;
    for (let index = 0; index < count; index += 1) {
      const x = probe.xMin + (probe.xMax - probe.xMin) * index / (count - 1);
      const y = evaluateNumeric(ast, input.variable, x);
      if (Number.isFinite(y) && Math.abs(y) < 1e6) values.push(y);
    }
  }
  if (!values.length) return { ...probe };
  values.sort((a, b) => a - b);
  const low = values[Math.floor(values.length * 0.03)] ?? values[0];
  const high = values[Math.ceil(values.length * 0.97) - 1] ?? values[values.length - 1];
  let min = Math.min(low, high); let max = Math.max(low, high);
  if (Math.abs(max - min) < 1e-8) { min -= 1; max += 1; }
  const padding = Math.max(0.5, (max - min) * 0.12);
  return { xMin: probe.xMin, xMax: probe.xMax, yMin: min - padding, yMax: max + padding };
}

export function niceTicks(min: number, max: number, target = 8): number[] {
  const span = max - min;
  if (!(span > 0) || !Number.isFinite(span)) return [];
  const raw = span / Math.max(2, target);
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = multiplier * power;
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= max + step * 1e-9 && ticks.length < 100; value += step) {
    ticks.push(Math.abs(value) < EPSILON ? 0 : Number(value.toPrecision(12)));
  }
  return ticks;
}
