# P5 Acceptance — Functions & Calculus

P5 is accepted when MathLab treats unary real functions as first-class computational objects, executes a bounded deterministic calculus domain through the existing worker/engine boundary, exposes rule-aware derivations, and refuses unsupported symbolic cases transparently.

## Accepted capabilities

### Function workflow
- saved definitions such as `f(x)=x^3-3x` retain `x` as a function parameter rather than a free workspace variable;
- unary functions expose evaluation, profile, derivative, integration, limit and behavior actions;
- supported real-domain violations are rejected during evaluation, including denominator zeros, invalid logarithm/square-root inputs and tangent poles;
- multivariable functions remain recognized semantic objects but P5 calculus actions are marked inapplicable;
- workspace scalar/expression bindings are resolved before calculus execution.

### Differentiation
- exact polynomial differentiation;
- sum, difference, product and quotient rules;
- power + chain rule for variable-independent exponents;
- elementary chain rules for `sin`, `cos`, `tan`, `exp`, `ln`, `log`, `sqrt`, `sinh`, `cosh`, `tanh`, `asin`, `acos`, `atan`;
- higher derivatives through order 12;
- structured before/after AST derivation records with deterministic rule IDs;
- inherited real-domain restrictions remain visible when algebraic simplification would otherwise hide them (for example `d/dx(x/x)=0` still records `x ≠ 0`);
- explicit refusal of globally unsafe `abs(...)`, `floor(...)`, `ceil(...)`, unknown functions, and general `u(x)^v(x)` real-domain differentiation.

### Integration
- polynomial antiderivatives;
- linearity and constant multiples;
- affine power substitution;
- affine reciprocal logarithm rule;
- elementary affine antiderivatives for `exp`, `sin`, `cos`, `sinh`, `cosh`;
- direct `ln(x)` antiderivative;
- explicit `+ C` for indefinite integrals;
- exact supported definite integrals via the Fundamental Theorem of Calculus;
- interval-domain checks reject poles and supported real-domain violations rather than silently evaluating an improper/discontinuous integral.

### Limits
- direct substitution for expressions proven defined at a finite rational target;
- removable rational singularities via factor cancellation scoped only to the limit computation;
- selected fundamental limits at zero, including `sin(x)/x`, `(exp(x)-1)/x`, and `ln(1+x)/x`;
- polynomial limits at `±∞`;
- rational-function limits at `±∞` by degree and leading coefficient;
- `exp(x)` at `±∞` and `ln(x)` at `+∞`;
- explicit refusal when a one-sided or more advanced limit cannot be proven by the P5 rules.

### Function analysis
- exact zero finding for degree ≤2 polynomials;
- higher-degree zero finding when rational factorization reduces every remaining factor to degree ≤2;
- stationary points from `f′(x)=0` when the derivative polynomial has degree ≤2;
- second-derivative local min/max classification with explicit inconclusive state when the test is zero/unavailable;
- monotonicity intervals when `f′` is polynomial degree ≤2;
- concavity intervals when `f″` is polynomial degree ≤2;
- domain notes for supported denominator, logarithm, square-root and tangent restrictions;
- structured function profiles containing function/domain metadata, first/second derivatives, zeros, stationary/extrema information, monotonicity and concavity where available.

### Result architecture
- `MathResult` may carry structured `sections` in addition to a primary AST/display;
- profile and interval analyses use sections rather than flattening rich mathematical output into prose;
- this structured result model is explicitly designed for P6 visualization overlays and inspectors;
- Answer and Steps remain distinct UI views.

## Deliberate P5 boundaries

P5 is **not** a complete symbolic calculus system. Deferred cases include:

- multivariable differentiation, gradients, Jacobians and Hessians;
- general variable-exponent differentiation where real-domain assumptions are required;
- distributional/piecewise derivatives;
- general symbolic integration, integration by parts search, trig/rational substitution search, special functions;
- improper integrals as a single automatic operation;
- full one-sided limit algebra and indeterminate-form machinery;
- L'Hôpital automation;
- transcendental equation solving for zeros/critical points;
- stationary-point searches requiring derivative polynomial degree >2 unless later factoring support is added;
- full domain/continuity decomposition for arbitrary compositions;
- global extrema on user-specified closed intervals;
- Taylor/Maclaurin series and rigorous epsilon-delta analysis, scheduled for later phases.

MathLab must fail explicitly outside this domain.

## Regression gate

Required deterministic cases include:

- `d/dx (x^3+2x) -> 3x^2+2`;
- `d/dx sin(x^2) -> 2x cos(x^2)`;
- second derivative of `x^3 -> 6x`;
- `∫(3x^2+2x+1)dx -> x^3+x^2+x+C`;
- `∫_0^pi sin(x)dx -> 2`;
- `∫_-1^1 1/x dx` is rejected as crossing a pole;
- `lim_(x->1) (x^2-1)/(x-1) -> 2` without redefining the original function at `x=1`;
- `lim_(x->0) sin(x)/x -> 1`;
- `lim_(x->∞) (2x^2+3)/(x^2-4) -> 2`;
- zeros of `x^3-3x` include `0, ±sqrt(3)` through exact factoring;
- critical points of `x^3-3x` are `{-1,1}`;
- those stationary points classify as local maximum at `(-1,2)` and local minimum at `(1,-2)`;
- monotonicity returns three intervals for `x^3-3x`;
- concavity returns two intervals for `x^3-3x`;
- a full function profile returns reusable structured sections;
- `d/dx abs(x)` is rejected without sign/piecewise support;
- `d/dx x^x` is rejected rather than hiding real-domain conditions.

## Validation performed in this build

- strict TypeScript compilation of the complete math + worker core: **PASS**;
- full-source structural TypeScript validation with temporary local React/Vitest declarations: **PASS**;
- deterministic runtime regression harness for representative P4 + P5 operations: **PASS**;
- P5 Vitest regression files added for calculus and function capability routing;
- genuine npm dependency installation / Vite / Vitest run: **blocked by runtime network timeout**;
- no partial `node_modules` or generated lockfile is included in the package.
