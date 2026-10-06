import type { AstNode } from './ast';
import { E11MathEngine } from './e11Engine';
import { substituteBindings } from './e5NumericalOptimization';
import {
  assignmentProblem,
  exponentialSmoothing,
  polynomialLeastSquares,
  simplexLinearProgram,
  timeSeriesProfile,
  transportationProblem,
  type WirtschaftsmathematikTransform,
} from './p7Wirtschaftsmathematik';
import type { MathOperationRequest, MathResult } from './types';

const P7_OPERATIONS = new Set([
  'simplex-linear-program',
  'assignment-problem',
  'transportation-problem',
  'time-series-profile',
  'exponential-smoothing',
  'polynomial-least-squares',
]);

function requestAst(request: MathOperationRequest): AstNode {
  if (!request.ast) throw new Error('Post-v2 P7 requires a resolved mathematical object.');
  const ast = request.ast.type === 'definition' ? request.ast.right : request.ast;
  return substituteBindings(ast, request.bindings ?? [], []);
}
function textOption(request: MathOperationRequest, name: string): string | undefined {
  const raw = request.options?.[name];
  if (raw === undefined) return undefined;
  const value = String(raw).trim();
  return value || undefined;
}
function numberOption(request: MathOperationRequest, name: string): number | undefined {
  const raw = request.options?.[name];
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
function result(request: MathOperationRequest, out: WirtschaftsmathematikTransform): MathResult {
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
    steps: [],
    sections: out.sections,
    createdAt: Date.now(),
  };
}

export class P7MathEngine extends E11MathEngine {
  async execute(request: MathOperationRequest): Promise<MathResult> {
    if (!P7_OPERATIONS.has(request.operation)) return super.execute(request);
    const ast = requestAst(request);
    switch (request.operation) {
      case 'simplex-linear-program':
        return result(request, simplexLinearProgram(ast, {
          objective: textOption(request, 'objective'),
          sense: textOption(request, 'sense'),
          maxIterations: numberOption(request, 'maxIterations'),
        }));
      case 'assignment-problem':
        return result(request, assignmentProblem(ast, textOption(request, 'sense') === 'max' ? 'max' : 'min'));
      case 'transportation-problem':
        return result(request, transportationProblem(ast, textOption(request, 'supply'), textOption(request, 'demand')));
      case 'time-series-profile':
        return result(request, timeSeriesProfile(ast, numberOption(request, 'maxLag') ?? 6));
      case 'exponential-smoothing':
        return result(request, exponentialSmoothing(ast, numberOption(request, 'alpha') ?? 0.3, numberOption(request, 'horizon') ?? 1));
      case 'polynomial-least-squares':
        return result(request, polynomialLeastSquares(ast, numberOption(request, 'degree') ?? 2, numberOption(request, 'predictAt')));
      default:
        return super.execute(request);
    }
  }
}
