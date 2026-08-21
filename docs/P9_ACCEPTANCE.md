# P9 Acceptance — Analysis

P9 extends the same parser → semantic object → capability → Worker → `MathResult` architecture with theorem-aware real-analysis workflows. It must not infer unproved convergence, continuity, differentiability, or infinite-series identities merely from numerical samples.

## Sequence objects

A definition such as:

```text
a_n := 1/n
# conventional equality syntax is also accepted:
a_n = 1/n
```

is a first-class `sequence` object with index `n`. P9 provides:

- exact term previews with configurable start/count;
- exact finite partial sums when every sampled term is rational;
- sequence limit and convergence classification;
- combined sequence/series profiles.

Unknown convergence is a valid result. It must never be rewritten as divergence.

## Series convergence

P9 implements bounded theorem-driven tests for recognized exact forms:

- nth-term divergence test;
- geometric-series test, including exact sums when the start index is known;
- p-series test;
- alternating p-series / absolute-vs-conditional convergence;
- rational-function limit comparison by degree;
- polynomial × geometric ratio behavior;
- squeeze-theorem sequence limits for bounded trig terms over positive powers.

The result architecture explicitly preserves the theorem guard:

> `a_n → 0` is necessary for `Σa_n` to converge, but it is not sufficient.

## Rigorous limits

P9 strengthens P5 limits without replacing the P5 API:

- direct continuity and removable-factor cancellation remain supported;
- rational pole limits use local vanishing orders and one-sided sign analysis;
- opposite one-sided infinite limits produce `DNE` for the two-sided limit;
- `abs(u)/u` one-sided sign behavior is recognized for an affine zero;
- no averaging of incompatible one-sided limits is allowed.

## Continuity

P9 distinguishes:

- continuous on all real numbers;
- continuous on the function's real domain;
- removable discontinuities;
- poles/infinite discontinuities;
- continuity at a specific point.

For rational functions, polynomial GCD reduction distinguishes holes from true poles whenever the exact bounded root solver can resolve the relevant factors.

## Differentiability

P9 adds theorem-aware differentiability profiles and point checks:

- polynomials: differentiable on `R`;
- rational functions: differentiable away from holes/poles;
- supported elementary compositions: derivative-domain aware;
- affine absolute value: exact corner detection;
- floor/ceil: discontinuous at integers and derivative `0` between integers;
- continuity failure implies nondifferentiability;
- continuity alone never implies differentiability.

## Taylor and power series

P9 provides:

- exact Taylor polynomials at rational centers through order 10;
- exact derivative/factorial coefficients;
- explicit finite-polynomial vs infinite-series distinction;
- verified Maclaurin profiles for `exp`, `sin`, `cos`, `ln(1+x)`, `ln(1-x)`, polynomials, and geometric `1/(1-cx)` forms;
- radius and interval of convergence where the supported theorem family proves them;
- endpoint reasoning for supported geometric/logarithmic families.

A Taylor polynomial must never be described as proof that the infinite Taylor series equals the original function globally.

## Asymptotic analysis

P9 provides exact bounded profiles for:

- polynomial leading-term growth;
- rational degree comparison;
- horizontal, oblique, and higher polynomial asymptotes from exact polynomial division;
- rational vertical asymptotes vs removable holes;
- basic exponential/logarithmic growth comparisons.

## Correctness boundaries

P9 intentionally does not claim a complete real-analysis theorem prover. Deferred cases include:

- arbitrary epsilon-delta proof synthesis;
- general comparison/Dirichlet/Abel/integral tests outside recognized forms;
- general symbolic limsup/liminf;
- arbitrary power-series coefficient extraction and analytic continuation;
- general nonzero-center singularity-distance computation;
- general piecewise differentiability classification;
- measure/integration theory and functional analysis.

## Regression requirement

P4 algebra, P5 calculus, P6 visualization, P7 foundational linear algebra, and P8 advanced linear algebra must retain representative deterministic behavior after P9.
