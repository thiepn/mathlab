import type { ObjectCapability } from './capabilities';
import type { SemanticMathObject } from './types';

type Seed = Omit<ObjectCapability, 'applicable' | 'available' | 'reason'>;

const QUANTIFIER: Seed = { id: 'finite-quantifier-profile', label: 'Evaluate finite quantifier…', phase: 'E9', group: 'Predicate logic' };
const RECURRENCE: Seed[] = [
  { id: 'recurrence-generating-function', label: 'Ordinary generating function', phase: 'E9', group: 'Recurrences' },
  { id: 'recurrence-closed-form-e9', label: 'Extended recurrence closed form', phase: 'E9', group: 'Recurrences' },
];
const COMPLEXITY: Seed = { id: 'extended-master-theorem', label: 'Extended Master theorem…', phase: 'E9', group: 'Algorithms & complexity' };
const GRAPH: Seed[] = [
  { id: 'bellman-ford', label: 'Bellman–Ford shortest path…', phase: 'E9', group: 'Graph algorithms' },
  { id: 'max-flow-min-cut', label: 'Max-flow / min-cut…', phase: 'E9', group: 'Graph algorithms' },
  { id: 'bipartite-matching', label: 'Maximum bipartite matching', phase: 'E9', group: 'Graph algorithms' },
];
const VECTOR: Seed = { id: 'longest-increasing-subsequence', label: 'Longest increasing subsequence', phase: 'E9', group: 'Dynamic programming' };
const MATRIX: Seed[] = [
  { id: 'knapsack-dp', label: '0/1 knapsack DP…', phase: 'E9', group: 'Dynamic programming' },
  { id: 'chinese-remainder', label: 'Chinese remainder theorem', phase: 'E9', group: 'Number theory' },
];
const INTEGER: Seed[] = [
  { id: 'number-theory-profile', label: 'Factorization & arithmetic functions', phase: 'E9', group: 'Number theory' },
  { id: 'extended-gcd', label: 'Extended Euclidean algorithm…', phase: 'E9', group: 'Number theory' },
  { id: 'modular-inverse', label: 'Modular inverse…', phase: 'E9', group: 'Number theory' },
  { id: 'linear-congruence', label: 'Solve linear congruence…', phase: 'E9', group: 'Number theory' },
  { id: 'linear-diophantine', label: 'Solve linear Diophantine equation…', phase: 'E9', group: 'Number theory' },
];

function ready(seed: Seed): ObjectCapability { return { ...seed, applicable: true, available: true }; }
function blocked(seed: Seed, reason: string): ObjectCapability { return { ...seed, applicable: false, available: false, reason }; }

export function e9CapabilitiesForObject(object: SemanticMathObject): ObjectCapability[] {
  if (object.kind === 'finite-set') return [ready(QUANTIFIER)];
  if (object.kind === 'recurrence') return RECURRENCE.map(ready);
  if (object.kind === 'complexity') {
    const master = object.valueAst.type === 'call' && object.valueAst.name === 'master';
    return [master ? ready(COMPLEXITY) : blocked(COMPLEXITY, 'The E9 logarithmic Master extension applies to master(a,b,k) objects.')];
  }
  if (object.kind === 'graph') {
    const family = object.shape.type === 'graph' ? object.shape : null;
    return GRAPH.map(seed => {
      if (!family) return blocked(seed, 'Graph shape metadata is unavailable.');
      if (seed.id === 'bellman-ford') return family.weighted ? ready(seed) : blocked(seed, 'Bellman–Ford is exposed on weighted graph objects.');
      if (seed.id === 'max-flow-min-cut') return family.weighted && family.directed ? ready(seed) : blocked(seed, 'Max-flow/min-cut requires a weighted directed graph (wdigraph).');
      return !family.weighted && !family.directed ? ready(seed) : blocked(seed, 'Bipartite matching currently expects an unweighted undirected graph.');
    });
  }
  if (object.kind === 'vector' && object.shape.type === 'vector') {
    return [object.variables.length === 0 && object.shape.length >= 1 && object.shape.length <= 256
      ? ready(VECTOR)
      : blocked(VECTOR, 'LIS requires a resolved vector with 1–256 exact numeric entries.')];
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix') {
    const compatible = object.variables.length === 0 && object.shape.columns === 2 && object.shape.rows >= 1;
    return MATRIX.map(seed => compatible
      ? ready(seed)
      : blocked(seed, seed.id === 'knapsack-dp' ? '0/1 knapsack expects an n×2 [weight,value] matrix.' : 'CRT expects an n×2 [residue,modulus] matrix.'));
  }
  if (object.kind === 'scalar') {
    const integerLike = object.domain === 'natural' || object.domain === 'integer';
    return INTEGER.map(seed => integerLike ? ready(seed) : blocked(seed, 'E9 number-theory operations require an exact integer scalar.'));
  }
  return [];
}
