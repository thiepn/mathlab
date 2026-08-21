import type { AstNode } from './ast';
import { rationalToAst, rationalValue, sqrtRationalAst } from './algebra';
import {
  ONE, ZERO, add, div, eq, isOne, isZero, mul, neg, pow, rat, sub, type Rational,
} from './rational';

export type LinearScalar = { kind: 'scalar'; value: Rational };
export type LinearVector = { kind: 'vector'; values: Rational[] };
export type LinearMatrix = { kind: 'matrix'; values: Rational[][] };
export type LinearValue = LinearScalar | LinearVector | LinearMatrix;

export interface LinearStep {
  beforeAst: AstNode;
  afterAst: AstNode;
  rule: string;
  explanation: string;
}

export interface RrefResult {
  matrix: Rational[][];
  pivots: number[];
  steps: LinearStep[];
}

export interface SubspaceAnalysis {
  rows: number;
  columns: number;
  rank: number;
  nullity: number;
  pivots: number[];
  columnBasis: Rational[][];
  rowBasis: Rational[][];
  nullBasis: Rational[][];
  steps: LinearStep[];
}

function cloneMatrix(matrix: Rational[][]): Rational[][] {
  return matrix.map((row) => row.map((value) => ({ ...value })));
}

function assertRectangular(matrix: Rational[][]): void {
  if (!matrix.length || !matrix[0]?.length) throw new Error('A matrix cannot be empty.');
  const width = matrix[0].length;
  if (matrix.some((row) => row.length !== width)) throw new Error('All matrix rows must have the same length.');
}

function matrixAst(values: Rational[][]): AstNode {
  return { type: 'matrix', rows: values.map((row) => row.map(rationalToAst)) };
}

function vectorAst(values: Rational[]): AstNode {
  return { type: 'matrix', rows: [values.map(rationalToAst)] };
}

export function linearValueToAst(value: LinearValue): AstNode {
  if (value.kind === 'scalar') return rationalToAst(value.value);
  if (value.kind === 'vector') return vectorAst(value.values);
  return matrixAst(value.values);
}

export function matrixToAst(values: Rational[][]): AstNode { return matrixAst(values); }
export function vectorToAst(values: Rational[]): AstNode { return vectorAst(values); }

function scalarFromAst(node: AstNode): Rational | null {
  return rationalValue(node);
}

function collectionFromMatrixAst(node: Extract<AstNode,{type:'matrix'}>): LinearVector | LinearMatrix {
  const rows = node.rows.map((row) => row.map((cell) => {
    const value = scalarFromAst(cell);
    if (!value) throw new Error('P7 exact linear algebra requires rational matrix/vector entries after workspace definitions are resolved.');
    return value;
  }));
  assertRectangular(rows);
  return rows.length === 1 ? { kind: 'vector', values: rows[0] } : { kind: 'matrix', values: rows };
}

function sameVectorLength(a: Rational[], b: Rational[]) {
  if (a.length !== b.length) throw new Error(`Vector dimensions do not match (${a.length} and ${b.length}).`);
}

function sameMatrixShape(a: Rational[][], b: Rational[][]) {
  assertRectangular(a); assertRectangular(b);
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error(`Matrix dimensions do not match (${a.length}×${a[0].length} and ${b.length}×${b[0].length}).`);
  }
}

function scaleVector(values: Rational[], factor: Rational): Rational[] { return values.map((value) => mul(value, factor)); }
function scaleMatrix(values: Rational[][], factor: Rational): Rational[][] { return values.map((row) => scaleVector(row, factor)); }

function addValues(a: LinearValue, b: LinearValue, subtract = false): LinearValue {
  const combine = subtract ? sub : add;
  if (a.kind === 'scalar' && b.kind === 'scalar') return { kind: 'scalar', value: combine(a.value, b.value) };
  if (a.kind === 'vector' && b.kind === 'vector') {
    sameVectorLength(a.values, b.values);
    return { kind: 'vector', values: a.values.map((value, index) => combine(value, b.values[index])) };
  }
  if (a.kind === 'matrix' && b.kind === 'matrix') {
    sameMatrixShape(a.values, b.values);
    return { kind: 'matrix', values: a.values.map((row, r) => row.map((value, c) => combine(value, b.values[r][c]))) };
  }
  throw new Error('Addition and subtraction require two scalars, two equal-length vectors, or two matrices with identical dimensions.');
}

