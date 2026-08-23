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

E7 reuses unary expressions/functions, vectors/matrices and initialized `ode2(...)` objects.

Implemented baseline:

- bounded exact unilateral Laplace transform/inverse tables;
- linearity, shifts and convolution;
- bounded transform-based constant-coefficient `ode2` solving;
- configured-period Fourier-series coefficients with exact structural parity zeros;
- exact Gaussian bilateral Fourier pair under the documented convention;
- finite-window numerical Fourier/inverse-Fourier evaluation;
- direct bounded `O(N²)` DFT/IDFT.

E7 does not claim general ROC solving, distribution semantics, Bromwich inversion, FFT performance, multidimensional transforms, Z transforms, wavelets or general transform-based PDE solving.

See `E7_ACCEPTANCE.md`.

---

## E8 — Complex Analysis — Complete

E8 extends unary scalar expressions/functions and the existing complex constant `i` rather than introducing a parallel complex language.

Implemented baseline:

- exact `z=x+iy` real/imaginary decomposition;
- exact complex derivatives and Cauchy–Riemann residual certification for supported forms;
- explicit non-holomorphic refusals and branch-local derivative warnings;
- binary64 complex point mappings;
- bounded exact rational power/Laurent series around real rational centers;
- rational regular/removable/pole classification and exact residues;
- numerical small-circle residue fallback for supported single-valued cases;
- deterministic circle/line contour integration;
- bounded circular residue-theorem automation;
- logarithm/square-root/argument/non-integer-power branch diagnostics.

E8 does not claim general analytic continuation, Riemann surfaces, arbitrary Laurent expansions or pole discovery, essential-singularity theory, rigorous contour error bounds, argument-principle/Rouché workflows, or a complete complex-plane visualization system.

See `E8_ACCEPTANCE.md`.

---

## E9 — Discrete Mathematics II, Algorithms & Number Theory — Complete

E9 reuses finite-set, recurrence, complexity, graph, vector/matrix and exact integer-scalar objects. Its accepted mathematical outputs are exact and deterministic.

### Predicate logic

- configurable `∀` / `∃` predicates over explicit finite-set objects;
- exact exhaustive evaluation of every represented domain element;
- exact arithmetic equations/comparisons and existing Boolean connectives;
- witness/counterexample reporting;
- bounded to at most 256 represented elements.

### Recurrences and complexity

- exact ordinary generating functions for `linrec` and `linrec2`;
- stronger exact characteristic-root closed forms for supported first/second-order constant-coefficient recurrences;
- real, repeated and complex-conjugate roots;
- explicit refusal of the degenerate double-zero representation gap;
- bounded Master-theorem extension for `Θ(n^k(log n)^j)` tolls.

### Graph algorithms

- exact-rational Bellman–Ford for weighted graphs, including negative edges;
- reachable negative-cycle detection and refusal;
- deterministic Edmonds–Karp maximum flow on weighted directed graphs;
- exact residual minimum-cut certificate and max-flow/min-cut equality;
- bipartiteness certification and deterministic maximum-cardinality bipartite matching.

### Dynamic programming

- deterministic exact `O(n²)` longest strictly increasing subsequence for vectors up to 256 elements;
- bounded exact 0/1 knapsack for up to 100 items and integer capacity up to 500;
- inspectable DP traces.

### Number theory

- deterministic exact trial factorization for nonzero `|n|≤10^12`;
- primality signal;
- Euler `φ`, divisor count `τ`, divisor sum `σ`, and Möbius `μ`;
- exact extended Euclidean algorithm with Bézout certificate;
- modular inverses with gcd obstruction checks;
- complete linear-congruence residue classes;
- generalized CRT for 1–20 compatible congruences, including non-coprime moduli;
- complete integer solution families for two-variable linear Diophantine equations.

E9 does not claim infinite-domain first-order theorem proving, general SAT/SMT, arbitrary recurrence/generating-function solving, Akra–Bazzi, advanced flow variants, weighted/general graph matching, general combinatorial optimization, cryptographic factorization, discrete logarithms, algebraic number theory, general polynomial congruences, or nonlinear/higher-dimensional Diophantine solving.

E9 participates in the cumulative Worker/engine chain, capability registry, inspector controls, Workspace actions, and global Tools/`Ctrl+K` discovery.

See `E9_ACCEPTANCE.md`.

---

## Next — E10: PDEs, Abstract Structures & Geometry Foundations

E10 is intentionally a foundation phase rather than a claim to complete three very large subjects.

### PDEs

- PDE semantic objects;
- order/linearity classification;
- common first/second-order form recognition;
- separation-of-variables templates;
- canonical heat/wave/Laplace rectangular problems;
- initial/boundary-condition objects.

### Abstract structures

- finite-group objects and Cayley tables;
- subgroup/order checks;
- finite ring/field foundations;
- bounded finite homomorphism/kernel/image checks.

### Geometry/topology

- analytic-geometry objects needed by other domains;
- stronger shared curve/surface/region ownership building on E2/E3;
- metric-space foundation;
- basic open/closed/connected/compact finite or supported symbolic examples.

---

## E11 — Proof System II & Upper-Division Reasoning

- predicate syntax and quantifiers;
- induction templates;
- theorem registry;
- proof obligations;
- deterministic theorem application;
- equality/inequality lemma chaining;
- analysis proof templates where assumptions can be represented formally;
- algebra/linear-algebra theorem certificates;
- counterexample generation remains disproof-only;
- natural-language explanation may accompany, but never replace, a deterministic certificate.

---

## E12 — Mathematical Integration & v2 Certification

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

The most recent fixed M7 re-score was taken after E3; **E4–E9 have not been used to rewrite that historical score outside the scheduled E12 integration audit.**

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
