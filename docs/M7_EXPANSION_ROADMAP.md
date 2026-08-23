# Post-M7 Mathematics Expansion Roadmap

M7 established that completing the original P0–P15 roadmap did not make MathLab mathematically comprehensive. The E-series therefore expanded the same semantic-object, engine, workspace, visualization and verification architecture rather than adding disconnected calculators.

## Expansion principles

Every E-phase preserves the existing MathLab contracts:

- exact / approximate / heuristic status remains explicit;
- unsupported mathematics fails honestly;
- new mathematical structures are first-class only when a new semantic object is genuinely needed;
- existing semantic objects are reused when they already represent the mathematics correctly;
- new operations become discoverable only when their underlying behavior exists;
- mathematical output remains structured and MathML-first;
- visualization is a projection of mathematical objects, never an alternate source of truth;
- every phase ships with deterministic regression coverage and must pass the real release audit + Vitest + strict TypeScript + Vite production gate.

---

## E1 — Multivariable Calculus Foundation — Complete

E1 removed the unary-only calculus assumption and established multi-argument scalar/vector-valued functions, exact partial and mixed derivatives, gradients, Jacobians, Hessians, directional derivatives, linearization/tangent planes, bounded exact two-variable critical-point analysis, and bounded one-constraint Lagrange stationarity.

See `E1_ACCEPTANCE.md`.

---

## E2 — Vector Calculus & Multivariable Integration — Complete

E2 builds directly on E1 function objects and adds bounded exact/approximate double and triple integration, coordinate transforms with Jacobians, 2D/3D vector fields, divergence/curl/potentials, scalar/work/flux integrals, and bounded Green/Gauss/Stokes verification.

See `E2_ACCEPTANCE.md`.

---

## E3 — Visualization 2.0 — Complete

E3 consumes the existing semantic objects directly and adds parameterized and polar curves, implicit curves, contours, scalar/vector/gradient fields, phase portraits, graph and parametric SVG 3D surfaces, E1/E2 overlays, synchronized object selection, and SVG/PNG export.

It remains visualization rather than proof and does not claim a general WebGL/implicit-3D engine.

See `E3_ACCEPTANCE.md`.

---

## E4 — ODEs & Dynamical Systems II — Complete

E4 extends the P12 numerical-IVP foundation with bounded symbolic separable/linear/exact ODE workflows, constant-coefficient higher-order equations, first-order systems, equilibrium/Jacobian/local-stability analysis, E3 phase-plane integration, adaptive Dormand–Prince RK45, event stopping, and explicit symbolic/numerical provenance.

See `E4_ACCEPTANCE.md`.

---

## E5 — Numerical Linear Algebra & Optimization — Complete

E5 extends matrix and multivariable-function objects with pivoted LU, Cholesky, Householder QR, bounded real-symmetric eigenanalysis, SVD/pseudoinverse/rank/conditioning, conjugate gradient, nonlinear Newton, local unconstrained optimization, one-equality penalty optimization, convexity diagnostics, and bounded two-variable LP.

See `E5_ACCEPTANCE.md`.

---

## E6 — Probability & Statistics II — Complete

E6 extends the existing dataset/matrix/distribution semantics with advanced continuous distributions, joint PMFs, covariance/correlation matrices, broader two-sample/categorical inference, one-way ANOVA, multiple OLS/diagnostics, nonparametric rank tests, deterministic percentile bootstrap, and finite Markov-chain analysis.

Special-function/inferential decimals remain approximate and bootstrap remains heuristic; degenerate cases fail explicitly.

See `E6_ACCEPTANCE.md`.

---

## E7 — Fourier, Laplace & Transform Methods — Complete

E7 reuses unary expressions/functions, vectors/matrices and initialized `ode2(...)` objects. It adds bounded exact unilateral Laplace/inverse tables, convolution and transform ODE solving, numerical Fourier-series coefficients, the exact Gaussian bilateral Fourier pair, finite-window Fourier evaluation, and direct bounded DFT/IDFT.

E7 does not claim general ROC solving, distribution semantics, Bromwich inversion, FFT performance, multidimensional transforms, Z transforms, wavelets or general transform-based PDE solving.

See `E7_ACCEPTANCE.md`.

---

## E8 — Complex Analysis — Complete

E8 extends unary scalar expressions/functions and the existing complex constant `i` with exact rectangular decomposition, complex derivatives/Cauchy–Riemann checks, branch diagnostics, bounded rational power/Laurent series, singularity/residue analysis, deterministic contour integration, and bounded residue-theorem workflows.

E8 does not claim general analytic continuation, Riemann surfaces, arbitrary Laurent expansions or pole discovery, essential-singularity theory, rigorous contour error bounds, argument-principle/Rouché workflows, or a complete complex-plane visualization system.

See `E8_ACCEPTANCE.md`.

---

## E9 — Discrete Mathematics II, Algorithms & Number Theory — Complete

E9 reuses finite-set, recurrence, complexity, graph, vector/matrix and exact integer-scalar objects. Its accepted mathematical outputs are exact and deterministic.

