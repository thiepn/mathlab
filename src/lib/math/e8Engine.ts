import type { AstNode } from './ast';
import { E7MathEngine } from './e7Engine';
import { substituteBindings } from './e5NumericalOptimization';
import {
  branchDiagnostics,
  cauchyRiemann,
  complexDecompose,
  complexDerivative,
  complexMapping,
  complexSeries,
  contourIntegral,
  residueAt,
  residueTheorem,
  singularityProfile,
  type E8Transform,
} from './e8ComplexAnalysis';
import type { MathOperationRequest, MathResult } from './types';

const E8_OPERATIONS = new Set([
  'complex-map',
  'complex-decompose',
  'complex-derivative',
  'cauchy-riemann',
  'complex-series',
  'singularity-profile',
  'complex-residue',
  'complex-contour-integral',
  'residue-theorem',
  'branch-diagnostics',
]);

function requestAst(request: MathOperationRequest): AstNode {
  if (!request.ast) throw new Error('E8 requires a resolved mathematical object.');
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
function variableFor(request: MathOperationRequest): string {
  return textOption(request, 'variable', request.variable ?? 'z') || 'z';
}
function result(request: MathOperationRequest, out: E8Transform): MathResult {
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

export class E8MathEngine extends E7MathEngine {
  async execute(request: MathOperationRequest): Promise<MathResult> {
    if (!E8_OPERATIONS.has(request.operation)) return super.execute(request);
    const ast = requestAst(request); const variable = variableFor(request);
    switch (request.operation) {
      case 'complex-map':
        return result(request, complexMapping(ast, variable, numberOption(request, 'pointRe', 0), numberOption(request, 'pointIm', 0)));
      case 'complex-decompose':
        return result(request, complexDecompose(ast, variable));
      case 'complex-derivative':
        return result(request, complexDerivative(ast, variable));
      case 'cauchy-riemann':
        return result(request, cauchyRiemann(ast, variable));
      case 'complex-series':
        return result(request, complexSeries(ast, variable, numberOption(request, 'center', 0), Math.trunc(numberOption(request, 'order', 6))));
      case 'singularity-profile':
        return result(request, singularityProfile(ast, variable, numberOption(request, 'center', 0)));
      case 'complex-residue':
        return result(request, residueAt(ast, variable, numberOption(request, 'pointRe', 0), numberOption(request, 'pointIm', 0), numberOption(request, 'radius', 0.001), Math.trunc(numberOption(request, 'intervals', 1200))));
      case 'complex-contour-integral': {
        const path = (textOption(request, 'path', 'circle') || 'circle') as 'circle' | 'line';
        if (path !== 'circle' && path !== 'line') throw new Error('Contour path must be circle or line.');
        return result(request, contourIntegral(ast, variable, path, {
          centerRe: numberOption(request, 'centerRe', 0), centerIm: numberOption(request, 'centerIm', 0), radius: numberOption(request, 'radius', 1),
          startRe: numberOption(request, 'startRe', 0), startIm: numberOption(request, 'startIm', 0), endRe: numberOption(request, 'endRe', 1), endIm: numberOption(request, 'endIm', 0),
          intervals: Math.trunc(numberOption(request, 'intervals', 1200)),
        }));
      }
      case 'residue-theorem':
        return result(request, residueTheorem(ast, variable, numberOption(request, 'centerRe', 0), numberOption(request, 'centerIm', 0), numberOption(request, 'radius', 1)));
      case 'branch-diagnostics':
        return result(request, branchDiagnostics(ast, variable));
      default:
        return super.execute(request);
    }
  }
}
