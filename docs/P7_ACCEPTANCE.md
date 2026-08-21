# P7 Acceptance — Linear Algebra Foundation

P7 extends the existing MathLab semantic-object and local-worker engine with exact finite-dimensional linear algebra. It does not create a separate matrix calculator or bypass P0–P6.

## Product requirements

- Preserve `[a,b,c]` as vector syntax and `[[a,b],[c,d]]` as matrix syntax.
- Let saved vectors/matrices participate in later expressions through workspace bindings.
- Infer vector/matrix result shapes for compatible expressions such as `A*B`, `A*v`, `v*A`, `2*A`, and `A+B`.
- Evaluate vector/matrix arithmetic exactly over rational entries.
- Support scalar multiplication/division, vector addition/subtraction, matrix addition/subtraction, vector dot products, matrix products, matrix-vector products, and integer powers of square matrices.
- Compute exact Euclidean vector norms when their squared norm is rational; simplify radicals using the existing P4 radical machinery.
- Compute exact RREF with explicit elementary-row-operation derivations.
- Compute rank and pivot columns from RREF.
- Compute determinants exactly and track determinant sign changes from row swaps.
- Compute exact inverses by Gauss–Jordan reduction of `[A | I]`; reject singular/non-square matrices.
- Treat a matrix with its final column as the right-hand side as an augmented linear system and distinguish unique, inconsistent, and underdetermined cases.
- For underdetermined augmented systems, return a particular solution plus exact null-space directions instead of pretending the solution is unique.
- Compute foundational column-space, row-space, and null-space bases.
- Report rank–nullity and column independence in a reusable linear-algebra profile.
- Keep eigenvalues/eigenvectors, Gram–Schmidt, projections, QR, least squares, orthogonality, and spectral/decomposition workflows locked to P8.

## Correctness boundaries

P7 is exact and deterministic. Matrix/vector entries must reduce to rational values after workspace scalar/expression bindings are resolved. Symbolic-entry matrices such as `[[x,1],[0,x]]` are valid mathematical objects, but P7 does not claim general symbolic determinant/RREF/inverse support yet.

The exact row-reduction engine is bounded to matrices up to 20×30; determinant is bounded to 20×20; integer matrix powers are bounded to `|n| <= 64`. These limits prevent pathological derivation size and worker stalls.

Vectors are stored in the shared AST as one-row matrix nodes, but P7 gives them abstract vector semantics:

- `v*w` is the Euclidean dot product when lengths agree;
- `A*v` treats `v` as a column vector;
- `v*A` treats `v` as a row vector.

This avoids introducing orientation-only AST variants before P8 while keeping multiplication rules explicit.

## Acceptance examples

```text
A = [[1,2],[3,4]]
B = [[2,0],[1,2]]
A*B  -> [[4,4],[10,8]]
```

```text
[3,4] -> norm -> 5
[1,2,3] dot [4,5,6] -> 32
```

```text
rref([[1,2,3],[2,4,6]])
-> [[1,2,3],[0,0,0]]
rank = 1
```

```text
det([[1,2],[3,4]]) = -2
inverse([[1,2],[3,4]]) = [[-2,1],[3/2,-1/2]]
```

For augmented matrix

```text
[[1,1,3],[1,-1,1]]
```

P7 returns `x_1=2; x_2=1`.

For

```text
[[1,1,2],[2,2,4]]
```

P7 reports infinitely many solutions, a particular solution, and a null-space basis direction.

For

```text
[[1,2],[2,4]]
```

P7 reports:

- rank `1`;
- column-space basis `{[1,2]}`;
- row-space basis `{[1,2]}`;
- null-space basis `{[-2,1]}`;
- nullity `1`.

## Regression requirements

P0–P6 parser, semantic, workspace, algebra, calculus, and visualization behavior must remain intact. P7 adds a dedicated linear-algebra regression suite covering semantic shape inference, exact arithmetic, row reduction, rank, determinant, inverse, augmented systems, subspaces, matrix powers, and dimension errors.

## Validation targets

- strict TypeScript check of the mathematical/worker core;
- full-source structural TS/TSX check;
- dependency-free P4–P7 runtime regression harness;
- P7 capability routing regression;
- no partial `node_modules` or lockfile when package installation is unavailable.

## Validation status in this build

- strict TypeScript check of the complete mathematical/worker core: **PASS**;
- structural TypeScript/TSX check of the complete source tree using temporary local React/Vite/Vitest declarations: **PASS**;
- dependency-free P4–P7 runtime regression harness: **PASS**;
- P7 semantic-shape and capability-routing regression: **PASS**;
- exact determinant/inverse/RREF/rank/vector/subspace/augmented-system regression: **PASS**;
- genuine `npm install` / Vite / Vitest execution: **not available in this runtime** because the npm registry could not be resolved (`EAI_AGAIN`); an offline install also confirmed the required packages are not cached;
- no incomplete `node_modules` or generated lockfile is included in the package.
