# MathLab

MathLab is a local-first mathematical workbench for university mathematics. It is built around persistent mathematical objects rather than disconnected calculator pages.

## Current release candidate

**v1.0.0-rc.2 — v1.0 Certification Candidate**

P15 freezes the P0–P14 feature surface and hardens MathLab for release: storage migration/recovery, import guards, Worker timeout/crash handling, offline/PWA resilience, accessibility, mobile touch targets, release packaging checks, and a top-level error boundary. RC2 additionally patches the Vite/Vitest release toolchain, pins top-level dependency versions, disables production source maps, and passes the complete existing 161-test suite through a dependency-independent compatibility runner. Final `v1.0.0` promotion still requires the genuine npm/Vitest/Vite and built-browser gates documented in `docs/RELEASE_CERTIFICATION.md`.

### Available now

**P4 algebra**
- exact rational arithmetic;
- safe simplification, expansion and rational factorization;
- symbolic substitution;
- polynomial long division and supported partial fractions;
- exact linear equations, real quadratics and linear inequalities;
- exact equation-form linear systems.

**P5 functions & calculus**
- unary function evaluation;
- symbolic derivatives and higher derivatives;
- bounded elementary antiderivatives and definite integrals;
- supported exact limits and domain guards;
- zeros, stationary points, extrema, monotonicity, concavity;
- reusable structured function profiles.

**P6 visualization**
- interactive domain-aware 2D plotting of unary functions/one-variable expressions;
- up to six simultaneous series;
- exact/numeric feature overlays;
- pan, zoom, fit, trace;
- SVG/PNG export.

**P7 linear algebra**
- vectors `[1,2,3]` and matrices `[[1,2],[3,4]]` as first-class semantic objects;
- saved vector/matrix bindings inside later expressions;
- exact vector/matrix addition and subtraction;
- scalar multiplication/division;
- exact dot products and Euclidean norms;
- matrix-matrix, matrix-vector and vector-matrix products;
- integer powers of square matrices, including supported negative powers via exact inversion;
- exact Gauss–Jordan RREF with visible elementary-row-operation derivations;
- rank and pivot columns;
- exact determinant;
- exact inverse with singularity rejection;
- augmented-matrix system solving with unique/inconsistent/underdetermined classification;
- particular solution + null-space directions for underdetermined systems;
- column-space, row-space and null-space bases;
- rank–nullity and independence profile.

**P8 advanced linear algebra**
- transpose and conjugate transpose;
- exact real/complex-rational inner products and Gram matrices;
- orthogonality, orthonormality, orthogonal/unitary classification;
- vector and column-space projection;
- exact Gram–Schmidt and reduced QR with symbolic radicals;
- exact full-column-rank least squares;
- characteristic polynomials through 6×6;
- bounded exact eigenvalues/eigenspaces and diagonalization;
- real symmetric, Hermitian, skew-Hermitian, and normal-matrix profiles.

**P9 analysis**
- first-class sequences such as `a_n := 1/n` or `a_n = 1/n`;
- exact term previews and finite rational partial sums;
- sequence limits and convergence classification;
- geometric, p-series, alternating, rational-comparison, and polynomial×geometric convergence tests;
- absolute vs conditional convergence reporting;
- squeeze-theorem sequence limits for supported bounded trigonometric forms;
- stronger one-sided/two-sided rational limits at poles;
- continuity profiles, removable holes vs poles, and continuity-at-point checks;
- differentiability profiles and point checks, including exact `abs` corners;
- exact Taylor polynomials at rational centers through order 10;
- supported Maclaurin/power-series radius and interval profiles;
- polynomial/rational asymptotic growth and horizontal/oblique/polynomial asymptotes;
- explicit theorem guards against false converses such as “a_n → 0, therefore Σa_n converges.”

