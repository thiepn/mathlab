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
| **E1 — Multivariable Calculus Foundation** | Multi-parameter scalar/vector-valued functions; partial/mixed derivatives; gradient/Jacobian/Hessian; directional derivatives; linearization/tangent planes; bounded exact 2D critical-point/Hessian analysis and one-constraint Lagrange stationarity. | **Complete** |
| **E2 — Vector Calculus & Multivariable Integration** | Double/triple integrals, coordinate transforms, vector fields, div/curl, line/surface integrals, Green/Gauss/Stokes. | Next |
| **E3 — Visualization 2.0** | Parametric/polar/implicit plots, contours, fields, phase portraits and 3D surfaces. | Planned |
| **E4 — ODEs & Dynamical Systems II** | Symbolic textbook ODE classes, higher-order/systems, adaptive methods and phase-plane stability. | Planned |
| **E5 — Numerical Linear Algebra & Optimization** | LU/Cholesky, numerical eigen/SVD, nonlinear systems, multivariable/constrained/linear optimization. | Planned |
| **E6 — Probability & Statistics II** | Joint distributions, broader inference, ANOVA, multiple regression, nonparametrics and stochastic foundations. | Planned |
| **E7 — Fourier, Laplace & Transform Methods** | Laplace/inverse, convolution, Fourier series/transforms and transform-based differential equations. | Planned |
| **E8 — Complex Analysis** | Holomorphic functions, Cauchy–Riemann, contours, Laurent series and residues. | Planned |
| **E9 — Discrete Mathematics II, Algorithms & Number Theory** | Predicate logic, generating functions, advanced graph algorithms, modular arithmetic/CRT/Diophantine workflows. | Planned |
| **E10 — PDEs, Abstract Structures & Geometry Foundations** | PDE foundations, finite abstract algebra and geometry/topology semantic models. | Planned |
| **E11 — Proof System II & Upper-Division Reasoning** | Quantifiers, induction, theorem registry, proof obligations and deterministic upper-division certificates. | Planned |
| **E12 — Mathematical Integration & v2 Certification** | Re-audit coverage, golden corpus, cross-domain QA, performance/accessibility and v2 capability freeze. | Planned |

## E1 semantic outcome

The parser and semantic model already represented `f(x,y,...)` definitions and function arity. E1 promotes that dormant structure into the calculus engine rather than inventing a second function representation.

The current split is explicit:

```text
Unary f(x)
  → P5 calculus / P6 plots / P9 analysis / P12 scalar numerical calculus

Multivariable f(x,y,...)
  → E1 derivative tensors and local geometry

Vector-valued F(x,y,...)
  → E1 componentwise partial derivatives and Jacobians
```

See `E1_ACCEPTANCE.md` for the exact solving and optimization boundaries.

## Architecture rule

No phase should bypass the core flow:

```text
Input → AST → Semantic Object → Capability → MathOperationRequest
      → Worker / Engine → Structured MathResult → Workspace / Visualization / Practice
```

## Current release/certification note

GitHub CI runs the real Vitest + TypeScript + Vite production path on expansion pull requests. The historical `v1.0.0-rc.2` label predates the M/E-series work, so a new stable version should be promoted only after the expanded deployed application receives a fresh browser/device/PWA release certification.
