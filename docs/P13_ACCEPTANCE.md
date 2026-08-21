# P13 Acceptance — Verify My Work & Proof Lab

P13 is accepted when MathLab can validate bounded student work without confusing numerical evidence with proof, while preserving P0–P12 behavior.

## Verification states

Every checked transition must resolve to exactly one of:

- **verified** — a supported deterministic proof establishes the step;
- **conditionally valid** — the algebraic step is reversible only if an explicit condition is carried;
- **invalid** — exact reasoning or a concrete counterexample disproves equivalence;
- **not proven** — the current verifier cannot certify or refute the step.

A failed counterexample search must never be upgraded to `verified`.

## Required workflows

### Single-step verification

- compare two parsed mathematical lines;
- certify supported polynomial/rational identities;
- validate one-variable polynomial equation transformations;
- validate supported linear inequalities by exact solution-set equality;
- validate supported linear-system equivalence;
- certify elementary rational row operations;
- certify propositional equivalence exhaustively through six variables;
- report theorem/rule references and required conditions.

### Domain and assumption preservation

- detect rational denominator restrictions;
- flag cancellation such as `x/x -> 1` as conditional unless `x != 0` is carried;
- retain elementary `sqrt`, `ln`, and `log` domain conditions in diagnostics;
- allow explicit assumptions to discharge supported required conditions.

### Counterexamples

- bounded numerical evaluation may produce a concrete counterexample for one-variable real expressions/equations/inequalities;
- counterexample search is disproof-only;
- no matching sample set may certify correctness.

### Chain verification

- accept one mathematical line per step;
- check every adjacent transition independently;
- aggregate the chain status deterministically;
- cap a run at 40 mathematical lines;
- carry the same explicit assumptions through the chain.

### Proof Lab

A dedicated Proof Lab route must provide:

- one-step checker;
- chain checker;
- propositional entailment checker;
- visible state key for verified/conditional/invalid/not-proven;
- structured Answer and Steps result rendering.

### Propositional entailment

- accept premises and a conclusion;
- exhaustively evaluate all truth assignments through six variables;
- certify entailment only when no assignment makes all premises true and the conclusion false;
- return a concrete truth assignment when entailment fails.

### Equation solution checking

Equation objects expose a contextual candidate-solution check using the exact deterministic solution set where P4 solving applies.

## Explicit boundaries

P13 does not claim:

- general automated theorem proving;
- arbitrary multivariate algebraic-geometry equivalence;
- unrestricted transcendental identity proving;
- arbitrary epsilon-delta proof checking;
- arbitrary natural-language proof understanding;
- Lean/Coq/Isabelle-level formalization;
- probabilistic testing as proof;
- general proof synthesis.

Unsupported work must return `not proven` or a precise boundary error rather than a fabricated certificate.
