# M7 — Mathematical Completeness Audit

Status: **AUDIT COMPLETE**

Audit baseline: MathLab after M6 (`main` at `35fa55aa330f8f0ef3d4ddc57afed77fb63390ab`).

## 1. Purpose

P0–P15 proved that the original MathLab roadmap was implemented. M1–M6 reconstructed how that mathematics is presented and discovered. Neither statement means that MathLab is mathematically complete as a university workbench.

M7 therefore evaluates the **actual implemented engine**, not roadmap labels, against a broad undergraduate/university mathematics baseline.

The audit uses four evidence sources:

1. the public Tools catalog (`src/app/toolCatalog.ts`);
2. capability routing (`src/lib/math/capabilities.ts`);
3. the local deterministic engine (`src/lib/math/localEngine.ts` and domain modules);
4. the real Vitest suites under `tests/`.

A capability counts only when there is a first-class operation or deterministic engine workflow. Incidental internal code does not count as subject support. For example, an internal gcd helper does not make MathLab a number-theory system, and complex eigenvalues do not make it a complex-analysis system.

## 2. Scoring rubric

The score is deliberately conservative.

| Level | Status | Meaning |
|---:|---|---|
| 0 | Missing | No first-class workflow for the domain. |
| 1 | Incidental | Fragments exist only as support for another domain. |
| 2 | Narrow | One or a few useful workflows exist, but a normal course would quickly exceed the boundary. |
| 3 | Partial | A meaningful course-level subset is implemented, with major standard topics absent. |
| 4 | Strong | Broad useful deterministic coverage, but still bounded enough that it should not be called comprehensive. |
| 5 | Comprehensive | Broad standard undergraduate coverage including important edge cases and connected workflows. |

No current domain receives 5/5.

## 3. Headline result

MathLab is best described as a **strong lower-division computational foundation with several serious upper-division components**, not as a complete university mathematics platform.

Using the fixed 22-domain rubric encoded in `src/app/completenessAudit.ts`:

- **University-math breadth index: 35/100**
- **Maturity inside domains that have first-class support: 58/100**
- **Strong domains: 3**
- **Partial domains: 6**
- **Narrow domains: 4**
- **Missing major domains: 9**

These are audit indices, not claims about the percentage of all mathematics that exists in the product. Their purpose is to stop a large operation count from being mistaken for curricular completeness.

## 4. Domain matrix