**P10 probability & statistics**
- first-class `data(…)` datasets plus statistical analysis of numeric vectors;
- exact mean/median/mode, sample vs population variance, symbolic SD, Tukey quartiles/IQR/outliers;
- exact `choose`, `permute`, conditional probability, Bayes, union, complement, and independent-joint arithmetic;
- Bernoulli, binomial, geometric, Poisson, uniform, and normal distribution objects;
- distribution profiles, probabilities, quantiles, expectation/variance, and sample-mean distributions;
- one-sample Student-t confidence intervals/tests and Wilson/z proportion inference with assumption warnings;
- exact simple linear regression coefficients, Pearson correlation and R² for paired n×2 data;
- deterministic seed-based simulation explicitly labeled heuristic.

**P11 discrete math & algorithms**
- exhaustive propositional truth tables through six variables, tautology/contradiction/contingency classification, canonical DNF/CNF;
- finite `set(...)` objects with exact set algebra, Cartesian products and bounded power sets;
- `relation(n, pairs)` property analysis, closures, equivalence classes, and partial-order/Hasse profiles;
- `graph`, `digraph`, `wgraph`, and `wdigraph` objects with deterministic graph profiles;
- BFS/DFS traces, unweighted shortest paths, exact-rational Dijkstra, topological sorting, and Kruskal MST;
- first/second-order linear recurrence objects with exact term generation and bounded closed/characteristic forms;
- tight Θ classification for common polynomial/log/exponential forms plus the basic Master theorem;
- exact multinomial, stars-and-bars, derangements, Stirling/Bell, and pigeonhole counts;
- insertion/selection/bubble/merge sort traces, binary-search traces, and binary-heap structural checks on numeric vectors.

Examples:

```text
P := implies(and(p,q),p)
A := set(1,2,3)
R := relation(3, [[1,1],[1,2],[1,3],[2,2],[2,3],[3,3]])
G := wgraph(4, [[1,2,3],[1,3,1],[3,2,1],[2,4,2]])
F := linrec2(0,1,1,1)
C := complexity(n^2 * log(n))
```

P11 actions remain contextual: propositions expose truth tables/normal forms; finite sets expose set algebra; relations expose closures/classes/order structure; graph objects expose graph-specific algorithms; recurrences expose terms and characteristic structure; vectors retain their P7/P10 roles while also exposing sort/search/heap traces.

P11 is deliberately bounded. Graph constructors model simple graphs and reject parallel/duplicate edges instead of silently choosing one. It does not claim general SAT solving, symbolic recurrence solving, max-flow/matching, negative-weight shortest paths, arbitrary asymptotic theorem proving, or unbounded combinatorial expansion. Unsupported cases fail explicitly rather than returning heuristic-looking discrete mathematics.

**P12 numerical math & ODEs**
- exact IEEE-754 binary64 representation-error profiles for rational scalars;
- bisection, Newton, and secant numerical roots with residual/stopping diagnostics;
- centered finite-difference derivatives with Richardson refinement;
- adaptive Simpson plus composite Simpson/trapezoid quadrature with convergence/error estimates;
- exact Newton divided-difference polynomial interpolation for rational n×2 point matrices;
- partial-pivoting numerical Gaussian solves with residual/pivot diagnostics;
- Jacobi and Gauss–Seidel iterations with convergence traces and diagonal-dominance warnings;
- infinity-norm condition estimates for square matrices;
- first-class `ivp(rhs,x0,y0)` ODE objects;
- Euler, Heun, and classical RK4 fixed-step solvers with step-doubling endpoint error estimates.

Examples:

```text
f(x) := cos(x)-x
P := [[0,1],[1,3],[2,7]]
A := [[4,1,9],[1,3,7]]
Y := ivp(x+y, 0, 1)
```

P12 deliberately separates exactness levels. Polynomial interpolation can remain exact, while roots, finite differences, quadrature, numerical linear solves, condition estimates, and ODE solutions are approximate. Error estimates are method-scoped diagnostics, not universal rigorous enclosures.

**P13 Verify My Work & Proof Lab**
- dedicated Proof Lab route with one-step, chain, and propositional-entailment modes;
- four explicit verification states: verified, conditionally valid, invalid, and not proven;
- exact polynomial/rational identity checks with domain-preservation diagnostics;
- exact one-variable equation and supported inequality solution-set validation;
- nonzero-factor conditions when a factor is introduced or cancelled;
- carried assumptions such as `x != 0` that can discharge supported conditions;
- exact elementary row-swap, row-scale, and row-replacement verification;
- exact equation candidate-solution checks;
- exhaustive propositional equivalence and semantic entailment through six variables;
- bounded counterexample search used strictly for disproof, never certification;
- theorem/rule references and structured transition-by-transition result sections.

