# E3 — Visualization 2.0

E3 expands MathLab from the P6/M5 unary Cartesian plotter into a semantic-object visualization system. It deliberately reuses E1 multivariable functions and E2 vector-field/region concepts rather than inventing a second expression language.

## Accepted visualization families

### Explicit Cartesian curves
The existing mature P6/M5 renderer remains the Cartesian path for unary scalar functions and expressions. E3 preserves:
- segmented discontinuity-aware sampling;
- pan and cursor-centered zoom;
- exact/numeric zero overlays;
- extrema, inflections, asymptotes and holes where supported;
- trace interaction;
- comparison of up to six explicit functions.

### Parametric curves
Unary two-component function definitions such as:

```text
C(t) := [cos(t), sin(t)]
```

are sampled over a configurable parameter interval and rendered as continuous/discontinuous polylines.

### Polar curves
A unary scalar function may be interpreted as `r(theta)` and mapped by:

```text
x = r(theta) cos(theta)
y = r(theta) sin(theta)
```

The parameter interval is explicit and defaults to a symmetric angular interval.

### Implicit curves
Two-variable equations such as:

```text
x^2 + y^2 = 1
```

are converted to a zero-level scalar field and traced with deterministic marching squares inside the current viewport.

E3 does not claim symbolic implicit-curve solving; this renderer is a numerical geometry view of the represented equation.

### Contours and scalar fields
For scalar fields `f(x,y)`, E3 supports:
- sampled scalar-value grids;
- configurable contour levels;
- marching-squares level sets;
- normalized field shading;
- exact E1 critical-point overlays when the E1 bounded solver can certify them.

### Vector and gradient fields
For two-component fields:

```text
F(x,y) := [P(x,y), Q(x,y)]
```

E3 samples the field on a configurable grid, preserves original magnitudes for inspection and normalizes displayed arrow lengths so direction remains readable across large magnitude ranges.

For scalar fields, **Gradient field** mode derives `grad f` through the exact E1 differentiation engine before sampling it.

### Phase portraits
Two-dimensional autonomous vector fields can be viewed as phase portraits. E3 combines:
- the sampled vector field;
- a deterministic grid of seed points;
- bounded midpoint/RK2-style forward/backward field trajectories.

These trajectories are qualitative visualization aids, not adaptive ODE solutions or stability proofs. First-class ODE systems, equilibrium classification and adaptive integration remain E4 scope.

### Graph surfaces
Two-variable scalar fields can be rendered as sampled graph surfaces:

```text
z = f(x,y)
```

The renderer uses a dependency-free SVG orthographic projection with:
- sampled mesh faces;
- wireframe lines;
- camera azimuth;
- camera elevation;
- zoom;
- value-band surface shading;
- E1 exact critical-point markers when available.

### Parametric surfaces
Two-parameter, three-component functions such as:

```text
S(u,v) := [u, v, u*v]
```

are sampled as parametric surface meshes and rendered through the same SVG 3D projection.

## E2 integration

Visualization 2.0 can display a configurable rectangular region overlay in the 2D stage. This deliberately mirrors the bounded rectangular/base-region geometry used by E2 integration and theorem workflows.

E3 does not yet serialize a general shared Region semantic object. Richer region/curve/surface object ownership belongs to later geometry integration work.

## Workspace synchronization

The Visualization route consumes the active persisted mathematical object when that object is visualizable. Selecting another source in Visualization activates the same workspace object, and **Open in Workspace** returns to its editable symbolic definition.

No visualization-specific copy of the user's formula is maintained.

## Numerical model

The E3 renderer is deterministic. It uses:
- fixed configurable sample grids;
- marching squares for level/implicit curves;
- fixed sample counts for parametric/polar curves;
- normalized arrow geometry for fields;
- bounded deterministic trajectory integration for phase portraits;
- deterministic mesh sampling and orthographic projection for surfaces.

These sampled visualizations are not presented as mathematical proof. Exact E1 annotations are explicitly sourced from the symbolic engine; sampled geometry remains visualization.

## Export

Visualization 2.0 supports:
- SVG export preserving vector geometry;
- PNG raster export from the current SVG scene.

## Explicit boundaries

E3 does **not** claim:
- implicit 3D surfaces or isosurfaces;
- volumetric scalar-field rendering;
- 3D vector fields;
- WebGL/GPU acceleration;
- arbitrary mesh import;
- hidden-surface removal comparable to a full 3D graphics engine;
- general topology/geometry certification;
- exact symbolic implicit plotting;
- adaptive error-certified curve or surface tessellation;
- complex-plane/domain-coloring visualization;
- first-class ODE system solving or stability analysis;
- automatic theorem-region extraction from E2 MathResult objects.

## Completeness-registry effect

Under the fixed M7 22-domain rubric:
- Mathematical visualization moves from **2/5 narrow** to **4/5 strong**.
- Vector calculus remains **3/5 partial**, while E3 adds direct field/curve/surface views to its evidence.
- ODE/dynamical systems remains **2/5 narrow** because phase portraits visualize supplied vector fields but do not add a real ODE-system solver.
- University-domain breadth moves from **41/100** to **43/100**.
- Implemented-domain maturity moves from **56/100** to **59/100**.
- Six major domains remain completely missing.

## Acceptance gate

E3 is accepted only when:
1. the existing P6/M5 Cartesian renderer remains available and legacy visualization tests remain green;
2. parametric and polar curves are regression-tested;
3. implicit and contour marching-squares geometry is regression-tested;
4. scalar-field normalization is regression-tested;
5. vector and exact-gradient field sampling is regression-tested;
6. deterministic phase trajectories are regression-tested;
7. E1 exact critical-point overlays are regression-tested;
8. graph and parametric 3D surfaces are regression-tested;
9. 3D projection is deterministic;
10. semantic objects are routed only to compatible visualization modes;
11. all legacy P4–P15, M-series, E1 and E2 tests remain green;
12. strict TypeScript and the production Vite build pass in GitHub Actions;
13. PWA caches are rotated to the E3 namespace.
