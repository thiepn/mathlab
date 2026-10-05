import type { AstNode } from './ast';

export type PiecewiseNode = Extract<AstNode, { type: 'piecewise' }>;

export function isConditionAst(node: AstNode): boolean {
  if (node.type === 'comparison' || node.type === 'equation') return true;
  if (node.type !== 'call') return false;
  if (node.name === 'not') return node.args.length === 1 && isConditionAst(node.args[0]);
  if (['and', 'or', 'xor', 'implies', 'iff'].includes(node.name)) {
    return node.args.length >= 2 && node.args.every(isConditionAst);
  }
  return false;
}

export function containsPiecewise(node: AstNode): boolean {
  switch (node.type) {
    case 'piecewise':
      return true;
    case 'number':
    case 'symbol':
      return false;
    case 'unary':
      return containsPiecewise(node.operand);
    case 'binary':
    case 'equation':
    case 'comparison':
    case 'definition':
      return containsPiecewise(node.left) || containsPiecewise(node.right);
    case 'call':
      return node.args.some(containsPiecewise);
    case 'matrix':
      return node.rows.some((row) => row.some(containsPiecewise));
    case 'system':
    case 'set':
      return node.items.some(containsPiecewise);
  }
}

export function selectPiecewiseBranch(
  node: PiecewiseNode,
  evaluateCondition: (condition: AstNode) => boolean | null,
): AstNode | null {
  for (const branch of node.branches) {
    const verdict = evaluateCondition(branch.condition);
    if (verdict === true) return branch.value;
    if (verdict === null) return null;
  }
  return node.otherwise ?? null;
}

function staticScalar(node: AstNode): number | null {
  if (node.type === 'number') {
    const value = Number(node.value);
    return Number.isFinite(value) ? value : null;
  }
  if (node.type === 'symbol') {
    if (node.name === 'pi') return Math.PI;
    if (node.name === 'e') return Math.E;
    return null;
  }
  if (node.type === 'unary') {
    const value = staticScalar(node.operand);
    return value === null ? null : node.operator === '-' ? -value : value;
  }
  if (node.type === 'binary') {
    const left = staticScalar(node.left);
    const right = staticScalar(node.right);
    if (left === null || right === null) return null;
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return right === 0 ? null : left / right;
    const powered = left ** right;
    return Number.isFinite(powered) ? powered : null;
  }
  if (node.type === 'call' && node.args.length === 1) {
    const value = staticScalar(node.args[0]);
    if (value === null) return null;
    const fn: Record<string, (x: number) => number> = {
      sin: Math.sin, cos: Math.cos, tan: Math.tan,
      asin: Math.asin, acos: Math.acos, atan: Math.atan,
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
      exp: Math.exp, ln: Math.log, log: Math.log10,
      sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil,
    };
    const evaluator = fn[node.name];
    if (!evaluator) return null;
    const out = evaluator(value);
    return Number.isFinite(out) ? out : null;
  }
  return null;
}

function compare(left: number, right: number, operator: '<' | '<=' | '>' | '>=' | '!=' | '='): boolean {
  const tolerance = 1e-12 * Math.max(1, Math.abs(left), Math.abs(right));
  if (operator === '=') return Math.abs(left - right) <= tolerance;
  if (operator === '!=') return Math.abs(left - right) > tolerance;
  if (operator === '<') return left < right && Math.abs(left - right) > tolerance;
  if (operator === '<=') return left < right || Math.abs(left - right) <= tolerance;
  if (operator === '>') return left > right && Math.abs(left - right) > tolerance;
  return left > right || Math.abs(left - right) <= tolerance;
}

export function evaluateConditionWith(
  node: AstNode,
  evaluateScalar: (node: AstNode) => number,
): boolean | null {
  if (node.type === 'comparison' || node.type === 'equation') {
    try {
      const left = evaluateScalar(node.left);
      const right = evaluateScalar(node.right);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
      return compare(left, right, node.type === 'equation' ? '=' : node.operator);
    } catch {
      return null;
    }
  }

  if (node.type === 'call') {
    if (node.name === 'not' && node.args.length === 1) {
      const value = evaluateConditionWith(node.args[0], evaluateScalar);
      return value === null ? null : !value;
    }
    if (['and','or','xor','implies','iff'].includes(node.name) && node.args.length >= 2) {
      const values = node.args.map((arg) => evaluateConditionWith(arg, evaluateScalar));
      if (values.some((value) => value === null)) return null;
      const bools = values as boolean[];
      if (node.name === 'and') return bools.every(Boolean);
      if (node.name === 'or') return bools.some(Boolean);
      if (node.name === 'xor') return bools.filter(Boolean).length % 2 === 1;
      if (node.name === 'implies') return !bools[0] || bools[1];
      return bools.every((value) => value === bools[0]);
    }
  }

  return null;
}

export function evaluateStaticCondition(node: AstNode): boolean | null {
  return evaluateConditionWith(node, (candidate) => {
    const value = staticScalar(candidate);
    if (value === null) throw new Error('Condition is not constant.');
    return value;
  });
}
