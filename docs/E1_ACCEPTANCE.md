# E1 — Multivariable Calculus Foundation

E1 is the first post-M7 mathematical expansion. Its purpose is to remove the architectural assumption that calculus objects are unary and establish a deterministic multivariable derivative/geometry foundation without pretending to implement all of vector calculus or optimization.

## Accepted scope

### Multi-parameter functions
- Existing parser/semantic support for `f(x,y) := ...`, `f(x,y,z) := ...`, etc. is promoted to first-class calculus use.
- Declared parameter order is preserved.
- Anonymous expressions with 2–6 free variables can use derivative-structure workflows.
- Scalar-valued functions and vector-valued functions written as `[f1, f2, ...]` are distinguished.
- Existing unary P5/P6/P9/P12 operations remain unary and explicitly report that boundary on higher-arity functions.

### Exact differential structure
- partial derivative with a selected parameter;
- ordered mixed partial derivatives;
- gradient for scalar-valued functions;
- Jacobian for scalar and vector-valued functions;
- Hessian for scalar-valued functions;
- exact reuse of P5 differentiation/domain warnings rather than a second symbolic differentiator.

### Local geometry
- multivariable function evaluation in declared parameter order;
- directional derivative at a point with automatic normalization of a nonzero supplied direction;
- first-order linearization;
- tangent plane `z = L(x,y)` for scalar functions of exactly two variables.

### Critical points
- exact two-variable critical-point solving when the gradient system is either:
  - separable into supported one-variable degree-2-or-lower equations, or
  - a coupled exact linear system;
- exact function value at each recovered point;
- two-variable Hessian determinant classification as local minimum, local maximum, saddle point, or inconclusive when the required second derivatives evaluate exactly.

### Constrained stationarity
- Lagrange multipliers for a scalar objective of exactly two variables and one equality constraint;
- exact solution when the stationarity equations reduce to a unique exact linear system;
- objective value and multiplier reported;
- explicit warning that a stationary constrained point is not by itself a global-optimum certificate.

## Product integration

E1 operations are available through:
- Workspace suggested actions where no configuration is required;
- Tools & Inspector parameter controls;
- the searchable M4 Tools catalog;
- Reference capability listings;
- normal structured MathResult / MathML rendering.

Configurable E1 operations:
- partial derivative;
- mixed partial;
- directional derivative;
- linearization;
- tangent plane;
- Lagrange multipliers.

Direct operations:
- gradient;
- Jacobian;
- Hessian;
- multivariable critical points;
- second-derivative test.

## Safety / mathematical boundaries

E1 intentionally does **not** claim:
- general multivariable limits, continuity, or differentiability proofs;
- implicit-function / inverse-function theorem workflows;
- general nonlinear system solving;
- general or global multivariable optimization;
- multiple equality constraints, inequality constraints, or KKT conditions;
- double/triple integrals;
- vector fields, divergence, curl, line/surface integrals;
- contour/surface/3D plotting;
- matrix-valued derivative tensors.

Those remain assigned to E2, E3, E5, and later phases.

## Completeness-registry effect

Under the fixed M7 22-domain rubric:
- Multivariable calculus moves from **0/5 missing** to **3/5 partial**.
- Optimization moves from **0/5 missing** to **1/5 incidental** because E1 adds bounded local classification and one-constraint Lagrange stationarity, not a general optimization engine.
- Breadth moves from **35/100** to **38/100**.
- Maturity within implemented domains becomes **56/100**; this can decrease when a previously absent domain first enters the product at an intentionally partial maturity level.

## Acceptance gate

E1 is accepted only when:
1. legacy P4–P15/M1–M7 regression tests remain green;
2. E1 semantic/capability tests pass;
3. partial/mixed derivative, gradient/Jacobian/Hessian tests pass;
4. multivariable evaluation and local geometry tests pass;
5. critical-point/Hessian classification tests pass;
6. Lagrange bounded-case and unsupported-boundary tests pass;
7. TypeScript and production Vite build pass in GitHub Actions;
8. the service-worker cache is rotated to the E1 namespace.