Implemented baseline includes finite quantifiers, generating functions and stronger recurrence closed forms, an extended Master-theorem workflow, Bellman–Ford, max-flow/min-cut, bipartite matching, inspectable dynamic-programming traces, bounded exact factorization/arithmetic functions, extended GCD, modular inverses, linear congruences, generalized CRT and bounded linear Diophantine solving.

E9 does not claim infinite-domain first-order theorem proving, general SAT/SMT, arbitrary recurrence/generating-function solving, Akra–Bazzi, advanced flow variants, weighted/general graph matching, general combinatorial optimization, cryptographic factorization, discrete logarithms, algebraic number theory, general polynomial congruences, or nonlinear/higher-dimensional Diophantine solving.

See `E9_ACCEPTANCE.md`.

---

## E10 — PDEs, Abstract Structures & Geometry Foundations — Complete

E10 is intentionally a foundation phase rather than a claim to complete three very large subjects.

Implemented baseline:

- first-class canonical heat/wave/rectangular-Laplace problem objects, separation templates and exact finite modal solutions;
- bounded exact finite groups, subgroups, rings/fields and group homomorphisms;
- finite metric spaces and metric balls;
- finite topologies with open/closed/clopen, T0/T1, connectedness, compactness, interior, closure and boundary certificates;
- exact 2D/3D point-set and affine geometry;
- semantic ownership for rectangular regions, parameterized curves and graph surfaces.

E10 does not claim general PDE solving, weak/numerical PDE theory, infinite abstract algebra, manifolds/differential geometry, or general topological theorem proving.

See `E10_ACCEPTANCE.md`.

---

## E11 — Proof System II & Upper-Division Reasoning — Complete

E11 extends P13's exact transition/chain/entailment verifier into a bounded theorem-application system without introducing a free-form proof generator.

Implemented baseline:

- checker-backed theorem registry only for rules with deterministic prerequisite/application checkers;
- exact AST-subtree equality substitution;
- bounded one-way rational-polynomial inequality consequences;
- one- and two-level finite `∀`/`∃` proof obligations with witnesses/counterexamples;
- recurrence-backed ordinary induction with separate base/hypothesis/recurrence/successor obligations;
- differentiability ⇒ continuity, rank–nullity, invertible-matrix, Hermitian spectral and finite-group Lagrange certificates;
- cumulative Worker, Workspace, Tools/`Ctrl+K` and Proof Lab integration.

E11 does not claim a general theorem prover, SAT/SMT system, proof-assistant kernel, prose-proof formalizer, quantifier elimination, advanced induction systems, arbitrary theorem discovery or proof from numerical sampling.

See `E11_ACCEPTANCE.md`.

---

## E12 — Mathematical Integration & v2 Certification — Complete

E12 closes the planned E-series. It introduces no new mathematics domain; it certifies the cumulative architecture and fixes the release boundary.

Implemented baseline:

- re-runs the exact original M7 22-domain rubric against E1–E11 production evidence;
- updates the live completeness registry while preserving the historical M7 checkpoint;
- adds a 22-domain cumulative golden corpus through the production E11 engine/visualization paths;
- certifies golden operation discovery and capability routing;
- certifies Workspace controlled-operation discovery coverage;
- validates main-parser tool examples while preserving dedicated Proof Lab grammar ownership;
- requires explicit exact/approximate/heuristic provenance in the golden corpus;
- adds `npm run audit:e12` and makes both PR CI and Pages deployment run it;
- promotes the source identity to **`v2.0.0-rc.1`** only after the pre-promotion integration head passes all tests, strict TypeScript and Vite build;
- explicitly withholds stable `v2.0.0` pending real browser/device/PWA/accessibility evidence.

See `E12_ACCEPTANCE.md`, `E12_MATHEMATICAL_REAUDIT.md`, and `RELEASE_CERTIFICATION.md`.

---

## Historical M7 checkpoint vs E12 re-audit

The original fixed-rubric post-E3 checkpoint remains historical evidence:

- breadth: **43/100**;
- implemented-domain maturity: **59/100**.

E12 applies the **same** rubric to the completed E1–E11 product:

- breadth: **66/100**;
- implemented-domain maturity: **66/100**;
- 9 strong domains;
- 11 partial domains;
- 2 narrow domains;
- 0 missing/incidental domains;
- **0 comprehensive domains**.

Zero missing domains means the expansion roadmap successfully established a first-class workflow in every audited area. It does not mean the mathematics is comprehensive.

## E-series outcome

The E-series was not designed to compete with Mathematica by raw feature count. Its completed outcome is a coherent, honest, broad university-mathematics environment in which:

- common undergraduate computations are genuinely supported across the 22 audited areas;
- exactness boundaries remain visible;
- numerical methods expose approximation status;
- sampled visualization is not confused with proof;
- proofs are checker-backed rather than fabricated;
- tools remain discoverable;
- symbolic work, visualization, verification and practice share the same mathematical objects;
- unsupported upper-division/general-CAS boundaries remain explicit.

## Roadmap closure

There is no automatic E13. Future development begins only from concrete post-RC defects, measured performance/security/accessibility findings, real-user UX evidence, or a separately defined new roadmap.
