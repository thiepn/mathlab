# P2 Acceptance — Mathematical Object & Assumption System

Status: **implemented**

## Scope

P2 adds a semantic layer between the P1 AST and every future computation engine. Raw text is no longer sufficient to represent a MathLab workspace object.

## Accepted requirements

- [x] Explicit `:=` definition syntax.
- [x] `=` remains available for ordinary mathematical equations.
- [x] Natural function definitions (`f(x)=...`) remain supported.
- [x] Natural matrix/vector definitions (`A=[[...]]`) remain supported.
- [x] Named scalar definitions via `:=`.
- [x] Sequence recognition for forms such as `a_n := 1/n`.
- [x] Persistent semantic object identity.
- [x] Object kind and structural shape.
- [x] Domain inference with real ambient domains for standard vector/matrix/function work.
- [x] Complex-domain propagation.
- [x] Representation exactness field.
- [x] Function parameter extraction.
- [x] Free-variable extraction.
- [x] Dependency resolution against the workspace symbol table.
- [x] Alias shape/kind preservation (`B := A`).
- [x] Recursive-definition rejection.
- [x] Redefinition updates an existing named object instead of duplicating it.
- [x] Assumption parsing for domain, comparison and selected structural properties.
- [x] Assumptions attached to the mathematical subjects they constrain.
- [x] Domain-conflict diagnostics.
- [x] Assumption changes trigger semantic object recomputation.
- [x] Object removal triggers dependency recomputation.
- [x] Versioned IndexedDB P2 workspace state.
- [x] Context panel consumes semantic objects rather than P1 syntax classification alone.
- [x] Future actions are filtered for basic semantic applicability (for example determinant/eigenvalues require square matrices).
- [x] Mobile-safe assumption and semantic metadata UI.

## Validation performed in this environment

- P2 math/storage/worker TypeScript sources pass strict TypeScript compilation with unused-symbol checks enabled.
- Deterministic runtime assertions pass for definitions, equations, functions, matrices, aliases, sequences, recursion rejection and assumption propagation.
- P1 parser regression coverage is retained and extended with explicit-definition syntax.
- Dedicated Vitest suites were added for semantics and assumptions.

A complete Vite/Vitest package run is not available in this execution environment because npm packages are not cached and external package installation is restricted. No partial `node_modules` directory is included in the deliverable.

## Explicitly deferred

P2 does **not** perform:

- algebraic simplification;
- equation solving;
- differentiation/integration;
- determinant/rank/inverse computation;
- numeric approximation;
- formal proof checking.

The P0 math engine remains deliberately non-computing.

## Exit condition

P2 is complete when future layers can consume a persisted semantic object and know, without reparsing loose UI text:

1. its identity/name;
2. mathematical kind;
3. structural shape;
4. ambient domain;
5. parameters/free variables;
6. dependencies;
7. applicable assumptions;
8. which operations are structurally meaningful.

This condition is met.
