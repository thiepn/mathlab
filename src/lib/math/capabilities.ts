import type { SemanticMathObject } from './types';

export interface ObjectCapability {
  id: string;
  label: string;
  phase: string;
  group: string;
  applicable: boolean;
  available: boolean;
  reason?: string;
}

type CapabilitySeed = Omit<ObjectCapability,'available'|'applicable'|'reason'>;

const definitions: Record<SemanticMathObject['kind'], CapabilitySeed[]> = {
  scalar: [
    { id:'inspect-exact', label:'Exact form', phase:'P4', group:'Inspect' },
    { id:'inspect-decimal', label:'Decimal form', phase:'P4', group:'Inspect' },
    { id:'floating-point-profile', label:'IEEE-754 binary64 profile', phase:'P12', group:'Numerical' },
    { id:'verify-transition', label:'Verify equivalent…', phase:'P13', group:'Verify' },
  ],
  expression: [
    { id:'simplify', label:'Simplify', phase:'P4', group:'Algebra' },
    { id:'expand', label:'Expand', phase:'P4', group:'Algebra' },
    { id:'factor', label:'Factor', phase:'P4', group:'Algebra' },
    { id:'substitute', label:'Substitute…', phase:'P4', group:'Algebra' },
    { id:'polynomial-division', label:'Polynomial division', phase:'P4', group:'Algebra' },
    { id:'partial-fractions', label:'Partial fractions', phase:'P4', group:'Algebra' },
    { id:'differentiate', label:'Differentiate', phase:'P5', group:'Calculus' },
    { id:'higher-derivative', label:'Higher derivative…', phase:'P5', group:'Calculus' },
    { id:'integrate', label:'Antiderivative', phase:'P5', group:'Calculus' },
    { id:'definite-integral', label:'Definite integral…', phase:'P5', group:'Calculus' },
    { id:'limit', label:'Limit…', phase:'P5', group:'Calculus' },
    { id:'graph', label:'Graph', phase:'P6', group:'Visualize' },
    { id:'evaluate-linear-algebra', label:'Evaluate linear algebra', phase:'P7', group:'Linear algebra' },
    { id:'continuity-profile', label:'Continuity profile', phase:'P9', group:'Analysis' },
    { id:'differentiability-profile', label:'Differentiability profile', phase:'P9', group:'Analysis' },
    { id:'differentiability-at', label:'Differentiability at…', phase:'P9', group:'Analysis' },
    { id:'continuity-at', label:'Continuity at…', phase:'P9', group:'Analysis' },
    { id:'analysis-limit', label:'Rigorous limit…', phase:'P9', group:'Analysis' },
    { id:'taylor-polynomial', label:'Taylor polynomial…', phase:'P9', group:'Series' },
    { id:'power-series-profile', label:'Power-series profile…', phase:'P9', group:'Series' },
    { id:'asymptotic-profile', label:'Asymptotic profile', phase:'P9', group:'Analysis' },
    { id:'analysis-profile', label:'Analysis profile', phase:'P9', group:'Analysis' },
    { id:'numerical-root', label:'Numerical root…', phase:'P12', group:'Numerical' },
    { id:'numerical-derivative', label:'Numerical derivative…', phase:'P12', group:'Numerical' },
    { id:'numerical-integral', label:'Numerical integral…', phase:'P12', group:'Numerical' },
    { id:'verify-transition', label:'Verify transformation…', phase:'P13', group:'Verify' },
  ],
  equation: [
    { id:'solve', label:'Solve equation', phase:'P4', group:'Solve' },
    { id:'verify', label:'Check solution', phase:'P13', group:'Verify' },
    { id:'verify-transition', label:'Verify transformation…', phase:'P13', group:'Verify' },
  ],
  inequality: [
    { id:'solve-inequality', label:'Solve inequality', phase:'P4', group:'Solve' },
    { id:'verify-transition', label:'Verify transformation…', phase:'P13', group:'Verify' },
  ],
  system: [
    { id:'solve-system', label:'Solve linear system', phase:'P4', group:'Solve' },
    { id:'verify-transition', label:'Verify equivalent system…', phase:'P13', group:'Verify' },
  ],
  function: [
    { id:'evaluate-function', label:'Evaluate…', phase:'P5', group:'Function' },
    { id:'function-profile', label:'Full function profile', phase:'P5', group:'Function' },
    { id:'zeros', label:'Zeros', phase:'P5', group:'Analyze' },
    { id:'derivative', label:'Derivative', phase:'P5', group:'Analyze' },
    { id:'higher-derivative', label:'Higher derivative…', phase:'P5', group:'Analyze' },
    { id:'integrate', label:'Antiderivative', phase:'P5', group:'Analyze' },
    { id:'definite-integral', label:'Definite integral…', phase:'P5', group:'Analyze' },
    { id:'limit', label:'Limit…', phase:'P5', group:'Analyze' },
    { id:'critical-points', label:'Critical points', phase:'P5', group:'Behavior' },
    { id:'extrema', label:'Extrema', phase:'P5', group:'Behavior' },
    { id:'monotonicity', label:'Monotonicity', phase:'P5', group:'Behavior' },
    { id:'concavity', label:'Concavity', phase:'P5', group:'Behavior' },
    { id:'graph', label:'Graph', phase:'P6', group:'Visualize' },
    { id:'continuity-profile', label:'Continuity profile', phase:'P9', group:'Analysis' },
    { id:'differentiability-profile', label:'Differentiability profile', phase:'P9', group:'Analysis' },
    { id:'differentiability-at', label:'Differentiability at…', phase:'P9', group:'Analysis' },
    { id:'continuity-at', label:'Continuity at…', phase:'P9', group:'Analysis' },
    { id:'analysis-limit', label:'Rigorous limit…', phase:'P9', group:'Analysis' },
    { id:'taylor-polynomial', label:'Taylor polynomial…', phase:'P9', group:'Series' },
    { id:'power-series-profile', label:'Power-series profile…', phase:'P9', group:'Series' },
    { id:'asymptotic-profile', label:'Asymptotic profile', phase:'P9', group:'Analysis' },
    { id:'analysis-profile', label:'Analysis profile', phase:'P9', group:'Analysis' },
    { id:'numerical-root', label:'Numerical root…', phase:'P12', group:'Numerical' },
    { id:'numerical-derivative', label:'Numerical derivative…', phase:'P12', group:'Numerical' },
    { id:'numerical-integral', label:'Numerical integral…', phase:'P12', group:'Numerical' },
    { id:'verify-transition', label:'Verify equivalent function…', phase:'P13', group:'Verify' },
  ],
  vector: [
    { id:'evaluate-linear-algebra', label:'Evaluate exact', phase:'P7', group:'Linear algebra' },
    { id:'norm', label:'Euclidean norm', phase:'P7', group:'Linear algebra' },
    { id:'dot-product', label:'Dot product…', phase:'P7', group:'Linear algebra' },
    { id:'span-vector', label:'Span profile', phase:'P7', group:'Subspaces' },
    { id:'projection', label:'Project vector…', phase:'P8', group:'Inner product' },
    { id:'transpose', label:'Transpose', phase:'P8', group:'Inner product' },
    { id:'conjugate-transpose', label:'Conjugate transpose', phase:'P8', group:'Inner product' },
    { id:'orthogonality-profile', label:'Orthogonality profile', phase:'P8', group:'Inner product' },
    { id:'descriptive-statistics', label:'Descriptive statistics', phase:'P10', group:'Statistics' },
    { id:'mean-confidence-interval', label:'Mean confidence interval…', phase:'P10', group:'Inference' },
    { id:'mean-hypothesis-test', label:'One-sample mean test…', phase:'P10', group:'Inference' },
    { id:'proportion-confidence-interval', label:'Proportion confidence interval…', phase:'P10', group:'Inference' },
    { id:'proportion-hypothesis-test', label:'One-proportion test…', phase:'P10', group:'Inference' },
    { id:'sorting-trace', label:'Sorting trace…', phase:'P11', group:'Algorithms' },
    { id:'binary-search', label:'Binary search…', phase:'P11', group:'Algorithms' },
    { id:'heap-profile', label:'Binary heap profile', phase:'P11', group:'Data structures' },
    { id:'verify-transition', label:'Verify equivalent vector…', phase:'P13', group:'Verify' },
  ],
  matrix: [
    { id:'evaluate-linear-algebra', label:'Evaluate exact', phase:'P7', group:'Linear algebra' },
    { id:'det', label:'Determinant', phase:'P7', group:'Analyze' },
    { id:'rank', label:'Rank', phase:'P7', group:'Analyze' },
    { id:'inverse', label:'Inverse', phase:'P7', group:'Analyze' },
    { id:'rref', label:'RREF', phase:'P7', group:'Row reduction' },
    { id:'solve-augmented', label:'Solve as augmented system', phase:'P7', group:'Row reduction' },
    { id:'linear-profile', label:'Linear algebra profile', phase:'P7', group:'Subspaces' },
    { id:'column-space', label:'Column-space basis', phase:'P7', group:'Subspaces' },
    { id:'null-space', label:'Null-space basis', phase:'P7', group:'Subspaces' },
    { id:'row-space', label:'Row-space basis', phase:'P7', group:'Subspaces' },
    { id:'transpose', label:'Transpose', phase:'P8', group:'Advanced linear algebra' },
    { id:'conjugate-transpose', label:'Conjugate transpose', phase:'P8', group:'Advanced linear algebra' },
    { id:'orthogonality-profile', label:'Orthogonality profile', phase:'P8', group:'Inner product' },
    { id:'gram-schmidt', label:'Gram–Schmidt', phase:'P8', group:'Inner product' },
    { id:'project-column-space', label:'Project onto column space…', phase:'P8', group:'Inner product' },
    { id:'qr', label:'QR decomposition', phase:'P8', group:'Decompositions' },
    { id:'least-squares', label:'Least squares…', phase:'P8', group:'Applications' },
    { id:'characteristic-polynomial', label:'Characteristic polynomial', phase:'P8', group:'Eigenstructure' },
    { id:'eigen', label:'Eigenvalues', phase:'P8', group:'Eigenstructure' },
    { id:'eigenspaces', label:'Eigenspaces', phase:'P8', group:'Eigenstructure' },
    { id:'diagonalize', label:'Diagonalize', phase:'P8', group:'Eigenstructure' },
    { id:'symmetry-profile', label:'Symmetric / Hermitian profile', phase:'P8', group:'Structure' },
    { id:'correlation-regression', label:'Correlation & regression', phase:'P10', group:'Statistics' },
    { id:'interpolation-polynomial', label:'Interpolation polynomial', phase:'P12', group:'Numerical' },
    { id:'numerical-linear-solve', label:'Pivoted numerical solve', phase:'P12', group:'Numerical linear algebra' },
    { id:'iterative-linear-solve', label:'Jacobi / Gauss–Seidel…', phase:'P12', group:'Numerical linear algebra' },
    { id:'condition-estimate', label:'Condition estimate', phase:'P12', group:'Numerical linear algebra' },
    { id:'verify-transition', label:'Verify row operation / equality…', phase:'P13', group:'Verify' },
  ],
  dataset: [
    { id:'descriptive-statistics', label:'Descriptive statistics', phase:'P10', group:'Statistics' },
    { id:'mean-confidence-interval', label:'Mean confidence interval…', phase:'P10', group:'Inference' },
    { id:'mean-hypothesis-test', label:'One-sample mean test…', phase:'P10', group:'Inference' },
    { id:'proportion-confidence-interval', label:'Proportion confidence interval…', phase:'P10', group:'Inference' },
    { id:'proportion-hypothesis-test', label:'One-proportion test…', phase:'P10', group:'Inference' },
  ],
  distribution: [
    { id:'distribution-profile', label:'Distribution profile', phase:'P10', group:'Probability' },
    { id:'distribution-probability', label:'Probability…', phase:'P10', group:'Probability' },
    { id:'distribution-quantile', label:'Quantile…', phase:'P10', group:'Probability' },
    { id:'sampling-mean-profile', label:'Sampling mean…', phase:'P10', group:'Sampling' },
    { id:'simulate-distribution', label:'Simulate…', phase:'P10', group:'Simulation' },
  ],
  probability: [
    { id:'evaluate-probability', label:'Evaluate exactly', phase:'P10', group:'Probability' },
  ],
  proposition: [
    { id:'verify-transition', label:'Verify equivalent proposition…', phase:'P13', group:'Verify' },
    { id:'logic-profile', label:'Truth table & classification', phase:'P11', group:'Logic' },
    { id:'logic-normal-forms', label:'Canonical DNF / CNF', phase:'P11', group:'Logic' },
  ],
  'finite-set': [
    { id:'set-profile', label:'Set profile', phase:'P11', group:'Sets' },
    { id:'power-set', label:'Power set', phase:'P11', group:'Sets' },
    { id:'set-union', label:'Union with…', phase:'P11', group:'Set operations' },
    { id:'set-intersection', label:'Intersection with…', phase:'P11', group:'Set operations' },
    { id:'set-difference', label:'Difference with…', phase:'P11', group:'Set operations' },
    { id:'set-symmetric-difference', label:'Symmetric difference with…', phase:'P11', group:'Set operations' },
    { id:'cartesian-product', label:'Cartesian product with…', phase:'P11', group:'Set operations' },
    { id:'subset-check', label:'Subset of…', phase:'P11', group:'Set operations' },
  ],
  relation: [
    { id:'relation-profile', label:'Relation profile', phase:'P11', group:'Relations' },
    { id:'relation-closures', label:'Reflexive / symmetric / transitive closures', phase:'P11', group:'Relations' },
    { id:'equivalence-classes', label:'Equivalence classes', phase:'P11', group:'Relations' },
    { id:'hasse-profile', label:'Hasse / order profile', phase:'P11', group:'Relations' },
  ],
  graph: [
    { id:'graph-profile', label:'Graph profile', phase:'P11', group:'Graph theory' },
    { id:'graph-bfs', label:'BFS trace…', phase:'P11', group:'Traversal' },
    { id:'graph-dfs', label:'DFS trace…', phase:'P11', group:'Traversal' },
    { id:'shortest-path', label:'Shortest path…', phase:'P11', group:'Graph algorithms' },
    { id:'topological-sort', label:'Topological sort', phase:'P11', group:'Graph algorithms' },
    { id:'minimum-spanning-tree', label:'Minimum spanning tree', phase:'P11', group:'Graph algorithms' },
  ],
  recurrence: [
    { id:'recurrence-profile', label:'Recurrence profile', phase:'P11', group:'Recurrences' },
    { id:'recurrence-terms', label:'Generate terms…', phase:'P11', group:'Recurrences' },
    { id:'recurrence-closed-form', label:'Closed / characteristic form', phase:'P11', group:'Recurrences' },
  ],
  complexity: [
    { id:'complexity-profile', label:'Asymptotic complexity', phase:'P11', group:'Algorithms' },
  ],
  combinatorics: [
    { id:'evaluate-combinatorics', label:'Evaluate exactly', phase:'P11', group:'Combinatorics' },
  ],
  ode: [
    { id:'ivp-profile', label:'IVP profile', phase:'P12', group:'ODEs' },
    { id:'ode-solve', label:'Solve numerically…', phase:'P12', group:'ODEs' },
  ],
  sequence: [
    { id:'sequence-terms', label:'Preview terms…', phase:'P9', group:'Sequence' },
    { id:'sequence-limit', label:'Sequence limit', phase:'P9', group:'Sequence' },
    { id:'sequence-convergence', label:'Convergence profile', phase:'P9', group:'Sequence' },
    { id:'partial-sum', label:'Partial sum…', phase:'P9', group:'Series' },
    { id:'series-convergence', label:'Series convergence', phase:'P9', group:'Series' },
    { id:'sequence-series-profile', label:'Sequence + series profile', phase:'P9', group:'Analysis' },
  ],
  unknown: [],
};


