# P8 Acceptance — Advanced Linear Algebra

P8 extends the exact P7 matrix foundation without bypassing the shared parser, semantic object model, capability system, Worker pipeline, or `MathResult` derivation architecture.

## Required workflows

### Inner-product spaces

- transpose and conjugate transpose;
- real/complex-rational inner products;
- Gram matrix construction;
- orthogonal, orthonormal, orthogonal-matrix, and unitary classification;
- exact vector projection;
- projection onto `Col(A)` using an independent pivot-column basis.

### Gram–Schmidt and QR

For a matrix whose columns are input vectors:

- left-to-right Gram–Schmidt produces an exact orthogonal basis;
- dependent columns are reported and omitted rather than divided by zero;
- normalization preserves square roots symbolically;
- complex inputs use conjugate inner products;
- reduced QR requires rows ≥ columns and independent columns;
- Q and R are returned as structured AST matrices with `A = QR` metadata.

### Least squares

For real rational `A` with full column rank and target `b`, P8 returns exactly:

- the unique minimizer `x_hat`;
- fitted vector `A x_hat`;
- residual `b - A x_hat`;
- exact residual norm.

Rank-deficient coefficient parameterization is outside P8.

### Eigenstructure

- characteristic polynomial: exact up to 6×6 via Faddeev–LeVerrier;
- eigenvalues: exact 1×1/2×2, including non-real 2×2 spectra;
- cubic extraction: exact when a bounded rational root is found, then quadratic reduction;
- rational eigenspaces: exact null-space bases from `A - lambda I`;
- 2×2 irrational eigenvectors: deterministic symbolic vector formula;
- diagonalization: exact when a complete eigenbasis can be constructed safely.

P8 does not present unresolved higher-degree spectra as numerical facts.

### Structural matrix analysis

P8 identifies exactly, for rational/complex-rational square matrices:

- real symmetric;
- Hermitian;
- skew-Hermitian;
- normal.

A Hermitian result explicitly surfaces the spectral-theorem consequence without pretending that every corresponding eigendecomposition has been computed.

## Correctness boundaries

- General symbolic-entry matrices are not a complete symbolic linear-algebra CAS.
- Numerical eigensolvers, SVD, Schur, and Jordan canonical form are deferred.
- Characteristic polynomial size is limited to 6×6.
- Exact eigenvalue extraction is bounded to degree ≤3 under the documented factoring conditions.
- Least squares currently requires full column rank.
- P7 exact row operations remain rational; complex-rational support is introduced only for P8 inner-product/adjoint workflows.

## Regression requirement

P4 algebra, P5 calculus, P6 visualization architecture, and P7 exact matrix behavior must remain valid. P8 adds regression coverage for projection, complex inner products, Hermitian detection, Gram–Schmidt, QR, least squares, characteristic polynomials, complex quadratic spectra, eigenspaces, diagonalization, and cubic rational-root extraction.

## Validation performed for v0.8.0-p8

- strict TypeScript validation of `src/lib/math` and Worker protocol: **PASS**;
- full source-tree TS/TSX structural validation with temporary dependency declarations: **PASS**;
- dependency-free P4–P8 runtime regression: **PASS**;
- saved real and complex-rational matrix-expression materialization: **PASS**;
- P8 capability routing for real vs complex matrices: **PASS**;
- projection / Gram matrix / Gram–Schmidt / QR / least squares: **PASS**;
- characteristic polynomial / real and complex 2×2 spectra / rational cubic extraction: **PASS**;
- eigenspace / diagonalization / Hermitian-normal classification: **PASS**.

The genuine npm/Vite/Vitest build was not available in the execution environment because dependency installation did not complete before the network timeout. No partial `node_modules` or generated lockfile is retained in the package.
