# MathLab Development Roadmap

MathLab has three development eras:

1. **P0–P15 — original product and mathematics foundation**
2. **M1–M7 — deployed-product reconstruction and completeness audit**
3. **E1–E12 — post-audit mathematical expansion**

The architecture is cumulative. New phases extend the same mathematical-object, workspace, engine and result system rather than creating disconnected calculator pages.

## P-series — original product foundation

| Phase | Scope | Status |
|---|---|---|
| **P0 — Architecture, Design System & Product Skeleton** | React/Vite shell, routing, Worker boundary, engine contract, storage/PWA baseline. | Complete |
| **P1 — Universal Mathematical Input** | Normalization, parser, AST, diagnostics, MathML/LaTeX/plain serialization. | Complete |
| **P2 — Mathematical Object & Assumption System** | Semantic objects, definitions, dependencies, domains/shapes/exactness, assumptions, capability applicability. | Complete |
| **P3 — Core Workspace** | Persistent objects, dependency graph, lifecycle operations, autosave/recovery/import/export. | Complete |
| **P4 — Algebra & Equation Engine** | Exact rational/polynomial/rational algebra, supported equations/inequalities/systems. | Complete |
| **P5 — Functions & Calculus** | Unary functions, symbolic differentiation, bounded integration/limits and function analysis. | Complete |
| **P6 — Visualization Engine** | Domain-aware explicit 2D unary plotting with feature overlays and export. | Complete |
| **P7 — Linear Algebra Foundation** | Exact matrix/vector arithmetic, RREF, rank, determinant, inverse, systems and subspaces. | Complete |
| **P8 — Advanced Linear Algebra** | Bounded spectral analysis, Gram–Schmidt, projections, QR, least squares, Hermitian structure. | Complete |
| **P9 — Analysis** | Sequences/series, continuity/differentiability, stronger limits, Taylor/power-series and asymptotic workflows. | Complete |
| **P10 — Probability & Statistics** | Descriptive statistics, common distributions, elementary probability, one-sample inference, simple regression. | Complete |
| **P11 — Discrete Math & Algorithms** | Logic/sets/relations, graphs, recurrences, combinatorics, common algorithms/asymptotics. | Complete |
| **P12 — Numerical Math & ODEs** | Roots, finite differences, quadrature, interpolation, linear solves, first-order IVPs. | Complete |
| **P13 — Verify My Work & Proof Lab** | Deterministic bounded transformation/solution/entailment verification. | Complete |
| **P14 — Practice & Courses** | Course sessions, authored/generated exercises, adaptive review, exams and mastery tracking. | Complete |
| **P15 — Release Hardening** | Persistence, Worker safety, PWA/offline, accessibility, release packaging and CI gates. | Complete foundation |

## M-series — deployed-product reconstruction

| Phase | Scope | Status |
|---|---|---|
| **M1 — Visual & Typography Reconstruction** | Readable typography, spacing, surfaces and hierarchy. | Complete |
| **M2 — Mathematical Typesetting Reconstruction** | MathML-first rendering across results, derivations, graphs, Practice and Proof. | Complete |
| **M3 — Workspace UX Reconstruction** | Clear input → result flow, suggested operations and on-demand advanced tools. | Complete |
| **M4 — Tools & Feature Discovery** | Searchable real capability catalog integrated with `Ctrl+K`. | Complete |
| **M5 — Visualization Reconstruction** | Rebuilt plotting workspace, interaction modes, trace, viewport and series controls. | Complete |
| **M6 — Practice / Proof / Reference Reconstruction** | Dedicated learning, verification and reference workspaces. | Complete |
| **M7 — Mathematical Completeness Audit** | 22-domain evidence-backed audit, visible coverage boundary and expansion roadmap. | Complete |

The M7 audit deliberately concludes that the feature-rich P-series is **not** a complete university mathematics platform. See `M7_MATHEMATICAL_COMPLETENESS_AUDIT.md`.

## E-series — mathematical expansion

The post-M7 sequence is defined in detail in `M7_EXPANSION_ROADMAP.md`.

