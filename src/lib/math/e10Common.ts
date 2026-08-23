import type { AstNode } from './ast';
import { rationalValue, simplifyAst } from './algebra';
import { astToPlainText } from './format';
import { add, div, mul, neg, rat, sub, ZERO, type Rational } from './rational';
import type { DerivationStep, MathResultFact, MathResultSection } from './types';

export const n = (value: bigint | number | string): AstNode => ({ type: 'number', value: String(value) });
export const s = (name: string): AstNode => ({ type: 'symbol', name });
export const b = (operator: '+' | '-' | '*' | '/' | '^', left: AstNode, right: AstNode): AstNode => ({ type: 'binary', operator, left, right });
export const call = (name: string, ...args: AstNode[]): AstNode => ({ type: 'call', name, args });
export const matrix = (rows: AstNode[][]): AstNode => ({ type: 'matrix', rows });
export const section = (id: string, title: string, facts: MathResultFact[], description?: string): MathResultSection => ({ id, title, facts, description });
export const exactStep = (beforeAst: AstNode, afterAst: AstNode, rule: string, explanation: string, index = 1): DerivationStep => ({ id: `e10-step-${index}`, before: astToPlainText(beforeAst), after: astToPlainText(afterAst), beforeAst, afterAst, rule, explanation, verified: true });

export function rationalAst(value: Rational): AstNode { return value.d === 1n ? n(value.n) : b('/', n(value.n), n(value.d)); }
export function exactRational(node: AstNode, label = 'value'): Rational {
  const value = rationalValue(simplifyAst(node));
  if (!value) throw new Error(`${label} must resolve to an exact rational value.`);
  return value;
}
export function exactInteger(node: AstNode, label = 'value'): bigint {
  const value = exactRational(node, label);
  if (value.d !== 1n) throw new Error(`${label} must be an integer.`);
  return value.n;
}
export function compareRat(a: Rational, d: Rational): number {
  const delta = a.n * d.d - d.n * a.d;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}
export function eqRat(a: Rational, d: Rational): boolean { return a.n === d.n && a.d === d.d; }
export function absRat(a: Rational): Rational { return a.n < 0n ? { n: -a.n, d: a.d } : a; }
export function squareRat(a: Rational): Rational { return mul(a, a); }

export function exactVector(node: AstNode, label = 'vector'): Rational[] {
  const q = simplifyAst(node);
  if (q.type !== 'matrix' || q.rows.length !== 1) throw new Error(`${label} must be a vector [a1,a2,...].`);
  return q.rows[0].map((cell, i) => exactRational(cell, `${label} entry ${i + 1}`));
}
export function exactIntegerVector(node: AstNode, label = 'vector'): bigint[] {
  const q = simplifyAst(node);
  if (q.type !== 'matrix' || q.rows.length !== 1) throw new Error(`${label} must be a vector [a1,a2,...].`);
  return q.rows[0].map((cell, i) => exactInteger(cell, `${label} entry ${i + 1}`));
}
export function exactMatrix(node: AstNode, label = 'matrix'): Rational[][] {
  const q = simplifyAst(node);
  if (q.type !== 'matrix' || !q.rows.length || !q.rows[0].length || q.rows.some(row => row.length !== q.rows[0].length)) throw new Error(`${label} must be a non-empty rectangular matrix.`);
  return q.rows.map((row, i) => row.map((cell, j) => exactRational(cell, `${label} entry (${i + 1},${j + 1})`)));
}
export function exactIntegerMatrix(node: AstNode, label = 'matrix'): bigint[][] {
  const q = simplifyAst(node);
  if (q.type !== 'matrix' || !q.rows.length || !q.rows[0].length || q.rows.some(row => row.length !== q.rows[0].length)) throw new Error(`${label} must be a non-empty rectangular matrix.`);
  return q.rows.map((row, i) => row.map((cell, j) => exactInteger(cell, `${label} entry (${i + 1},${j + 1})`)));
}

export function rationalRank(values: Rational[][]): number {
  if (!values.length || !values[0]?.length) return 0;
  const a = values.map(row => row.map(x => ({ ...x })));
  let rank = 0;
  for (let col = 0; col < a[0].length && rank < a.length; col += 1) {
    let pivot = rank;
    while (pivot < a.length && a[pivot][col].n === 0n) pivot += 1;
    if (pivot === a.length) continue;
    [a[rank], a[pivot]] = [a[pivot], a[rank]];
    const p = a[rank][col];
    for (let j = col; j < a[0].length; j += 1) a[rank][j] = div(a[rank][j], p);
    for (let i = 0; i < a.length; i += 1) {
      if (i === rank || a[i][col].n === 0n) continue;
      const factor = a[i][col];
      for (let j = col; j < a[0].length; j += 1) a[i][j] = sub(a[i][j], mul(factor, a[rank][j]));
    }
    rank += 1;
  }
  return rank;
}

export function determinant3(a: Rational[][]): Rational {
  if (a.length !== 3 || a.some(row => row.length !== 3)) throw new Error('determinant3 requires a 3×3 matrix.');
  return add(sub(mul(a[0][0], sub(mul(a[1][1], a[2][2]), mul(a[1][2], a[2][1]))), mul(a[0][1], sub(mul(a[1][0], a[2][2]), mul(a[1][2], a[2][0])))), mul(a[0][2], sub(mul(a[1][0], a[2][1]), mul(a[1][1], a[2][0]))));
}

export function dotRat(a: Rational[], d: Rational[]): Rational {
  if (a.length !== d.length) throw new Error('Dot-product dimensions do not match.');
  return a.reduce((sum, value, i) => add(sum, mul(value, d[i])), ZERO);
}
export function vectorSub(a: Rational[], d: Rational[]): Rational[] {
  if (a.length !== d.length) throw new Error('Vector dimensions do not match.');
  return a.map((value, i) => sub(value, d[i]));
}
export function cross3(a: Rational[], d: Rational[]): Rational[] {
  if (a.length !== 3 || d.length !== 3) throw new Error('cross3 requires two 3D vectors.');
  return [sub(mul(a[1], d[2]), mul(a[2], d[1])), sub(mul(a[2], d[0]), mul(a[0], d[2])), sub(mul(a[0], d[1]), mul(a[1], d[0]))];
}

export function sumRat(values: Rational[]): Rational { return values.reduce((sum, value) => add(sum, value), ZERO); }
export function averageRat(values: Rational[]): Rational { return values.length ? div(sumRat(values), rat(values.length)) : ZERO; }
export function negativeAst(value: AstNode): AstNode { return { type: 'unary', operator: '-', operand: value }; }
export function negateRat(value: Rational): Rational { return neg(value); }
