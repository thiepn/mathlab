# E8 Acceptance — Complex Analysis

## Status

**Accepted / complete.**

E8 extends MathLab's existing scalar expression/function architecture into a bounded complex-analysis layer. It reuses the existing AST, the complex constant `i`, exact algebra, and the symbolic differentiation engine rather than introducing a parallel complex calculator or a second expression language.

The E8 contract is deliberately conservative: exact symbolic claims are emitted only when the implemented rules certify them; numerical complex evaluation and contour integration remain explicitly approximate; branch-sensitive mathematics is surfaced rather than silently treated as globally single-valued.

## Semantic and architectural model

E8 works primarily on existing unary scalar expressions/functions:

```text
f(z) := ...
  → existing AST / SemanticMathObject
  → E8 capability
  → MathOperationRequest
  → E8MathEngine extends E7MathEngine
  → structured MathResult
```

No new complex-object kind is required for the accepted baseline. The existing symbol `i` already promotes expression domains to complex where appropriate. E8 treats the independent variable as a complex coordinate and, when required, substitutes

`z = x + i y`.

The production Worker instantiates `E8MathEngine`, preserving cumulative fallback to E7 and all earlier engines.

## Real / imaginary decomposition

`complex-decompose` derives a rectangular representation

`f(x+iy) = u(x,y) + i v(x,y)`

for the supported exact grammar.

Accepted exact decomposition includes:

- constants and `i`;
- the complex variable;
- unary signs;
- sums, differences, products and quotients;
- integer powers, including negative powers on their inherited nonzero domains;
- `exp`;
- `sin`, `cos`;
- `sinh`, `cosh`, `tanh`;
- logarithmic rectangular form with an explicit argument term and branch warning.

Non-integer powers are not silently expanded as single-valued functions. They require a branch choice and are routed to branch diagnostics.

## Complex point mapping

`complex-map` evaluates a represented unary complex expression at a configured point `z=a+bi`.

It reports:

- input point;
- mapped value;
- modulus;
- principal argument;
- derivative value when the represented function is inside the supported differentiable grammar;
- a local nonzero-derivative conformality signal.

Point evaluation is **approximate** because it uses binary64 complex arithmetic.

Integer powers are evaluated algebraically, including at the origin, so ordinary identities such as `0^2=0` do not spuriously route through `log(0)`. Non-integer powers, logarithms and square roots use principal-branch numerical conventions.

The local derivative signal is not a global conformal-mapping theorem.

## Complex differentiation

`complex-derivative` reuses the verified symbolic differentiation engine for supported elementary holomorphic expressions.

Accepted exact derivative grammar includes the already-supported elementary derivative rules such as:

- polynomial/rational combinations;
- integer powers;
- exponentials;
- trigonometric functions;
- hyperbolic functions;
- logarithms and square roots on selected branch domains.

The operation explicitly refuses a global complex derivative for structural non-holomorphic operators including:

- `abs`;
- conjugation;
- real-part extraction;
- imaginary-part extraction;
- argument;
- floor/ceiling.

For branch-sensitive functions such as `ln` or `sqrt`, the derivative formula may still be exact **locally on a selected branch domain**, and the result carries a branch warning.

## Cauchy–Riemann certification

`cauchy-riemann` derives exact `u(x,y)` and `v(x,y)`, then computes

- `u_x - v_y`;
- `u_y + v_x`.

E8 reports a verified Cauchy–Riemann identity only when both residuals simplify exactly to zero.

For explicit non-holomorphic operators such as `abs`, E8 reports a structural obstruction rather than attempting to infer holomorphicity numerically.

For logarithms, square roots and unresolved non-integer powers, E8 does **not** promote a branch-local identity into a global branch-independent theorem. Exact Cauchy–Riemann certification is refused until a branch-domain model is explicit.

A verified result remains subject to inherited denominator/domain exclusions.

## Branch and domain diagnostics

`branch-diagnostics` detects supported branch-sensitive constructs and reports the principal-branch conventions used elsewhere in E8.

The baseline recognizes:

- logarithms;
- square roots;
- argument functions when represented in the AST;
- non-integer powers.

Diagnostics explain conventional negative-real-axis cuts for the principal logarithm/square root and note the branch point at zero where appropriate.

E8 does not model a Riemann surface, monodromy, or global analytic continuation.

## Power and Laurent series

`complex-series` provides an exact local series baseline for **rational functions of `z` with real rational coefficients**, centered at a configured **real rational** point.

The implementation:

1. shifts `z` to `w = z - z0` exactly;
2. extracts numerator and denominator polynomials;
3. determines their orders at `w=0`;
4. solves the rational power/Laurent coefficient recurrence exactly;
5. returns a finite exact truncation through the configured exponent.

The result distinguishes:

- regular power-series points;
- Laurent expansions at poles;
- removable rational singularities.

The displayed coefficients are exact. A nearest-pole radius may be estimated numerically when the denominator degree is inside the bounded root finder; that radius estimate does not upgrade to an exact convergence-domain proof.

E8 does not claim arbitrary transcendental Taylor/Laurent expansion or essential-singularity series generation.

## Isolated singularities

