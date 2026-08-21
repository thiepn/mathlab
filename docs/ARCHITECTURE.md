# MathLab Architecture — P0–P4 Foundation

## Architectural boundaries

```text
UI / Workspace
      ↓
Object + operation layer
      ↓
MathEngine interface
      ↓
Worker client / protocol
      ↓
Symbolic + numerical engines (later phases)
```

The UI must never import a concrete CAS directly. All mathematical execution goes through a `MathEngine` contract and returns a structured `MathResult`.

## Mathematical foundation

`src/lib/math/` contains the first stable contracts for:

- mathematical domains;
- object kinds;
- assumptions;
- exactness;
- derivation steps;
- operation requests;
- structured results;
- AST node types.

P1 can evolve the parser without forcing UI rewrites.

## Worker boundary

`src/lib/worker/` keeps expensive mathematics off the UI thread. P0 exposes a ping path plus an execution protocol. Pyodide/SymPy or other heavyweight engines can later be initialized behind this boundary.

## Persistence

`MathLabDatabase` wraps IndexedDB. P0 intentionally keeps a minimal key/value store so later schemas can be introduced through explicit migrations rather than hard-coding course/history concepts prematurely.

## Routing

P0 uses a tiny hash router with no additional dependency. It is GitHub Pages/static-host compatible and exposes stable top-level spaces:

- Workspace
- Visualize
- Practice
- Reference

## PWA

A conservative service worker is provided as a baseline. Before release it should be replaced with a versioned build-aware caching strategy.

## Design system

The product uses a white scientific/editorial visual language:

- thin geometric rules;
- small radii;
- no bubble/chat aesthetic;
- interface typography separated from mathematical typography;
- blue used as a functional accent, not decoration;
- object/context panels rather than tool-card sprawl;
- responsive mobile composition rather than desktop shrinkage.

## P1 input pipeline

P1 establishes a deterministic front-end mathematical language before any CAS is connected:

```text
Raw source
  ↓
normalizeMathSource
  ↓
positioned lexer
  ↓
implicit multiplication pass
  ↓
precedence parser
  ↓
MathLab AST
  ↓
classification / MathML / LaTeX
```

The parser intentionally owns syntax only. It does not simplify expressions or decide mathematical truth. P2 adds symbol-table and object semantics; later computation phases translate the AST through the `MathEngine` abstraction.

### P1 source modules

- `src/lib/math/normalize.ts` — common Unicode and LaTeX normalization.
- `src/lib/math/parser.ts` — lexer, implicit multiplication, precedence parser and diagnostics.
- `src/lib/math/format.ts` — deterministic AST serialization to LaTeX/plain text.
- `src/lib/math/suggestions.ts` — input autocomplete data and insertion logic.
- `src/app/components/MathPreview.tsx` — AST-to-MathML presentation.
- `src/lib/storage/inputHistory.ts` — local input-history persistence.

---

## P2 semantic layer

P2 inserts a semantic boundary after parsing:

```text
source
  ↓
P1 parser / AST
  ↓
P2 semantic resolver
  ├─ identity
  ├─ kind + shape
  ├─ domain
  ├─ parameters / free variables
  ├─ dependencies
  └─ assumptions
  ↓
SemanticMathObject
  ↓
future operation resolver / MathEngine
```

### Definitions versus equations

MathLab deliberately distinguishes assignment from equality.

- `x = 2` is an equation.
- `x := 2` defines the persistent object `x`.
- `f(x) = x^2` is accepted as conventional function-definition notation.
- `A = [[1,2],[3,4]]` is accepted as conventional named matrix notation.

This prevents the workspace symbol table from silently redefining variables when the user intended to solve or inspect an equation.

### Semantic objects

`SemanticMathObject` stores both the original AST and the resolved value AST plus:

- stable object identity;
- optional name;
- kind;
- shape;
- ambient domain;
- exactness metadata;
- parameters;
- free variables;
- named dependencies;
- applicable assumptions;
- creation/update timestamps;
- definition style.

