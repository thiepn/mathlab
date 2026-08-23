# E7 Acceptance — Fourier, Laplace & Transform Methods

## Status

**Accepted / complete**, subject to the final exact-head repository gate before merge.

E7 extends the existing MathLab expression, function, vector, matrix and ODE objects. It does **not** introduce a competing transform-object language.

## Accepted architecture

E7 preserves the cumulative computation path:

```text
Input → AST → Semantic Object → Capability → MathOperationRequest
      → E7MathEngine → structured MathResult → Workspace / Tools
```

`E7MathEngine` extends `E6MathEngine`, and the production Worker routes through E7. Operations outside E7 continue through the established E6 → E5 → earlier-engine chain.

Transform results remain ordinary mathematical AST expressions in the relevant transform variable. Numerical/discrete transforms remain operation results rather than a second persistence model.

## Unilateral Laplace transform

E7 uses the convention

```text
L{f}(s) = ∫₀∞ f(t)e^(-st) dt.
```

The verified exact table includes:

- constants;
- nonnegative integer powers `t^n` through the explicit E7 power bound;
- `exp(a t)`;
- `sin(a t)` and `cos(a t)`;
- `sinh(a t)` and `cosh(a t)`;
- finite sums/differences of supported terms;
- multiplication by factors independent of the transform variable;
- the supported exponential shift rule `L{e^(at)f(t)} = F(s-a)`.

The transform identity is marked **exact** when the represented expression matches this table. E7 warns that it does not generally derive or certify the full region of convergence in the complex `s` plane.

Unsupported symbolic forms fail explicitly rather than being assigned a guessed table entry.

## Inverse Laplace transform

The exact inverse baseline supports:

- finite linear combinations of supported inverses;
- constant multiples;
- powers represented by `1/s^n` inside the accepted bound;
- proper rational transforms whose denominator has degree at most two;
- first-order poles;
- quadratic denominators with oscillatory `sin/cos` reconstruction;
- repeated quadratic roots;
- real/hyperbolic quadratic reconstruction through `sinh/cosh`.

E7 does not claim general partial-fraction inversion for arbitrary-degree rational functions, Bromwich contour inversion, branch-sensitive inversion, or distribution-valued inverse transforms.

## Convolution

For two supported unilateral time-domain expressions, E7 constructs

```text
(f*g)(t) = ∫₀ᵗ f(τ)g(t-τ)dτ
```

and verifies

```text
L{f*g} = L{f} L{g}.
```

If the resulting transform product lies inside the bounded inverse-Laplace table, E7 returns an exact closed time-domain form. Otherwise it preserves the exact convolution integral and transform product rather than fabricating an elementary inverse.

## Transform-based ODE solving

E7 connects transforms to the existing E4 ODE representation rather than adding an equation-specific calculator.

Accepted production scope:

```text
ode2(a,b,c,forcing,0,y0,v0)
```

with constant coefficients and encoded initial data at `t0=0`.

E7 uses

```text
L{y'}  = sY - y(0)
L{y''} = s²Y - s y(0) - y'(0)
```

to derive the exact Laplace-domain expression

```text
Y(s) = [L{forcing} + a(s y0 + v0) + b y0] / [a s² + b s + c].
```

If `Y(s)` lies inside the accepted inverse table, E7 returns the exact time-domain solution. Otherwise the exact `Y(s)` representation remains the result and the unsupported inversion boundary is stated.

This is not a general transform-based ODE solver for arbitrary order, variable coefficients, nonzero initial time, systems, delays, impulses, or distributions.

## Fourier series

For a scalar elementary expression/function and a configured positive period `T`, E7 uses

```text
ω₀ = 2π/T
f(t) ≈ a₀/2 + Σ [aₙ cos(nω₀t) + bₙ sin(nω₀t)].
```

Accepted behavior:

- 1–40 requested harmonics;
- one represented period sampled as `[-T/2,T/2]`;
- deterministic composite-Simpson coefficient integration;
- structural even/odd analysis for supported elementary syntax;
- exact elimination of the mathematically zero sine family for recognized even functions;
- exact elimination of the mathematically zero cosine family and `a₀` for recognized odd functions.

The nonzero coefficients are **approximate** binary64 quadrature results. Structural symmetry does not upgrade the numerical coefficient family into an exact Fourier-series certificate.

E7 does not claim convergence-mode classification, Gibbs-error certification, piecewise endpoint reconstruction, or exact coefficient integration for every elementary function.

## Bilateral Fourier transform

E7 uses the angular-frequency convention

```text
F(ω) = ∫_{-∞}^{∞} f(t)e^(-iωt) dt
f(t) = (1/2π)∫_{-∞}^{∞} F(ω)e^(iωt) dω.
```

