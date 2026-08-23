# Post-M7 Mathematics Expansion Roadmap

M7 established that completing the original P0–P15 roadmap did not make MathLab mathematically comprehensive. The E-series therefore expands the same semantic-object, engine, workspace, visualization and verification architecture rather than adding disconnected calculators.

## Expansion principles

Every E-phase must preserve the existing MathLab contracts:

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

### Checker-backed theorem registry

The accepted registry contains only rules with deterministic checkers, including substitution of equals, positive order scaling, finite-domain quantifier semantics, recurrence-backed ordinary induction, differentiability implies continuity, rank–nullity, bounded invertible-matrix equivalences, the Hermitian spectral theorem, and Lagrange's theorem.

### Lemma and inequality reasoning

- exact AST-subtree equality substitution, forward/reverse and first/all occurrence modes;
- proposed targets must contain no hidden extra step;
- bounded exact one-variable rational-polynomial inequality implications by positive rational scaling;
- strict-to-nonstrict weakening is supported, but non-strict-to-strict strengthening and negative scaling are refused.

### Quantified proof obligations

- one or two nested `∀`/`∃` quantifiers over explicit finite sets;
- exact arithmetic predicates and existing Boolean connectives;
- exhaustive witnesses/counterexamples;
- at most 256 values per domain and at most 4096 nested assignments;
- no finite result is extrapolated to an infinite domain.

### Ordinary induction

- natural sequence/function claims such as `S(n)=F(n)`;
- explicit base fact and recurrence premise;
- separate base, induction-hypothesis, recurrence-compatibility, hypothesis-substitution and successor-algebra obligations;
- the final conclusion is explicitly conditional on the represented recurrence premise/definition and verified base fact.

### Upper-division theorem certificates

- differentiability ⇒ continuity at a point only after the P9 differentiability prerequisite is established;
- exact rank–nullity certificates;
- square rational-matrix determinant/full-rank/nullity-zero equivalence checks;
- Hermitian spectral-theorem application only after exact `A*=A` certification;
- Lagrange theorem only after exact E10 finite-group and subgroup certification.

If a prerequisite is not discharged, E11 reports that state and asserts no theorem conclusion. Failure to prove is not treated as proof of negation.

E11 integrates with the cumulative Worker/engine chain, capability registry, Workspace controls, global Tools/`Ctrl+K`, and an extended Proof Lab that retains all P13 modes while adding induction, finite quantifiers, lemma application and theorem-registry inspection.

E11 does not claim a general first-order theorem prover, SAT/SMT, a proof-assistant kernel, prose-proof formalization, theorem discovery from language similarity, general nonlinear inequality proving, quantifier elimination, strong/structural/well-founded/transfinite induction, epsilon–delta proof synthesis, arbitrary abstract-algebra/topology theorem proving, or proof from numerical sampling.

See `E11_ACCEPTANCE.md`.

---

## Next — E12: Mathematical Integration & v2 Certification

E12 will re-run the exact M7 rubric rather than inventing a more favorable metric.

- re-score all 22 domains with evidence;
- full engine/capability/catalog consistency audit;
- representative golden mathematical corpus;
- cross-domain regression testing;
- exact/approximate/heuristic label audit;
- visualization sampling/performance audit;
- Worker timeout/performance audit;
- browser/device/PWA certification;
- accessibility audit across expanded mathematical interfaces;
- documentation and unsupported-boundary audit;
- remove stale or duplicate operation paths;
- capability freeze;
- v2 release-candidate promotion only after the evidence supports it.

## Current evidence after E3

The most recent fixed M7 re-score was taken after E3; **E4–E11 have not been used to rewrite that historical score outside the scheduled E12 integration audit.**

Under that fixed M7 22-domain rubric:

- university-domain breadth: **43/100**;
- implemented-domain maturity: **59/100**;
- visualization: **4/5 strong**;
- vector calculus & multivariable integration: **3/5 partial**;
- multivariable calculus: **3/5 partial**;
- six major domains remained completely missing at that historical checkpoint;
- no domain is rated comprehensive merely because its UI is polished.

## Intended E-series outcome

The E-series is not designed to compete with Mathematica by raw feature count. Its purpose is to produce a coherent, honest, broad university-mathematics environment in which:

- common undergraduate computations are genuinely supported;
- exactness boundaries remain visible;
- numerical methods expose approximation status;
- sampled visualization is not confused with proof;
- proofs are not fabricated;
- tools remain discoverable;
- symbolic work, visualization, verification and practice share the same mathematical objects.