### Assumptions

P2 assumptions are structured predicates, not opaque strings. Supported initial categories are:

- domain: `n integer`, `x in C`;
- comparison: `x > 0`, `x != 0`;
- property: `A symmetric`, `A invertible`.

The workspace retains assumptions independently from objects so changes can propagate through dependencies.

### Persistence

The default workspace uses a versioned P2 record in IndexedDB. The semantic state can be migrated independently of the lower-level database wrapper in later phases.

### Operation applicability

P2 does not activate mathematical engines, but it can already reject structurally meaningless future actions. Example: determinant, inverse and eigenvalue actions are marked inapplicable for a non-square matrix.

---

## P3 workspace layer

P3 makes semantic state durable and user-manageable without changing the computation boundary.

```text
P1 source / AST
      ↓
P2 SemanticMathObject
      ↓
P3 workspace lifecycle
  ├─ durable named objects
  ├─ temporary scratch object
  ├─ dependencies / reverse dependencies
  ├─ rename + reference rewriting
  ├─ duplicate / pin / delete
  ├─ activity stream
  ├─ autosave / recovery
  └─ import / export
      ↓
future P4+ operations
```

### Durable versus scratch state

A named mathematical definition is durable. An anonymous expression or equation is held as current scratch work and is intentionally not appended to the persistent object collection. This prevents ordinary exploratory mathematics from turning the object sidebar into an activity log.

### Rename semantics

Renaming is an object operation, not a textual label edit. P3 rewrites references in dependent ASTs, serializes them back to canonical source, migrates object-scoped assumptions, and recomputes semantic objects. Name collisions and invalid identifiers are rejected before state mutation.

### Workspace schema

The workspace record is now version 3 and includes:

- semantic objects;
- assumptions;
- active object ID;
- pinned object IDs;
- bounded activity history;
- update timestamp.

P2 state is migrated automatically on first P3 load.

### Persistence and recovery

State writes are debounced at the React controller boundary. Before a new workspace snapshot is written, the previous persisted snapshot is retained under a recovery key. P3 therefore has a conservative one-step recovery path without introducing a full undo/redo architecture prematurely.

### Import/export boundary

Workspace exchange uses an explicit packet:

```text
format: mathlab-workspace
version: 1
workspace: MathWorkspaceState v3
```

Import rejects unknown JSON instead of attempting heuristic conversion. Future formats can add explicit migrations.

### Activity versus mathematical result history

P3 activity records workspace lifecycle events only. P4 keeps calculation results as current-session result state rather than overloading lifecycle activity; durable computation-result history can be added as a separate schema when the broader engine surface warrants it.

---

## P4 exact algebra layer

P4 activates the first real `MathEngine` implementation while preserving the P0 worker and engine abstraction.

```text
SemanticMathObject / scratch AST
        ↓
Context capability resolver
        ↓
MathOperationRequest
        ↓
MathWorkerClient
        ↓
Web Worker
        ↓
LocalMathEngine (P4)
        ↓
exact rational + polynomial algorithms
        ↓
MathResult
  ├─ result AST
  ├─ exactness
  ├─ assumptions
  ├─ warnings
  └─ derivation steps
        ↓
Answer / Steps UI
```

### Exact arithmetic

P4 uses a small internal `Rational` type backed by `bigint`. Arithmetic is normalized after every operation, so `1/3 + 1/6` is represented as `1/2` rather than being routed through floating point.

### Polynomial representation

Supported univariate polynomials are converted from the shared MathLab AST into a sparse `Map<degree, Rational>`. The same representation powers:

- expansion;
- coefficient collection;
- factorization;
- polynomial division;
- equation normalization;
- partial fractions.

The polynomial layer is intentionally independent of React and the worker protocol.

### Solver boundary

P4 equation solving is deliberately deterministic and narrow:

- one-variable linear equations;
- real quadratic equations;
- one-variable linear inequalities;
- exact linear systems.

Unsupported symbolic forms return an explicit engine error. There is no LLM or heuristic fallback.