| Phase | Scope | Status |
|---|---|---|
| **E1 — Multivariable Calculus Foundation** | Multi-parameter scalar/vector-valued functions; partial/mixed derivatives; gradient/Jacobian/Hessian; directional derivatives; linearization/tangent planes; bounded exact 2D critical-point/Hessian analysis and one-constraint Lagrange stationarity. | Complete |
| **E2 — Vector Calculus & Multivariable Integration** | Exact/approximate bounded double/triple integrals; polar/cylindrical/spherical transforms; 2D/3D vector fields; div/curl/potentials; line/surface/flux integrals; bounded Green/Gauss/Stokes verification. | **Complete** |
| **E3 — Visualization 2.0** | Parametric/polar curves; implicit/contour plots; scalar/vector/gradient fields; phase portraits; graph and parametric SVG 3D surfaces; E1/E2 overlays; export. | **Complete** |
| **E4 — ODEs & Dynamical Systems II** | Symbolic textbook ODE classes, higher-order/systems, adaptive methods and phase-plane stability. | **Complete** |
| **E5 — Numerical Linear Algebra & Optimization** | Pivoted LU; Cholesky; Householder QR; symmetric numerical eigenanalysis; SVD/pseudoinverse/rank/conditioning; CG; nonlinear Newton; local unconstrained/equality-constrained optimization; bounded 2D LP; convexity diagnostics. | **Complete** |
| **E6 — Probability & Statistics II** | Extended distributions; joint PMFs; covariance/correlation matrices; broader two-sample/categorical inference; ANOVA; multiple regression/diagnostics; nonparametrics; bootstrap; finite Markov chains. | **Complete** |
| **E7 — Fourier, Laplace & Transform Methods** | Exact bounded Laplace/inverse rules; convolution; initialized `ode2` transform solving; numerical Fourier series; exact Gaussian Fourier pair; finite-window Fourier evaluation; DFT/IDFT. | **Complete** |
| **E8 — Complex Analysis** | Rectangular complex decomposition; point mappings; complex derivatives/Cauchy–Riemann checks; branch diagnostics; rational power/Laurent series; singularity/residue analysis; numerical contour integrals; bounded residue-theorem workflows. | **Complete** |
| **E9 — Discrete Mathematics II, Algorithms & Number Theory** | Finite quantifiers; generating functions and stronger recurrence solutions; Bellman–Ford; max-flow/min-cut; bipartite matching; DP traces; bounded exact factorization, arithmetic functions, modular arithmetic, CRT and Diophantine workflows. | **Complete** |
| **E10 — PDEs, Abstract Structures & Geometry Foundations** | Canonical heat/wave/Laplace PDE objects and finite modal solutions; finite groups/rings/fields/homomorphisms; finite metric/topological spaces; exact point-set/affine geometry; owned region/curve/surface objects. | **Complete** |
| **E11 — Proof System II & Upper-Division Reasoning** | Checker-backed theorem registry; exact lemma rewrites and order consequences; nested finite quantifier certificates; recurrence-backed induction; analysis, linear-algebra and finite-group theorem certificates; Proof Lab integration. | **Complete** |
| **E12 — Mathematical Integration & v2 Certification** | Re-audit coverage, golden corpus, cross-domain QA, performance/accessibility, browser/device/PWA certification and v2 capability freeze. | **Next** |

## E1 semantic outcome

The parser and semantic model already represented `f(x,y,...)` definitions and function arity. E1 promotes that dormant structure into the calculus engine rather than inventing a second function representation.

```text
Unary f(x)
  → P5 calculus / P6 plots / P9 analysis / P12 scalar numerical calculus

Multivariable f(x,y,...)
  → E1 derivative tensors and local geometry

Vector-valued F(x,y,...)
  → E1 componentwise partial derivatives and Jacobians
```

See `E1_ACCEPTANCE.md` for the exact solving and optimization boundaries.

## E2 semantic outcome

E2 deliberately reuses those E1 objects rather than adding a competing field syntax:

```text
Scalar field f(x,y[,z])
  → iterated integration / coordinate transforms / scalar line & surface integrals

Vector field F(x,y)=[P,Q]
  → 2D divergence/curl / potential / circulation / Green

Vector field F(x,y,z)=[P,Q,R]
  → 3D divergence/curl / potential / work / flux / Gauss / Stokes
```

Curves, iterated bounds, graph surfaces and bounded theorem regions are typed operation inputs. Exact evaluation reuses P5/E1 symbolic calculus; deterministic Simpson cubature is an explicitly approximate fallback for constant rectangular regions.

See `E2_ACCEPTANCE.md` for exact region, surface, topology and numerical boundaries.

## E3 semantic outcome

E3 visualizes existing semantic objects directly rather than copying formulas into a separate plotting language:

```text
Unary scalar f(x)
  → Cartesian / polar

Unary vector C(t)=[x(t),y(t)]
  → parametric curve

Equation F(x,y)=0
  → implicit curve

Scalar field f(x,y)
  → contours / scalar field / exact-gradient field / z=f(x,y) surface

Vector field F(x,y)=[P,Q]
  → vector field / phase portrait

Two-parameter S(u,v)=[x,y,z]
  → parametric 3D surface
```

E1 exact critical-point analysis supplies certified overlays when supported. E2's bounded rectangular geometry is represented as an optional region overlay. Sampled curves, fields and surfaces are explicitly visualization rather than proof or exact solving.

See `E3_ACCEPTANCE.md` for the renderer, numerical-sampling and 3D boundaries.

## Architecture rule

No phase should bypass the core flow:

```text
Input → AST → Semantic Object → Capability → MathOperationRequest
      → Worker / Engine → Structured MathResult → Workspace / Visualization / Practice
```

Visualization is allowed to consume an existing Semantic Object directly because it is a read-only projection of that object, not a competing computation/persistence path.

## Current release/certification note

GitHub CI runs the real Vitest + TypeScript + Vite production path on expansion pull requests. The historical `v1.0.0-rc.2` label predates the M/E-series work, so a new stable version should be promoted only after the expanded deployed application receives the E12 integration and browser/device/PWA release certification.