function dot(a: Rational[], b: Rational[]): Rational {
  sameVectorLength(a, b);
  return a.reduce((sum, value, index) => add(sum, mul(value, b[index])), ZERO);
}

function multiplyMatrices(a: Rational[][], b: Rational[][]): Rational[][] {
  assertRectangular(a); assertRectangular(b);
  const inner = a[0].length;
  if (inner !== b.length) throw new Error(`Matrix product is undefined: ${a.length}×${inner} cannot multiply ${b.length}×${b[0].length}.`);
  const out: Rational[][] = Array.from({ length: a.length }, () => Array.from({ length: b[0].length }, () => ZERO));
  for (let r = 0; r < a.length; r += 1) {
    for (let c = 0; c < b[0].length; c += 1) {
      let value = ZERO;
      for (let k = 0; k < inner; k += 1) value = add(value, mul(a[r][k], b[k][c]));
      out[r][c] = value;
    }
  }
  return out;
}

function multiplyValues(a: LinearValue, b: LinearValue): LinearValue {
  if (a.kind === 'scalar' && b.kind === 'scalar') return { kind: 'scalar', value: mul(a.value, b.value) };
  if (a.kind === 'scalar' && b.kind === 'vector') return { kind: 'vector', values: scaleVector(b.values, a.value) };
  if (a.kind === 'vector' && b.kind === 'scalar') return { kind: 'vector', values: scaleVector(a.values, b.value) };
  if (a.kind === 'scalar' && b.kind === 'matrix') return { kind: 'matrix', values: scaleMatrix(b.values, a.value) };
  if (a.kind === 'matrix' && b.kind === 'scalar') return { kind: 'matrix', values: scaleMatrix(a.values, b.value) };
  if (a.kind === 'vector' && b.kind === 'vector') return { kind: 'scalar', value: dot(a.values, b.values) };
  if (a.kind === 'matrix' && b.kind === 'vector') {
    if (a.values[0].length !== b.values.length) throw new Error(`Matrix-vector product is undefined: ${a.values.length}×${a.values[0].length} cannot multiply a vector of length ${b.values.length}.`);
    return { kind: 'vector', values: a.values.map((row) => dot(row, b.values)) };
  }
  if (a.kind === 'vector' && b.kind === 'matrix') {
    if (a.values.length !== b.values.length) throw new Error(`Vector-matrix product is undefined: vector length ${a.values.length} does not match ${b.values.length} matrix rows.`);
    const values: Rational[] = [];
    for (let c = 0; c < b.values[0].length; c += 1) {
      let value = ZERO;
      for (let r = 0; r < b.values.length; r += 1) value = add(value, mul(a.values[r], b.values[r][c]));
      values.push(value);
    }
    return { kind: 'vector', values };
  }
  if (a.kind === 'matrix' && b.kind === 'matrix') return { kind: 'matrix', values: multiplyMatrices(a.values, b.values) };
  throw new Error('Unsupported linear-algebra product.');
}

function divideValue(a: LinearValue, b: LinearValue): LinearValue {
  if (b.kind !== 'scalar') throw new Error('P7 linear algebra only permits division by a nonzero scalar.');
  if (isZero(b.value)) throw new Error('Division by zero.');
  if (a.kind === 'scalar') return { kind: 'scalar', value: div(a.value, b.value) };
  if (a.kind === 'vector') return { kind: 'vector', values: scaleVector(a.values, div(ONE, b.value)) };
  return { kind: 'matrix', values: scaleMatrix(a.values, div(ONE, b.value)) };
}

function identity(size: number): Rational[][] {
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => r === c ? ONE : ZERO));
}

