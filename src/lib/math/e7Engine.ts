import type { AstNode } from './ast';
import { E6MathEngine } from './e6Engine';
import { substituteBindings } from './e5NumericalOptimization';
import {
  convolutionTransform,
  discreteFourierTransform,
  fourierSeries,
  fourierTransform,
  inverseDiscreteFourierTransform,
  inverseFourierTransform,
  inverseLaplaceTransform,
  laplaceOdeSolve,
  laplaceTransform,
  numericalFourierTransform,
  type E7Transform,
} from './e7Transforms';
import type { MathOperationRequest, MathResult } from './types';

const E7_OPERATIONS = new Set([
  'laplace-transform',
  'inverse-laplace-transform',
  'convolution',
  'laplace-ode-solve',
  'fourier-series',
  'fourier-transform',
  'inverse-fourier-transform',
  'numerical-fourier-transform',
  'numerical-inverse-fourier-transform',
  'discrete-fourier-transform',
  'inverse-discrete-fourier-transform',
]);

function requestAst(request: MathOperationRequest): AstNode {
  if (!request.ast) throw new Error('E7 requires a resolved mathematical object.');
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
function result(request: MathOperationRequest, out: E7Transform): MathResult {
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
function sourceVariable(request: MathOperationRequest, fallback: string): string {
  return textOption(request, 'variable', request.variable ?? fallback) || fallback;
}

export class E7MathEngine extends E6MathEngine {
  async execute(request: MathOperationRequest): Promise<MathResult> {
    if (!E7_OPERATIONS.has(request.operation)) return super.execute(request);
    const ast = requestAst(request);
    switch (request.operation) {
      case 'laplace-transform':
        return result(request, laplaceTransform(ast, sourceVariable(request, 't'), textOption(request, 'transformVariable', 's') || 's'));
      case 'inverse-laplace-transform':
        return result(request, inverseLaplaceTransform(ast, sourceVariable(request, 's'), textOption(request, 'outputVariable', 't') || 't'));
      case 'convolution':
        return result(request, convolutionTransform(ast, sourceVariable(request, 't'), textOption(request, 'second')));
      case 'laplace-ode-solve':
        return result(request, laplaceOdeSolve(ast));
      case 'fourier-series':
        return result(request, fourierSeries(ast, sourceVariable(request, 't'), numberOption(request, 'period', 2 * Math.PI), Math.trunc(numberOption(request, 'order', 8)), Math.trunc(numberOption(request, 'intervals', 1200))));
      case 'fourier-transform':
        return result(request, fourierTransform(ast, sourceVariable(request, 't'), textOption(request, 'frequencyVariable', 'omega') || 'omega'));
      case 'inverse-fourier-transform':
        return result(request, inverseFourierTransform(ast, sourceVariable(request, 'omega'), textOption(request, 'outputVariable', 't') || 't'));
      case 'numerical-fourier-transform':
        return result(request, numericalFourierTransform(ast, sourceVariable(request, 't'), numberOption(request, 'lower', -10), numberOption(request, 'upper', 10), numberOption(request, 'frequency', 0), Math.trunc(numberOption(request, 'intervals', 1600)), false));
      case 'numerical-inverse-fourier-transform':
        return result(request, numericalFourierTransform(ast, sourceVariable(request, 'omega'), numberOption(request, 'lower', -10), numberOption(request, 'upper', 10), numberOption(request, 'time', 0), Math.trunc(numberOption(request, 'intervals', 1600)), true));
      case 'discrete-fourier-transform':
        return result(request, discreteFourierTransform(ast));
      case 'inverse-discrete-fourier-transform':
        return result(request, inverseDiscreteFourierTransform(ast));
      default:
        return super.execute(request);
    }
  }
}
