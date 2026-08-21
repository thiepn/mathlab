# P14 Acceptance — Practice & Courses

P14 is accepted when MathLab provides a persistent learning workflow that reuses the certified P4–P13 mathematics instead of maintaining a second answer engine.

## Product requirements

- The Practice route is a functioning product page, not a placeholder.
- Courses are organized into named topics with explicit phase coverage.
- The starter curriculum spans algebra, calculus, linear algebra, analysis, probability/statistics, discrete mathematics, numerical methods/ODEs, and verification.
- Both authored exercises and deterministic generated templates are available.
- Every generated exercise has a stable template+seed identity and can be reconstructed later from that ID.
- Exercises expose an explicit 1–5 difficulty level.
- Mathematical responses are checked by the P13 deterministic verifier.
- Conceptual finite-choice questions use exact choice IDs rather than fuzzy text matching.
- A conditionally-valid mathematical answer is not silently counted as fully correct.
- Hints are layered and revealed incrementally.
- Full solutions can be revealed explicitly.
- Hint use and pre-check solution reveal affect the review rating.
- Per-exercise attempts, correctness, streak, mastery, ease, interval and due date persist locally.
- Adaptive review prioritizes overdue items and then low-mastery/unseen material.
- Incorrect work returns on a short retry interval; successful work receives expanding intervals.
- Course practice is biased toward lower-mastery material while still generating fresh variants.
- Exam sessions disable hints, solutions and per-question grading until final submission.
- Exam submission records all attempts and exposes a final score plus per-question expected answer/solution.
- Progress UI reports overall mastery, accuracy, practice sessions, exams and per-course progress.
- Resetting practice progress does not reset the mathematical workspace.
- The Reference route exposes the curriculum/topic map rather than remaining a P14 placeholder.
- Mobile navigation accounts for all five primary routes.

## Determinism and correctness boundaries

- Generated content may vary by seed, but the same seed must reproduce the same prompt and expected answer.
- Generated templates must remain inside mathematical domains already supported by P4–P13.
- Numerical sampling is never used to certify a mathematical practice answer.
- P13 `verified` is the only positive mathematical grading state; `conditionally-valid`, `invalid`, and `not-proven` remain distinct.
- Review scheduling is an educational heuristic and must not be described as mathematically optimal or clinically validated.

## Persistence

Practice state uses the shared IndexedDB database through a dedicated `practice:p14:default` record. The state version is independent of `MathWorkspaceState` so future P15 persistence migrations can audit them separately.

## Tests

The P14 suite must cover:

- curriculum structure;
- seeded exercise determinism and reconstruction;
- exact mathematical grading through P13;
- exact choice grading;
- mastery/interval changes;
- overdue-first adaptive review;
- bounded course/exam session construction;
- progress/session counters.

## Deferred to P15

P14 does not certify the final release. Real npm dependency-backed Vitest/Vite runs, browser/device accessibility certification, PWA/offline stress, database migration stress, performance/load audits, security/privacy review, visual consistency freeze, and final release-candidate packaging remain P15 responsibilities.