### Domain safety

P4 avoids simplifications that silently enlarge an expression's domain. For example `x/x` is not reduced to `1` unless a later assumption-aware engine can prove `x != 0`. Division by zero is rejected.

### Relation syntax

The shared parser now supports `<`, `<=`, `>`, `>=`, `!=`, Unicode `≤`, `≥`, `≠`, and semicolon-separated relation systems. New AST variants are `comparison`, `system`, and `set`.

### Derivation records

P4 result steps carry both human-readable text and the exact before/after AST. This keeps future rendering, export, verification, and P13 proof/checking work independent from prose generation.

---

## P5 functions and calculus layer

P5 extends the same local `MathEngine` rather than adding a second calculus-specific execution path.

```text
Unary function / one-variable expression
        ↓
P5 capability resolver
        ↓
MathOperationRequest
  ├─ variable
  ├─ bounds / point / order options
  ├─ assumptions
  └─ workspace bindings
        ↓
Web Worker → LocalMathEngine (P5)
        ↓
calculus.ts
  ├─ verified differentiation rules
  ├─ bounded elementary antiderivatives
  ├─ definite-integral domain guard
  ├─ finite / infinity limit rules
  ├─ stationary/extrema analysis
  └─ polynomial interval-sign analysis
        ↓
MathResult
  ├─ primary result AST/display
  ├─ exactness / warnings / assumptions
  ├─ derivation steps
  └─ structured result sections
        ↓
Answer / Steps / P6 visualization
```

### Function parameters

A saved definition such as `f(x)=x^2+1` intentionally has `parameters=[x]` and no free `variables`. P5 therefore passes the unary function parameter explicitly as the calculus variable when executing operations.

### Calculus correctness boundary

P5 is rule-driven rather than heuristic. It emits only transformations covered by explicit local rules. Unsupported antiderivatives, unsafe global `abs` derivatives, general variable-to-variable powers and unproven limits return mathematical limitation errors.

### Definite-integral domain safety

Before applying the Fundamental Theorem, P5 checks supported denominator zeros, negative powers, even-denominator powers, logarithm/square-root real domains and affine tangent poles over numerically resolvable bounds. This prevents false finite answers for intervals that contain discontinuities such as `∫[-1,1] 1/x dx`.

### Structured analysis results

`MathResult.sections` is introduced in P5 for outputs that are not naturally a single AST. Function profiles, extrema classifications and interval behavior use structured facts. P6 consumes the same structured calculus model and shared AST directly for graph overlays rather than reparsing display strings.


---

## P6 visualization layer

P6 does not introduce a second parser or remote plotting service. A graphable object remains a normal `SemanticMathObject`; visualization resolves the same workspace bindings, evaluates the same AST numerically, and uses P4/P5 algebra/calculus utilities for exact annotations.

```text
SemanticMathObject (unary function / one-variable expression)
        ↓
P6 graph capability
        ↓
visualization.ts
  ├─ workspace-binding inlining
  ├─ deterministic numeric AST evaluator
  ├─ exact P4/P5 feature analysis (cached)
  ├─ real-domain/discontinuity segmentation
  ├─ numerical zero fallback (explicitly approximate)
  └─ viewport / fit / tick utilities
        ↓
GraphSeriesModel[]
  ├─ continuous polyline segments
  ├─ exact/numeric annotations
  ├─ warnings
  └─ source AST + variable
        ↓
GraphCanvas
  ├─ multiple series
  ├─ pan / zoom / trace
  ├─ overlay switches
  └─ SVG / PNG export
```

### Sampling correctness

P6 never uses a single unbroken SVG path for every sampled value. Known denominator zeros and removable holes are inserted as hard segment boundaries. Invalid real-domain samples (`ln`, `sqrt`, inverse trig, division by zero), non-finite values, and pole-like midpoint jumps also break a curve. This avoids the common graphing error of drawing a false vertical connector across a discontinuity.

### Exact versus numerical annotations