The exact symbolic baseline deliberately starts with the ordinary-function Gaussian identity:

```text
exp(-a t²), a>0
  ↔ sqrt(π/a) exp(-ω²/(4a)).
```

The corresponding inverse Gaussian identity is also certified under the stated convention.

E7 deliberately refuses cases such as `cos(t)` in the exact bilateral workflow because their classical transforms require distributions (Dirac deltas), which MathLab does not yet represent. Refusal is preferable to displaying a false ordinary function.

## Numerical Fourier evaluation

For broader elementary scalar expressions, E7 provides a finite-window numerical workflow.

The user explicitly supplies:

- lower integration bound;
- upper integration bound;
- angular-frequency evaluation point for the forward transform, or time point for the inverse;
- quadrature interval count.

Composite Simpson quadrature evaluates the real and imaginary parts separately.

These results are **approximate**. E7 explicitly states both sources of error:

1. finite-window truncation relative to the ideal improper integral over the real line;
2. numerical quadrature error inside the selected window.

A finite-window result must never be presented as an exact bilateral transform.

## Discrete Fourier transform foundation

For a resolved real vector of 2–256 samples, E7 provides the direct transform

```text
X[k] = Σ x[n] e^(-i 2πkn/N).
```

The inverse workflow accepts an `N×2` matrix of `[real, imaginary]` coefficients and applies the standard `1/N` inverse normalization.

Accepted characteristics:

- direct `O(N²)` implementation;
- binary64 trigonometric evaluation;
- complex coefficient output represented as `[real, imaginary]` pairs;
- magnitude reporting;
- deterministic inverse reconstruction.

DFT/IDFT output is **approximate**. E7 does not claim an FFT implementation, arbitrary precision, DSP window-design system, or high-performance signal-processing library.

## Capability and UI requirements

E7 actions participate in the normal cumulative capability registry and global tool catalog.

- scalar transform workflows require exactly one independent variable;
- DFT requires a resolved real vector with 2–256 entries;
- inverse DFT requires a resolved real `N×2` coefficient matrix;
- transform-based ODE solving requires an initialized `ode2(...)` object, with the stricter `t0=0` check enforced at execution;
- convolution, Fourier-series configuration and finite-window numerical transforms use the existing workspace inspector/control surface;
- exact one-click operations do not create unnecessary settings panels;
- E7 tools are visible in both the Tools page and global `Ctrl+K` catalog.

## Exactness policy

- supported unilateral Laplace table: **exact**;
- supported inverse Laplace table: **exact**;
- convolution theorem / preserved formal convolution: **exact representation**;
- supported Laplace-domain ODE derivation: **exact**;
- supported time-domain ODE inversion: **exact**;
- Fourier-series nonzero coefficients: **approximate**;
- recognized symmetry-zero coefficient families: **exact structural zero**, inside an otherwise approximate series workflow;
- Gaussian bilateral Fourier pair: **exact**;
- finite-window numerical Fourier/inverse evaluation: **approximate**;
- DFT/IDFT: **approximate**.

## Explicit non-goals

E7 does **not** claim:

- general Laplace regions-of-convergence analysis;
- Heaviside/unit-step, impulse/Dirac-delta or other distribution semantics;
- general time-delay/distribution transform tables;
- arbitrary-degree symbolic inverse Laplace decomposition;
- Bromwich contour inversion;
- general symbolic bilateral Fourier transforms;
- distribution-valued Fourier transforms;
- multidimensional Fourier transforms;
- FFT algorithms or production DSP performance;
- spectral-window design, leakage correction, filter design or signal-processing pipelines;
- Z transforms;
- wavelets;
- general transform-based PDE solving;
- general transform-based ODE solving outside the accepted `ode2(...)` boundary;
- rigorous interval error enclosures for Fourier quadrature.

Unsupported cases must fail or remain explicit formal representations instead of returning plausible-looking unsupported mathematics.

## Regression gate

E7 acceptance requires deterministic coverage for at least:

- polynomial/trigonometric Laplace transforms;
- exponential shifting;
- bounded rational inverse Laplace transforms;
- convolution theorem behavior;
- initialized `ode2(...)` Laplace solving and nonzero-initial-time refusal;
- even/odd Fourier-series symmetry behavior;
- exact Gaussian Fourier and inverse-Fourier identities;
- refusal of unsupported distribution-valued exact Fourier cases;
- finite-window numerical Fourier accuracy on a known Gaussian integral;
- DFT and inverse-DFT reconstruction;
- capability gating and global tool discovery;
- cumulative E6 fallback;
- invalid period/order, unsupported inverse, invalid numerical windows, and discrete shape/size boundaries.

The exact final documentation/code head must pass the repository's real **release audit + Vitest + strict TypeScript + Vite production build** gate before promotion to `main`.