`singularity-profile` classifies supported rational functions at a configured real rational point.

It can certify:

- regular points;
- removable singularities;
- poles and exact pole order;
- the Laurent residue coefficient.

For rational functions, this is an exact algebraic classification inside the supported polynomial boundary.

Essential singularities are not inferred by this rational classifier.

## Residues

`complex-residue` has two paths.

### Exact path

For a supported rational function at a real rational point, E8 extracts the coefficient of `(z-z0)^(-1)` from the exact Laurent recurrence.

This residue is **exact**.

### Numerical fallback

For a supported single-valued expression/point outside that exact path, E8 may approximate

`Res(f,z0) = (1 / 2πi) ∮ f(z) dz`

on a small configured circle.

This fallback is **approximate** and explicitly warns that the chosen circle must isolate exactly one singularity and avoid branch cuts/other singularities.

E8 refuses to assign an ordinary residue at unresolved branch points such as the principal square root at zero.

## Parameterized contour integrals

`complex-contour-integral` evaluates supported complex integrands along configured:

- circles;
- line segments.

The contour is parameterized explicitly and the integral is approximated using deterministic composite Simpson quadrature in the contour parameter.

Contour-integral output is **approximate**. It does not imply:

- analyticity inside the contour;
- contour independence;
- an exact antiderivative;
- a rigorous quadrature error enclosure.

## Residue theorem

`residue-theorem` provides a bounded automatic circular-contour workflow for rational functions with real rational coefficients.

The accepted automatic pole-discovery boundary is:

- denominator degree at most two;
- simple poles;
- circular contour with finite center and positive radius.

E8:

1. extracts exact rational polynomial coefficients;
2. discovers denominator roots numerically;
3. rejects a pole lying on the contour;
4. selects enclosed poles;
5. evaluates simple-pole residues through `P(root)/Q'(root)`;
6. returns `2πi` times the enclosed-residue sum.

Because root and complex residue evaluation use binary64 arithmetic, the automated theorem result is **approximate**, despite relying on the exact residue-theorem identity.

Repeated poles in this automatic theorem workflow are refused rather than treated by an unsupported formula.

## Capability and discovery integration

E8 operations are available only on scalar expressions/functions with exactly one independent variable.

Integrated operations:

- `complex-map`
- `complex-decompose`
- `complex-derivative`
- `cauchy-riemann`
- `complex-series`
- `singularity-profile`
- `complex-residue`
- `complex-contour-integral`
- `residue-theorem`
- `branch-diagnostics`

They are integrated into:

- the cumulative capability surface;
- Workspace actions;
- the shared inspector/control surface;
- the global Tools catalog;
- `Ctrl+K` discovery;
- the production Worker/engine chain.

Configured operations expose their mathematical inputs rather than hiding them: complex points, centers, series order, contour geometry, fallback residue radius, and quadrature resolution.

## Exactness policy

- rectangular decomposition: **exact** inside the supported grammar;
- complex symbolic derivative: **exact**, with branch-domain warnings where applicable;
- Cauchy–Riemann residual identities: **exact certification** when both residuals reduce to zero;
- branch diagnostics: **exact structural diagnostics**;
- rational power/Laurent coefficients: **exact**;
- rational singularity order/residue at supported real rational centers: **exact**;
- complex point mapping: **approximate**;
- numerical residue fallback: **approximate**;
- contour quadrature: **approximate**;
- bounded automatic residue-theorem result: **approximate** because pole/root evaluation is numerical.

No sampled or floating-point result is promoted to an exact complex-analysis theorem.

## Explicit non-goals

E8 does not claim:

- full analytic continuation;
- Riemann surfaces;
- monodromy analysis;
- general branch-cut topology;
- arbitrary complex-center exact Laurent expansions;
- arbitrary transcendental Taylor/Laurent series;
- automatic essential-singularity expansions;
- arbitrary-order/transcendental residue algebra;
- general symbolic pole discovery;
- automatic residue-theorem workflows beyond the bounded rational/simple-pole case;
- rigorous interval/error bounds for contour quadrature;
- arbitrary parameterized symbolic exact contour antiderivatives;
- the argument principle;
- Rouché's theorem;
- winding-number/root-counting systems;
- global conformal-mapping classification;
- Schwarz–Christoffel mappings;
- complex-plane visualization as part of the certified E8 baseline.

Unsupported cases remain explicit rather than being represented as solved.

## Regression gate

E8 acceptance requires deterministic coverage for at least:

- exact rectangular decomposition;
- exact complex differentiation;
- Cauchy–Riemann certification;
- structural non-holomorphic refusal;
- branch-local derivative warnings;
- binary64 point mapping;
- integer powers at the origin;
- exact rational Laurent expansion;
- pole-order/singularity classification;
- exact residue extraction;
- branch-point residue refusal;
- numerical circle and line contour integration;
- bounded residue-theorem automation;
- pole-on-contour refusal;
- denominator-degree boundary refusal;
- capability gating;
- global tool discovery;
- cumulative E7 fallback.

The final branch must pass the repository's real **P15 release audit + Vitest + strict TypeScript + Vite production build** gate before promotion to `main`.
