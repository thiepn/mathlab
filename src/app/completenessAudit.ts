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

// E12 deliberately reuses the exact 22-domain M7 rubric. Scores are conservative:
// a domain is promoted only for first-class deterministic workflows that exist in production.
export const COMPLETENESS_DOMAINS: CompletenessDomain[] = [
  {
    id: 'algebra-cas', title: 'Algebra & symbolic manipulation', level: 4, status: 'strong',
    evidence: ['Exact rational arithmetic', 'Polynomial/rational simplify, expand, factor, division and partial fractions', 'Linear/quadratic equations, linear inequalities and exact linear systems', 'Exact substitution and domain-preserving transformation verification'],
    gaps: ['General transcendental equation solving', 'Nonlinear symbolic systems', 'Broader piecewise/assumption-aware CAS', 'General symbolic factorization beyond the supported polynomial/rational boundary'],
  },
  {
    id: 'single-calculus', title: 'Single-variable calculus', level: 4, status: 'strong',
    evidence: ['Symbolic derivatives and higher derivatives', 'Bounded elementary antiderivatives and definite integrals', 'Limits, zeros, extrema, monotonicity and concavity', 'Taylor/power-series and asymptotic workflows'],
    gaps: ['General implicit differentiation', 'General improper integrals', 'Broader integration techniques', 'Full parametric/polar calculus theory'],
  },
  {
    id: 'multivariable-calculus', title: 'Multivariable calculus', level: 3, status: 'partial',
    evidence: ['First-class scalar and vector-valued multi-parameter functions', 'Exact partial/mixed derivatives, gradients, Jacobians and Hessians', 'Directional derivatives, linearization and tangent planes', 'Bounded exact two-variable critical-point and one-constraint Lagrange workflows', 'Iterated double/triple integration reuses the same semantic model'],
    gaps: ['General multivariable limits, continuity and differentiability theory', 'General nonlinear critical-point systems', 'Multiple constraints and KKT conditions', 'General/global optimization certification'],
  },
  {
    id: 'vector-calculus', title: 'Vector calculus & multivariable integration', level: 3, status: 'partial',
    evidence: ['Bounded exact/approximate double and triple integrals', 'Polar/cylindrical/spherical substitutions with Jacobians', '2D/3D vector fields with divergence, curl, conservative checks and potentials', 'Parameterized line integrals and graph-surface scalar/flux integrals', 'Bounded Green, Gauss and Stokes verification'],
    gaps: ['General region algebra and automatic order conversion', 'General parametric/implicit surface integration', 'Arbitrary coordinate transformations/orientation machinery', 'Improper/singular multivariable integration with rigorous error control', 'General theorem-hypothesis/topology certification'],
  },
  {
    id: 'visualization', title: 'Mathematical visualization', level: 4, status: 'strong',
    evidence: ['Interactive explicit Cartesian plotting with pan, zoom and trace', 'Parameterized and polar curves', 'Implicit curves, contours and scalar fields', '2D vector/gradient fields and phase portraits', 'Rotatable graph and parametric SVG 3D surfaces', 'Exact-analysis overlays and SVG/PNG export'],
    gaps: ['Implicit 3D surfaces and isosurfaces', '3D vector fields and volumetric visualization', 'GPU/WebGL acceleration for large meshes', 'Complex-plane visualization', 'Deeper linked theorem/geometry metadata'],
  },
  {
    id: 'linear-core', title: 'Linear algebra core', level: 4, status: 'strong',
    evidence: ['Exact vector/matrix arithmetic', 'RREF, rank, determinant and inverse', 'Exact systems and subspace bases', 'Rank-nullity and independence profiles', 'Deterministic proof verification for row/equality steps'],
    gaps: ['Sparse/large numerical workflows', 'Broader exact field support'],
  },
  {
    id: 'linear-advanced', title: 'Advanced linear algebra', level: 4, status: 'strong',
    evidence: ['Exact Gram-Schmidt, QR, least squares and bounded eigenspaces/diagonalization', 'Pivoted LU and Cholesky', 'Householder QR', 'Symmetric numerical eigenanalysis', 'SVD, pseudoinverse, numerical rank and spectral conditioning', 'Conjugate-gradient solving and Hermitian spectral-theorem certificates'],
    gaps: ['Jordan form', 'Schur decomposition', 'General nonsymmetric numerical eigensolvers', 'Generalized eigenproblems', 'Matrix functions and large sparse decomposition workflows'],
  },
  {
    id: 'real-analysis', title: 'Real analysis', level: 3, status: 'partial',
    evidence: ['Sequences and deterministic convergence classifications', 'Several series tests', 'One-sided limits and discontinuity classification', 'Taylor/power-series and rational asymptotic workflows', 'Finite metric-space compactness/connectedness consequences', 'Bounded differentiability-implies-continuity theorem certificates'],
    gaps: ['General epsilon-delta proof workflows', 'Uniform convergence', 'General metric-space completeness/compactness theorem proving', 'Riemann/Lebesgue integration theory', 'General theorem construction'],
  },
  {
    id: 'complex-analysis', title: 'Complex analysis', level: 3, status: 'partial',
    evidence: ['Exact rectangular real/imaginary decomposition', 'Complex derivatives and Cauchy-Riemann residual certification', 'Branch diagnostics and local branch warnings', 'Bounded rational power/Laurent series and singularity classification', 'Exact/numerical residues, contour integrals and bounded residue-theorem workflows'],
    gaps: ['General Cauchy integral theorem/formula workflows', 'Analytic continuation and Riemann surfaces', 'General essential-singularity/Laurent machinery', 'Argument principle and Rouché workflows', 'Conformal-mapping classification and complex-plane visualization'],
  },
  {
    id: 'probability', title: 'Probability', level: 4, status: 'strong',
    evidence: ['Exact elementary probability arithmetic', 'Broad elementary discrete/continuous distribution families', 'Joint finite PMFs and affine random-variable transformations', 'Covariance/correlation matrices', 'Finite Markov-chain profiles and transition steps', 'Deterministic simulation with explicit heuristic status'],
    gaps: ['General continuous joint distributions and transformations', 'Conditional-expectation workflows', 'Broader stochastic processes', 'Theorem-level LLN/CLT proof workflows'],
  },
  {
    id: 'statistics', title: 'Statistics', level: 4, status: 'strong',
    evidence: ['Descriptive statistics', 'One- and two-sample/paired mean inference', 'One- and two-proportion inference', 'Chi-square goodness/independence procedures and one-way ANOVA', 'Simple and multiple linear regression with diagnostics', 'Mann-Whitney, Wilcoxon and deterministic percentile bootstrap'],
    gaps: ['Generalized linear models', 'Time-series/survival workflows', 'Bayesian inference', 'Advanced experimental-design/mixed-model workflows', 'Broader robust/model-selection tooling'],
  },
  {
    id: 'discrete', title: 'Discrete mathematics', level: 4, status: 'strong',
    evidence: ['Propositional logic and canonical normal forms', 'Finite sets and relations', 'Graph profiles', 'Linear recurrences, exact generating functions and stronger closed forms', 'Finite-domain universal/existential quantifiers', 'Combinatorics, asymptotics and recurrence-backed induction certificates'],
    gaps: ['Infinite-domain first-order logic', 'General recurrence/generating-function solving', 'Broader combinatorial identity libraries', 'General theorem-prover-level discrete proofs'],
  },
  {
    id: 'algorithms', title: 'Algorithms & data-structure mathematics', level: 3, status: 'partial',
    evidence: ['BFS/DFS, Dijkstra, topological sort and Kruskal MST', 'Bellman-Ford with reachable negative-cycle handling', 'Exact max-flow/min-cut and bipartite matching', 'Sorting/search/heap traces', 'Longest-increasing-subsequence and 0/1-knapsack DP traces', 'Bounded Master-theorem complexity derivations'],
    gaps: ['Advanced balanced/search data structures', 'All-pairs/advanced graph algorithms', 'Weighted/general matching', 'General dynamic-programming synthesis', 'General algorithm-correctness proof construction'],
  },
  {
    id: 'numerical', title: 'Numerical analysis', level: 4, status: 'strong',
    evidence: ['Root finding, finite differences, adaptive/composite quadrature and interpolation', 'Pivoted numerical linear solves and stationary iterations', 'Pivoted LU, Cholesky and Householder QR', 'Symmetric eigenanalysis, SVD, pseudoinverse, numerical rank and conditioning', 'Damped Newton nonlinear systems and conjugate gradient', 'Adaptive RK45 and local numerical optimization'],
    gaps: ['Spline families', 'General stability/error-propagation theory', 'Large sparse/preconditioned workflows', 'General nonsymmetric eigenproblems', 'Stiff ODE/PDE numerical solvers'],
  },
  {
    id: 'ode', title: 'ODEs & dynamical systems', level: 3, status: 'partial',
    evidence: ['First-order IVP semantic objects and fixed-step Euler/Heun/RK4', 'Supported symbolic separable/linear/exact first-order classes', 'Constant-coefficient higher-order equations and first-order systems', 'Equilibria, exact Jacobian linearization and planar local stability', 'Adaptive Dormand-Prince RK45 with event stopping', 'Bounded transform-based initialized second-order solving'],
    gaps: ['General nonlinear symbolic ODE solving', 'Boundary-value problems', 'Stiff solvers', 'Global nonlinear dynamical-systems analysis', 'General systems transform solving'],
  },
  {
    id: 'pde', title: 'Partial differential equations', level: 2, status: 'narrow',
    evidence: ['First-class canonical heat, wave and rectangular Laplace PDE objects', 'Exact separation-of-variables templates', 'Exact finite modal solutions from supplied coefficients'],
    gaps: ['General PDE parsing/classification', 'Arbitrary initial/boundary data recovery', 'Weak solutions and PDE theory', 'Finite-difference/finite-element PDE solvers', 'Noncanonical/nonlinear PDEs'],
  },
  {
    id: 'optimization', title: 'Optimization', level: 3, status: 'partial',
    evidence: ['Exact bounded multivariable stationary/Hessian classification', 'One-constraint exact Lagrange stationarity where the system is linear', 'Local BFGS unconstrained optimization', 'One-equality local penalty optimization', 'Convexity diagnostics', 'Bounded exact/approximate two-variable linear programming'],
    gaps: ['General constrained nonlinear programming and KKT workflows', 'Global optimization', 'Higher-dimensional LP/QP families', 'Integer/combinatorial optimization', 'General convex-program certification'],
  },
  {
    id: 'transforms', title: 'Transforms & harmonic analysis', level: 3, status: 'partial',
    evidence: ['Bounded exact unilateral Laplace/inverse-Laplace rules', 'Convolution and initialized second-order ODE transform solving', 'Numerical Fourier-series coefficients with structural parity elimination', 'Exact Gaussian bilateral Fourier pair', 'Finite-window numerical Fourier/inverse evaluation', 'Bounded DFT/IDFT'],
    gaps: ['General regions of convergence', 'Distribution/Dirac semantics and Bromwich inversion', 'General Fourier-transform table and exact inversion', 'FFT-scale performance', 'Z transforms, wavelets and multidimensional transforms'],
  },
  {
    id: 'number-theory', title: 'Number theory', level: 3, status: 'partial',
    evidence: ['Exact gcd and extended Euclidean algorithm with Bezout certificates', 'Modular inverses and linear congruence classes', 'Generalized compatible CRT including non-coprime moduli', 'Bounded exact integer factorization and primality signal', 'Euler phi, divisor count/sum and Mobius functions', 'Complete two-variable linear Diophantine solution families'],
    gaps: ['Cryptographic-scale factorization', 'Discrete logarithms', 'General polynomial congruences', 'Quadratic reciprocity and broader classical number theory', 'Algebraic/analytic number theory'],
  },
  {
    id: 'abstract-algebra', title: 'Abstract algebra', level: 3, status: 'partial',
    evidence: ['Exact finite-group validation from Cayley tables', 'Identity/inverses, abelian/cyclic structure and element orders', 'Exact subgroup checks and Lagrange-theorem certificates', 'Finite-ring validation with units/zero divisors/commutativity/field certification', 'Finite group-homomorphism kernel/image/injectivity/surjectivity/isomorphism checks'],
    gaps: ['Infinite/symbolic group and ring presentations', 'Normal subgroups and quotient structures', 'Ideals/modules/polynomial rings', 'Sylow and broader group-structure theory', 'General field extensions and Galois theory'],
  },
  {
    id: 'geometry-topology', title: 'Geometry & topology', level: 2, status: 'narrow',
    evidence: ['Exact finite metric spaces, balls, diameter and finite compactness/connectedness consequences', 'Explicit finite topologies with T0/T1, connectedness, compactness, interior/closure/boundary', 'Exact 2D/3D point-set centroid, distance matrices and affine dimension/hulls', 'First-class rectangular regions, parameterized curves and graph surfaces'],
    gaps: ['General Euclidean/synthetic geometry theorem workflows', 'Infinite metric/topological spaces', 'General continuity/homeomorphism/fundamental-group machinery', 'Manifolds and differential geometry', 'General computational/algebraic topology'],
  },
  {
    id: 'proof', title: 'Proof & formal reasoning', level: 3, status: 'partial',
    evidence: ['Exact algebraic/equation/inequality/system transition verification', 'Elementary row-operation verification and propositional entailment', 'Checker-backed theorem registry', 'Exact equality-lemma rewriting and bounded inequality consequences', 'One- and two-level finite quantified proofs with witnesses/counterexamples', 'Recurrence-backed induction and selected analysis/linear-algebra/finite-group theorem certificates'],
    gaps: ['Infinite-domain first-order theorem proving', 'General theorem/lemma search and tactic composition', 'General analysis/algebra proof construction', 'Natural-language proof generation with machine-checked translation', 'Interactive proof-assistant-level foundations'],
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
