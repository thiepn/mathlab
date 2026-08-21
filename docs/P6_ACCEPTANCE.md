# P6 Acceptance — Visualization Engine

P6 turns the existing **Visualize** route into a first-class mathematical workspace. It does not replace or fork the P0–P5 architecture.

## Product requirements

- Plot saved unary functions and one-variable expressions.
- Plot up to six mathematical objects together without flattening them into screenshots or strings.
- Reuse workspace scalar/expression bindings before numerical evaluation.
- Preserve a deterministic AST-to-numeric evaluator; never use `eval`, `Function`, or a remote graphing service.
- Segment curves at invalid real-domain samples, denominator zeros, removable holes, and detected pole-like jumps rather than drawing false connecting lines.
- Support pan, cursor-centered zoom, reset, and robust Y fitting.
- Provide coordinate trace values directly from the AST evaluator rather than interpolating screen pixels.
- Overlay supported zeros, extrema, inflection points, vertical asymptotes, horizontal asymptotes, and removable holes.
- Derive exact annotations from P4/P5 equation/calculus machinery where supported; mark sampled/bisected fallbacks as numeric/approximate.
- Keep unsupported 3D and multivariable visualization explicit rather than projecting them incorrectly.
- Export the current graph as standalone SVG and raster PNG.
- Remain usable on narrow/mobile layouts.

## Correctness boundaries

P6 is a renderer and numeric evaluator, not a new CAS. Exact annotation coverage is therefore limited by the exact P4/P5 solvers. Numerical zero detection is deliberately a fallback and is labeled as such. Sampling may reveal additional visual behavior, but MathLab does not present sampled features as proofs.

Known vertical asymptotes and removable denominator holes are separated before polyline construction. Domain failures such as `ln(x)` for `x <= 0` and `sqrt(x)` for `x < 0` produce missing samples/segments, not invented complex-valued real plots.

## Acceptance examples

- `f(x)=x^3-3x`: continuous curve, stationary extrema at `x=-1,1`, inflection at `x=0`, zeros visible.
- `g(x)=1/x`: two branches and exact vertical asymptote `x=0`; no bridge through the pole.
- `h(x)=(x^2-1)/(x-1)`: removable hole at `x=1`; no false continuous point is drawn there.
- `(2x^2+1)/(x^2-4)`: exact vertical asymptotes at `x=-2,2` and horizontal asymptote `y=2`.
- `ln(x)`: only the real-domain branch is rendered.
- `sin(x)`: continuous sampled curve, cursor trace, pan/zoom, export.

## Regression requirements

P0–P5 parser, semantic, persistence, algebra, solver and calculus suites must continue to pass. P6 adds dedicated pure-engine tests for evaluator correctness, segmentation, holes/asymptotes, P5-derived features, viewport utilities and fitting.

## Validation status in this build

- strict TypeScript check of the complete mathematical/worker core: **PASS**;
- structural TypeScript/TSX check of the complete source tree using temporary local React/Vite declarations: **PASS**;
- dependency-free P4–P6 runtime regression harness: **PASS**;
- P6 capability routing regression: **PASS**;
- P6 visualization regression source added for evaluator, binding resolution, real-domain segmentation, exact/numeric features, holes/asymptotes and viewport utilities;
- `npm install` / genuine Vite + Vitest execution: **not available in this environment because dependency installation timed out**;
- no incomplete `node_modules` or generated lockfile is included in the package.