Exact zero annotations reuse the equation solver and, when necessary, the same factor-then-solve strategy used by P5. Stationary extrema reuse P5 derivative classification. Inflection candidates are obtained from the second derivative and verified by a sign change. Supported rational vertical/horizontal asymptotes and removable holes are derived algebraically. Sampling/bisection is only a fallback for additional zeros and is labeled `numeric`.

### Performance boundary

Exact feature analysis is cached by resolved AST + variable, so dragging or zooming resamples points without repeatedly recomputing symbolic derivatives and exact features. Sampling is bounded per series and the UI limits simultaneous visible series to six for legibility and predictable interaction cost.

### Visualization boundary

P6 is intentionally 2D and real-valued. It does not project multivariable functions into misleading pseudo-2D graphs, and it does not treat numerical sampling as proof. 3D surfaces, parametric/polar plotting, implicit curves, complex visualization, and numerical ODE solution plots remain future extensions.

---

## P7 exact linear algebra layer

P7 keeps vectors and matrices inside the shared AST and sends every operation through the same worker/engine contract used by P4 and P5.

```text
Vector / Matrix / linear-algebra expression
        ↓
Semantic shape inference
  ├─ saved object dimensions
  ├─ scalar × collection rules
  ├─ matrix-product compatibility
  └─ vector product semantics
        ↓
P7 capability resolver
        ↓
MathOperationRequest + workspace bindings
        ↓
Web Worker → LocalMathEngine
        ↓
linearAlgebra.ts
  ├─ exact rational value evaluator
  ├─ vector arithmetic / dot / norm
  ├─ matrix arithmetic / products / powers
  ├─ Gauss–Jordan RREF + row-operation trace
  ├─ rank / determinant / inverse
  ├─ augmented-system classification
  └─ row / column / null-space bases
        ↓
MathResult
  ├─ result AST
  ├─ verified row-operation steps
  └─ structured subspace/system sections
```

### Exact scalar boundary

P7 does not convert matrix entries to IEEE floating point. Every executable entry must reduce to an exact `Rational` after saved scalar/expression bindings are inlined. This makes pivot selection, zero testing, rank, determinant, and null-space construction deterministic.

### Vector representation

The P1 parser already represents `[1,2,3]` as a one-row `matrix` AST node. P7 preserves that representation for backward compatibility but applies abstract vector semantics at execution time. `A*v` is matrix-by-column-vector, `v*A` is row-vector-by-matrix, and `v*w` is a dot product.

### Row-reduction derivations

RREF, inverse, rank, augmented-system, and subspace workflows share one exact Gauss–Jordan implementation. Elementary row operations produce before/after matrix ASTs with deterministic rule IDs. This means P13 can later verify row-operation work without reconstructing operations from prose.

### Subspace model

P7 treats a matrix `A` as a linear map with columns as generating vectors. Pivot columns in RREF identify a basis of `Col(A)` using the corresponding original columns. Nonzero RREF rows form a basis of `Row(A)`. Free variables generate a basis of `N(A)`. Rank–nullity is reported structurally rather than inferred from display text.

### P7/P8 boundary

P7 deliberately stops before eigenstructure and inner-product-space algorithms beyond norm/dot product. Eigenvalues/eigenvectors, characteristic structure, diagonalization, Gram–Schmidt, projections, QR, least squares, symmetric/Hermitian workflows, and selected decompositions belong to P8.


## P8 — Advanced Linear Algebra architecture

P8 is implemented in `src/lib/math/advancedLinearAlgebra.ts` and is invoked through the existing local Worker engine. It does not introduce a second computation path.

### Exact scalar boundary

P7 row-reduction algorithms continue to operate over `Rational`. P8 adds a small `ComplexRational` layer for exact entries of the form `a + bi`, where `a,b ∈ Q`. This layer is used only where conjugation and inner products are necessary. Radical normalization is emitted as AST structure, not coerced into floating point.

### Orthogonal workflows

