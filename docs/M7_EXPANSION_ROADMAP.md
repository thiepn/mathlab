# Post-M7 Mathematics Expansion Roadmap

M7 establishes that the original P0–P15 feature roadmap is complete but the mathematics product is not comprehensive. Future work therefore moves into an explicit **E-series expansion program** rather than pretending that more UI reconstruction closes the remaining mathematical gaps.

## Principles

Every E-phase must preserve the existing MathLab contracts:

- exact / approximate / heuristic results remain explicit;
- unsupported mathematics fails honestly;
- new semantic objects are first-class rather than encoded as display strings;
- new operations appear in Tools, Reference, Practice and Proof only when their engine behavior exists;
- mathematical rendering is MathML-first;
- every phase ships with deterministic regression tests and must pass the existing release gate.

## E1: Multivariable Calculus Foundation — Complete

E1 removed the unary-only calculus assumption and established:

- multi-argument function definitions such as `f(x,y) := x^2 + y^2`;
- variable-aware partial and mixed derivatives;
- gradients, Jacobians and Hessians;
- directional derivatives;
- tangent planes / first-order linearization;
- bounded exact multivariable critical-point classification;
- bounded one-constraint Lagrange stationarity;
- scalar and vector-valued multivariable function semantics.

See `E1_ACCEPTANCE.md`.

---

## E2: Vector Calculus & Multivariable Integration — Complete

E2 builds on E1 rather than duplicating its function representation.

Implemented baseline:

- exact iterated double integrals over rectangular/simple nested bounds where the P5 antiderivative engine applies;
- exact iterated triple integrals in the same bounded model;
- deterministic composite Simpson fallback for constant rectangular regions, explicitly marked approximate;
- polar/cylindrical/spherical coordinate substitutions and Jacobian factors;
- first-class computational 2D/3D vector-field workflows;
- divergence and curl;
- conservative-field checks and exact scalar potentials where supported;
- scalar line integrals and work/circulation integrals over parameterized curves;
- scalar and flux graph-surface integrals over rectangular bases;
- computational Green theorem verification on rectangles;
- computational Gauss/divergence theorem verification on rectangular boxes;
- computational Stokes theorem verification on graph surfaces over rectangular bases;
- region, curve, surface and orientation controls integrated into the normal Tools/Workspace contract.

The accepted boundaries are intentionally narrower than a general geometry engine. See `E2_ACCEPTANCE.md`.

---

## Next — E3: Visualization 2.0

The current P6/M5 engine is an explicit unary 2D plotter. E3 expands the visualization model itself and should consume E1/E2 semantic objects directly.

- parametric curves;
- polar plots;
- implicit curves;
- contour plots;
- scalar fields;
- vector fields;
- gradient fields;
- phase portraits;
- 3D surfaces `z=f(x,y)`;
- parametric surfaces where feasible;
- E1 critical-point overlays;
- E2 vector-field and region overlays;
- synchronized symbolic ↔ visualization selection;
- export for new plot types.

---

## E4: ODEs & Dynamical Systems II

Replace the current “first-order numerical IVP only” boundary with a coherent differential-equations system.

- symbolic separable first-order equations;
- first-order linear equations;
- exact equations where bounded rules are reliable;
- second-order constant-coefficient linear ODEs;
- higher-order-to-system conversion;
- systems of first-order ODEs;
- equilibrium points;
- linearized stability;
- phase-plane analysis;
- adaptive Runge–Kutta methods;
- event/stopping support;
- stiff-method foundation;
- solution-curve visualization.

---

## E5: Numerical Linear Algebra & Optimization

This phase fills two high-value computational gaps that share numerical infrastructure.

### Numerical linear algebra

- LU with pivoting;
- Cholesky for supported positive-definite matrices;
- numerical QR for general floating matrices;
- numerical eigenvalue/eigenvector workflows;
- SVD;
- pseudoinverse;
- rank estimation under tolerance;
- condition/stability diagnostics;
- iterative methods beyond Jacobi/Gauss–Seidel where justified;
- nonlinear-system solving.

### Optimization

