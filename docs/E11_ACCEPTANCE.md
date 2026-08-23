# E11 Acceptance — Proof System II & Upper-Division Reasoning

E11 extends the P13 verification foundation into a bounded theorem-application system. It does **not** add a free-form proof generator and it does not treat plausible prose, numerical sampling, or pattern resemblance as proof.

## Architecture

E11 remains cumulative:

```text
Input / Workspace object / Proof Lab form
  → AST / Semantic Object
  → E11 capability or Proof Lab mode
  → MathOperationRequest
  → production Worker
  → E11MathEngine → E10MathEngine → earlier engines
  → structured MathResult / derivation steps / theorem obligations
```

The production Worker instantiates `E11MathEngine`. Unsupported E11 operations fall through to E10 and the earlier cumulative engine chain.

The E11 proof core is intentionally separated into:

- `e11ProofLogic.ts` — theorem registry, equality-lemma rewriting, inequality consequences, finite quantifiers;
- `e11Induction.ts` — recurrence-backed ordinary induction;
- `e11UpperDivision.ts` — analysis, linear-algebra and finite-group theorem certificates.

## Checker-backed theorem registry

E11 ships a registry containing only theorem/rule entries with deterministic checkers:

1. substitution of equals;
2. order preservation under positive scaling;
3. finite-domain quantifier semantics;
4. ordinary induction for a recursively defined sequence;
5. differentiability implies continuity at a point;
6. rank–nullity;
7. bounded invertible-matrix equivalences;
8. finite-dimensional Hermitian spectral theorem;
9. Lagrange's theorem for finite groups.

The registry is discoverability metadata, not a natural-language theorem matcher. A theorem name or similar-looking statement never constitutes a certificate by itself.

## Equality-lemma application

Operation: `lemma-rewrite`

Accepted baseline:

- lemma must be an explicit equation `A = B`;
- forward or reverse substitution;
- first exact occurrence or all exact occurrences;
- exact mathematical subtree replacement;
- proposed target must be exactly the result of the certified rewrite after deterministic simplification;
- an additional hidden algebraic step causes refusal rather than being silently bundled into the theorem application.

The result includes a verified derivation step and the exact lemma/direction/occurrence count.

## One-way inequality consequences

Operation: `inequality-consequence`

Accepted baseline:

- `<`, `<=`, `>`, `>=`;
- at most one independent variable;
- rational-polynomial order differences;
- target difference must be a positive rational multiple of the source difference;
- strict order may be weakened to the corresponding non-strict order;
- non-strict order may not be upgraded to strict order;
- negative scaling is not certified by this operation.

This is an implication checker, not merely an equivalence checker. It deliberately implements a narrow exact order theorem rather than a general nonlinear inequality prover.

## Finite quantified proof obligations

Operation: `finite-quantifier-proof`

Accepted baseline:

- `∀` and `∃` over explicit finite-set objects;
- one quantifier or two nested quantifiers;
- distinct bound variables for nested quantifiers;
- exact arithmetic equations/comparisons;
- Boolean `not`, `and`, `or`, `xor`, `implies`, `iff`;
- exhaustive evaluation of every assignment required by the represented quantifier semantics;
- witnesses/counterexamples or decisive assignments are returned when applicable.

Bounds:

- each represented finite domain: at most 256 elements;
- nested assignment product: at most 4096 assignments.

A finite certificate is never generalized to an infinite domain.

## Ordinary induction certificate

Operation: `induction-certificate`

E11 supports a deliberately bounded but genuine induction workflow for recursively defined sequence/function claims such as:

```text
S(n) = n(n+1)/2
```

with a represented base fact and recurrence premise such as:

```text
S(1) = 1
S(k+1) = S(k) + (k+1)
```

The checker separately discharges:

1. the base equality;
2. the induction-hypothesis representation at arbitrary `k`;
3. compatibility of the recurrence left side with the successor term;
4. occurrence of the recursive `S(k)` term in the recurrence;
5. substitution of the induction hypothesis into that recursive term;
6. the exact successor algebra obligation using the existing P13 deterministic verifier.

The conclusion is explicitly conditional on the represented recurrence premise/definition plus the verified base fact. The recurrence itself is not fabricated or inferred from examples.

