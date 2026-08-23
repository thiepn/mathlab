# E10 Acceptance — PDEs, Abstract Structures & Geometry Foundations

## Status

**Accepted / complete.**

E10 adds bounded foundations for three areas that were still structurally thin after E9: canonical PDE problems, finite abstract algebra, and geometry/topology. The phase introduces first-class semantic objects only where the pre-E10 object model could not own the required mathematical structure cleanly.

E10 is intentionally a foundation phase. It does not claim comprehensive PDE solving, abstract algebra, geometry, or topology.

## Architecture

```text
Input
  → existing parser / AST
  → E10 first-class semantic object where required
  → cumulative capability registry
  → MathOperationRequest
  → E10MathEngine extends E9MathEngine
  → focused E10 domain module
  → structured MathResult
```

The production Worker instantiates `E10MathEngine`, preserving E9 and all earlier engine fallback.

New semantic kinds are:

- `pde`
- `finite-group`
- `finite-ring`
- `homomorphism`
- `metric-space`
- `topology`
- `point-set`
- `geometry`

The corresponding new shapes retain bounded structural metadata such as PDE family/mode count, finite order, topology point/open-set counts, point-set dimension, and geometry family/dimension.

## Canonical PDE problem objects

E10 introduces three explicit constructors rather than pretending to parse arbitrary differential notation into a general PDE solver:

- `heatpde(L, alpha, [b1,...,bN])`
- `wavepde(L, c, [a1,...,aN], [b1,...,bN])`
- `laplacepde(L, H, [b1,...,bN])`

The represented coefficient vectors contain **1–20 exact modal coefficients**.

All geometric/physical scalar parameters represented by these constructors must be positive exact rationals.

### Heat equation

The accepted problem is

`u_t = alpha u_xx`

on `0 < x < L`, with homogeneous Dirichlet boundary conditions and represented sine-series initial data.

E10 owns:

- the PDE family;
- the interval length;
- diffusivity;
- zero boundary conditions;
- represented initial sine coefficients.

The exact finite represented solution is

`sum b_n exp(-alpha (n pi/L)^2 t) sin(n pi x/L)`.

### Wave equation

The accepted problem is

`u_tt = c^2 u_xx`

with homogeneous Dirichlet endpoint conditions and represented displacement/velocity sine coefficients.

Displacement and velocity coefficient vectors must have equal length.

The exact represented solution uses the standard separated sine spatial modes and cosine/sine time modes.

### Rectangular Laplace equation

The accepted problem is

`u_xx + u_yy = 0`

on a rectangle of width `L` and height `H`, with zero boundary data on the sides and bottom and represented sine-series data on the top boundary.

The exact represented finite solution uses

`sin(n pi x/L) sinh(n pi y/L) / sinh(n pi H/L)`.

## PDE operations

### `pde-profile`

Reports:

- canonical family/equation;
- second order;
- linearity;
- homogeneous PDE status;
- represented mode count;
- owned initial/boundary conditions.

### `pde-separation-template`

Reports the exact separation-of-variables/eigenfunction template appropriate to the supported canonical problem.

### `pde-modal-solution`

Constructs the exact **finite modal solution represented by the supplied coefficients**.

This is not an infinite-series convergence certificate and does not infer Fourier coefficients from arbitrary functions.

## PDE non-goals

E10 does not claim:

- arbitrary PDE syntax or classification;
- nonlinear PDE solving;
- variable-coefficient general PDE solving;
- arbitrary spatial domains;
- automatic Fourier-coefficient extraction from arbitrary initial/boundary functions;
- general boundary-condition algebra;
- weak/distributional solutions;
- Sobolev-space theory;
- finite-difference, finite-element, finite-volume, or spectral numerical PDE solvers;
- general elliptic/parabolic/hyperbolic theory;
- convergence/error theorems for infinite modal expansions.

Unsupported PDEs remain outside the represented constructors.

## Finite groups

Finite groups use

`group(cayleyTable)`.

Accepted table boundary:

