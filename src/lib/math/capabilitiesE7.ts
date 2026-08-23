import type { ObjectCapability } from './capabilities';
import { odeShapeInfo } from './e4Ode';
import type { SemanticMathObject } from './types';

type Seed = Omit<ObjectCapability, 'applicable' | 'available' | 'reason'>;

const UNARY: Seed[] = [
  { id: 'laplace-transform', label: 'Laplace transform', phase: 'E7', group: 'Integral transforms' },
  { id: 'inverse-laplace-transform', label: 'Inverse Laplace transform', phase: 'E7', group: 'Integral transforms' },
  { id: 'convolution', label: 'Convolution…', phase: 'E7', group: 'Integral transforms' },
  { id: 'fourier-series', label: 'Fourier series…', phase: 'E7', group: 'Fourier analysis' },
  { id: 'fourier-transform', label: 'Exact Fourier transform', phase: 'E7', group: 'Fourier analysis' },
  { id: 'inverse-fourier-transform', label: 'Exact inverse Fourier transform', phase: 'E7', group: 'Fourier analysis' },
  { id: 'numerical-fourier-transform', label: 'Numerical Fourier evaluation…', phase: 'E7', group: 'Fourier analysis' },
  { id: 'numerical-inverse-fourier-transform', label: 'Numerical inverse Fourier evaluation…', phase: 'E7', group: 'Fourier analysis' },
];
const VECTOR: Seed[] = [
  { id: 'discrete-fourier-transform', label: 'Discrete Fourier transform', phase: 'E7', group: 'Discrete transforms' },
];
const MATRIX: Seed[] = [
  { id: 'inverse-discrete-fourier-transform', label: 'Inverse discrete Fourier transform', phase: 'E7', group: 'Discrete transforms' },
];
const ODE: Seed = { id: 'laplace-ode-solve', label: 'Solve by Laplace transform', phase: 'E7', group: 'Transform ODEs' };

function ready(seed: Seed): ObjectCapability { return { ...seed, applicable: true, available: true }; }
function blocked(seed: Seed, reason: string): ObjectCapability { return { ...seed, applicable: false, available: false, reason }; }

export function e7CapabilitiesForObject(object: SemanticMathObject): ObjectCapability[] {
  if (object.kind === 'expression' || object.kind === 'function') {
    const dimension = object.kind === 'function' ? object.parameters.length : object.variables.length;
    const scalar = object.valueAst.type !== 'matrix';
    return UNARY.map(seed => dimension === 1 && scalar
      ? ready(seed)
      : blocked(seed, 'E7 scalar transform workflows require exactly one independent variable.'));
  }
  if (object.kind === 'vector' && object.shape.type === 'vector') {
    const length = object.shape.length;
    const compatible = object.variables.length === 0 && object.domain !== 'complex' && length >= 2 && length <= 256;
    return VECTOR.map(seed => compatible
      ? ready(seed)
      : blocked(seed, 'E7 DFT requires a resolved real vector with 2–256 samples.'));
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix') {
    const { rows, columns } = object.shape;
    const compatible = object.variables.length === 0 && object.domain !== 'complex' && columns === 2 && rows >= 2 && rows <= 256;
    return MATRIX.map(seed => compatible
      ? ready(seed)
      : blocked(seed, 'E7 inverse DFT expects a resolved real n×2 matrix of [real, imaginary] coefficient pairs, with 2–256 rows.'));
  }
  if (object.kind === 'ode') {
    const info = odeShapeInfo(object.valueAst);
    return [info?.constructor === 'ode2' && info.hasInitialConditions
      ? ready(ODE)
      : blocked(ODE, 'E7 transform-based ODE solving currently requires ode2(...) with encoded initial conditions at t=0.')];
  }
  return [];
}
