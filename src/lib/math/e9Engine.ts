import type { AstNode } from './ast';
import { E8MathEngine } from './e8Engine';
import { substituteBindings } from './e5NumericalOptimization';
import {
  bellmanFord,
  bipartiteMatching,
  chineseRemainder,
  extendedGcd,
  extendedMasterTheorem,
  knapsackTrace,
  linearDiophantine,
  longestIncreasingSubsequence,
  maxFlowMinCut,
  modularInverse,
  numberTheoryProfile,
  recurrenceClosedFormE9,
  recurrenceGeneratingFunction,
  solveLinearCongruence,
  type E9Transform,
} from './e9DiscreteNumberTheory';
import { finiteQuantifierOnSet } from './e9Quantifiers';
import type { MathOperationRequest, MathResult } from './types';

const E9_OPERATIONS = new Set([
  'finite-quantifier-profile',
  'recurrence-generating-function',
  'recurrence-closed-form-e9',
  'extended-master-theorem',
  'bellman-ford',
  'max-flow-min-cut',
  'bipartite-matching',
  'longest-increasing-subsequence',
  'knapsack-dp',
  'number-theory-profile',
  'extended-gcd',
  'modular-inverse',
  'linear-congruence',
  'chinese-remainder',
  'linear-diophantine',
]);

function requestAst(request: MathOperationRequest): AstNode {
  if (!request.ast) throw new Error('E9 requires a resolved mathematical object.');
  const ast = request.ast.type === 'definition' ? request.ast.right : request.ast;
  return substituteBindings(ast, request.bindings ?? [], []);
}
function textOption(request: MathOperationRequest, name: string, fallback = ''): string {
  const raw = request.options?.[name];
  return raw === undefined ? fallback : String(raw).trim();
}
function numberOption(request: MathOperationRequest, name: string, fallback: number): number {
  const raw = request.options?.[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
  return value;
}
function integerOption(request: MathOperationRequest, name: string, fallback: number): number {
  const value = numberOption(request, name, fallback);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be a safe integer.`);
  return value;
}
function bigintOption(request: MathOperationRequest, name: string, fallback: bigint): bigint {
  const raw = request.options?.[name];
  if (raw === undefined || raw === '') return fallback;
  const text = String(raw).trim();
  if (!/^-?\d+$/.test(text)) throw new Error(`${name} must be an integer.`);
  return BigInt(text);
}
function result(request: MathOperationRequest, out: E9Transform): MathResult {
  return {
    id: request.id,
    operation: request.operation,
    input: request.input,
    exactness: out.exactness,
    value: out.display,
    display: out.display,
    resultAst: out.ast,
    variable: request.variable,
    assumptions: request.assumptions ?? [],
    warnings: out.warnings,
    steps: out.steps,
    sections: out.sections,
    createdAt: Date.now(),
  };
}

export class E9MathEngine extends E8MathEngine {
  async execute(request: MathOperationRequest): Promise<MathResult> {
    if (!E9_OPERATIONS.has(request.operation)) return super.execute(request);
    const ast = requestAst(request);
    switch (request.operation) {
      case 'finite-quantifier-profile': {
        const quantifier = textOption(request, 'quantifier', 'forall');
        if (quantifier !== 'forall' && quantifier !== 'exists') throw new Error('quantifier must be forall or exists.');
        return result(request, finiteQuantifierOnSet(ast, textOption(request, 'boundVariable', 'x') || 'x', textOption(request, 'predicate', 'x=x') || 'x=x', quantifier));
      }
      case 'recurrence-generating-function': return result(request, recurrenceGeneratingFunction(ast));
      case 'recurrence-closed-form-e9': return result(request, recurrenceClosedFormE9(ast));
      case 'extended-master-theorem': return result(request, extendedMasterTheorem(ast, integerOption(request, 'logPower', 1)));
      case 'bellman-ford': return result(request, bellmanFord(ast, integerOption(request, 'start', 1), integerOption(request, 'target', 2)));
      case 'max-flow-min-cut': return result(request, maxFlowMinCut(ast, integerOption(request, 'source', 1), integerOption(request, 'sink', 2)));
      case 'bipartite-matching': return result(request, bipartiteMatching(ast));
      case 'longest-increasing-subsequence': return result(request, longestIncreasingSubsequence(ast));
      case 'knapsack-dp': return result(request, knapsackTrace(ast, integerOption(request, 'capacity', 10)));
      case 'number-theory-profile': return result(request, numberTheoryProfile(ast));
      case 'extended-gcd': return result(request, extendedGcd(ast, bigintOption(request, 'other', 1n)));
      case 'modular-inverse': return result(request, modularInverse(ast, bigintOption(request, 'modulus', 2n)));
      case 'linear-congruence': return result(request, solveLinearCongruence(ast, bigintOption(request, 'rhs', 0n), bigintOption(request, 'modulus', 2n)));
      case 'chinese-remainder': return result(request, chineseRemainder(ast));
      case 'linear-diophantine': return result(request, linearDiophantine(ast, bigintOption(request, 'b', 1n), bigintOption(request, 'c', 0n)));
      default: return super.execute(request);
    }
  }
}