Matrices are interpreted column-wise for Gram–Schmidt and QR. P8 computes orthogonal vectors using exact inner products, stores squared norms rationally, and emits normalization factors with exact square-root ASTs. Complex inputs use the conjugate inner product.

### Least squares and projection

Projection onto `Col(A)` first reduces to an independent pivot-column basis. Full-column-rank least squares solves the exact normal equations `(AᵀA)x=Aᵀb`. Rank-deficient least-squares coefficient parameterization is deliberately deferred.

### Spectral workflows

Characteristic polynomials use the Faddeev–LeVerrier recurrence up to 6×6. Exact eigenvalue extraction is intentionally narrower: 1×1 and 2×2 are complete over algebraic square roots (including complex 2×2 spectra), while 3×3 requires an exact rational factor before reducing to a quadratic. Eigenspaces use the P7 null-space engine whenever the eigenvalue is rational.

### P8/P9 boundary

P8 stops before numerical spectral algorithms, Jordan/Schur/SVD machinery, and infinite-dimensional/analysis concepts. P9 owns sequences, series, rigorous convergence, continuity/differentiability analysis, and theorem-oriented real analysis workflows.

## P9 — Analysis architecture

P9 is implemented primarily in `src/lib/math/analysis.ts` and is invoked through the existing `LocalMathEngine`. It does not add a separate analysis calculator or bypass semantic objects.

### Sequence semantics

The P2 semantic layer already recognizes names such as `a_n` whose value depends on `n` as `sequence` objects. P9 activates that dormant object kind. The sequence index remains a semantic index rather than an unresolved external variable, so contextual actions can generate terms, limits, partial sums, and convergence profiles directly from the saved object.

### Theorem-aware result model

Analysis operations return structured `MathResultSection` data containing the theorem used, hypotheses/recognized form, conclusion, and warnings. A failed theorem match returns `unknown` rather than a heuristic truth value. This is essential groundwork for P13 verification/proof workflows.

### Limit strengthening

P5 remains responsible for baseline symbolic calculus limits. P9 wraps that engine with additional exact local reasoning: rational numerator/denominator zero multiplicities determine one-sided pole signs, and two-sided limits are accepted only when both sides agree. Removable factor cancellation remains scoped to the limit and never mutates the original domain.

### Rational discontinuity classification

For rational functions, P9 computes a polynomial GCD over exact rational coefficients. Roots of the common factor are removable holes; roots remaining in the reduced denominator are poles. Root display remains bounded by the exact degree-2 solver rather than silently switching to floating point.

### Convergence engine

Sequence and series analysis is rule-driven. Recognized families include geometric, p-series, alternating p-series, rational degree comparison, polynomial-times-geometric ratio behavior, and selected squeeze-theorem forms. The nth-term test is stored explicitly as a necessary condition so its false converse cannot leak into later features.

### Taylor/power-series boundary

Taylor polynomials are constructed from repeated exact P5 derivatives and rational-center evaluation. Infinite power-series profiles are a separate workflow and are emitted only for supported theorem families. This separation prevents a finite approximation from being mistaken for an identity theorem.

### P9/P10 boundary

P9 stops before probability models, random variables, inferential statistics, regression, and simulation. P10 owns those concerns while reusing the same structured exact/numeric result conventions.

## P10 — Probability & Statistics architecture

P10 is implemented primarily in `src/lib/math/probabilityStatistics.ts` and is invoked through the existing `LocalMathEngine`. It adds semantic `dataset`, `distribution`, and `probability` object kinds rather than separate calculator pages. Numeric vectors remain valid linear-algebra objects but also expose bounded statistical capabilities.

### Exact vs numerical boundary

Exact rational arithmetic is used for descriptive summaries, combinatorics, Bayes/conditional formulas, discrete Bernoulli/binomial/geometric probabilities, uniform probabilities, distribution moments, and simple-regression coefficients. Student-t tails/critical values, normal tails/quantiles, and seeded simulations are intentionally labeled approximate or heuristic.

### Distribution model