| Domain | Level | Verdict | Current evidence | Largest gaps |
|---|---:|---|---|---|
| Algebra & symbolic manipulation | 4/5 | **Strong** | Exact rationals; polynomial/rational simplify/expand/factor; substitution; long division; partial fractions; supported equations/inequalities/systems | General transcendental solving; nonlinear systems; wider assumption/piecewise CAS; broader factorization |
| Single-variable calculus | 4/5 | **Strong** | Symbolic differentiation; higher derivatives; bounded elementary integration; definite integrals; limits; zeros/extrema/monotonicity/concavity | Implicit differentiation; improper integrals; broader integration methods; parametric/polar calculus |
| Multivariable calculus | 0/5 | **Missing** | — | Partial derivatives; gradient; Jacobian; Hessian; directional derivatives; tangent planes; multivariable extrema; Lagrange multipliers |
| Vector calculus & multivariable integration | 0/5 | **Missing** | — | Double/triple integrals; vector fields; div/curl; line/surface integrals; Green/Gauss/Stokes |
| Mathematical visualization | 2/5 | **Narrow** | Domain-aware explicit 2D unary plots; pan/zoom/trace; feature overlays | Parametric; polar; implicit; contour; vector fields; phase portraits; 3D surfaces |
| Linear algebra core | 4/5 | **Strong** | Exact vector/matrix arithmetic; RREF; rank; determinant; inverse; exact systems; row/column/null spaces | Large/sparse numerical workflows; broader field support |
| Advanced linear algebra | 3/5 | **Partial** | Gram–Schmidt; QR; least squares; characteristic polynomial ≤6×6; bounded eigen/eigenspace/diagonalization; Hermitian/normal checks | SVD; Jordan form; Schur; numerical eigensolvers; generalized eigenproblems; matrix functions |
| Real analysis | 3/5 | **Partial** | Sequences; several series tests; one-sided limits; continuity/differentiability checks; Taylor/power series; rational asymptotics | Epsilon-delta proofs; uniform convergence; metric spaces; compactness/completeness; integration theory |
| Complex analysis | 0/5 | **Missing** | Complex values occur incidentally in linear algebra | Holomorphic functions; Cauchy-Riemann; contour integrals; residues; conformal mappings |
| Probability | 3/5 | **Partial** | Exact elementary probability; six distribution families; distribution probabilities/quantiles; sampling means; deterministic simulation | Joint/multivariate distributions; transformations; covariance matrices; stochastic processes; Markov chains |
| Statistics | 3/5 | **Partial** | Descriptive statistics; one-sample t; one-proportion inference; simple regression/correlation | Two-sample/paired inference; chi-square; ANOVA; multiple regression; nonparametric tests; diagnostics |
| Discrete mathematics | 3/5 | **Partial** | Propositional logic; finite sets/relations; graph profiles; recurrences; combinatorics; common asymptotics | Predicate logic; quantifiers; generating functions; broader recurrences; richer proof workflows |
| Algorithms & data-structure mathematics | 2/5 | **Narrow** | BFS/DFS; Dijkstra; topological sort; Kruskal; basic sorting/search traces; heap checks | Dynamic programming workbench; max-flow; matching; negative weights; advanced structures; algorithm proofs |
| Numerical analysis | 3/5 | **Partial** | Root finding; finite differences; quadrature; interpolation; numerical linear solve; Jacobi/Gauss–Seidel; condition estimate | Splines; nonlinear systems; LU/Cholesky workflows; numerical eigen/SVD; stability/error analysis; optimization |
| ODEs & dynamical systems | 2/5 | **Narrow** | First-order IVP object; Euler; Heun; fixed-step RK4; step-doubling endpoint estimate | Symbolic ODE solving; higher-order equations; systems; adaptive RK; stiff methods; phase plane/stability |
| PDEs | 0/5 | **Missing** | — | PDE objects; classification; separation; boundary/initial problems; numerical PDEs |
| Optimization | 0/5 | **Missing** | Single-variable extrema are calculus features, not an optimization system | Multivariable optimization; constraints; linear programming; convexity; numerical optimizers |
| Transforms & harmonic analysis | 0/5 | **Missing** | — | Laplace/inverse Laplace; Fourier series/transforms; convolution; transform-based ODE/PDE methods |
| Number theory | 0/5 | **Missing** | Internal integer/rational utilities do not count as a user-facing subject | Modular arithmetic; congruences; CRT; primes; Diophantine equations |
| Abstract algebra | 0/5 | **Missing** | — | Groups; rings; fields; homomorphisms; quotient structures; finite algebraic structures |
| Geometry & topology | 0/5 | **Missing** | — | Analytic/Euclidean geometry workbench; curves/surfaces; metric/topological spaces; connectedness/compactness |
| Proof & formal reasoning | 2/5 | **Narrow** | Supported algebraic step verification; solution-set equivalence; elementary row operations; propositional entailment | Predicate logic; quantifiers; induction; theorem library; general analysis/algebra proof construction |

## 5. What the existing engine genuinely does well

### 5.1 Exactness discipline

MathLab's strongest architectural property is not raw breadth; it is its refusal to blur exact, approximate and heuristic results. P4–P13 repeatedly preserve this boundary. Numerical methods are labelled approximate, simulation is heuristic, and unsupported proof claims become `not proven` rather than guessed.

That is worth preserving through every expansion phase.

### 5.2 Core linear algebra

The core linear-algebra surface is one of the strongest parts of the product. Exact RREF, determinant, inverse, systems, subspace bases and rank/nullity form a coherent workflow. Advanced features add exact Gram–Schmidt, QR, least squares and bounded spectral analysis.

The major deficiency is not the core; it is the absence of the numerical/advanced decomposition family such as SVD, Schur and robust large-matrix eigenanalysis.

