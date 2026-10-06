# Post-v2 P7 — Wirtschaftsmathematik Expansion

## Goal

P7 selectively expands MathLab for applied **Wirtschaftsmathematik** work where the v2 engine was still materially narrow.

The phase is not a new calculator silo. Every new workflow remains inside the existing pipeline:

```text
Input → AST → Semantic Object → Capability Registry
      → P7MathEngine → Structured MathResult
      → Workspace / Tools / Reference / Learn
```

The historical E12 22-domain scorecard remains locked evidence for v2.0.0 and is not rewritten retroactively by P7.

## Scope

P7 targets three gaps:

1. **Operations research beyond bounded 2D LP**
2. **Applied statistics for ordered economic/business data**
3. **Data-driven numerical approximation**

## Optimization & operations research

### Canonical simplex linear programming

Input is an m×(n+1) matrix:

```text
[[a11, …, a1n, b1],
 ...
 [am1, …, amn, bm]]
```

representing:

```text
A x ≤ b
x ≥ 0
```

The objective vector `c` and max/min sense are configured in the operation control.

Boundary:

- b must be nonnegative so the slack basis is initially feasible;
- up to 20 decision variables and 40 constraints;
- no automatic phase-I artificial variables;
- equality, ≥, and free-variable models must be reformulated explicitly;
- unbounded objective directions are detected;
- pivot selection uses deterministic Bland-style first-negative entering selection.

The result reports the optimum, decision vector, binding constraints, slacks, pivot count and capped pivot trace.

### Assignment problem

A square numeric matrix represents cost or profit for assigning each row to exactly one column.

P7 uses the Hungarian algorithm for:

- minimum-cost assignment;
- maximum-profit assignment.

The result includes the total objective, one-hot assignment matrix and row→column pairs.

### Transportation problem

The active matrix is the supplier×customer unit-cost matrix. Supply and demand vectors are configured separately.

P7 solves a **balanced** transportation model as deterministic min-cost flow.

Boundary:

- nonnegative supply/demand;
- equal total supply and demand;
- up to 12 suppliers × 12 demand nodes;
- no fixed-charge, lower-bound, integer-only or unbalanced dummy-node model is silently inferred.

The result reports minimum cost, allocation matrix, flow count and row/column balance verification.

## Time series & forecasting

### Time-series profile

A dataset or one-dimensional vector is treated as an ordered sequence.

P7 computes:

- sample mean and standard deviation;
- linear time trend;
- slope/intercept;
- trend R² and RMSE;
- one-period linear-trend extrapolation;
- bounded autocorrelation function (ACF).

The workflow is descriptive. It does not claim causality or automatically infer trend/seasonality structure.

### Simple exponential smoothing

P7 adds level-only simple exponential smoothing with configured:

- smoothing parameter α;
- forecast horizon.

It reports:

- final level;
- one-step RMSE;
- forecast vector;
- a bounded update trace.

Explicit boundary: SES does not model trend or seasonality.

## Applied numerical modeling

### Polynomial least squares

An n×2 matrix `[[x1,y1], …]` can be fitted with a polynomial of degree 1–6.

The solver uses **Householder QR**, not normal equations, to reduce avoidable conditioning loss.

It reports:

- coefficients;
- fitted polynomial;
- R²;
- RMSE;
- QR diagonal ratio as a conditioning warning signal;
- optional prediction at a configured x-value.

This remains an approximate numerical fit. R² is not presented as proof of predictive validity.

## Product integration

P7 adds a first-class **Optimization & OR** tool category.

The new capabilities are still exposed through the canonical P4 registry. Optimization/OR participates in the existing numerical learning course so Learn maintains engine/curriculum parity without inventing a disconnected course shell.

Runtime applicability:

- matrices expose compatible OR / curve-fitting operations;
- vectors and datasets expose time-series workflows;
- invalid shapes remain visible but unavailable with an explicit reason.

## Controls

All six P7 operations are configuration-aware:

- simplex: objective, max/min, pivot limit;
- assignment: min/max;
- transportation: supply/demand;
- time series: maximum ACF lag;
- smoothing: α and horizon;
- polynomial fit: degree and optional prediction point.

## Certification

P7 is complete only when the exact merge candidate passes:

1. all existing release/E12/stable/accessibility/worksheet/input/P4/P5/P6 audits;
2. the dedicated P7 Wirtschaftsmathematik audit;
3. known-optimum unit tests for simplex, assignment and transportation;
4. deterministic time-series, smoothing and polynomial-fit tests;
5. production-engine inheritance test;
6. strict TypeScript and production build;
7. browser acceptance through the shared contextual tool surface;
8. full Chromium / Firefox / WebKit and phone/tablet matrix;
9. GitHub Pages deployment;
10. live custom-domain verification.

No earlier correctness or accessibility gate is weakened.
