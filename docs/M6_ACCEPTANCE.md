# M6 — Practice / Proof / Reference Reconstruction

## Scope

M6 reconstructs the three learning-oriented product surfaces while preserving the existing P13/P14 engines and storage model.

## Practice acceptance

- Course selection is a navigable workbench rather than a grid of equal cards.
- Course mastery, accuracy, seen count and due count remain visible.
- Topic descriptions and authored/generated inventory are visible before a session starts.
- Course practice, adaptive review and exam generation continue to use the existing deterministic P14 engine.
- Exercise sessions provide a clear current-question hierarchy, question rail, rendered mathematics, hints, solutions and grading state.
- Exam mode continues to hide hints, solutions and correctness until final submission.
- Exam results compare submitted and expected answers and expose worked solutions.
- Practice progress remains independently persisted and resettable.
- Mobile layouts keep questions, choices and session navigation readable without horizontal page scrolling.

## Proof Lab acceptance

- One-step, derivation-chain and propositional-entailment modes remain available.
- Before/after mathematics, assumptions, derivation lines, premises and conclusion render as mathematics while source remains editable.
- The interface visibly distinguishes VERIFIED, CONDITIONAL, INVALID and NOT PROVEN outcomes.
- The presentation never upgrades bounded sampling to proof.
- Exact rule results, warnings, steps and structured sections continue to come from the existing P13 worker operations.
- Counterexample and assumption information remains visible through the result pipeline.

## Reference acceptance

- Reference is no longer only a dump of P14 course metadata.
- Users can browse all implemented capabilities or scope the reference to one course track.
- The page uses the M4 `TOOL_CATALOG` as the capability source of truth.
- Tool entries expose label, phase, compatible object kind, description and a rendered example.
- Search matches tools, aliases, descriptions, phases, examples and course-topic text.
- Course scopes expose their P14 topic descriptions and exercise inventory.
- Reference clearly states that it documents implemented deterministic capabilities only.

## Regression boundary

M6 does not add new symbolic/numerical mathematics. P4–P13 engines, P14 exercise generation/grading, IndexedDB practice persistence, worker execution, graphing and workspace semantics remain unchanged.

## Release gate

Before merge:

1. `npm run audit:release`
2. `npm install --no-package-lock`
3. `npm run test`
4. `npm run build`

The M6 regression tests must pass together with the full existing suite.