function itemIsP8Linear(id: string): boolean {
  return ['projection','transpose','conjugate-transpose','orthogonality-profile','gram-schmidt','project-column-space','qr','least-squares','characteristic-polynomial','eigen','eigenspaces','diagonalize','symmetry-profile'].includes(id);
}

function itemRequiresRealRationalP8(id: string): boolean {
  return ['projection','project-column-space','least-squares','characteristic-polynomial','eigen','eigenspaces','diagonalize'].includes(id);
}

function itemIsP7Linear(id: string): boolean {
  return ['evaluate-linear-algebra','norm','dot-product','span-vector','det','rank','inverse','rref','solve-augmented','linear-profile','column-space','null-space','row-space'].includes(id);
}

function applicability(object: SemanticMathObject, id: string): { applicable: boolean; reason?: string } {
  if (object.kind === 'proposition' && object.shape.type === 'proposition' && object.shape.variables > 6) {
    return { applicable:false, reason:'P11 exhaustive truth-table workflows are limited to at most 6 proposition variables.' };
  }
  if ((object.kind === 'relation' || object.kind === 'graph' || object.kind === 'recurrence' || object.kind === 'combinatorics') && object.variables.length > 0) {
    return { applicable:false, reason:'This P11 workflow requires all numeric parameters/vertices to resolve exactly before execution.' };
  }
  if (object.kind === 'complexity' && object.variables.some((name) => name !== 'n')) {
    return { applicable:false, reason:'P11 asymptotic complexity uses n as the only free size variable.' };
  }
  if (object.kind === 'graph' && object.shape.type === 'graph' && id === 'topological-sort' && !object.shape.directed) {
    return { applicable:false, reason:'Topological sorting is defined for directed graphs.' };
  }
  if (object.kind === 'graph' && object.shape.type === 'graph' && id === 'minimum-spanning-tree' && (object.shape.directed || !object.shape.weighted)) {
    return { applicable:false, reason:'Minimum spanning trees require an undirected weighted graph (wgraph).'};
  }
  if (object.kind === 'vector' && ['sorting-trace','binary-search','heap-profile'].includes(id) && (object.variables.length > 0 || object.domain === 'complex')) {
    return { applicable:false, reason:'P11 array/data-structure traces require a resolved real numeric vector.' };
  }
  if ((object.kind === 'expression' || object.kind === 'function') && ['numerical-root','numerical-derivative','numerical-integral'].includes(id) && object.variables.length !== 1 && !(object.kind === 'function' && object.shape.type === 'function' && object.shape.arity === 1)) {
    return { applicable:false, reason:'P12 scalar numerical calculus currently requires exactly one independent variable.' };
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix' && id === 'interpolation-polynomial' && (object.shape.columns !== 2 || object.shape.rows < 2)) {
    return { applicable:false, reason:'P12 polynomial interpolation expects at least two points in an n×2 matrix.' };
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix' && ['numerical-linear-solve','iterative-linear-solve'].includes(id) && object.shape.columns !== object.shape.rows + 1) {
    return { applicable:false, reason:'P12 numerical system solving expects an n×(n+1) augmented matrix [A|b].' };
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix' && id === 'condition-estimate' && object.shape.rows !== object.shape.columns) {
    return { applicable:false, reason:'Condition estimation requires a square matrix.' };
  }
  if (object.kind === 'matrix' && ['interpolation-polynomial','numerical-linear-solve','iterative-linear-solve','condition-estimate'].includes(id) && (object.variables.length > 0 || object.domain === 'complex')) {
    return { applicable:false, reason:'P12 numerical matrix workflows require resolved real numeric entries.' };
  }
  if (object.kind === 'ode' && object.variables.length > 0) {
    return { applicable:false, reason:'P12 IVPs may use internal x and y only; define or substitute any additional external parameters first.' };
  }
  if ((object.kind === 'matrix' || object.kind === 'vector') && itemIsP8Linear(id) && object.variables.length > 0) {
    return { applicable:false, reason:'P8 advanced linear algebra requires every entry to resolve before the operation can run.' };
  }
  if ((object.kind === 'matrix' || object.kind === 'vector') && itemRequiresRealRationalP8(id) && object.domain === 'complex') {
    return { applicable:false, reason:'This P8 workflow currently requires real rational entries. Complex inner-product, adjoint, Gram–Schmidt and QR workflows are available separately.' };
  }
  if ((object.kind === 'matrix' || object.kind === 'vector') && itemIsP7Linear(id) && object.variables.length > 0) {
    return { applicable:false, reason:'P7 exact linear algebra requires every vector/matrix entry to resolve to an exact scalar. Define or substitute the remaining free symbols first.' };
  }
  if ((object.kind === 'matrix' || object.kind === 'vector') && itemIsP7Linear(id) && object.domain === 'complex') {
    return { applicable:false, reason:'P7 row-reduction arithmetic is rational-real. Use P8 conjugate-transpose, orthogonality, Gram–Schmidt, QR, or Hermitian workflows for supported exact complex entries.' };
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix' && ['det','inverse','eigen','eigenspaces','diagonalize','characteristic-polynomial','symmetry-profile'].includes(id) && object.shape.rows !== object.shape.columns) {
    return { applicable:false, reason:'Requires a square matrix.' };
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix' && id === 'correlation-regression' && (object.shape.columns !== 2 || object.shape.rows < 2)) {
    return { applicable:false, reason:'P10 simple correlation/regression expects at least two paired observations in an n×2 matrix.' };
  }
  if (object.kind === 'matrix' && id === 'correlation-regression' && (object.variables.length > 0 || object.domain === 'complex')) {
    return { applicable:false, reason:'P10 correlation/regression requires resolved real numeric pairs.' };
  }
  if ((object.kind === 'dataset' || object.kind === 'distribution' || object.kind === 'probability') && object.variables.length > 0) {
    return { applicable:false, reason:'P10 probability/statistics objects require every parameter or observation to resolve before computation.' };
  }
  if (object.kind === 'vector' && ['descriptive-statistics','mean-confidence-interval','mean-hypothesis-test','proportion-confidence-interval','proportion-hypothesis-test'].includes(id) && (object.variables.length > 0 || object.domain === 'complex')) {
    return { applicable:false, reason:'P10 statistics requires a real numeric vector with all entries resolved.' };
  }
  if (object.kind === 'matrix' && object.shape.type === 'matrix' && id === 'solve-augmented' && object.shape.columns < 2) {
    return { applicable:false, reason:'An augmented system needs at least one coefficient column and one right-hand-side column.' };
  }
  if (object.kind === 'expression' && ['expand','factor','polynomial-division','partial-fractions'].includes(id) && object.variables.length !== 1) {
    return { applicable:false, reason:'P4 polynomial operations currently require exactly one free variable.' };
  }
  if (object.kind === 'expression' && id === 'evaluate-linear-algebra' && object.shape.type !== 'scalar') {
    return { applicable:false, reason:'This action appears for scalar results produced by vector/matrix products.' };
  }
  if (object.kind === 'expression' && ['differentiate','higher-derivative','integrate','definite-integral','limit','graph','continuity-profile','continuity-at','differentiability-profile','differentiability-at','analysis-limit','taylor-polynomial','power-series-profile','asymptotic-profile','analysis-profile'].includes(id) && object.variables.length !== 1) {
    const p9Analysis = ['continuity-profile','continuity-at','differentiability-profile','differentiability-at','analysis-limit','taylor-polynomial','power-series-profile','asymptotic-profile','analysis-profile'].includes(id);
    return { applicable:false, reason: id === 'graph' ? 'P6 2D graphing requires exactly one free variable.' : p9Analysis ? 'P9 real-analysis workflows currently require exactly one free variable.' : 'P5 calculus currently requires exactly one free variable.' };
  }
  if (object.kind === 'expression' && ['polynomial-division','partial-fractions'].includes(id)) {
    const value = object.valueAst;
    if (value.type !== 'binary' || value.operator !== '/') return { applicable:false, reason:'Requires a rational expression with a polynomial numerator and denominator.' };
  }
  if (object.kind === 'equation' && id === 'solve' && object.variables.length !== 1) {
    return { applicable:false, reason:'P4 equation solving currently requires exactly one free variable.' };
  }
  if (object.kind === 'inequality' && id === 'solve-inequality' && object.variables.length !== 1) {
    return { applicable:false, reason:'P4 inequality solving currently requires exactly one free variable.' };
  }
  if (object.kind === 'system' && id === 'solve-system' && object.valueAst.type === 'system' && !object.valueAst.items.every((item) => item.type === 'equation')) {
    return { applicable:false, reason:'P4 system solving currently supports semicolon-separated equations only.' };
  }
  if (object.kind === 'function' && object.shape.type === 'function' && object.shape.arity !== 1) {
    return { applicable:false, reason: id === 'graph' ? 'P6 2D graphing supports unary functions only.' : ['continuity-profile','continuity-at','differentiability-profile','differentiability-at','analysis-limit','taylor-polynomial','power-series-profile','asymptotic-profile','analysis-profile'].includes(id) ? 'P9 real-analysis workflows currently support unary functions only.' : 'P5 calculus profiles currently support unary functions only.' };
  }
  if (object.kind === 'sequence' && object.shape.type === 'sequence') {
    const sequenceIndex = object.shape.index;
    if (object.variables.some((name) => name !== sequenceIndex)) return { applicable:false, reason:'P9 sequence workflows require a single sequence index and no unresolved external variables. Define or substitute the remaining symbols first.' };
  }
  return { applicable:true };
}

export function capabilitiesFor(object: SemanticMathObject | null): ObjectCapability[] {
  if (!object) return [];
  return definitions[object.kind].map((item) => {
    const applicabilityResult = applicability(object, item.id);
    return { ...item, ...applicabilityResult, available: ['P4','P5','P6','P7','P8','P9','P10','P11','P12','P13'].includes(item.phase) && applicabilityResult.applicable };
  });
}
