import type { ObjectCapability } from './capabilities';
import type { SemanticMathObject } from './types';

type Seed = Omit<ObjectCapability, 'applicable' | 'available' | 'reason'>;

const UNARY: Seed[] = [
  { id: 'complex-map', label: 'Map a complex point…', phase: 'E8', group: 'Complex functions' },
  { id: 'complex-decompose', label: 'Real / imaginary decomposition', phase: 'E8', group: 'Complex functions' },
  { id: 'complex-derivative', label: 'Complex derivative', phase: 'E8', group: 'Complex differentiability' },
  { id: 'cauchy-riemann', label: 'Cauchy–Riemann check', phase: 'E8', group: 'Complex differentiability' },
  { id: 'complex-series', label: 'Power / Laurent series…', phase: 'E8', group: 'Complex series' },
  { id: 'singularity-profile', label: 'Classify singularity…', phase: 'E8', group: 'Complex singularities' },
  { id: 'complex-residue', label: 'Residue at a point…', phase: 'E8', group: 'Residues' },
  { id: 'complex-contour-integral', label: 'Contour integral…', phase: 'E8', group: 'Contour integration' },
  { id: 'residue-theorem', label: 'Residue theorem on circle…', phase: 'E8', group: 'Residues' },
  { id: 'branch-diagnostics', label: 'Branch / domain diagnostics', phase: 'E8', group: 'Complex domains' },
];

function ready(seed: Seed): ObjectCapability { return { ...seed, applicable: true, available: true }; }
function blocked(seed: Seed, reason: string): ObjectCapability { return { ...seed, applicable: false, available: false, reason }; }

export function e8CapabilitiesForObject(object: SemanticMathObject): ObjectCapability[] {
  if (object.kind !== 'expression' && object.kind !== 'function') return [];
  const dimension = object.kind === 'function' ? object.parameters.length : object.variables.length;
  const scalar = object.valueAst.type !== 'matrix';
  const compatible = dimension === 1 && scalar;
  return UNARY.map(seed => compatible
    ? ready(seed)
    : blocked(seed, 'E8 complex-analysis workflows require a scalar expression/function of exactly one independent variable.'));
}
