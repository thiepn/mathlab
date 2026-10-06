import type { ObjectCapability } from './capabilities';
import type { SemanticMathObject } from './types';

type Seed = Omit<ObjectCapability, 'applicable' | 'available' | 'reason'>;

const MATRIX_TOOLS: Seed[] = [
  { id:'simplex-linear-program', label:'Canonical simplex LP…', phase:'P7', group:'Optimization & operations research' },
  { id:'assignment-problem', label:'Assignment problem…', phase:'P7', group:'Optimization & operations research' },
  { id:'transportation-problem', label:'Transportation problem…', phase:'P7', group:'Optimization & operations research' },
  { id:'polynomial-least-squares', label:'Polynomial least squares…', phase:'P7', group:'Applied numerical modeling' },
];

const SERIES_TOOLS: Seed[] = [
  { id:'time-series-profile', label:'Time-series profile…', phase:'P7', group:'Time series & forecasting' },
  { id:'exponential-smoothing', label:'Exponential smoothing…', phase:'P7', group:'Time series & forecasting' },
];

function blocked(seed: Seed, reason: string): ObjectCapability {
  return { ...seed, applicable: false, available: false, reason };
}
function ready(seed: Seed): ObjectCapability {
  return { ...seed, applicable: true, available: true };
}

export function p7CapabilitiesForObject(object: SemanticMathObject): ObjectCapability[] {
  if (object.kind === 'matrix' && object.shape.type === 'matrix') {
    const { rows, columns } = object.shape;
    return MATRIX_TOOLS.map((seed) => {
      if (object.variables.length || object.domain === 'complex') return blocked(seed, 'Post-v2 P7 requires a resolved real numeric matrix.');
      if (seed.id === 'simplex-linear-program' && columns < 2) return blocked(seed, 'Simplex expects rows [a1,…,an,b] with at least one decision-variable column.');
      if (seed.id === 'assignment-problem' && (rows !== columns || rows < 2)) return blocked(seed, 'Assignment requires a square n×n matrix with n≥2.');
      if (seed.id === 'transportation-problem' && (rows > 12 || columns > 12)) return blocked(seed, 'Transportation is bounded to 12 suppliers × 12 demand nodes.');
      if (seed.id === 'polynomial-least-squares' && (columns !== 2 || rows < 2)) return blocked(seed, 'Polynomial least squares expects an n×2 matrix [[x1,y1], …] with n≥2.');
      return ready(seed);
    });
  }

  if (object.kind === 'vector' || object.kind === 'dataset') {
    return SERIES_TOOLS.map((seed) => ready(seed));
  }

  return [];
}
