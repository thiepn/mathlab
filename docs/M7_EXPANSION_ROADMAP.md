# Post-M7 Mathematics Expansion Roadmap

M7 established that completing the original P0–P15 roadmap did not make MathLab mathematically comprehensive. The E-series therefore expands the same semantic-object, engine, workspace, visualization and verification architecture rather than adding disconnected calculators.

## Expansion principles

Every E-phase must preserve the existing MathLab contracts:

- exact / approximate / heuristic status remains explicit;
- unsupported mathematics fails honestly;
- new mathematical structures are first-class when a new semantic object is genuinely needed;
- existing semantic objects are reused when they already represent the mathematics correctly;
- new operations become discoverable only when their underlying behavior exists;
- mathematical output remains structured and MathML-first;
- visualization is a projection of mathematical objects, never an alternate source of truth;
- every phase ships with deterministic regression coverage and must pass the real Vitest + strict TypeScript + Vite production gate.

---

## E1 — Multivariable Calculus Foundation — Complete

E1 removed the unary-only calculus assumption and established:

- multi-argument function definitions such as `f(x,y) := x^2 + y^2`;
- scalar and vector-valued multivariable functions;
- exact partial and mixed derivatives;
- gradients;
- Jacobians;
- Hessians;
- directional derivatives;
- first-order linearization;
- tangent planes;
- bounded exact two-variable critical-point solving and Hessian classification;
- bounded one-constraint Lagrange stationarity.

See `E1_ACCEPTANCE.md`.

---

## E2 — Vector Calculus & Multivariable Integration — Complete

E2 builds directly on E1's function representation.

Implemented baseline:

- exact iterated double integrals over rectangular/simple nested bounds where the symbolic antiderivative engine applies;
- exact iterated triple integrals in the same bounded model;
- deterministic composite Simpson fallback for constant rectangular regions, explicitly marked approximate;
- polar, cylindrical and spherical coordinate substitutions with Jacobian factors;
- computational 2D/3D vector fields;
- divergence and curl;
- bounded conservative-field checks and exact scalar-potential reconstruction;
- scalar line integrals;
- work/circulation integrals over parameterized curves;
- scalar and flux graph-surface integrals over rectangular bases;
- Green theorem verification on rectangles;
- Gauss/divergence theorem verification on rectangular boxes;
- Stokes theorem verification on graph surfaces over rectangular bases;
- explicit curve, region, surface and orientation controls.

The accepted scope is intentionally narrower than a general geometry or integration engine. See `E2_ACCEPTANCE.md`.

---

## E3 — Visualization 2.0 — Complete

E3 replaces the assumption that visualization means only an explicit unary Cartesian graph. It consumes E1/E2 semantic objects directly.

Implemented baseline:

- preserves the mature P6/M5 explicit Cartesian renderer, including pan/zoom, trace and symbolic feature overlays;
- parameterized curves `C(t)=[x(t),y(t)]`;
- polar curves `r(theta)`;
- two-variable implicit equations through deterministic marching squares;
- configurable contour plots for scalar fields;
- sampled scalar-field maps;
- E1 exact critical-point overlays where the bounded symbolic solver applies;
- sampled 2D vector fields with normalized display arrows and retained magnitudes;
- exact E1 gradient-field visualization;
- deterministic phase portraits for supplied 2D autonomous vector fields;
- sampled graph surfaces `z=f(x,y)`;
- sampled two-parameter three-component parametric surfaces `S(u,v)=[x,y,z]`;
- dependency-free SVG 3D projection with azimuth, elevation and zoom controls;
- E2-style rectangular region overlays;
- synchronized persisted-object selection between Workspace and Visualization;
- SVG and PNG export for the current visualization;
- dedicated searchable E3 Visualization tools.

E3 deliberately does **not** claim a WebGL 3D engine, implicit 3D isosurfaces, 3D vector fields, adaptive error-certified tessellation, complex-plane visualization or a first-class ODE-system solver.

See `E3_ACCEPTANCE.md`.

---

## E4 — ODEs & Dynamical Systems II — Complete

E4 extends the P12 scalar numerical-IVP foundation into a bounded symbolic/numerical ODE and dynamical-systems layer and connects autonomous two-state systems directly to E3 phase-plane visualization.

Implemented baseline:

- symbolic separable first-order ODEs;
- first-order linear ODEs with exact integrating-factor representation;
- supported exact differential-equation workflows with cross-partial certification;
- second-order constant-coefficient linear ODEs;
- bounded higher-order constant-coefficient equations and first-order-system conversion;
- first-class systems of first-order ODEs;
- equilibrium points in supported exact linear/decoupled cases;
- exact Jacobian linearization of autonomous systems;
- planar eigenvalue/trace/determinant local stability classification with nonhyperbolic caveats;
- phase-plane analysis connected to E3;
- adaptive Dormand–Prince RK45 integration for scalar IVPs and systems;
- event / stopping conditions through sign crossing;
- an explicitly heuristic stiffness signal rather than a false stiff solver;
- explicit symbolic vs numerical solution provenance;
- backward-compatible P12 fixed-step Euler/Heun/RK4 for scalar `ivp(...)` objects.

E4 makes the phase portrait a view of an ODE-system object rather than merely a view of an arbitrary vector field. Unsupported symbolic classes, global nonlinear stability, stiff integration, BVPs and DAEs remain outside the accepted boundary.

See `E4_ACCEPTANCE.md`.

---

## E5 — Numerical Linear Algebra & Optimization — Complete

E5 extends existing matrix and multivariable-function objects rather than creating a parallel numerical object language.

Implemented numerical linear algebra baseline:

- partial-pivoting numerical LU with `P`, `L`, `U` and reconstruction diagnostics;
- numerical Cholesky for real symmetric positive-definite matrices;
- Householder numerical QR with reconstruction and orthogonality residuals;
- bounded real-symmetric Jacobi eigenvalue/eigenvector analysis;
- SVD baseline through the symmetric eigendecomposition of `AᵀA`, with explicit conditioning limitations;
- tolerance-aware numerical rank;
- Moore–Penrose pseudoinverse;
- spectral `κ₂` condition diagnostics;
- conjugate-gradient solves for numerically SPD systems;
- damped multivariate Newton for square nonlinear systems.

Implemented optimization baseline:

- local gradient-descent minimization;
- local Newton minimization with descent fallback;
- local BFGS quasi-Newton minimization;
- backtracking line search and convergence traces;
- one-equality constrained quadratic-penalty optimization;
- Hessian-based local/constant-Hessian convexity diagnostics without sampling-based global claims;
- bounded two-variable linear programming by feasible-vertex enumeration, where a global optimum claim is valid only inside the explicitly represented finite polygon.

E5 keeps floating results approximate. General nonsymmetric Schur/eigen workflows, high-accuracy bidiagonal SVD, sparse linear algebra, inequality-constrained nonlinear optimization, general-dimensional LP/MILP and global nonconvex optimization remain outside the accepted boundary.

See `E5_ACCEPTANCE.md`.

---

## E6 — Probability & Statistics II — Complete

E6 extends P10's introductory statistics model using the existing dataset, matrix and distribution semantics rather than introducing a parallel statistics workspace.

Implemented probability/random-variable baseline:

- exponential, chi-square, Student-t and F distribution objects;
- numerical CDF, tail, interval-probability and quantile workflows for those families;
- deterministic seeded simulation;
- finite `jointpmf(...)` objects with explicit zero-based support convention;
- joint marginals, expectations, covariance and correlation;
- affine random-variable expectation/variance transforms;
- sample covariance and Pearson correlation matrices.

Implemented inference baseline:

- Welch two-sample mean inference;
- paired mean inference;
- two-proportion large-sample inference;
- chi-square goodness-of-fit testing;
- chi-square independence testing with Cramér's V;
- one-way ANOVA for rectangular equal-size group columns with eta-squared effect size.

Implemented regression/nonparametric/resampling baseline:

- multiple ordinary least squares with automatic intercept, coefficient inference, `R²` and adjusted `R²`;
- standardized residual, leverage, Cook's-distance and VIF diagnostics;
- Mann–Whitney U with tie/continuity correction;
- Wilcoxon signed-rank with tie/continuity correction;
- deterministic seeded percentile bootstrap intervals for the sample mean.

Implemented stochastic-process foundation:

- finite row-stochastic transition-matrix validation;
- reachability-based irreducibility signal;
- numerical stationary candidate by power iteration;
- finite-step probability-vector propagation;
- self-loop signal as a sufficient, not exhaustive, aperiodicity indication.

