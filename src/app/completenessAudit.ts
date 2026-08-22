export type CompletenessLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type CompletenessStatus = 'missing' | 'incidental' | 'narrow' | 'partial' | 'strong' | 'comprehensive';

export interface CompletenessDomain {
  id: string;
  title: string;
  level: CompletenessLevel;
  status: CompletenessStatus;
  evidence: string[];
  gaps: string[];
  nextPhase?: string;
}

export const COMPLETENESS_RUBRIC: Record<CompletenessLevel, CompletenessStatus> = {
  0: 'missing', 1: 'incidental', 2: 'narrow', 3: 'partial', 4: 'strong', 5: 'comprehensive',
};

export const COMPLETENESS_DOMAINS: CompletenessDomain[] = [
  {
    id: 'algebra-cas', title: 'Algebra & symbolic manipulation', level: 4, status: 'strong',
    evidence: ['Exact rational arithmetic', 'Polynomial/rational simplify, expand, factor, division and partial fractions', 'Linear/quadratic equations, linear inequalities and exact linear systems'],
    gaps: ['General transcendental equation solving', 'Nonlinear systems', 'Broader piecewise/assumption-aware CAS', 'General symbolic factorization beyond the supported polynomial/rational boundary'],
  },
  {
    id: 'single-calculus', title: 'Single-variable calculus', level: 4, status: 'strong',
    evidence: ['Symbolic derivatives and higher derivatives', 'Bounded elementary antiderivatives and definite integrals', 'Limits, zeros, extrema, monotonicity and concavity'],
    gaps: ['Implicit differentiation', 'Improper integrals', 'Broader integration techniques', 'Parametric and polar calculus'],
  },
  {
    id: 'multivariable-calculus', title: 'Multivariable calculus', level: 3, status: 'partial',
    evidence: ['First-class scalar and vector-valued multi-parameter function definitions', 'Exact partial and mixed derivatives', 'Gradient, Jacobian and Hessian matrices', 'Directional derivatives, first-order linearization and tangent planes', 'Bounded exact two-variable critical-point solving with Hessian classification', 'Bounded one-constraint Lagrange stationarity workflows', 'E2 iterated double/triple integration reuses the same multivariable semantic model'],
    gaps: ['Multivariable limits, continuity and differentiability theory', 'General nonlinear critical-point systems', 'Multiple constraints and KKT conditions', 'General/global optimization certification'], nextPhase: 'E5',
  },
  {
    id: 'vector-calculus', title: 'Vector calculus & multivariable integration', level: 3, status: 'partial',
    evidence: ['Exact iterated double and triple integrals when supported by the bounded symbolic antiderivative engine', 'Deterministic Simpson fallback on constant rectangular regions', 'Polar/cylindrical/spherical substitutions with Jacobian factors', 'First-class 2D/3D vector-field workflows with divergence, curl, conservative checks and scalar potentials', 'Parameterized scalar/work line integrals and graph-surface scalar/flux integrals', 'Computational Green, Gauss/divergence and Stokes theorem verification on bounded rectangular/graph cases', 'E3 directly visualizes parameterized curves, 2D vector fields, scalar fields and graph surfaces'],
    gaps: ['General region algebra and automatic order conversion', 'General mathematical parametric/implicit surface integration', 'Arbitrary coordinate transformations and orientation machinery', 'Improper/singular multivariable integrals and stronger cubature/error control', 'Theorem hypotheses/topology certificates beyond the represented bounded cases'], nextPhase: 'E10',
  },
  {
    id: 'visualization', title: 'Mathematical visualization', level: 4, status: 'strong',
    evidence: ['Interactive explicit Cartesian plots with pan, zoom, trace and symbolic/numeric feature overlays', 'Parameterized and polar curves', 'Marching-squares implicit curves and scalar-field contour maps', 'Sampled scalar fields with E1 exact critical-point overlays', '2D vector fields, exact gradient fields and deterministic phase portraits', 'Rotatable SVG graph surfaces and two-parameter three-component parametric surfaces', 'E2 rectangular-region overlays plus SVG/PNG export across the visualization workspace'],
    gaps: ['Implicit 3D surfaces and isosurfaces', '3D vector fields and volumetric visualization', 'GPU/WebGL acceleration for very large meshes', 'Complex-plane visualization', 'Deeper linked geometry metadata from theorem/integration results'], nextPhase: 'E12',
  },
  {
    id: 'linear-core', title: 'Linear algebra core', level: 4, status: 'strong',
    evidence: ['Exact vector/matrix arithmetic', 'RREF, rank, determinant and inverse', 'Exact systems and subspace bases', 'Rank-nullity and independence profiles'],
    gaps: ['Sparse/large numerical workflows', 'More general field support'],
  },
  {
    id: 'linear-advanced', title: 'Advanced linear algebra', level: 3, status: 'partial',
    evidence: ['Gram-Schmidt, QR and least squares', 'Characteristic polynomials through 6x6', 'Bounded exact eigenvalues/eigenspaces and diagonalization', 'Hermitian/normal structure checks'],
    gaps: ['SVD', 'Jordan form', 'Schur decomposition', 'General numerical eigensolvers', 'Generalized eigenproblems', 'Matrix functions'], nextPhase: 'E5',
  },
  {
    id: 'real-analysis', title: 'Real analysis', level: 3, status: 'partial',
    evidence: ['Sequences and convergence', 'Several series tests', 'One-sided limits and discontinuity classification', 'Taylor/power-series profiles and rational asymptotics'],
    gaps: ['Epsilon-delta proof workflows', 'Uniform convergence', 'Metric spaces', 'Compactness/completeness theorem workflows', 'Riemann/Lebesgue integration theory'], nextPhase: 'E11',
  },
  {
    id: 'complex-analysis', title: 'Complex analysis', level: 0, status: 'missing', evidence: [],
    gaps: ['Complex differentiability', 'Cauchy-Riemann equations', 'Contour integration', 'Residues', 'Complex series and mappings'], nextPhase: 'E8',
  },
  {
    id: 'probability', title: 'Probability', level: 3, status: 'partial',
    evidence: ['Exact elementary probability arithmetic', 'Bernoulli/binomial/geometric/Poisson/uniform/normal distributions', 'Sampling-mean profiles and deterministic simulation'],
    gaps: ['Joint and multivariate distributions', 'Random-variable transformations', 'Covariance matrices', 'Markov chains and stochastic processes', 'Broader theorem-level LLN/CLT tooling'], nextPhase: 'E6',
  },
  {
    id: 'statistics', title: 'Statistics', level: 3, status: 'partial',
    evidence: ['Descriptive statistics', 'One-sample t inference', 'One-proportion inference', 'Simple linear regression and correlation'],
    gaps: ['Two-sample and paired inference', 'Chi-square procedures', 'ANOVA', 'Multiple regression', 'Nonparametric tests', 'Model diagnostics'], nextPhase: 'E6',
  },
  {
    id: 'discrete', title: 'Discrete mathematics', level: 3, status: 'partial',
    evidence: ['Propositional logic and canonical normal forms', 'Finite sets and relations', 'Graph profiles', 'Linear recurrences', 'Combinatorics and common asymptotic forms'],
    gaps: ['Predicate logic and quantifiers', 'Generating functions', 'More general recurrence solving', 'Broader combinatorial identities and proof workflows'], nextPhase: 'E9',
  },
  {
    id: 'algorithms', title: 'Algorithms & data-structure mathematics', level: 2, status: 'narrow',
    evidence: ['BFS/DFS', 'Dijkstra, topological sort and Kruskal MST', 'Basic sorting/search traces and heap checks'],
    gaps: ['Dynamic programming workbench', 'Max-flow/min-cut', 'Matching', 'Negative-weight shortest paths', 'Advanced data structures', 'Algorithm-proof and complexity derivations'], nextPhase: 'E9',
  },
  {
    id: 'numerical', title: 'Numerical analysis', level: 3, status: 'partial',
    evidence: ['Root finding', 'Finite differences', 'Adaptive/composite quadrature', 'Interpolation', 'Numerical linear solves and stationary iterations', 'Condition estimates'],
    gaps: ['Spline interpolation', 'Nonlinear systems', 'LU/Cholesky numerical workflows', 'Numerical eigen/SVD', 'General error propagation and stability analysis', 'Optimization solvers'], nextPhase: 'E5',
  },
  {
    id: 'ode', title: 'ODEs & dynamical systems', level: 2, status: 'narrow',
    evidence: ['First-order IVP semantic object', 'Euler, Heun and fixed-step RK4', 'Step-doubling endpoint diagnostics', 'E3 phase portraits visualize supplied two-dimensional autonomous vector fields'],
    gaps: ['Symbolic first-order ODE solving', 'Higher-order ODEs', 'Systems of ODEs as first-class ODE objects', 'Adaptive RK methods', 'Stiff solvers', 'Equilibrium/stability classification'], nextPhase: 'E4',
  },
  {
    id: 'pde', title: 'Partial differential equations', level: 0, status: 'missing', evidence: [],
    gaps: ['PDE objects', 'Classification', 'Separation of variables', 'Boundary/initial-value workflows', 'Numerical PDE methods'], nextPhase: 'E10',
  },
  {
    id: 'optimization', title: 'Optimization', level: 1, status: 'incidental',
    evidence: ['Exact local min/max/saddle classification for bounded two-variable critical-point problems', 'One-equality-constraint Lagrange stationarity when the exact system is linear'],
    gaps: ['General nonlinear optimization', 'Convexity and global-optimum tools', 'Linear programming', 'Multiple constraints and KKT conditions', 'Numerical optimization'], nextPhase: 'E5',
  },
  {
    id: 'transforms', title: 'Transforms & harmonic analysis', level: 0, status: 'missing', evidence: [],
    gaps: ['Laplace transforms', 'Inverse Laplace', 'Fourier series', 'Fourier transforms', 'Convolution and transform-based ODE/PDE workflows'], nextPhase: 'E7',
  },
  {
    id: 'number-theory', title: 'Number theory', level: 0, status: 'missing', evidence: [],
    gaps: ['Divisibility and Euclidean algorithm as user tools', 'Modular arithmetic', 'Congruences and CRT', 'Prime factorization', 'Diophantine equations'], nextPhase: 'E9',
  },
  {
    id: 'abstract-algebra', title: 'Abstract algebra', level: 0, status: 'missing', evidence: [],
    gaps: ['Groups', 'Rings', 'Fields', 'Homomorphisms', 'Quotients', 'Finite algebraic structures'], nextPhase: 'E10',
  },
  {
    id: 'geometry-topology', title: 'Geometry & topology', level: 0, status: 'missing', evidence: [],
    gaps: ['Euclidean/analytic geometry workbench', 'Curves and surfaces', 'Metric/topological spaces', 'Connectedness and compactness tools'], nextPhase: 'E10',
  },
  {
    id: 'proof', title: 'Proof & formal reasoning', level: 2, status: 'narrow',
    evidence: ['Exact supported algebraic transformation checking', 'Equation/inequality/system equivalence checks', 'Elementary row-operation verification', 'Exhaustive propositional entailment'],
    gaps: ['Predicate logic', 'Quantifiers', 'Induction', 'Theorem-library proof construction', 'General analysis/algebra proofs', 'Natural-language proof assistance with formal certificates'], nextPhase: 'E11',
  },
];

export const COMPLETENESS_MAX_LEVEL = 5;

export function completenessBreadthPercent(domains: CompletenessDomain[] = COMPLETENESS_DOMAINS): number {
  if (!domains.length) return 0;
  const total = domains.reduce((sum, domain) => sum + domain.level, 0);
  return Math.round((total / (domains.length * COMPLETENESS_MAX_LEVEL)) * 100);
}

export function implementedDomainMaturityPercent(domains: CompletenessDomain[] = COMPLETENESS_DOMAINS): number {
  const implemented = domains.filter((domain) => domain.level > 0);
  if (!implemented.length) return 0;
  const total = implemented.reduce((sum, domain) => sum + domain.level, 0);
  return Math.round((total / (implemented.length * COMPLETENESS_MAX_LEVEL)) * 100);
}

export function domainsByStatus(status: CompletenessStatus): CompletenessDomain[] {
  return COMPLETENESS_DOMAINS.filter((domain) => domain.status === status);
}
