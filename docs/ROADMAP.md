# MathLab Development Roadmap

MathLab has three completed development eras:

1. **P0–P15 — original product and mathematics foundation**
2. **M1–M7 — deployed-product reconstruction and mathematical completeness audit**
3. **E1–E12 — post-audit mathematical expansion, integration and v2 certification**

The architecture is cumulative. Every phase extends the same mathematical-object, workspace, engine, result, visualization and verification system rather than creating disconnected calculator pages.

## P-series — Complete

| Phase | Scope | Status |
|---|---|---|
| P0 | Architecture, design system and product skeleton | Complete |
| P1 | Universal mathematical input, parser and AST | Complete |
| P2 | Mathematical object and assumption system | Complete |
| P3 | Persistent core workspace | Complete |
| P4 | Algebra and equation engine | Complete |
| P5 | Functions and single-variable calculus | Complete |
| P6 | Visualization engine | Complete |
| P7 | Linear algebra foundation | Complete |
| P8 | Advanced linear algebra | Complete |
| P9 | Analysis | Complete |
| P10 | Probability and statistics | Complete |
| P11 | Discrete mathematics and algorithms | Complete |
| P12 | Numerical mathematics and ODEs | Complete |
| P13 | Verify My Work and Proof Lab | Complete |
| P14 | Practice and courses | Complete |
| P15 | Release hardening, persistence, PWA and CI foundation | Complete |

## M-series — Complete

| Phase | Scope | Status |
|---|---|---|
| M1 | Visual and typography reconstruction | Complete |
| M2 | Mathematical typesetting reconstruction | Complete |
| M3 | Workspace UX reconstruction | Complete |
| M4 | Tools and feature discovery | Complete |
| M5 | Visualization reconstruction | Complete |
| M6 | Practice / Proof / Reference reconstruction | Complete |
| M7 | 22-domain mathematical completeness audit | Complete |

M7 established an intentionally critical baseline: the P-series product was feature-rich but not a comprehensive university-mathematics environment. The original audit remains in `M7_MATHEMATICAL_COMPLETENESS_AUDIT.md` and must be read as a historical checkpoint, not silently rewritten after later phases.

## E-series — Complete

| Phase | Scope | Status |
|---|---|---|
| **E1 — Multivariable Calculus Foundation** | Multi-parameter scalar/vector functions, partial/mixed derivatives, gradient/Jacobian/Hessian, local geometry and bounded constrained stationarity. | Complete |
| **E2 — Vector Calculus & Multivariable Integration** | Bounded double/triple integration, coordinate transforms, vector fields, line/surface/flux integrals and bounded Green/Gauss/Stokes workflows. | Complete |
| **E3 — Visualization 2.0** | Parametric/polar/implicit curves, contours, scalar/vector fields, phase portraits, SVG 3D surfaces, overlays and export. | Complete |
| **E4 — ODEs & Dynamical Systems II** | Supported symbolic ODE classes, higher-order/systems, equilibria/stability, adaptive RK45 and phase-plane integration. | Complete |
| **E5 — Numerical Linear Algebra & Optimization** | LU/Cholesky/Householder QR, symmetric eigenanalysis, SVD/pseudoinverse/conditioning/CG, nonlinear solving and bounded optimization. | Complete |
| **E6 — Probability & Statistics II** | Extended distributions, joint PMFs, covariance, broader inference, ANOVA, multiple regression, nonparametrics, bootstrap and finite Markov chains. | Complete |
| **E7 — Fourier, Laplace & Transform Methods** | Bounded exact Laplace/inverse/convolution, transform ODE solving, Fourier series/numerical transforms and DFT/IDFT. | Complete |
| **E8 — Complex Analysis** | Complex decomposition/derivatives/CR, branch diagnostics, bounded Laurent/singularity/residue/contour workflows and residue theorem. | Complete |
| **E9 — Discrete Mathematics II, Algorithms & Number Theory** | Finite quantifiers, generating functions, Bellman–Ford, flow/matching, DP traces, modular arithmetic, CRT, factorization and Diophantine workflows. | Complete |
| **E10 — PDEs, Abstract Structures & Geometry Foundations** | Canonical finite-modal PDE workflows; finite groups/rings/fields/homomorphisms; finite metric/topological and affine-geometry foundations. | Complete |
| **E11 — Proof System II & Upper-Division Reasoning** | Checker-backed theorem registry, exact lemma/order consequences, finite quantified proofs, induction and selected theorem certificates. | Complete |
| **E12 — Mathematical Integration & v2 Certification** | Fixed-rubric re-audit, 22-domain golden corpus, catalog/capability/provenance integration gates, release-candidate freeze and v2 certification boundary. | **Complete** |

Detailed phase boundaries are recorded in `E1_ACCEPTANCE.md` through `E12_ACCEPTANCE.md`.

## E12 integration outcome

E12 re-ran the **same 22-domain rubric used by M7** rather than changing the scoring system after implementation.

Current evidence:

- university-domain breadth: **66/100**;
- implemented-domain maturity: **66/100**;
- 9 strong domains;
- 11 partial domains;
- 2 narrow domains;
- 0 missing/incidental domains;
- **0 comprehensive domains**.

See `E12_MATHEMATICAL_REAUDIT.md`.

The historical post-E3 checkpoint of **43/100 breadth / 59/100 implemented-domain maturity** remains historical evidence. E4–E11 increased the current score; they do not retroactively alter what M7 measured at that earlier point.

## Architecture rule

No phase bypasses the core flow:

```text
Input → AST → Semantic Object → Capability → MathOperationRequest
      → Worker / Engine → Structured MathResult → Workspace / Visualization / Practice
```

Visualization may consume an existing Semantic Object directly only as a read-only projection. Proof certification must come from deterministic checkers, not natural-language resemblance or numerical sampling.

## Current release state

The completed P/M/E source is promoted to **`v2.0.0-rc.1`** only after the exact final E12 branch head passes:

- P15 release audit;
- E12 certification audit;
- complete Vitest suite;
- strict TypeScript;
- Vite production build.

Stable **`v2.0.0` is not certified by repository CI alone**. It remains gated on real deployed Chromium/Firefox, Android Chrome, iOS Safari/WebKit, PWA install/offline/upgrade, keyboard/screen-reader and visual-regression evidence described in `RELEASE_CERTIFICATION.md`.

## What comes after E12

There is **no E13 in the locked expansion roadmap**. E12 closes the planned E-series. Future work should be driven by concrete post-RC defects, real-user UX findings, performance/security maintenance, or a deliberately defined new roadmap rather than continuing phase numbering automatically.
