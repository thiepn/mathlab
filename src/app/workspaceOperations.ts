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
]);

const PRIORITY = [
  'solve','solve-inequality','solve-system','simplify','factor','expand',
  'gradient','jacobian','hessian','multivariable-critical-points','second-derivative-test',
  'vector-field-profile','divergence','curl','conservative-field','scalar-potential',
  'ode-profile','ode-symbolic-solve','ode-equilibria','ode-stability','ode-linearize','ode-to-system','ode-adaptive-solve',
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