- order `1–16`;
- exact integer labels `1,...,n`;
- square table;
- every table entry must belong to the represented element set.

`finite-group-profile` checks exhaustively:

- closure by table membership;
- associativity;
- two-sided identity;
- two-sided inverses;
- commutativity/Abelian status;
- exact element orders;
- cyclicity by existence of an element of full group order.

All claims are exact finite certificates.

## Subgroups

`subgroup-check` accepts a configured finite subset such as `set(1,3)` and checks exactly:

- nonemptiness;
- identity membership;
- closure under the operation;
- closure under inverses.

The operation requires the parent Cayley table to have already certified a valid finite group.

## Finite rings and fields

Finite rings use

`ring(additionTable, multiplicationTable)`.

Both tables must have the same order, at most 16.

`finite-ring-profile` checks exhaustively:

- additive abelian-group structure;
- multiplication associativity;
- left and right distributive laws;
- additive identity;
- multiplicative identity when present;
- commutative multiplication;
- units;
- zero divisors;
- field status.

Field certification means the represented structure is a commutative finite ring with identity in which every nonzero element is a unit.

E10 does not silently assume a multiplicative identity when the table lacks one.

## Finite group homomorphisms

Group maps use

`grouphom(sourceTable, targetTable, [f(1),...,f(n)])`.

Both source and target tables must define valid finite groups.

`group-homomorphism-profile` exhaustively checks

`f(ab) = f(a)f(b)`

for every source pair.

When operation preservation is certified, E10 derives exactly:

- kernel;
- image;
- injectivity;
- surjectivity;
- isomorphism status.

A failing map returns a concrete operation-preservation counterexample rather than kernel/image claims.

## Abstract-algebra non-goals

E10 does not claim:

- infinite groups/rings;
- finitely presented groups;
- normal-subgroup/quotient-group automation;
- Sylow-theorem machinery;
- direct/semidirect products;
- group actions;
- representation theory;
- ideals/quotient rings;
- polynomial rings;
- extension fields;
- module theory;
- category-theoretic algebra;
- general symbolic algebraic-structure proving.

## Finite metric spaces

Finite metric spaces use

`metricspace(distanceMatrix)`.

Accepted boundary:

- `1–24` points;
- exact rational distances;
- square matrix.

`metric-space-profile` certifies exactly:

- nonnegativity;
- identity of indiscernibles;
- symmetry;
- triangle inequality.

For a valid finite metric space it also reports:

- exact diameter;
- exact minimum positive separation when present;
- compactness, using finiteness;
- discrete induced topology, using positive minimum separation in finite metrics;
- connectedness (`Yes` only for the one-point finite metric space).

Exact rational display is preserved, including denominators such as `1/10`.

### Metric balls

`metric-ball` computes exact open or closed balls from:

- a 1-based represented center point;
- an exact nonnegative rational radius.

No numerical tolerance is used.

## Finite topological spaces

Finite topologies use

`topology(openSetIncidenceMatrix)`.

Each row is a `0/1` incidence vector for one represented open subset.

Accepted boundary:

- `1–16` points;
- exact binary incidence entries;
- duplicate open rows are canonicalized.

`finite-topology-profile` certifies the finite topology axioms by checking:

- empty set;
- whole space;
- pairwise unions;
- pairwise finite intersections.

For a finite family, binary-union closure is sufficient for arbitrary finite unions, and every represented union is finite.

It also derives exactly:

- closed sets by complement;
- clopen sets;
- discrete/indiscrete status;
- `T0`;
- `T1`;
- connectedness via absence of nontrivial clopen sets;
- compactness from finiteness.

### Subset topology diagnostics

`topology-subset-profile` accepts a represented subset and computes exactly:

- open/closed/clopen status;
- interior;
- closure;
- boundary.

The topology itself must first certify as valid.

## Topology/metric non-goals

E10 does not claim:

- general infinite metric spaces;
- symbolic metric-function proving;
- normed/Banach/Hilbert-space foundations;
- general bases/subbases/product/quotient topologies;
- continuous-map/homeomorphism engines;
- compactness or connectedness proving on arbitrary infinite spaces;
- homotopy/fundamental groups;
- homology/cohomology;
- manifolds or differential topology.

