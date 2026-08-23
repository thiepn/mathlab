import type { Exactness } from '../lib/math/types';

export type E12GoldenRunner = 'engine' | 'visualization';

export interface E12GoldenCase {
  domainId: string;
  label: string;
  runner: E12GoldenRunner;
  input: string;
  operation?: string;
  options?: Record<string, string | number | boolean>;
  expectedExactness: Exclude<Exactness, 'unknown'>;
  expectedDisplayIncludes?: string;
}

export const E12_TARGET_VERSION = '2.0.0-rc.1';
export const E12_CERTIFICATION_DOMAINS = 22;

// One production-path smoke case per fixed M7 domain. Domain-specific suites remain
// deeper; this corpus proves that the cumulative E11 engine and visualization stack
// still compose across the complete E12 breadth audit.
export const E12_GOLDEN_CORPUS: E12GoldenCase[] = [
  { domainId:'algebra-cas', label:'Exact algebra', runner:'engine', input:'x^2-1', operation:'factor', expectedExactness:'exact', expectedDisplayIncludes:'x' },
  { domainId:'single-calculus', label:'Symbolic derivative', runner:'engine', input:'x^3+sin(x)', operation:'differentiate', expectedExactness:'exact', expectedDisplayIncludes:'x' },
  { domainId:'multivariable-calculus', label:'Gradient', runner:'engine', input:'f(x,y) := x^2+y^2', operation:'gradient', expectedExactness:'exact', expectedDisplayIncludes:'x' },
  { domainId:'vector-calculus', label:'Divergence', runner:'engine', input:'F(x,y,z) := [x,y,z]', operation:'divergence', expectedExactness:'exact', expectedDisplayIncludes:'3' },
  { domainId:'visualization', label:'Sampled explicit curve', runner:'visualization', input:'x^3-3*x', expectedExactness:'approximate' },
  { domainId:'linear-core', label:'Exact RREF', runner:'engine', input:'[[1,2],[3,4]]', operation:'rref', expectedExactness:'exact' },
  { domainId:'linear-advanced', label:'Numerical SVD', runner:'engine', input:'[[1,0],[0,2]]', operation:'numerical-svd', options:{tolerance:1e-12}, expectedExactness:'approximate' },
  { domainId:'real-analysis', label:'Continuity at a removable hole', runner:'engine', input:'(x^2-1)/(x-1)', operation:'continuity-at', options:{point:'1'}, expectedExactness:'exact', expectedDisplayIncludes:'Not continuous' },
  { domainId:'complex-analysis', label:'Complex derivative', runner:'engine', input:'f(z) := z^2', operation:'complex-derivative', expectedExactness:'exact', expectedDisplayIncludes:'z' },
  { domainId:'probability', label:'Exact Bayes probability', runner:'engine', input:'bayes(1/100,9/10,27/1000)', operation:'evaluate-probability', expectedExactness:'exact' },
  { domainId:'statistics', label:'Descriptive statistics', runner:'engine', input:'data(1,2,3,4,5)', operation:'descriptive-statistics', expectedExactness:'exact' },
  { domainId:'discrete', label:'Generating function', runner:'engine', input:'linrec2(0,1,1,1)', operation:'recurrence-generating-function', expectedExactness:'exact', expectedDisplayIncludes:'A(x)' },
  { domainId:'algorithms', label:'Bellman-Ford', runner:'engine', input:'wdigraph(4, [[1,2,4],[1,3,5],[2,3,-2],[3,4,3]])', operation:'bellman-ford', options:{start:1,target:4}, expectedExactness:'exact' },
  { domainId:'numerical', label:'Pivoted LU', runner:'engine', input:'[[4,2],[1,3]]', operation:'numerical-lu', expectedExactness:'approximate' },
  { domainId:'ode', label:'Planar stability', runner:'engine', input:'odesys([x,y],[-x,-2*y])', operation:'ode-stability', expectedExactness:'exact', expectedDisplayIncludes:'Stable node' },
  { domainId:'pde', label:'Finite heat modal solution', runner:'engine', input:'heatpde(1,1,[1])', operation:'pde-modal-solution', expectedExactness:'exact', expectedDisplayIncludes:'exp' },
  { domainId:'optimization', label:'Local BFGS', runner:'engine', input:'f(x,y) := (x-1)^2 + 2*(y+2)^2', operation:'numerical-optimize', options:{method:'bfgs',point:'[0,0]',tolerance:1e-9,maxIterations:200}, expectedExactness:'approximate' },
  { domainId:'transforms', label:'Laplace transform', runner:'engine', input:'f(t) := t^2 + 3*sin(2*t)', operation:'laplace-transform', expectedExactness:'exact', expectedDisplayIncludes:'s' },
  { domainId:'number-theory', label:'Arithmetic functions', runner:'engine', input:'360', operation:'number-theory-profile', expectedExactness:'exact', expectedDisplayIncludes:'2^3' },
  { domainId:'abstract-algebra', label:'Finite group profile', runner:'engine', input:'group([[1,2,3],[2,3,1],[3,1,2]])', operation:'finite-group-profile', expectedExactness:'exact' },
  { domainId:'geometry-topology', label:'Finite topology profile', runner:'engine', input:'topology([[0,0],[1,0],[0,1],[1,1]])', operation:'finite-topology-profile', expectedExactness:'exact' },
  { domainId:'proof', label:'Ordinary induction', runner:'engine', input:'S(n) = n*(n+1)/2', operation:'induction-certificate', options:{index:'n',stepVariable:'k',base:1,baseFact:'S(1)=1',recurrence:'S(k+1)=S(k)+(k+1)'}, expectedExactness:'exact', expectedDisplayIncludes:'INDUCTION CERTIFIED' },
];

export const E12_AUTOMATED_GATES = [
  'fixed-22-domain-rubric',
  'golden-cross-domain-corpus',
  'catalog-and-capability-consistency',
  'exactness-provenance',
  'p15-release-audit',
  'strict-typescript',
  'vitest-regression',
  'vite-production-build',
  'pwa-static-contract',
] as const;

export const E12_EXTERNAL_RELEASE_GATES = [
  'current Chromium desktop smoke',
  'current Firefox desktop smoke',
  'Android Chrome smoke',
  'iOS Safari/WebKit smoke',
  'real deployed PWA install/offline/upgrade cycle',
  'keyboard-only and screen-reader spot checks',
  'visual regression across target viewport widths',
] as const;