E6 keeps special-function probabilities, inferential procedures, regression calculations, rank-test approximations and Markov decimals explicitly approximate; bootstrap output is explicitly heuristic. Degenerate zero-variance/zero-standard-error cases are refused rather than surfaced as misleading `NaN` results. General Bayesian modeling, GLMs/mixed models, survival/time-series methods, exact small-sample categorical/rank procedures, general multivariate distributions and advanced stochastic processes remain outside the accepted boundary.

E6 also unifies the E4–E6 extension tool catalog used by both the Tools page and `Ctrl+K`, removing the earlier discovery gap where expansion tools were not all globally searchable.

See `E6_ACCEPTANCE.md`.

---

## E7 — Fourier, Laplace & Transform Methods — Complete

E7 extends existing unary expressions/functions, vectors/matrices and `ode2(...)` objects rather than introducing a parallel transform-object language.

Implemented Laplace baseline:

- exact unilateral transforms for constants, bounded nonnegative integer powers, exponentials, trigonometric and hyperbolic textbook forms;
- exact linearity and constant-multiple handling;
- exact exponential shift theorem for supported factors;
- bounded exact inverse transforms for linear combinations and proper rational transforms with denominator degree at most two;
- exact unilateral convolution representation and transform-product verification;
- closed time-domain convolution reconstruction when the bounded inverse table applies;
- exact Laplace-domain solving of constant-coefficient initialized `ode2(...)` problems at `t0=0`, with time-domain inversion when the supported inverse table closes.

Implemented Fourier baseline:

- configured-period Fourier-series coefficients through deterministic composite Simpson integration;
- structural even/odd recognition with exact elimination of the corresponding zero coefficient family;
- exact bilateral Gaussian Fourier transform and inverse transform under the documented angular-frequency convention;
- explicit refusal of distribution-valued exact cases such as pure sinusoids until Dirac-delta semantics exist;
- finite-window numerical forward and inverse Fourier evaluation with separate real/imaginary output and explicit truncation/quadrature warnings.

Implemented discrete-transform baseline:

- direct `O(N²)` DFT for resolved real vectors with 2–256 samples;
- inverse DFT from `N×2` `[real, imaginary]` coefficient matrices;
- standard `1/N` inverse normalization;
- complex-bin/magnitude reporting and deterministic reconstruction.

E7 keeps exact table transforms distinct from numerical quadrature and binary64 DFT results. It does not claim general Laplace region-of-convergence solving, distribution semantics, Bromwich inversion, a general symbolic bilateral Fourier table, FFT performance, multidimensional transforms, Z transforms, wavelets or general transform-based PDE/ODE solving.

E7 tools participate in the same cumulative capability registry and global Tools/`Ctrl+K` discovery path as earlier expansion phases.

See `E7_ACCEPTANCE.md`.

---

## E8 — Complex Analysis — Complete

E8 extends existing unary scalar expressions/functions and the existing complex constant `i`; it does not introduce a parallel complex-expression language.

Implemented complex-function/differentiability baseline:

- exact substitution `z=x+iy` and rectangular `u(x,y)+iv(x,y)` decomposition for supported arithmetic and elementary forms;
- exact symbolic complex derivatives for supported holomorphic elementary expressions;
- explicit refusal of structural non-holomorphic forms such as `abs` for global derivative claims;
- exact Cauchy–Riemann residual construction and certification when both identities simplify to zero;
- branch-local derivative warnings for logarithm/square-root style functions rather than global single-valued claims;
- binary64 complex point mappings with rectangular/polar output and a local derivative signal;
- algebraic integer-power evaluation at the origin rather than a spurious `log(0)` path.

Implemented series/singularity/residue baseline:

- exact rational power/Laurent coefficient recurrence around configured real rational centers;
- exact rational regular/removable/pole classification;
- exact pole order and Laurent residue extraction;
- nearest-pole radius estimate where bounded denominator root discovery applies;
- numerical small-circle residue fallback for supported single-valued cases outside the exact path;
- explicit refusal to assign ordinary residues at unresolved branch points.

Implemented contour/branch baseline:

- deterministic numerical contour integration over circles and line segments;
- bounded circular residue-theorem automation for rational functions with real rational coefficients and denominator degree at most two;
- simple-pole requirement and pole-on-contour refusal;
- logarithm, square-root, argument and non-integer-power branch diagnostics with principal-branch conventions;
- exact/approximate provenance maintained across every workflow.

E8 does not claim general analytic continuation, Riemann surfaces, arbitrary complex-center/transcendental Laurent expansions, essential-singularity series generation, general symbolic pole discovery, arbitrary residue algebra, rigorous contour error bounds, the argument principle, Rouché's theorem, or a full conformal-mapping/complex-plane visualization system.

E8 tools participate in the cumulative Worker/engine chain, capability registry, shared inspector controls, Workspace actions, and global Tools/`Ctrl+K` discovery.

See `E8_ACCEPTANCE.md`.

---

## Next — E9: Discrete Mathematics II, Algorithms & Number Theory

### Discrete mathematics and algorithms

- predicate logic and finite-domain quantifiers;
- stronger recurrence solving and generating functions;
- max-flow/min-cut;
- bipartite matching;
- Bellman–Ford and negative-weight handling;
- dynamic-programming traces;
- broader algorithm-complexity derivations.

### Number theory

- gcd and extended Euclidean algorithm;
- divisibility;
- modular arithmetic;
- modular inverses;
- linear congruences;
- Chinese remainder theorem;
- bounded prime factorization;
- Euler phi and elementary arithmetic functions;
- bounded linear Diophantine equations.

---

## E10 — PDEs, Abstract Structures & Geometry Foundations

This is intentionally a foundation phase rather than a claim to complete three very large subjects.

### PDEs

- PDE semantic objects;
- order/linearity classification;
- common first/second-order form recognition;
- separation-of-variables templates;
- canonical heat/wave/Laplace rectangular problems;
- initial/boundary condition objects.

### Abstract structures

- finite-group objects and Cayley tables;
- subgroup/order checks;
- finite ring/field foundations;
- homomorphism/kernel/image checks in bounded finite settings.

### Geometry/topology

- analytic-geometry objects needed by other domains;
- stronger shared curve/surface/region ownership building on E2/E3;
- metric-space foundation;
- basic open/closed/connected/compact finite or symbolic examples.

---

## E11 — Proof System II & Upper-Division Reasoning

- predicate syntax and quantifiers;
- induction templates;
- theorem registry;
- proof obligations;
- deterministic theorem application;
- equality/inequality lemma chaining;
- analysis proof templates where assumptions can be represented formally;
- algebra/linear-algebra theorem certificates;
- counterexample generation remains disproof-only;
- natural-language explanation may accompany, but never replace, a deterministic certificate.

---

## E12 — Mathematical Integration & v2 Certification

Re-run the exact M7 rubric rather than inventing a more favorable metric.

- re-score all 22 domains with evidence;
- full engine/capability/catalog consistency audit;
- representative golden mathematical corpus;
- cross-domain regression testing;
- exact/approximate/heuristic label audit;
- visualization sampling/performance audit;
- Worker timeout/performance audit;
- browser/device/PWA certification;
- accessibility audit across expanded mathematical interfaces;
- documentation and unsupported-boundary audit;
- remove stale or duplicate operation paths;
- capability freeze;
- v2 release-candidate promotion only after the evidence supports it.

## Current evidence after E3

The most recent fixed M7 re-score was taken after E3; E4–E8 have not been used to rewrite that historical score outside the scheduled integration audit.

Under that fixed M7 22-domain rubric:

- university-domain breadth: **43/100**;
- implemented-domain maturity: **59/100**;
- visualization: **4/5 strong**;
- vector calculus & multivariable integration: **3/5 partial**;
- multivariable calculus: **3/5 partial**;
- six major domains remain completely missing;
- no domain is rated comprehensive merely because its UI is polished.

## Intended E-series outcome

The E-series is not designed to compete with Mathematica by raw feature count. Its purpose is to produce a coherent, honest, broad university-mathematics environment in which:

- common undergraduate computations are genuinely supported;
- exactness boundaries remain visible;
- numerical methods expose approximation status;
- sampled visualization is not confused with proof;
- proofs are not fabricated;
- tools remain discoverable;
- symbolic work, visualization, verification and practice share the same mathematical objects.