### 5.3 Single-variable symbolic calculus

The calculus engine has coherent symbolic and domain-aware behavior. Existing tests verify chain-rule differentiation, higher derivatives, antiderivatives, supported definite integrals, domain rejection, removable limits, stationary points and interval-based function analysis (`tests/calculus.test.ts`).

Its main limitation is dimensional: the function object model is still fundamentally unary.

### 5.4 Honest real-analysis subset

The P9 implementation does more than a generic calculator: it separates holes from poles, handles one-sided rational limits, distinguishes continuity from differentiability, classifies several sequence/series families, and guards Taylor-polynomial claims. That is useful, but it is still a computational subset rather than a proof-oriented Real Analysis course.

### 5.5 Useful discrete/numerical foundation

P11 and P12 cover a real collection of undergraduate methods rather than token demos. Graph algorithms, recurrence work, combinatorics, numerical roots, finite differences, quadrature, interpolation, linear solves and fixed-step IVP methods are all tested.

The audit nevertheless marks these domains partial/narrow because standard courses extend substantially beyond those workflows.

## 6. Important capability claims that must remain bounded

### Algebra

Do not market MathLab as a general CAS. It currently has a strong exact polynomial/rational core, not Mathematica/SymPy-class unrestricted symbolic algebra.

### Eigenanalysis

Do not imply arbitrary matrix spectral analysis. Exact characteristic polynomials are intentionally bounded and exact eigenvalue handling is limited to supported structures.

### Analysis

Do not use the existence of a `Rigorous limit` operation to imply theorem-prover-level real analysis. The engine has deterministic rules for supported forms, not a general epsilon-delta proof system.

### Statistics

Do not imply a general statistics package. Current inferential statistics are primarily one-sample mean/proportion plus simple regression.

### ODEs

Do not call the current system an ODE solver without qualification. It is currently a **first-order numerical IVP workbench** using Euler/Heun/RK4.

### Proof Lab

Do not describe P13 as a theorem prover. It is a deterministic verifier for a carefully bounded family of algebraic, linear-algebra and propositional transformations.

## 7. Missing-core severity

The following missing domains are **release-shaping**, not optional extras for a product that wants to call itself a broad university mathematics workbench:

### Severity A — core expansion blockers

1. **Multivariable calculus**
2. **Vector calculus / multivariable integration**
3. **Broader visualization** required by those domains
4. **ODE systems / dynamical systems**
5. **Numerical linear algebra and optimization**

### Severity B — major university coverage gaps

6. **Probability & Statistics II**
7. **Laplace/Fourier transforms**
8. **Complex analysis**
9. **PDEs**

### Severity C — breadth expansion

10. **Number theory**
11. **Abstract algebra**
12. **Geometry/topology**
13. **General proof infrastructure**

## 8. Architecture implications

The next expansion cannot be implemented cleanly by merely adding more operation IDs.

### Required architecture changes

- function semantics must support **multiple parameters/variables** as first-class mathematical functions;
- AST/semantic layers need vector-valued functions and vector fields;
- result structures need multidimensional domains and region descriptions;
- visualization needs parametric/implicit/field/3D models instead of assuming `y=f(x)`;
- calculus operations need variable selection in multivariable expressions;
- assumptions need richer domain predicates and region constraints;
- numerical infrastructure should move toward reusable solver traces/tolerance contracts rather than method-specific result shapes;
- proof infrastructure must eventually support predicates/quantifiers if upper-division proof coverage is a goal.

These should be treated as explicit foundation work, not hidden inside individual tool buttons.

## 9. M7 verdict

### The product is not mathematically complete.

It is, however, a credible foundation worth extending. The key distinction is:

> MathLab already has **depth inside selected deterministic domains**, but still lacks **breadth across the standard university mathematics landscape**.

M7 therefore closes the reconstruction sequence with the following product classification:

**Current class:** broad lower-division computational math workbench + selected upper-division features.

**Not yet:** comprehensive university mathematics workbench.

The next development sequence is defined in `docs/M7_EXPANSION_ROADMAP.md`.
