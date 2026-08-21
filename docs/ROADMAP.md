# MathLab Development Roadmap — P0 to P15

The roadmap is cumulative: each phase extends the same mathematical-object, workspace, engine and result architecture rather than creating isolated calculator pages.

| Phase | Scope | Status |
|---|---|---|
| **P0 — Architecture, Design System & Product Skeleton** | React/Vite shell, scientific editorial UI system, hash routing, worker boundary, engine contract, IndexedDB baseline, PWA baseline, responsive product skeleton. | Complete |
| **P1 — Universal Mathematical Input** | Unicode/LaTeX normalization, lexer/parser, implicit multiplication, AST, diagnostics, MathML/LaTeX/plain serialization, history/autocomplete. | Complete |
| **P2 — Mathematical Object & Assumption System** | Semantic objects, definitions vs equations, symbol/dependency resolution, domains/shapes/exactness, structured assumptions, capability applicability. | Complete |
| **P3 — Core Workspace** | Durable named objects vs scratch work, dependency graph, rename/reference rewriting, duplicate/pin/delete, autosave/recovery, import/export, activity model. | Complete |
| **P4 — Algebra & Equation Engine** | Exact rational arithmetic, simplify/expand/factor/substitute, polynomial division/partial fractions, linear/quadratic equations, linear inequalities, exact linear systems, structured derivations. | Complete |
| **P5 — Functions & Calculus** | Unary function workflows, evaluation, symbolic derivatives/higher derivatives, bounded elementary integration, definite integrals, limits, zeros, critical points, extrema, monotonicity, concavity, reusable function profiles. | Complete |
| **P6 — Visualization Engine** | Interactive 2D function plotting driven by P5 profiles/results; multiple functions, domain-aware discontinuities, zeros/extrema/inflection/asymptote overlays, trace/zoom/pan, exact-vs-numeric labels, export, responsive graph workspace. | Complete |
| **P7 — Linear Algebra Foundation** | Vector/matrix arithmetic, dot/norm, matrix products, row operations, RREF, rank, determinant, inverse, exact linear-system matrix workflow, span/basis/null/column spaces foundations. | Complete |
| **P8 — Advanced Linear Algebra** | Eigenvalues/eigenvectors, characteristic structure, diagonalization, orthogonality, Gram–Schmidt, projections, QR, least squares, symmetric/Hermitian workflows and selected decompositions. | Complete |
| **P9 — Analysis** | Sequences and series, convergence tooling, continuity/discontinuity and differentiability, rigorous limit-oriented analysis, Taylor/power series foundations, theorem-aware real-analysis workflows and counterexample-sensitive diagnostics. | Complete |
| **P10 — Probability & Statistics** | Descriptive statistics, probability models, random variables/distributions, expectation/variance, conditional probability/Bayes, sampling, confidence intervals/tests, regression/correlation, simulation-aware exact/numeric results. | Complete |
| **P11 — Discrete Math & Algorithms** | Logic/sets/relations, combinatorics, graph structures, recurrences, asymptotics, algorithm tracing/complexity, common data-structure and algorithm-analysis workflows. | Complete |
| **P12 — Numerical Math & ODEs** | Floating-point/error model, root finding, interpolation, numerical differentiation/integration, pivoted and iterative linear systems, IVP objects plus Euler/Heun/RK4 methods, convergence/error diagnostics. | Complete |
| **P13 — Verify My Work & Proof Lab** | Step-by-step equivalence checking, equation/derivation validation, assumption/domain checks, proof structure workspace, theorem/definition references, counterexample search and explicit verified/conditional/invalid/not-proven boundaries. | Complete |
| **P14 — Practice & Courses** | Course/topic organization, reusable reference material, authored and deterministic generated exercise banks/templates, adaptive review, layered hints/solutions, persistent mastery tracking, exam sessions and study workflows built on P13 verification. | Complete |
| **P15 — Release Hardening** | Full regression and visual audit, test/build certification gates, performance/worker safety, persistence migrations/recovery, accessibility, mobile/input compatibility, offline/PWA hardening, import/export resilience, security/privacy, docs/onboarding and release packaging. | **Release candidate complete** |

## Architecture rule

No later phase should bypass the core flow:

```text
Input → AST → Semantic Object → Capability → MathOperationRequest
      → Worker / Engine → Structured MathResult → Workspace / Visualization / Practice
```

This is the main defense against MathLab becoming a collection of disconnected calculators.

## Release gate

P15 produces **v1.0.0-rc.2**. Static release audit, strict TypeScript checks, structural source/test compilation, complete 161/161 dependency-independent execution of the existing test corpus, persistence hardening, and package integrity are completed in the available runtime. Final **v1.0.0** promotion remains gated on dependency-backed Vitest/Vite execution and real browser/device certification in an environment where npm dependencies are available.