Distribution objects are constructor calls (`bernoulli`, `binomial`, `geometric`, `poisson`, `uniform`, `normal`) with validated parameters. Structured profiles expose support, expectation, variance, and standard deviation. Sampling-mean profiles distinguish exact normal closure from CLT approximation.

### Inference model

One-sample mean inference uses the Student-t distribution with deterministic numerical beta-function evaluation. Binary datasets additionally expose Wilson confidence intervals and a large-sample one-proportion z test with small-expected-count warnings. P10 reports p-values and assumptions; it does not transform a threshold into a scientific conclusion.

### Regression and simulation

An n×2 matrix is a paired dataset for simple least-squares regression. Exact rational slope/intercept and R² are retained, with Pearson r represented algebraically. Seeded simulation is reproducible but marked empirical and never used to overwrite exact probability results.

### P10/P11 boundary

P10 includes combinatorial counting only where it directly supports probability objects. General logic, set/relation algebra, graph theory, recurrences, and algorithm/data-structure analysis belong to P11.

## P11 — Discrete Math & Algorithms architecture

P11 is implemented primarily in `src/lib/math/discreteAlgorithms.ts` and is invoked through the existing `LocalMathEngine`. It adds semantic `proposition`, `finite-set`, `relation`, `graph`, `recurrence`, `complexity`, and `combinatorics` object kinds. Numeric vectors remain shared objects: P7 linear algebra and P10 statistics are preserved while P11 adds algorithm/data-structure capabilities contextually.

### Constructor syntax and parser boundary

P11 deliberately uses parser-compatible constructors instead of adding a second grammar. Logic uses `and/or/not/xor/implies/iff`; finite sets use `set(...)`; relations use `relation(n,pairs)`; graph families use `graph/digraph/wgraph/wdigraph`; recurrences use `linrec/linrec2`; asymptotic work uses `complexity/master`. This keeps all P11 input inside the existing AST, semantic-object, workspace-binding, Worker, and structured-result pipeline.

### Exact finite reasoning

Truth tables are exhaustive, finite-set operations compare normalized AST elements, relations use Boolean adjacency matrices, graph weights remain exact rationals, and recurrence terms/combinatorial counts use rational or BigInt arithmetic. P11 does not use random trials to infer a discrete theorem.

### Relation and graph algorithms

Relation transitive closure uses Warshall’s algorithm. Graph traversal order is deterministic because adjacency lists are processed in ascending vertex order. Unweighted shortest paths use BFS; weighted nonnegative paths use exact-rational Dijkstra. Topological sorting uses Kahn’s algorithm with deterministic tie-breaking. MST uses Kruskal with exact weight ordering and union-find cycle detection.

### Algorithm-trace model

Sorting/search workflows emit both structured result sections and verified deterministic trace steps. The trace describes the concrete execution, while asymptotic bounds are stated separately so an observed small comparison count is never confused with a complexity class.

### Complexity boundary

`complexity(f(n))` is a rule-based recognizer for common polynomial/logarithmic/exponential families. `master(a,b,k)` implements the basic polynomial Master theorem exactly. P11 intentionally does not pretend to be a general recurrence/complexity theorem prover.

### P11/P12 boundary

P11 owns exact finite/discrete structures and algorithm analysis. Floating-point error models, numerical root finding/interpolation/integration, iterative numerical linear algebra, and ODE numerical methods belong to P12.

## P12 — Numerical Math & ODEs architecture

P12 is implemented primarily in `src/lib/math/numerical.ts` and is invoked through the existing `LocalMathEngine`. It adds one semantic object kind, `ode`, for `ivp(rhs,x0,y0)` while reusing existing scalar, expression, function, and matrix objects for numerical workflows.

### Exact-to-numerical boundary

P12 never mutates the exact P4–P11 representation. Numerical operations create new `MathResult` values with `exactness: approximate`. Exact rational interpolation is an intentional exception: its Newton divided differences and polynomial remain exact because no floating-point approximation is required.

