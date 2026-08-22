# E4 Acceptance — ODEs & Dynamical Systems II

## Status

**Accepted / complete.**

E4 extends the P12 scalar numerical-IVP foundation into a bounded ODE and dynamical-systems layer while preserving MathLab's core rule: symbolic, numerical, and heuristic claims must remain distinguishable.

## Semantic model

E4 adds first-class structured ODE constructors without introducing a parallel calculator model:

```text
ivp(rhs, x0, y0)
odesys([x,y], [f,g], t0, [x0,y0])
separable(f, g[, x0, y0])
linearode(p, q[, x0, y0])
exactode(M, N)
ode2(a, b, c[, forcing, t0, y0, v0])
oden([a_n,...,a_0], forcing[, t0, initialState])
```

`ivp(...)` remains backward-compatible with P12. `odesys(...)` represents a first-order system directly. `ode2(...)` and `oden(...)` represent bounded constant-coefficient higher-order equations that can be converted to first-order systems.

State variables and the independent variable are intrinsic to the ODE object. External unresolved parameters remain ordinary dependencies and must resolve before numerical or stability workflows run.

## Accepted symbolic workflows

E4 may report an **exact** result only for the following verified classes:

- separable first-order equations when both required antiderivatives are within the existing verified integration boundary;
- first-order linear equations through the integrating-factor identity, leaving a formal integral explicit when the verified elementary antiderivative table cannot close it;
- exact differential equations after certifying `∂M/∂y = ∂N/∂x` on the represented differentiable domain;
- homogeneous second-order constant-coefficient linear equations with supported characteristic-root cases;
- bounded constant-coefficient higher-order equations converted structurally to first-order systems.

Unsupported symbolic ODEs must fail explicitly. E4 is not a general-purpose differential-equation CAS.

## Systems and dynamical systems

For supported autonomous first-order systems E4 provides:

- equilibrium search within bounded exact linear and separable/decoupled cases;
- exact symbolic Jacobian construction;
- Jacobian evaluation at a certified equilibrium;
- planar trace/determinant/discriminant analysis;
- local linearized classification of supported two-state equilibria;
- explicit inconclusive handling for nonhyperbolic cases where linearization does not certify nonlinear behavior.

Stability output is local unless a stronger statement is explicitly established. E4 must not promote a local eigenvalue classification into an unsupported global stability claim.

## Numerical integration

E4 provides adaptive Dormand–Prince RK45 for scalar IVPs and encoded first-order systems with finite initial data.

Accepted numerical behavior includes:

- embedded 5(4) local-error estimation;
- adaptive step acceptance/rejection;
- configurable endpoint and tolerance;
- bounded minimum/maximum step controls;
- accepted/rejected-step diagnostics;
- endpoint state output;
- bounded trajectory samples;
- event/stopping detection through sign crossing;
- an explicitly **heuristic** stiffness signal.

RK45 trajectories are **approximate**. Event times are approximate. The stiffness signal is diagnostic only; E4 does not claim a stiff integrator such as BDF or Radau.

The legacy P12 Euler/Heun/RK4 fixed-step operation remains available for scalar `ivp(...)` objects only.

## Visualization integration

Autonomous two-state `odesys(...)` objects are projected into E3's existing two-dimensional vector-field/phase-portrait renderer.

The visualization is a read-only projection of the ODE object. It does not create a second source of mathematical truth and does not upgrade sampled trajectories into exact solutions.

## Capability and UI requirements

E4 operations must be available only when their mathematical preconditions hold:

- `ode-profile`
- `ode-symbolic-solve`
- `ode-to-system`
- `ode-equilibria`
- `ode-linearize`
- `ode-stability`
- `ode-adaptive-solve`

They must be discoverable through the normal capability/workspace/tool-catalog paths. Unsupported operations expose a concrete reason instead of appearing to run and then returning fabricated mathematics.

## Exactness policy

- constructor parsing and structural conversion: **exact**;
- supported symbolic solutions: **exact**;
- equilibrium/Jacobian calculations inside their certified symbolic boundary: **exact**;
- planar linearized stability classification: **exact local classification**, with nonhyperbolic caveats;
- adaptive RK45: **approximate**;
- event location: **approximate**;
- stiffness detection: **heuristic**;
- E3 field/trajectory rendering: **sampled visualization**, not proof.

## Explicit non-goals

E4 does not claim:

- a general symbolic ODE solver;
- arbitrary nonlinear equilibrium solving;
- global nonlinear stability from local eigenvalues;
- Lyapunov-function synthesis;
- bifurcation analysis;
- continuation methods;
- stiff ODE integration;
- differential-algebraic equations;
- boundary-value problems;
- PDE solving;
- rigorous interval enclosures for trajectories;
- arbitrary high-order symbolic ODE solving.

These cases must remain unsupported or be delegated to later phases.

## Regression gate

E4 acceptance requires deterministic coverage for at least:

- ODE-system semantic resolution and intrinsic variables;
- separable symbolic solving;
- first-order linear symbolic solving;
- exact differential-equation certification and potential recovery;
- second-order constant-coefficient symbolic solving;
- higher-order-to-system conversion;
- equilibrium detection;
- planar local stability classification;
- adaptive RK45 accuracy on a known IVP;
- event stopping;
- E3 phase-plane adaptation;
- production-engine routing and capability gating.

The final branch must pass the repository's real **Vitest + strict TypeScript + Vite production build** gate before promotion to `main`.
