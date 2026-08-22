# E2 — Vector Calculus & Multivariable Integration

E2 builds directly on E1's multivariable function semantics. It adds deterministic bounded integration geometry and vector-field calculus without claiming a general region/surface engine or a theorem prover.

## Accepted scope

### Iterated multivariable integration
- double integrals for scalar functions/expressions of two variables;
- triple integrals for scalar functions/expressions of three variables;
- explicit inner → outer integration order;
- simple nested bounds where an inner bound may depend on variables integrated later;
- exact evaluation when every nested antiderivative is covered by the existing verified P5 integration engine;
- deterministic composite Simpson fallback for constant numeric rectangular boxes when an exact antiderivative is unavailable;
- exactness is surfaced as `exact` or `approximate`; numerical fallback is never presented as symbolic proof.

### Coordinate systems
- polar substitution in two dimensions;
- cylindrical substitution in three dimensions;
- spherical substitution in three dimensions;
- automatic Jacobian factors:
  - polar `r`;
  - cylindrical `r`;
  - spherical `rho^2 sin(phi)`;
- the transformed integrand and coordinate map are exposed in structured results.

### Vector fields
Vector fields reuse E1's vector-valued function representation:

```text
F(x,y) := [P(x,y), Q(x,y)]
F(x,y,z) := [P(x,y,z), Q(x,y,z), R(x,y,z)]
```

E2 provides:
- vector-field profile;
- exact divergence;
- scalar 2D curl;
- vector 3D curl;
- bounded conservative-field test;
- exact scalar-potential reconstruction for supported curl-free fields, verified by differentiating the candidate potential back to the field.

A zero curl is reported with the usual topology/domain qualification: it is not presented as a global certificate on arbitrary punctured or non-simply-connected domains.

### Curves and line integrals
- parameterized curves written as vectors such as `[t,t^2]` or `[cos(t),sin(t),t]`;
- scalar line integral `∫_C f ds`;
- work/circulation integral `∫_C F·dr`;
- exact evaluation when the pulled-back one-variable integrand is supported;
- deterministic Simpson fallback for constant parameter intervals when exact integration is unavailable.

### Graph surfaces
E2 supports surfaces represented as graphs over rectangular base regions:

```text
z = g(x,y)
```

Supported operations:
- scalar surface integral `∫∫_S f dS`;
- oriented vector flux `∫∫_S F·n dS`;
- upward or downward graph orientation;
- exact derivatives of the graph surface normal;
- exact or deterministic approximate base-region integration.

### Integral theorems
E2 includes computational verification workflows for bounded canonical geometries:

- **Green's theorem** on constant rectangular regions with counterclockwise boundary orientation;
- **Gauss/divergence theorem** on constant rectangular boxes with outward face normals;
- **Stokes' theorem** for graph surfaces over constant rectangular bases with boundary orientation derived from the chosen graph normal.

Each theorem workflow computes both sides independently and reports:
- both values;
- exact/approximate status;
- their difference;
- VERIFIED / NOT VERIFIED.

These are computational checks for the represented geometry, not general formal proofs that every theorem hypothesis holds.

## Region model

E2 intentionally avoids introducing a misleading free-form region parser. Region information is structured through operation controls:

- ordered iterated bounds;
- rectangular base domains;
- rectangular boxes;
- parameter intervals;
- graph surfaces.

This gives the later E3/E5/E12 phases a stable base from which a richer geometry/region model can be built.

## Product integration

E2 operations are exposed through:
- Workspace capabilities and suggested vector-field actions;
- Tools & Inspector controls;
- the searchable Tools catalog under **Vector Calculus**;
- Reference through the shared catalog;
- structured MathResult/MathML rendering;
- the normal worker execution boundary.

## Explicit boundaries

E2 does **not** claim:
- arbitrary implicit regions;
- automatic order reversal for general double/triple integrals;
- arbitrary changes of coordinates;
- general parametric or implicit surfaces;
- arbitrary closed surfaces;
- singular/improper multivariable integration;
- adaptive multidimensional cubature with rigorous error certificates;
- generalized differential forms;
- formal theorem-hypothesis proofs;
- vector-field, contour, or surface visualization (E3);
- global topology certification for conservative fields.

## Completeness-registry effect

Under the fixed M7 22-domain rubric:
- Vector calculus & multivariable integration moves from **0/5 missing** to **3/5 partial**.
- Multivariable calculus remains **3/5 partial**, while double/triple integration moves out of its recorded gap list.
- University-domain breadth moves from **38/100** to **41/100**.
- Implemented-domain maturity remains **56/100** because a newly activated domain enters at a deliberately partial level.
- Missing major domains fall from seven to six.

## Acceptance gate

E2 is accepted only when:
1. all legacy P4–P15, M-series and E1 tests remain green;
2. exact variable-bound double integration is tested;
3. exact triple integration is tested;
4. polar/cylindrical/spherical Jacobian transforms are tested;
5. divergence/curl and conservative/potential workflows are tested;
6. line and graph-surface flux workflows are tested;
7. Green, Gauss and Stokes canonical verification cases are tested;
8. numerical fallback is tested and explicitly marked approximate;
9. scalar-field vs vector-field capability applicability is tested;
10. TypeScript and production Vite build pass in GitHub Actions;
11. service-worker caches are rotated to the E2 namespace.
