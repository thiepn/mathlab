# P4 Acceptance — Algebra & Equation Engine

P4 is accepted when MathLab performs a bounded set of algebra operations deterministically and exactly, exposes them through the object-aware workspace, and rejects unsupported mathematics transparently.

## Accepted capabilities

### Exact arithmetic
- rational arithmetic remains exact;
- finite decimals are converted to exact rational values internally;
- decimal approximation is explicitly labelled approximate;
- division by zero is rejected.

### Algebra
- safe simplification and arithmetic identities;
- expansion of univariate rational-coefficient polynomials;
- like-term collection through polynomial normalization;
- rational polynomial factorization, including rational-root extraction and quadratic factors;
- symbolic substitution;
- polynomial long division;
- partial fractions for denominators that split into distinct rational linear factors.

### Equations and inequalities
- exact one-variable linear equations;
- exact real quadratic equations, including simplified radicals;
- explicit no-real-solution handling;
- exact one-variable linear inequalities;
- inequality reversal when dividing by a negative coefficient.

### Linear systems
- semicolon-separated linear equation systems;
- exact rational Gaussian elimination;
- unique solution output;
- inconsistent-system detection;
- underdetermined-system detection without fabricating a parametric form.

### Derivations
- every emitted P4 step is produced from a deterministic exact transformation rule;
- step records contain before/after ASTs, rule IDs, explanations and a verified flag;
- answer and step views are separated in the UI.

### UX
- P4 actions are RUN actions in the contextual inspector;
- later-phase actions remain visibly locked;
- computation runs in the existing Web Worker boundary;
- errors appear as mathematical limitations rather than generic crashes;
- substitution has an inline symbol/value control;
- exactness and assumptions remain visible beside results.

## Deliberate P4 boundaries

P4 does **not** claim to be a complete CAS. Deferred cases include:

- arbitrary transcendental equation solving;
- complex quadratic output beyond explicit future domain work;
- polynomial inequalities above degree 1;
- general multivariate polynomial simplification/factorization;
- repeated/irreducible-factor partial-fraction decomposition;
- parametric formatting for underdetermined linear systems;
- symbolic parameter coefficients in polynomial solving;
- assumption-driven cancellation such as `x/x -> 1` when `x != 0`;
- formal proof verification, which remains P13.

The engine must fail explicitly when a request is outside this domain.

## Regression gate

Required deterministic cases include:

- `1/3 + 1/6 -> 1/2`;
- `(x+1)^3 -> x^3 + 3x^2 + 3x + 1`;
- `x^2 - 5x + 6 -> (x-3)(x-2)`;
- `2x + 5 = 11 -> {3}`;
- `x^2 - 2 = 0 -> {sqrt(2), -sqrt(2)}`;
- `-3x + 2 > 11 -> x < -3`;
- `x+y=3; x-y=1 -> x=2; y=1`;
- `(x^3-1)/(x-1) -> x^2+x+1` via polynomial division;
- exact partial fractions for a supported split denominator;
- substitution `x^2+y` with `x=2 -> y+4`;
- `x/x` is **not** cancelled without a nonzero assumption;
- `0/0` is rejected.

## Validation performed in this build

- strict TypeScript compilation of math, storage and worker layers: **PASS**;
- structural TypeScript compilation of the full source/test tree with temporary local React/Vitest declarations: **PASS**;
- deterministic runtime regression suite executed from CommonJS-transpiled core: **PASS**;
- attempted real npm dependency installation: **blocked by runtime network timeout**, so the genuine Vite/Vitest production command could not be executed in this environment;
- no partial `node_modules` or generated lockfile is included in the package.