### Floating-point representation model

For an exact rational scalar, P12 converts to JavaScript binary64, decodes the actual sign/exponent/fraction bits, reconstructs the stored value as an exact rational, and compares that rational with the original exact input. This makes representation error auditable instead of merely displaying `Number(value)`.

### Root/differentiation/quadrature model

Bisection, Newton, and secant are bounded iterative workflows. Centered differences use Richardson refinement. Adaptive Simpson has evaluation/depth budgets; composite Simpson/trapezoid compare nested discretizations. Error estimates are explicitly scoped to the numerical method and assumptions rather than being presented as theorem-level guarantees.

### Numerical linear algebra model

Partial pivoting provides a bounded direct solve for augmented systems. Jacobi/Gauss–Seidel provide iterative convergence traces and a diagonal-dominance diagnostic. Square matrices expose an infinity-norm condition estimate computed from a pivoted numerical inverse. P7/P8 exact rational linear algebra remains the preferred exact path where applicable.

### ODE model

`ivp(rhs,x0,y0)` keeps `x` and `y` as intrinsic ODE variables inside the object. Euler, Heun, and classical RK4 use fixed steps, with a second solve at half the step size for endpoint error estimation. This creates a reusable ODE result architecture without introducing a separate ODE page or special parser grammar.

### P12/P13 boundary

P12 computes and reports numerical evidence and error diagnostics. Deciding whether a student's derivation, approximation argument, proof step, or claimed error bound is logically valid belongs to P13 Verify My Work & Proof Lab.


## P13 — Verify My Work & Proof Lab architecture

P13 is implemented primarily in `src/lib/math/proofLab.ts`, exposed both through contextual P13 capabilities and a dedicated `ProofLabPage`. It deliberately reuses the P1 parser, P2 assumptions, P4 exact algebra/solvers, P7 row-operation mathematics, P11 propositional structures, the Worker boundary, and structured `MathResult` sections instead of creating an independent checker.

### Verification-state model

Verification is four-valued: `verified`, `conditionally-valid`, `invalid`, and `not-proven`. `DerivationStep.verificationStatus` carries this distinction into the Steps UI. The existing boolean `verified` flag remains backward-compatible for P4–P12 generated derivations.

### Proof vs counterexample boundary

Exact certification comes only from supported deterministic reasoning: polynomial/rational identities on their common domain, exact solution-set comparisons, reversible polynomial equation factors, exact linear-system results, elementary row operations, and exhaustive propositional truth tables. Bounded numerical evaluation is permitted only to find counterexamples. Failure to find a counterexample never becomes proof.

### Domain/assumption model

Rational identities collect denominator restrictions and selected elementary-function domain conditions. If a transformation changes the written domain, P13 returns `conditionally-valid` with the missing condition. An explicit matching assumption can discharge that condition and upgrade the step to `verified` under the stated context.

### Chain and Proof Lab model

A proof chain is stored transiently as one mathematical line per step and checked pairwise. The aggregate status is invalid if any transition is invalid, otherwise not-proven if any transition is not proven, otherwise conditional if any transition is conditional, otherwise verified. Propositional entailment is a separate exhaustive finite workflow so implication is not confused with algebraic equivalence.

### P13/P14 boundary

P13 validates user-supplied work. Exercise generation, hints, mastery state, course organization, adaptive sequencing, and exam sessions belong to P14 Practice & Courses.

## P14 — Practice & Courses architecture

P14 is implemented primarily in `src/lib/math/practice.ts`, `src/lib/storage/practice.ts`, `PracticePage`, and `CourseReferencePage`. It is deliberately a learning layer over the existing mathematics rather than another computational engine. Mathematical answers are passed to the P13 verifier so grading rules do not diverge from Proof Lab.

### Curriculum/content model

`PracticeCourse → PracticeTopic → PracticeExercise` forms the course hierarchy. Exercises are either authored or deterministic generated instances. A generated ID is `gen:<template>:<seed>`; this makes the instance reproducible and allows a spaced-review record to reconstruct the original problem without persisting an entire question payload. Authored IDs use `auth:<id>`.

