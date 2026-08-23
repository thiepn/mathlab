import type { ObjectCapability } from '../lib/math/capabilities';

export const OPERATIONS_REQUIRING_CONTROLS = new Set([
  'substitute','evaluate-function','higher-derivative','definite-integral','limit','dot-product','projection',
  'project-column-space','least-squares','continuity-at','differentiability-at','analysis-limit','taylor-polynomial',
  'power-series-profile','sequence-terms','partial-sum','series-convergence','sequence-series-profile',
  'distribution-probability','distribution-quantile','sampling-mean-profile','simulate-distribution','mean-confidence-interval',
  'mean-hypothesis-test','proportion-confidence-interval','proportion-hypothesis-test','set-union','set-intersection',
  'set-difference','set-symmetric-difference','cartesian-product','subset-check','graph-bfs','graph-dfs','shortest-path',
  'recurrence-terms','sorting-trace','binary-search','numerical-root','numerical-derivative','numerical-integral',
  'iterative-linear-solve','ode-solve','verify-transition','verify',
  'partial-derivative','mixed-partial','directional-derivative','linearization','tangent-plane','lagrange-multipliers',
  'coordinate-transform','double-integral','triple-integral','scalar-line-integral','line-integral','surface-integral','flux-integral','green-theorem','gauss-theorem','stokes-theorem',
  'numerical-eigen','numerical-svd','pseudoinverse','numerical-rank','spectral-condition','conjugate-gradient',
  'nonlinear-system-solve','numerical-optimize','constrained-optimize','convexity-diagnostic','linear-program',
  'affine-rv-transform','two-sample-mean-inference','paired-mean-inference','two-proportion-inference','chi-square-goodness','bootstrap-mean','markov-step',
  'convolution','fourier-series','numerical-fourier-transform','numerical-inverse-fourier-transform',
  'complex-map','complex-series','singularity-profile','complex-residue','complex-contour-integral','residue-theorem',
  'finite-quantifier-profile','extended-master-theorem','bellman-ford','max-flow-min-cut','knapsack-dp',
  'extended-gcd','modular-inverse','linear-congruence','linear-diophantine',
]);

const PRIORITY = [
  'solve','solve-inequality','solve-system','simplify','factor','expand',
  'gradient','jacobian','hessian','multivariable-critical-points','second-derivative-test',
  'vector-field-profile','divergence','curl','conservative-field','scalar-potential',
  'complex-decompose','complex-derivative','cauchy-riemann','branch-diagnostics',
  'number-theory-profile','recurrence-generating-function','recurrence-closed-form-e9','bipartite-matching','longest-increasing-subsequence','chinese-remainder',
  'ode-profile','ode-symbolic-solve','laplace-ode-solve','ode-equilibria','ode-stability','ode-linearize','ode-to-system','ode-adaptive-solve',
  'laplace-transform','inverse-laplace-transform','fourier-transform','inverse-fourier-transform','discrete-fourier-transform','inverse-discrete-fourier-transform',
  'numerical-lu','numerical-cholesky','numerical-qr','numerical-eigen','numerical-svd','pseudoinverse','numerical-rank','spectral-condition','conjugate-gradient','numerical-optimize','nonlinear-system-solve',
  'joint-distribution-profile','covariance-correlation-matrix','chi-square-independence','one-way-anova','multiple-linear-regression','regression-diagnostics','mann-whitney','wilcoxon-signed-rank','markov-profile',
  'function-profile','derivative','differentiate','integrate','zeros','graph','det','rref','rank','inverse','eigen','linear-profile','descriptive-statistics',
  'distribution-profile','evaluate-probability','logic-profile','graph-profile','recurrence-profile','numerical-linear-solve',
  'condition-estimate','set-profile','relation-profile','complexity-profile','inspect-exact','inspect-decimal',
];

export function operationNeedsControls(operation: string): boolean {
  return OPERATIONS_REQUIRING_CONTROLS.has(operation);
}

export function preferredWorkspaceActions(actions: ObjectCapability[], limit = 6): ObjectCapability[] {
  const available = actions.filter((item) => item.available);
  const score = (item: ObjectCapability) => {
    const index = PRIORITY.indexOf(item.id);
    return index === -1 ? PRIORITY.length + 20 : index;
  };
  return [...available]
    .filter((item) => !operationNeedsControls(item.id))
    .sort((a, b) => score(a) - score(b) || a.group.localeCompare(b.group) || a.label.localeCompare(b.label))
    .slice(0, limit);
}
