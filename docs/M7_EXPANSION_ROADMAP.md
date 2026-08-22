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

## Next — E6: Probability & Statistics II

Extend P10 from introductory probability/statistics into a broader university workbench:

- joint distributions;
- covariance/correlation matrices;
- random-variable transformations;
- additional common distributions;
- two-sample mean procedures;
- paired inference;
- two-proportion inference;
- chi-square goodness-of-fit and independence;
- one-way ANOVA;
- multiple linear regression;
- regression diagnostics;
- nonparametric tests;
- bootstrap/resampling workflows with explicit heuristic/approximate labels;
- Markov-chain foundation.

---

## E7 — Fourier, Laplace & Transform Methods

- Laplace transforms;
- inverse Laplace transforms;
- shifting/scaling rules;
- convolution;
- transform-based linear ODE workflows;
- Fourier-series coefficients;
- even/odd simplifications;
- Fourier transforms for supported forms;
- inverse transforms;
- discrete/numerical transform foundation where appropriate.

---

## E8 — Complex Analysis

- complex-valued functions;
- real/imaginary decomposition;
- complex differentiability;
- Cauchy–Riemann checks;
- elementary complex mappings;
- complex power and Laurent series;
- isolated singularities;
- residues;
- contour integrals in supported parameterized forms;
- residue-theorem workflows;
- branch/domain diagnostics;
- later connection to complex-plane visualization.

---

## E9 — Discrete Mathematics II, Algorithms & Number Theory

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

The most recent fixed M7 re-score was taken after E3; later E-phases have not been used to rewrite that historical score outside the scheduled integration audit.

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
