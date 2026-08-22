# E5 Acceptance — Numerical Linear Algebra & Optimization

E5 extends the existing MathLab matrix, vector, expression and multivariable-function objects. It does **not** introduce a second numerical-matrix or optimization-object language.

## Accepted architecture

E5 preserves the cumulative computation flow:

```text
Input → AST → Semantic Object → Capability → MathOperationRequest
      → E5MathEngine → structured MathResult → Workspace / Tools
```

`E5MathEngine` extends E4 and is the production Worker engine. Earlier P/E operations remain routed through their existing engines.

## Numerical linear algebra accepted scope

### Pivoted LU

For resolved real square matrices through the E5 matrix-size bound:

- partial row pivoting;
- `P`, `L`, `U` output;
- row-swap count;
- smallest-pivot diagnostic;
- `||PA-LU||_F` reconstruction residual.

The factorization is **approximate** binary64 output.

### Cholesky

For numerically real-symmetric positive-definite matrices:

- lower-triangular `L`;
- numerical positive-definiteness failure when a diagonal update is nonpositive to working tolerance;
- `||A-LLᵀ||_F` residual.

A successful numerical Cholesky run is a numerical diagnostic, not an exact symbolic proof of positive definiteness.

### Numerical QR

Householder reflections provide:

- `Q` and `R`;
- `||A-QR||_F`;
- `||QᵀQ-I||_F`.

### Numerical eigenanalysis

E5 deliberately certifies only the **real symmetric** case:

- Jacobi rotations;
- real eigenvalues;
- orthonormal eigenvector matrix;
- eigenpair residuals;
- convergence/off-diagonal diagnostics.

General nonsymmetric eigenvalue/Schur workflows are outside E5.

### SVD, pseudoinverse, rank and spectral conditioning

E5 provides a bounded dense baseline based on the symmetric eigendecomposition of `AᵀA`:

- singular values;
- economy-column `U` representation and `V`;
- reconstruction residual;
- explicit tolerance-aware numerical rank;
- Moore–Penrose pseudoinverse at the selected singular-value threshold;
- `κ₂` diagnostics from retained singular values.

This is **not** claimed to match a bidiagonal/LAPACK-quality SVD on severely ill-conditioned problems. Squaring the condition number through `AᵀA` can reduce relative accuracy for tiny singular values; MathLab states this explicitly.

### Conjugate gradient

For an `n×(n+1)` augmented matrix `[A|b]` where `A` is numerically symmetric positive definite:

- zero starting vector;
- residual-driven stopping;
- iteration cap;
- bounded convergence trace;
- final `||Ax-b||₂`.

It does not claim CG for indefinite/nonsymmetric systems.

## Nonlinear systems

For square vector-valued functions of 2–6 variables:

```text
F(x1,…,xn) := [f1,…,fn]
```

E5 provides:

- user-selected starting point;
- centered finite-difference Jacobian;
- multivariate Newton step;
- damping/backtracking when a full step increases the residual;
- residual and iteration diagnostics.

The result is **local and approximate**. Convergence may depend on the starting point, and singular/ill-conditioned Jacobians may prevent completion.

## Unconstrained optimization

For scalar functions of 2–6 real variables, E5 supports local minimization by:

- gradient descent;
- Newton direction with descent fallback;
- BFGS;
- numerical centered gradients/Hessians;
- backtracking line search;
- gradient/stagnation stopping criteria;
- bounded convergence trace;
- local Hessian-curvature diagnostic at the reached point.

No nonconvex run is presented as a guaranteed global optimum.

## Equality-constrained optimization

For one scalar equality constraint `g(x)=0` and 2–5 variables:

- quadratic penalty stages;
- BFGS minimization of each penalized objective;
- increasing penalty parameter;
- explicit constraint-residual reporting.

This is a **local approximate penalty method**, not a general KKT solver or constrained-global optimizer.

## Convexity diagnostics

E5 reuses E1's symbolic Hessian.

- If Hessian entries still depend on the variables and no point is supplied, MathLab refuses to infer global convexity from sampling.
- With a supplied point, it reports only local curvature.
- A constant Hessian permits a global *numerical* curvature classification, but the eigenvalue-sign test is floating and therefore the exposed classification remains **approximate**, not an exact proof certificate.

## Bounded 2D linear programming

Rows of an `m×3` matrix encode

```text
[a,b,c]  ↔  ax + by ≤ c
```

with `x≥0`, `y≥0` implicit. The accepted workflow additionally requires explicit finite upper bounds `x≤M` and `y≤N` among the rows. E5 then:

- enumerates line intersections;
- filters feasible vertices;
- evaluates a user-supplied linear objective `[c1,c2]`;
- supports minimization or maximization.

Within the explicitly represented bounded polygon, the finite-vertex theorem permits a **global optimum claim for the represented LP**. Coordinates/objective values remain binary64 approximations.

## Size / representation bounds

- real resolved dense matrices only;
- matrix workflows bounded to 12 rows/columns (augmented workflows may have the additional RHS column);
- nonlinear/optimization variable dimensions are explicitly bounded as above;
- tolerances are restricted to a sane finite range;
- iteration counts are bounded.

## Explicit non-goals

E5 does **not** claim:

- sparse matrix formats/factorizations;
- complex-valued numerical linear algebra;
- general nonsymmetric Schur/eigen algorithms;
- high-accuracy bidiagonal SVD;
- generalized eigenvalue problems;
- Krylov methods beyond the accepted SPD conjugate-gradient workflow;
- automatic differentiation;
- trust-region or Levenberg–Marquardt frameworks;
- inequality-constrained nonlinear optimization;
- general-dimensional simplex/interior-point linear programming;
- integer/mixed-integer programming;
- global nonconvex optimization;
- exact KKT/global-optimality proof certificates.

Unsupported cases must fail explicitly rather than returning plausible-looking numerical output.

## Release gate

E5 is accepted only when the branch passes the real repository `Check MathLab` workflow covering strict TypeScript, Vitest regressions, and the Vite production build. The final accepted head must be the exact head merged into `main`.