Examples:

```text
2*x + 2 = 6
2*x = 4
x = 2
```

The chain above verifies exactly. By contrast, `x/x -> 1` is reported **conditionally valid** until the assumption `x != 0` is carried. A false claim such as `x+1 -> x+2` is rejected with a concrete counterexample.

P13 is intentionally not a general theorem prover or natural-language proof assistant. Unsupported transcendental, high-dimensional, or formally sophisticated claims return **not proven** rather than a guessed certificate.

**P14 Practice & Courses**
- dedicated Practice route with Courses, Review, Exam, and Progress modes;
- eight curriculum tracks spanning P4 algebra through P13 verification;
- topic-level organization with authored exercises and deterministic seeded exercise generators;
- difficulty labels, layered hints, explicit solution reveal, and exact mathematical answer checking through P13;
- four-choice conceptual questions for theorem/method knowledge where symbolic equivalence is not the right assessment;
- persistent per-exercise attempts, correctness, streak, mastery, ease, interval, due date, and bounded attempt history;
- adaptive review that prioritizes overdue work, then low-mastery/unseen material;
- deterministic spacing ratings (Again/Hard/Good/Easy) driven by correctness, hints, and pre-check solution reveal;
- closed-help exam sessions with hints/solutions/per-question grading disabled until submission;
- course and overall mastery/accuracy dashboards;
- a curriculum Reference route exposing course/topic coverage and generated/authored exercise counts;
- practice progress reset isolated from the main MathLab workspace.

Example generated work: linear equations, polynomial expansion, polynomial differentiation, exact definite integrals, 2×2 determinants, sequence limits, combinations, dataset means, stars-and-bars counts, and polynomial equivalence. Generated exercise IDs contain their template and seed, so scheduled review can reconstruct the exact original question later.

P14 does not use random sampling to decide whether a mathematical answer is correct. `math` answers are delegated to P13 verification; a merely conditionally valid answer is not counted as correct when an unconditional result was requested. Unsupported verifier cases remain unverified rather than being accepted heuristically.

**P15 release hardening**
- automatic migration from the P14 workspace/practice storage keys into P15 release keys;
- last-known-good recovery snapshots for both workspace and practice progress;
- corrupt/oversized workspace import rejection plus explicit replacement confirmation;
- IndexedDB blocked/version-change handling and visible practice storage failures;
- 30-second Worker operation timeout plus Worker-crash rejection/reset;
- installable PWA icons, Apple touch icon, relative manifest scope, same-origin runtime caching, and navigation fallback;
- online/offline local-ready indicator;
- application-level React error boundary;
- keyboard skip link, route-specific titles, `aria-current`, command-palette focus trap/restore, stronger muted-text contrast, and larger mobile touch targets;
- dependency-free `npm run audit:release` packaging/security/PWA invariant check;
- release candidate version `1.0.0-rc.2`.

P15 does not add analytics, telemetry, remote math calls, or new mathematical domains. The genuine dependency-backed Vitest/Vite certification remains a separate release gate and must be run in an environment where the declared npm dependencies can actually be installed.

## Definition examples

```text
A = [[1,2],[3,4]]
v = [1,2,3]
f(x) = sin(x^2)
a := 2
p := x^2 - 5x + 6
```

Named definitions are saved automatically. Anonymous mathematics remains scratch work.

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run check
```

## Architecture & roadmap

See:

- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/P0_ACCEPTANCE.md` through `docs/P15_ACCEPTANCE.md`
- `docs/RELEASE_CERTIFICATION.md`

## Release status

P15 hardening is implemented and packaged as **v1.0.0-rc.2**. Final v1.0.0 certification requires a dependency-backed `npm run test` and `npm run build` in an environment with React/Vite/Vitest installed, plus real-device/browser QA.
