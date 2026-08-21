# P11 Acceptance — Discrete Math & Algorithms

P11 extends the same parser → semantic object → capability → Worker → `MathResult` architecture with deterministic discrete mathematics and bounded algorithm tracing. It must not create a disconnected graph/logic calculator or silently replace exact discrete reasoning with random/heuristic output.

## 1. Propositional logic

Supported proposition syntax is constructor-based: `not(p)`, `and(p,q,...)`, `or(...)`, `xor(p,q)`, `implies(p,q)`, and `iff(p,q)`. P11 must:

- exhaustively enumerate truth assignments for up to six variables;
- classify tautologies, contradictions, and contingencies;
- report satisfying-assignment counts;
- construct canonical DNF and CNF from the truth table;
- state that canonical normal forms are not necessarily minimal.

No SAT heuristic may be presented as exhaustive proof.

## 2. Finite sets

`set(a,b,c)` is a finite-set object. P11 must normalize duplicate elements and support:

- cardinality;
- union/intersection/difference/symmetric difference;
- subset checking;
- Cartesian products;
- explicit power sets for at most 10 elements.

Explicit expansion must be bounded to prevent combinatorial UI/runtime blowups.

## 3. Relations

`relation(n, [[a,b],...])` defines a relation on `{1,…,n}`. P11 must report:

- reflexive / irreflexive;
- symmetric / antisymmetric / asymmetric;
- transitive;
- equivalence relation;
- partial order / total order.

It must also provide exact reflexive, symmetric and transitive closures, equivalence classes when applicable, and Hasse cover/minimal/maximal/least/greatest information for partial orders.

## 4. Graph objects and algorithms

Graph constructors:

- `graph(n, [[u,v],...])`;
- `digraph(n, [[u,v],...])`;
- `wgraph(n, [[u,v,w],...])`;
- `wdigraph(n, [[u,v,w],...])`.

Vertices are `1,…,n`. P11 must support deterministic graph profiles and:

- degree / in-out degree;
- components for undirected graphs;
- cycle detection;
- bipartiteness;
- tree recognition;
- undirected Euler trail/circuit criterion;
- adjacency matrices;
- BFS and DFS traces using ascending-neighbor order;
- unweighted shortest paths through BFS;
- exact-rational Dijkstra for nonnegative weighted graphs;
- topological sorting with cycle rejection;
- Kruskal MST for undirected weighted graphs.

P11 graph workflows are bounded to 100 vertices and 1000 edges. The constructors model simple graphs: parallel or duplicate edges are rejected explicitly rather than silently collapsed. Self-loops remain representable where the selected algorithm supports them. Negative-weight shortest paths are explicitly deferred rather than incorrectly passed through Dijkstra.

## 5. Recurrences

P11 provides exact first- and second-order linear recurrence objects:

- `linrec(a0,c,d)` means `a_n = c a_(n-1) + d`;
- `linrec2(a0,a1,p,q)` means `a_n = p a_(n-1) + q a_(n-2)`.

It must generate exact rational terms. First-order recurrences receive an exact closed form. Second-order recurrences expose the exact characteristic polynomial, while general algebraic coefficient solving remains explicitly deferred.

## 6. Asymptotic complexity

`complexity(f(n))` must recognize bounded combinations of:

- constants;
- polynomial powers;
- logarithmic powers;
- products and sums of supported forms;
- rational-base exponentials `a^n`, `a>1`.

It must return a tight Θ-class, not merely an upper O-bound.

`master(a,b,k)` represents `T(n)=aT(n/b)+Θ(n^k)` and must apply the basic three-case Master theorem exactly by comparing `a` with `b^k`.

## 7. Discrete combinatorics

Separate from P10 probability arithmetic, P11 supports exact:

- multinomial coefficients;
- stars-and-bars counts;
- derangements;
- Stirling numbers of the second kind;
- Bell numbers;
- generalized pigeonhole lower bounds.

Every explicit dynamic-programming or factorial computation has a stated bound.

## 8. Array/data-structure algorithm workflows

Numeric vectors remain P7/P10 vectors while gaining P11 capabilities:

- insertion/selection/bubble/merge sort traces;
- exact comparison/write counts for the executed trace;
- binary-search traces on pre-sorted vectors;
- binary min/max-heap structural checks.

Algorithm traces must be deterministic and expose their complexity statement separately from the observed operation count.

## 9. Exactness and safety

P11 results are exact/deterministic unless explicitly stated otherwise. Important correctness boundaries include:

- truth tables: ≤6 variables;
- power sets: ≤10 elements;
- graph size: ≤100 vertices / ≤1000 edges;
- nonnegative weights for Dijkstra;
- MST only for undirected weighted graphs;
- topological sort only for directed graphs;
- recurrence preview: ≤100 terms;
- complexity recognition only for supported asymptotic families;
- no claim of general SAT solving, general symbolic recurrence solving, Bellman–Ford/Floyd–Warshall shortest paths, max-flow, matching, or arbitrary data-structure simulation.

Unsupported cases must fail clearly rather than return a plausible-looking approximation.

## 10. Regression

Representative P4–P10 algebra, calculus, visualization, linear algebra, analysis, probability and statistics behavior must remain deterministic after P11. New P11 tests must cover semantic routing, truth tables, set algebra, relation properties/closures, graph traversal/shortest path/MST/topological sort, recurrences, Master theorem, discrete combinatorics, sorting, binary search, and heaps.