MathLab's parser can represent a natural right-side sequence reference such as `S(k)` as implicit multiplication when `S` is not a globally registered built-in function. E11 accepts that parser-preserved **implicit** representation for the same sequence symbol; explicit multiplication `S*k` is not reinterpreted as a sequence call.

## Analysis theorem certificate

Operation: `analysis-theorem-certificate`

E11 baseline theorem:

> differentiability at a point implies continuity at that point.

The existing deterministic real-analysis engine must first establish differentiability at the configured point. If that prerequisite is not discharged, E11 returns `THEOREM PREREQUISITE NOT DISCHARGED` and does **not** assert continuity from the theorem.

This distinction is important: failure to establish a prerequisite is neither a proof of the conclusion nor a proof of its negation.

## Linear-algebra theorem certificates

Operation: `linear-algebra-theorem-certificate`

### Rank–nullity

For exact rational matrices, E11 computes exact rank/nullity using the existing linear-algebra engine and certifies:

```text
rank(A) + nullity(A) = number of columns of A.
```

### Bounded invertible-matrix theorem

For square exact rational matrices, E11 cross-checks the supported equivalences:

- `det(A) ≠ 0`;
- `rank(A) = n`;
- `nullity(A) = 0`.

It returns a consistency-checked invertible/singular certificate.

### Hermitian spectral theorem

E11 first certifies the exact Hermitian prerequisite `A* = A`. Only then does it attach the theorem conclusions that the finite-dimensional complex matrix has real spectrum and is unitarily diagonalizable.

If the represented matrix is not Hermitian, no spectral-theorem conclusion is asserted.

## Finite-group theorem certificate

Operation: `finite-group-theorem-certificate`

E11 baseline abstract-algebra theorem is Lagrange's theorem.

The E10 finite-group engine must certify both:

- the Cayley table defines a finite group;
- the configured subset is a subgroup.

Only then does E11 certify `|H| divides |G|` and report the exact index `|G|/|H|`.

A non-subgroup receives a prerequisite-not-discharged result, not a false theorem conclusion.

## Product integration

E11 is integrated into:

- cumulative capability routing;
- Workspace advanced operation controls;
- production Worker execution;
- global Tools catalog;
- global `Ctrl+K` discovery;
- Proof Lab.

Proof Lab retains all existing P13 transition/chain/entailment modes and adds E11 modes for:

- recurrence-backed induction;
- finite quantified proofs;
- equality-lemma application;
- theorem-registry inspection.

Proof Lab and Workspace use the same E11 Worker/checker implementation.

## Exactness policy

The accepted E11 baseline is deterministic and exact inside its stated mathematical domains.

E11 never upgrades these to proof:

- sampled numerical evidence;
- approximate equality;
- counterexample searches that found no counterexample;
- theorem-name/text similarity;
- natural-language explanations without a checker;
- an unmet theorem prerequisite;
- a hidden rewrite step not represented in the certified transition.

Natural-language explanations may accompany a certificate but never replace it.

## Explicit non-goals

E11 does not claim:

- a general infinite-domain first-order theorem prover;
- SAT/SMT solving;
- a proof-assistant kernel or dependent type theory;
- acceptance/formalization of arbitrary prose proofs;
- theorem discovery from language similarity;
- unrestricted rewrite systems or Knuth–Bendix completion;
- general nonlinear inequality implication;
- quantifier elimination over infinite fields/orders;
- strong induction;
- structural induction;
- well-founded or transfinite induction;
- arbitrary predicate-induction synthesis;
- epsilon–delta proof synthesis;
- arbitrary topology/abstract-algebra theorem proving;
- arbitrary spectral-theorem construction outside the supported prerequisite checker;
- proof by numerical sampling;
- proof from the absence of a bounded counterexample.

These boundaries are intentional. E11 is a deterministic theorem-application and proof-obligation layer, not a claim that MathLab has become a general-purpose formal proof assistant.

## Regression gate

E11 acceptance requires the full repository gate:

- P15 release audit;
- all Vitest regression files including E11 core/boundary suites;
- strict TypeScript;
- Vite production build.

Roadmap promotion occurs only after production code passes that gate, followed by one final exact-head CI run including documentation/roadmap changes.