- multivariable gradient-based optimization;
- Newton/quasi-Newton methods;
- constrained optimization;
- linear programming;
- convexity diagnostics for supported functions;
- convergence traces and stopping criteria;
- explicit local/global optimum claims.

---

## E6: Probability & Statistics II

Extend P10 from an introductory statistics engine into a useful university statistics workbench.

- joint distributions;
- covariance/correlation matrices;
- random-variable transformations;
- additional common distributions;
- two-sample mean procedures;
- paired inference;
- two-proportion inference;
- chi-square goodness-of-fit/independence;
- one-way ANOVA;
- multiple linear regression;
- regression diagnostics;
- nonparametric tests;
- bootstrap/resampling workflows with explicit heuristic/approximate labels;
- Markov-chain foundation.

---

## E7: Fourier, Laplace & Transform Methods

- Laplace transforms;
- inverse Laplace transforms;
- shifting/scaling rules;
- convolution;
- transform-based linear ODE workflows;
- Fourier series coefficients;
- even/odd simplifications;
- Fourier transforms for supported forms;
- inverse transforms;
- discrete/numerical transform foundation where appropriate.

---

## E8: Complex Analysis

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
- domain/branch diagnostics.

---

## E9: Discrete Mathematics II, Algorithms & Number Theory

### Discrete / algorithms
- predicate logic and finite-domain quantifiers;
- stronger recurrence solving and generating functions;
- max-flow/min-cut;
- bipartite matching;
- Bellman–Ford / negative weights;
- dynamic-programming traces;
- broader algorithm complexity derivations.

### Number theory
- gcd / extended Euclidean algorithm;
- divisibility;
- modular arithmetic;
- modular inverses;
- linear congruences;
- Chinese remainder theorem;
- prime factorization for bounded integers;
- Euler phi and elementary arithmetic functions;
- bounded linear Diophantine equations.

---

## E10: PDEs, Abstract Structures & Geometry Foundations

This is intentionally a foundation phase rather than a claim of completing three enormous subjects.

### PDEs
- PDE semantic objects;
- order/linearity classification;
- common first/second-order form recognition;
- separation-of-variables templates;
- canonical heat/wave/Laplace rectangular problems;
- initial/boundary condition objects.

### Abstract structures
- finite group objects and Cayley tables;
- subgroup/order checks;
- finite ring/field foundations;
- homomorphism/kernel/image checks in bounded finite settings.

### Geometry/topology
- analytic geometry objects needed by other domains;
- curves/surfaces/regions shared with E2/E3;
- metric-space foundation;
- basic open/closed/connected/compact finite or symbolic examples.

---

## E11: Proof System II & Upper-Division Reasoning

- predicate syntax and quantifiers;
- induction templates;
- theorem registry;
- proof obligations;
- deterministic theorem application;
- equality/inequality lemma chaining;
- analysis proof templates where assumptions can be represented formally;
- algebra/linear-algebra theorem certificates;
- counterexample generation remains disproof-only;
- natural-language explanation may accompany, but never replace, the deterministic certificate.

---

## E12: Mathematical Integration & v2 Certification

Re-run the exact M7 rubric rather than inventing a more favorable metric.

- re-score all 22 domains with evidence;
- full engine/capability/catalog consistency audit;
- large golden mathematical corpus;
- cross-domain regression testing;
- exact/approximate/heuristic label audit;
- Worker timeout/performance audit;
- browser/device/PWA certification;
- accessibility audit after the expanded interfaces;
- documentation and unsupported-boundary audit;
- remove stale or duplicate operation paths;
- capability freeze;
- v2 release-candidate promotion only after the evidence supports it.

## Expected outcome

The purpose of the E-series is not to make MathLab compete with Mathematica by feature count. It is to turn the current bounded engine into a coherent, honest, broad university-mathematics environment in which:

- common undergraduate computations are genuinely supported;
- exactness boundaries remain visible;
- numerical methods explain their approximation status;
- proofs are not fabricated;
- every tool is discoverable;
- symbolic work, visualization, verification and practice share the same mathematical objects.
