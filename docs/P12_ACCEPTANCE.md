# P12 Acceptance — Numerical Math & ODEs

P12 extends the same parser → semantic object → capability → Worker → `MathResult` pipeline with bounded numerical computation. Approximation must never silently replace an exact P4–P11 result. Every numerical workflow reports `approximate` exactness and surfaces its stopping/error assumptions.

## IEEE-754 binary64 profile

Exact rational scalars expose a binary64 profile. P12 must decode the actual 64-bit floating-point representation back into an exact rational, then report exact representability, absolute representation error, relative representation error, and machine epsilon. This is representation analysis, not a generic arbitrary-precision floating-point package.

## Numerical roots

Unary functions/expressions expose bisection, Newton, and secant methods. Bisection requires a sign-changing bracket and returns the final bracket half-width as a rigorous method-local error bound. Newton/secant expose iterate-change/residual diagnostics and must warn that convergence depends on initial values. Iterations are bounded.

## Numerical differentiation

P12 uses centered finite differences at `h` and `h/2` plus Richardson refinement. It reports the refined derivative and a truncation-error estimate, while warning that roundoff and nonsmoothness can dominate.

## Numerical integration

Supported quadrature:

- adaptive Simpson with recursive local error control and evaluation/depth budgets;
- composite Simpson with `n` vs `2n` convergence estimate;
- composite trapezoid with `n` vs `2n` convergence estimate.

Discontinuities/singularities are not silently integrated as if smooth.

## Polynomial interpolation

An `n×2` real-rational matrix represents interpolation nodes. P12 constructs the exact Newton divided-difference coefficients and exact expanded interpolation polynomial for up to 12 distinct x-values. Exact interpolation remains explicitly distinct from statistical regression and does not claim predictive quality.

## Numerical linear algebra

An `n×(n+1)` augmented matrix exposes:

- partial-pivoting Gaussian solve with infinity-norm residual and pivot diagnostics;
- Jacobi and Gauss–Seidel iteration with tolerance/iteration bounds, residual, iterate-change trace, and row-wise diagonal-dominance warning.

Square matrices expose a floating-point infinity-norm condition estimate `κ∞(A)=||A||∞||A⁻¹||∞`. This estimate is not represented as an exact certificate.

## ODE IVPs

`ivp(rhs, x0, y0)` is a first-class P12 object representing

`y' = rhs(x,y),  y(x0)=y0`.

The internal variables `x` and `y` are not unresolved workspace symbols. Supported fixed-step methods are Euler (order 1), Heun (order 2), and classical RK4 (order 4). Endpoint error is estimated by step doubling. Step/work budgets are enforced, and the result warns that this estimate is not a rigorous enclosure and that explicit methods can fail on stiff equations.

## Correctness boundaries

P12 does not claim arbitrary precision, validated interval arithmetic, guaranteed Newton convergence, singular-integral regularization, splines, nonlinear systems, sparse/large-scale Krylov methods, adaptive embedded Runge–Kutta, stiffness detection, implicit ODE methods, higher-order ODE/system syntax, BVPs, PDEs, or symbolic ODE solving.

## Regression

P4–P11 representative behavior must remain deterministic. P12 tests cover binary64 decoding, root finding, finite differences, quadrature, interpolation, direct/iterative linear solves, conditioning, IVP semantics, and RK4 endpoint behavior.