function powerMatrix(values: Rational[][], exponent: number): Rational[][] {
  assertRectangular(values);
  if (values.length !== values[0].length) throw new Error('Matrix powers require a square matrix.');
  if (!Number.isInteger(exponent)) throw new Error('Exact matrix powers require an integer exponent.');
  if (Math.abs(exponent) > 64) throw new Error('P7 limits exact matrix powers to |n| ≤ 64.');
  let base = exponent < 0 ? inverseMatrix(values).matrix : cloneMatrix(values);
  let exp = Math.abs(exponent);
  let out = identity(values.length);
  while (exp > 0) {
    if (exp % 2 === 1) out = multiplyMatrices(out, base);
    exp = Math.floor(exp / 2);
    if (exp) base = multiplyMatrices(base, base);
  }
  return out;
}

export function evaluateLinearAst(node: AstNode): LinearValue {
  const scalar = scalarFromAst(node);
  if (scalar) return { kind: 'scalar', value: scalar };
  if (node.type === 'matrix') return collectionFromMatrixAst(node);
  if (node.type === 'unary') {
    const operand = evaluateLinearAst(node.operand);
    if (node.operator === '+') return operand;
    if (operand.kind === 'scalar') return { kind: 'scalar', value: neg(operand.value) };
    if (operand.kind === 'vector') return { kind: 'vector', values: scaleVector(operand.values, rat(-1n)) };
    return { kind: 'matrix', values: scaleMatrix(operand.values, rat(-1n)) };
  }
  if (node.type === 'binary') {
    const left = evaluateLinearAst(node.left);
    if (node.operator === '^') {
      const right = evaluateLinearAst(node.right);
      if (right.kind !== 'scalar' || right.value.d !== 1n) throw new Error('P7 matrix powers require an integer exponent.');
      const exponent = Number(right.value.n);
      if (!Number.isSafeInteger(exponent)) throw new Error('Matrix exponent is too large.');
      if (left.kind === 'scalar') return { kind: 'scalar', value: pow(left.value, exponent) };
      if (left.kind !== 'matrix') throw new Error('Vector powers are not defined.');
      return { kind: 'matrix', values: powerMatrix(left.values, exponent) };
    }
    const right = evaluateLinearAst(node.right);
    if (node.operator === '+') return addValues(left, right);
    if (node.operator === '-') return addValues(left, right, true);
    if (node.operator === '*') return multiplyValues(left, right);
    if (node.operator === '/') return divideValue(left, right);
  }
  throw new Error('P7 exact linear algebra supports rational scalars, vectors, matrices, +, −, scalar division, products, dot products, and integer matrix powers.');
}

export function asMatrix(value: LinearValue): Rational[][] {
  if (value.kind !== 'matrix') throw new Error('This operation requires a matrix.');
  assertRectangular(value.values);
  return cloneMatrix(value.values);
}

export function asVector(value: LinearValue): Rational[] {
  if (value.kind !== 'vector') throw new Error('This operation requires a vector.');
  return value.values.map((item) => ({ ...item }));
}

export function vectorNorm(values: Rational[]): AstNode {
  if (!values.length) throw new Error('A vector cannot be empty.');
  const squared = values.reduce((sum, value) => add(sum, mul(value, value)), ZERO);
  return sqrtRationalAst(squared);
}

export function dotProduct(a: Rational[], b: Rational[]): Rational { return dot(a, b); }

function matricesEqual(before: Rational[][], after: Rational[][]): boolean {
  return before.length === after.length && before.every((row, r) => row.length === after[r]?.length && row.every((value, c) => eq(value, after[r][c])));
}

function rowOperationStep(before: Rational[][], after: Rational[][], rule: string, explanation: string): LinearStep | null {
  if (matricesEqual(before, after)) return null;
  return { beforeAst: matrixAst(before), afterAst: matrixAst(after), rule, explanation };
}

