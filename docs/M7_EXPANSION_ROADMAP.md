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

## Next — E1: Multivariable Calculus Foundation

This is the highest-priority missing university domain and the architectural prerequisite for several later phases.

### E1 scope

- multi-argument function definitions such as `f(x,y) := x^2 + y^2`;
- variable-aware partial differentiation;
- higher/mixed partial derivatives;
- gradient vectors;
- Jacobian matrices for vector-valued functions;
- Hessian matrices;
- directional derivatives;
- tangent planes / first-order linearization;
- multivariable critical points;
- second-derivative classification in supported low-dimensional cases;
- constrained extrema with Lagrange multipliers in bounded deterministic cases;
- multivariable function semantic profiles;
- Tools/Reference/Practice integration;
- domain and assumption handling for multivariable expressions.

### E1 architectural gate

E1 is not complete until MathLab stops assuming that a function is necessarily unary throughout the semantic/capability/result pipeline.

---

## E2: Vector Calculus & Multivariable Integration

Build on E1 rather than duplicating it.

- double integrals over rectangular/simple bounded regions;
- iterated integrals;
- triple integrals;
- change of variables and Jacobian determinant in supported transforms;
- polar/cylindrical/spherical coordinate workflows;
- vector-field semantic objects;
- gradient, divergence and curl;
- conservative-field checks and potentials;
- line integrals;
- surface/flux integrals in bounded supported forms;
- computational Green/Gauss/Stokes verification workflows;
- region-aware domain descriptions.

---

## E3: Visualization 2.0

The current P6/M5 engine is an explicit unary 2D plotter. E3 expands the visualization model itself.

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
- special-point overlays for multivariable critical points;
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
- transform tables with assumptions;
- convolution;
- transform-based ODE solving;
- Fourier series coefficients;
- trigonometric/complex Fourier series;
- Fourier transform / inverse transform for supported symbolic families;
- discrete Fourier transform numerical workflow;
- spectrum visualization.

---

## E8: Complex Analysis

Complex values already exist incidentally in advanced linear algebra; E8 makes complex analysis a real domain.

- complex-number semantic workflows;
- complex elementary functions;
- complex differentiation;
- Cauchy–Riemann checks;
- analytic-function classification in supported forms;
- complex sequences/series;
- contour/path objects;
- contour integration;
- Cauchy integral workflows;
- Laurent series;
- poles and residues;
- residue-theorem evaluation in supported cases;
- complex-plane visualization.

---

## E9: Discrete Mathematics II, Algorithms & Number Theory

### Discrete / algorithms

- predicate logic and bounded quantifiers;
- induction-oriented recurrence/proof workflows;
- generating functions;
- broader recurrence solving;
- dynamic-programming traces;
- max-flow/min-cut;
- bipartite matching;
- negative-weight shortest paths with explicit cycle handling;
- more data-structure analysis.

### Number theory

- gcd/extended Euclidean algorithm as user operations;
- divisibility;
- modular arithmetic;
- linear congruences;
- Chinese remainder theorem;
- modular exponentiation;
- primality/factorization for bounded integers;
- Diophantine equations in supported classes.

---

## E10: PDEs, Abstract Structures & Geometry Foundations

This is intentionally later because each subject requires new semantic models rather than a few isolated operations.

### PDE foundation

- PDE semantic objects;
- first/second-order classification;
- canonical heat/wave/Laplace equation workflows;
- separation of variables in bounded textbook cases;
- boundary/initial-condition representation;
- basic finite-difference PDE methods.

### Abstract algebra foundation

- finite groups;
- group properties/subgroups;
- permutation groups;
- rings/fields for bounded finite examples;
- homomorphism/isomorphism checks;
- quotient structures where representation is deterministic.

### Geometry/topology foundation

- analytic geometry objects;
- curves/surfaces tied to E3 visualization;
- metric-space objects;
- basic open/closed/compact/connected classifications for supported finite/structured examples.

---

## E11: Proof System II & Upper-Division Reasoning

P13 should remain conservative until the underlying logic model expands.

- predicate logic;
- variables and quantifiers;
- explicit theorem/definition registry;
- induction templates;
- proof obligations and subgoals;
- exact certificates for supported real-analysis statements;
- exact certificates for supported linear/abstract algebra statements;
- counterexample generation separated from proof certification;
- structured proof trees;
- Practice integration for proof exercises;
- no natural-language “proof accepted” status unless a formal/deterministic certificate backs it.

---

## E12: Mathematical Integration, Coverage Certification & v2 Gate

After E1–E11:

- re-run the 22-domain completeness audit;
- audit cross-domain semantic consistency;
- verify every Tools entry against engine behavior;
- build a representative golden corpus across all supported domains;
- fuzz parsers and bounded numerical methods;
- cross-check selected exact/numerical outputs against independent references;
- browser/device/PWA regression;
- performance profiling for larger matrices, plots and numerical traces;
- accessibility pass for expanded mathematical notation;
- freeze a new v2 mathematical capability contract.

## Priority order

The planned order is deliberate:

1. **E1 — Multivariable Calculus Foundation**
2. **E2 — Vector Calculus & Multivariable Integration**
3. **E3 — Visualization 2.0**
4. **E4 — ODEs & Dynamical Systems II**
5. **E5 — Numerical Linear Algebra & Optimization**
6. **E6 — Probability & Statistics II**
7. **E7 — Fourier, Laplace & Transform Methods**
8. **E8 — Complex Analysis**
9. **E9 — Discrete Mathematics II, Algorithms & Number Theory**
10. **E10 — PDEs, Abstract Structures & Geometry Foundations**
11. **E11 — Proof System II & Upper-Division Reasoning**
12. **E12 — Mathematical Integration & v2 Certification**

The immediate next phase is therefore **E1 — Multivariable Calculus Foundation**.
