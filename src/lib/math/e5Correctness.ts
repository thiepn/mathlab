import type { AstNode } from './ast';
import { convexityDiagnostic, type E5Transform } from './e5NumericalOptimization';

/**
 * E5 uses a numerical symmetric eigensolver to classify Hessian signs.
 * Even when the Hessian is symbolically constant, that sign classification
 * is a floating computation and must not be exposed as an exact certificate.
 */
export function numericalConvexityDiagnostic(node: AstNode, source: string, pointSource?: string): E5Transform {
  const out = convexityDiagnostic(node, source, pointSource);
  if (out.display.includes('not certified')) return out;
  return {
    ...out,
    exactness: 'approximate',
    warnings: [
      ...out.warnings,
      'Hessian entries may be symbolic/exact, but curvature classification uses numerical eigenvalue signs and is therefore approximate.',
    ],
  };
}