export function rrefMatrix(input: Rational[][]): RrefResult {
  assertRectangular(input);
  if (input.length > 20 || input[0].length > 30) throw new Error('P7 exact RREF is limited to matrices up to 20×30 to keep derivations responsive.');
  const matrix = cloneMatrix(input);
  const pivots: number[] = [];
  const steps: LinearStep[] = [];
  let pivotRow = 0;

  for (let column = 0; column < matrix[0].length && pivotRow < matrix.length; column += 1) {
    let candidate = pivotRow;
    while (candidate < matrix.length && isZero(matrix[candidate][column])) candidate += 1;
    if (candidate === matrix.length) continue;

    if (candidate !== pivotRow) {
      const before = cloneMatrix(matrix);
      [matrix[pivotRow], matrix[candidate]] = [matrix[candidate], matrix[pivotRow]];
      const step = rowOperationStep(before, matrix, 'row-swap', `Swap R${pivotRow + 1} and R${candidate + 1} to place a nonzero pivot in column ${column + 1}.`);
      if (step) steps.push(step);
    }

    const pivot = matrix[pivotRow][column];
    if (!isOne(pivot)) {
      const before = cloneMatrix(matrix);
      matrix[pivotRow] = matrix[pivotRow].map((value) => div(value, pivot));
      const step = rowOperationStep(before, matrix, 'scale-pivot-row', `Scale R${pivotRow + 1} by the reciprocal of its pivot so the pivot becomes 1.`);
      if (step) steps.push(step);
    }

    for (let row = 0; row < matrix.length; row += 1) {
      if (row === pivotRow || isZero(matrix[row][column])) continue;
      const factor = matrix[row][column];
      const before = cloneMatrix(matrix);
      matrix[row] = matrix[row].map((value, c) => sub(value, mul(factor, matrix[pivotRow][c])));
      const step = rowOperationStep(before, matrix, 'eliminate-pivot-column', `Replace R${row + 1} with R${row + 1} − (${rationalText(factor)})R${pivotRow + 1}.`);
      if (step) steps.push(step);
    }

    pivots.push(column);
    pivotRow += 1;
  }

  return { matrix, pivots, steps };
}

function rationalText(value: Rational): string {
  return value.d === 1n ? value.n.toString() : `${value.n}/${value.d}`;
}

export function rankMatrix(values: Rational[][]): { rank: number; rref: Rational[][]; pivots: number[]; steps: LinearStep[] } {
  const reduced = rrefMatrix(values);
  return { rank: reduced.pivots.length, rref: reduced.matrix, pivots: reduced.pivots, steps: reduced.steps };
}

export function determinantMatrix(input: Rational[][]): { value: Rational; steps: LinearStep[] } {
  assertRectangular(input);
  if (input.length !== input[0].length) throw new Error('Determinant requires a square matrix.');
  if (input.length > 20) throw new Error('P7 exact determinant is limited to 20×20 matrices.');
  const matrix = cloneMatrix(input);
  const steps: LinearStep[] = [];
  let determinant = ONE;
  let signFactor = 1;

  for (let column = 0; column < matrix.length; column += 1) {
    let pivotRow = column;
    while (pivotRow < matrix.length && isZero(matrix[pivotRow][column])) pivotRow += 1;
    if (pivotRow === matrix.length) return { value: ZERO, steps };
    if (pivotRow !== column) {
      const before = cloneMatrix(matrix);
      [matrix[column], matrix[pivotRow]] = [matrix[pivotRow], matrix[column]];
      signFactor *= -1;
      const step = rowOperationStep(before, matrix, 'determinant-row-swap', `Swap R${column + 1} and R${pivotRow + 1}; this reverses the determinant sign.`);
      if (step) steps.push(step);
    }
    const pivot = matrix[column][column];
    determinant = mul(determinant, pivot);
    for (let row = column + 1; row < matrix.length; row += 1) {
      if (isZero(matrix[row][column])) continue;
      const factor = div(matrix[row][column], pivot);
      const before = cloneMatrix(matrix);
      for (let c = column; c < matrix.length; c += 1) matrix[row][c] = sub(matrix[row][c], mul(factor, matrix[column][c]));
      const step = rowOperationStep(before, matrix, 'determinant-row-elimination', `Eliminate entry (${row + 1}, ${column + 1}) using a determinant-preserving row replacement.`);
      if (step) steps.push(step);
    }
  }
  if (signFactor < 0) determinant = neg(determinant);
  return { value: determinant, steps };
}