The initial curriculum spans eight tracks: algebra, calculus, linear algebra, analysis, probability/statistics, discrete mathematics, numerical mathematics/ODEs, and verification. Generated templates are intentionally limited to mathematical families that P4–P13 can verify reliably. Conceptual theorem/method questions use explicit finite choices instead of pretending a symbolic verifier is the correct grading tool.

### Answer-verification boundary

Math answers call `verifySingleTransition(expected, userAnswer)`. Only `verified` counts as correct. `conditionally-valid`, `invalid`, and `not-proven` remain distinct feedback outcomes. Multiple-choice items compare stable choice IDs exactly. P14 never upgrades sampled numerical agreement to correctness.

### Mastery and spaced-review model

Practice progress was introduced under the legacy IndexedDB record `practice:p14:default`; P15 migrates it into `practice:p15:default` while preserving the separation from mathematical workspace objects. Each exercise record stores attempts, correct count, streak, mastery [0,1], ease, interval, due timestamp, last rating, and a bounded recent-attempt history.

Ratings are deterministic: incorrect → Again; correct after solution reveal or multiple hints → Hard; correct after one hint → Good; clean repeated success can become Easy. Again returns after about ten minutes, while successful intervals grow according to ease. Adaptive review orders overdue work first, then lower-mastery/unseen material. This is a bounded educational scheduler, not a claim of an empirically optimal cognitive model.

### Exam model

Exam sessions select a deterministic shuffled subset of the chosen course. Hints, solution reveal, and per-question grading are unavailable until final submission. Submission grades the whole set, records attempts into mastery/review history, increments the exam counter, and then reveals expected answers and solutions.

### P14/P15 boundary

P14 completes product functionality. Full dependency-backed CI/build certification, cross-browser/accessibility testing, performance stress, PWA/offline hardening, persistence migration audits, security/privacy review, and release-candidate packaging belong to P15 Release Hardening.


## P15 — Release Hardening architecture

P15 freezes the mathematical feature surface and hardens cross-cutting product infrastructure. It does not add a new semantic object kind or bypass the established Input → AST → Semantic Object → Capability → Worker/Engine → Structured Result flow.

### Persistence migration and recovery

The release workspace key is `workspace:p15:default`; P3-era `workspace:p3:default` and P2 records remain migration sources. Practice moves from `practice:p14:default` to `practice:p15:default`. Both stores maintain a last-known-good recovery record. Loads prefer a valid primary record, then recovery, then legacy migration, and only then an empty state. Import packets are schema-checked, bounded to 5 MB, and confirmed before replacing the active workspace.

### Worker failure boundary

Main-thread Worker requests have a 30-second safety timeout and an explicit Worker error listener. A crash or timeout terminates the Worker instance so a later request starts from a clean Worker rather than leaving a permanently unresolved operation. Mathematical correctness remains owned by the existing deterministic engine.

### PWA/cache boundary

The v1 service worker caches only same-origin GET responses. Navigation is network-first with cached document/index fallback; non-navigation assets use cached-first behavior with background refresh. Only successful `basic` responses are stored. Cache names are versioned and previous MathLab caches are removed during activation.

### Application resilience and accessibility

The root React tree is protected by an error boundary. The UI exposes connectivity state without implying cloud dependence, includes a keyboard skip link, restores/traps focus in the command palette, marks current navigation with `aria-current`, updates route titles, strengthens muted-text contrast, and increases mobile action targets. P15 removes inert release controls and development-phase language from ordinary product surfaces.

### Release-certification boundary

`npm run audit:release` is intentionally dependency-free and verifies required PWA, persistence, Worker, packaging, and safety invariants. It complements rather than replaces Vitest/Vite. Promotion from `1.0.0-rc.2` to final `1.0.0` remains gated on real dependency-backed tests/builds and browser/device QA. See `docs/RELEASE_CERTIFICATION.md`.