## Exact point-set geometry

Finite point sets use

`pointset([[x1,y1,...], ...])`.

Accepted boundary:

- `1–64` points;
- exact rational coordinates;
- ambient dimension exactly `2` or `3`.

### `point-set-profile`

Computes exactly:

- point count;
- ambient dimension;
- affine dimension via exact rational row rank;
- distinct-point count;
- exact centroid;
- exact coordinate bounds;
- collinearity;
- coplanarity where meaningful.

### `point-distance-matrix`

Builds the exact Euclidean distance matrix.

Irrational distances remain symbolic radicals such as `sqrt(2)` rather than being decimalized.

### `affine-hull-profile`

Recovers a bounded exact affine hull as appropriate:

- a point;
- an exact 2D line equation;
- a 3D parametric line;
- an exact 3D plane equation;
- full `R^2` or `R^3` when the points affinely span the ambient space.

## Geometry ownership foundation

E10 introduces semantic ownership for geometry that E2/E3 previously carried mainly through operation/visualization controls:

- `rectregion(x0,x1,y0,y1)`
- `paramcurve([x(t),y(t)[,z(t)]], t0,t1)`
- `graphsurface(g(x,y),x0,x1,y0,y1)`

`geometry-profile` validates and reports the represented geometry/bounds.

Bound parameters are exact rational values. Lower bounds must be strictly below upper bounds.

This is a **semantic ownership foundation**. E10 does not claim that the existing E3 renderer automatically visualizes every new geometry object directly; that integration can be performed in a later cross-domain phase without redefining the geometry.

## Geometry non-goals

E10 does not claim:

- general computational geometry;
- convex-hull/Delaunay/Voronoi algorithms;
- arbitrary implicit geometry ownership;
- mesh processing;
- manifold/surface topology;
- symbolic exact arc length/surface area for every owned object;
- automatic E3 rendering of every E10 geometry kind.

## Capability and discovery integration

E10 operations participate in:

- first-class semantic resolution;
- cumulative capability routing;
- shared inspector controls;
- Workspace suggested actions;
- global Tools catalog;
- `Ctrl+K` discovery;
- production Worker execution through `E10MathEngine`.

The older exhaustive input-label/default-example/base-capability registries were extended explicitly for the new object kinds rather than having their TypeScript exhaustiveness weakened.

## Exactness policy

All accepted E10 mathematical certificates are **exact**.

E10 uses:

- exact rational arithmetic for represented metric/geometry coordinates and coefficients;
- exact finite enumeration for algebra and topology axioms;
- symbolic AST formulas for canonical PDE modal solutions and irrational Euclidean distances.

No E10 accepted operation is promoted from floating-point sampling or heuristic evidence.

## Regression gate

E10 acceptance requires deterministic coverage for at least:

- first-class semantic promotion for every new E10 kind;
- heat PDE classification/conditions;
- exact finite heat modal solution;
- wave/Laplace separation templates;
- invalid/nonpositive PDE parameter refusal;
- wave coefficient-length refusal;
- finite group certification;
- invalid-group refusal for subgroup analysis;
- subgroup certification;
- finite field certification;
- finite group homomorphism/isomorphism certification;
- non-homomorphism counterexample behavior;
- metric axioms;
- metric triangle-inequality failure;
- exact open/closed metric balls;
- negative-radius refusal;
- fractional exact metric display such as `1/10`;
- finite topology certification;
- invalid-topology refusal;
- open/closed/interior/closure/boundary diagnostics;
- exact point-set affine dimension/centroid;
- symbolic irrational Euclidean distances;
- exact affine line/plane hull recovery;
- point-dimension boundary refusal;
- semantic region/curve/surface ownership;
- invalid geometry-bound refusal;
- global capability/discovery integration;
- inherited E9 fallback.

The final branch must pass the repository's real **P15 release audit + Vitest + strict TypeScript + Vite production build** gate before promotion to `main`.