export function inverseMatrix(input: Rational[][]): { matrix: Rational[][]; steps: LinearStep[] } {
  assertRectangular(input);
  if (input.length !== input[0].length) throw new Error('Inverse requires a square matrix.');
  const n = input.length;
  const augmented = input.map((row, r) => [...row, ...identity(n)[r]]);
  const reduced = rrefMatrix(augmented);
  if (reduced.pivots.filter((pivot) => pivot < n).length !== n) throw new Error('This matrix is singular, so an inverse does not exist.');
  for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
    if (!eq(reduced.matrix[r][c], r === c ? ONE : ZERO)) throw new Error('This matrix is singular, so an inverse does not exist.');
  }
  return { matrix: reduced.matrix.map((row) => row.slice(n)), steps: reduced.steps };
}

export function subspaceAnalysis(input: Rational[][]): SubspaceAnalysis {
  assertRectangular(input);
  const reduced = rrefMatrix(input);
  const rows = input.length;
  const columns = input[0].length;
  const pivotSet = new Set(reduced.pivots);
  const freeColumns = Array.from({ length: columns }, (_, index) => index).filter((index) => !pivotSet.has(index));
  const columnBasis = reduced.pivots.map((column) => input.map((row) => row[column]));
  const rowBasis = reduced.matrix.filter((row) => row.some((value) => !isZero(value)));
  const nullBasis = freeColumns.map((freeColumn) => {
    const vector = Array.from({ length: columns }, () => ZERO);
    vector[freeColumn] = ONE;
    reduced.pivots.forEach((pivotColumn, rowIndex) => {
      vector[pivotColumn] = neg(reduced.matrix[rowIndex][freeColumn]);
    });
    return vector;
  });
  return {
    rows,
    columns,
    rank: reduced.pivots.length,
    nullity: columns - reduced.pivots.length,
    pivots: reduced.pivots,
    columnBasis,
    rowBasis,
    nullBasis,
    steps: reduced.steps,
  };
}

export interface AugmentedSolveResult {
  status: 'unique' | 'underdetermined' | 'inconsistent';
  rref: Rational[][];
  pivots: number[];
  particular?: Rational[];
  nullBasis: Rational[][];
  steps: LinearStep[];
}

export function solveAugmentedMatrix(input: Rational[][]): AugmentedSolveResult {
  assertRectangular(input);
  if (input[0].length < 2) throw new Error('An augmented system matrix needs at least one coefficient column and one right-hand-side column.');
  const variableCount = input[0].length - 1;
  const reduced = rrefMatrix(input);
  for (const row of reduced.matrix) {
    const allZero = row.slice(0, variableCount).every(isZero);
    if (allZero && !isZero(row[variableCount])) return { status: 'inconsistent', rref: reduced.matrix, pivots: reduced.pivots, nullBasis: [], steps: reduced.steps };
  }
  const coefficientPivots = reduced.pivots.filter((pivot) => pivot < variableCount);
  const pivotSet = new Set(coefficientPivots);
  const freeColumns = Array.from({ length: variableCount }, (_, index) => index).filter((index) => !pivotSet.has(index));
  const particular = Array.from({ length: variableCount }, () => ZERO);
  coefficientPivots.forEach((pivot, rowIndex) => { particular[pivot] = reduced.matrix[rowIndex][variableCount]; });
  const nullBasis = freeColumns.map((freeColumn) => {
    const vector = Array.from({ length: variableCount }, () => ZERO);
    vector[freeColumn] = ONE;
    coefficientPivots.forEach((pivot, rowIndex) => { vector[pivot] = neg(reduced.matrix[rowIndex][freeColumn]); });
    return vector;
  });
  return {
    status: freeColumns.length ? 'underdetermined' : 'unique',
    rref: reduced.matrix,
    pivots: coefficientPivots,
    particular,
    nullBasis,
    steps: reduced.steps,
  };
}

export function basisSetAst(vectors: Rational[][]): AstNode {
  return { type: 'set', items: vectors.map(vectorAst) };
}

export function solutionSystemAst(values: Rational[]): AstNode {
  return {
    type: 'system',
    items: values.map((value, index) => ({ type: 'equation', left: { type: 'symbol', name: `x_${index + 1}` }, right: rationalToAst(value) })),
  };
}
