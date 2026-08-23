# E9 Acceptance — Discrete Mathematics II, Algorithms & Number Theory

## Status

**Accepted / complete.**

E9 extends MathLab's existing finite-set, recurrence, complexity, graph, vector/matrix, and exact integer-scalar semantics. It does not introduce a parallel discrete-mathematics or number-theory language.

The phase is deliberately certificate-oriented: all accepted E9 computations are exact inside explicit finite/bounded domains. Unsupported algorithmic or arithmetic cases fail rather than falling back to sampling or heuristic claims.

## Architecture

```text
existing SemanticMathObject
  → E9 capability
  → MathOperationRequest
  → E9MathEngine extends E8MathEngine
  → focused E9 domain module
  → structured MathResult
```

The production Worker instantiates `E9MathEngine`; all E8 and earlier operations continue through cumulative fallback.

The implementation is split by domain:

- `e9Quantifiers.ts`
- `e9RecurrenceComplexity.ts`
- `e9GraphAlgorithms.ts`
- `e9DynamicProgramming.ts`
- `e9NumberTheory.ts`
- shared exact helpers/result contracts

## Finite-domain predicate logic

`finite-quantifier-profile` operates on an existing finite-set object such as `set(-2,-1,0,1,2)`.

The inspector supplies:

- universal `∀` or existential `∃`;
- bound-variable name;
- predicate source.

The predicate is parsed through MathLab's ordinary parser and evaluated **exhaustively** over every represented set element.

Supported predicate baseline:

- exact arithmetic equations;
- exact `<`, `<=`, `>`, `>=`, `!=` comparisons;
- existing `not`, `and`, `or`, `xor`, `implies`, `iff` Boolean connectives.

The result reports a witness for a true existential statement or a counterexample for a false universal statement.

Boundary:

- maximum 256 represented domain elements;
- no infinite-domain quantification;
- no unrestricted first-order theorem prover;
- no SAT/SMT heuristic substitution for exhaustive finite evaluation.

## Recurrences and generating functions

E9 reuses existing recurrence constructors:

- `linrec(a0,c,d)` for `a_n=c a_(n-1)+d`;
- `linrec2(a0,a1,p,q)` for `a_n=p a_(n-1)+q a_(n-2)`.

### Ordinary generating functions

`recurrence-generating-function` derives exact rational ordinary generating functions

`A(x)=Σ_{n≥0} a_n x^n`

for both supported recurrence families.

### Extended closed forms

`recurrence-closed-form-e9` provides exact characteristic-root forms for supported constant-coefficient second-order recurrences, including:

- two distinct real roots;
- a repeated nonzero root with `(A+Bn)r^n`;
- complex-conjugate characteristic roots represented exactly with `i` and radicals.

The degenerate double-zero characteristic root is explicitly refused because the current expression AST lacks a clean finite-support/Kronecker-delta representation for all initial conditions.

E9 does not claim arbitrary nonlinear, nonconstant-coefficient, high-order, or symbolic recurrence solving.

## Extended Master theorem

`extended-master-theorem` reuses existing `master(a,b,k)` objects and adds an explicit configured logarithmic exponent `j` for tolls

`f(n)=Θ(n^k (log n)^j)`.

Accepted boundary:

- integer `a≥1`;
- integer `b≥2`;
- integer `0≤k≤30`;
- integer `0≤j≤20`.

The implementation covers the corresponding bounded Master-theorem cases exactly. It does not claim Akra–Bazzi or a general divide-and-conquer recurrence solver.

## Bellman–Ford

`bellman-ford` operates on existing weighted `wgraph` / `wdigraph` objects.

It provides:

- exact rational edge arithmetic;
- deterministic relaxation passes;
- exact source-to-target shortest distance and path;
- reachable negative-weight-cycle detection.

A reachable negative cycle causes explicit refusal because a finite shortest-path distance is not well-defined.

E9 does not add all-pairs shortest paths or arbitrary graph optimization under this operation.

## Maximum flow / minimum cut

`max-flow-min-cut` requires an existing `wdigraph(...)` object whose weights are interpreted as capacities.

Accepted baseline:

- nonnegative exact rational capacities;
- distinct source/sink vertices;
- deterministic Edmonds–Karp augmenting paths;
- exact maximum-flow value;
- residual-reachability minimum-cut partition;
- exact cut-capacity certificate;
- exact verification that flow value equals cut capacity.

Not included:

- lower-bounded flows;
- min-cost flow;
- circulation with demands;
- multicommodity flow.

## Maximum bipartite matching

`bipartite-matching` operates on existing unweighted undirected `graph(...)` objects.

E9:

1. certifies bipartiteness by two-coloring;
2. refuses non-bipartite graphs;
3. runs deterministic augmenting-path matching;
4. returns an exact maximum-cardinality matching.

Weighted matching and general non-bipartite blossom matching remain outside E9.

## Dynamic programming

### Longest increasing subsequence

`longest-increasing-subsequence` accepts a resolved vector with 1–256 exact numeric entries.

It uses deterministic `O(n²)` dynamic programming and returns:

- exact LIS length;
- one strictly increasing optimal subsequence;
- chosen indices;
- state trace.

### 0/1 knapsack

`knapsack-dp` accepts an `n×2` matrix of `[weight,value]` rows.

Boundary:

- 1–100 items;
- positive integer weights;
- exact rational values;
- integer capacity `0–500`.

The full integer-capacity DP is exact. E9 does not claim unbounded, fractional, multidimensional, or approximation-scheme knapsack support.

## Integer factorization and arithmetic functions

`number-theory-profile` accepts an exact nonzero integer scalar.

It computes:

- deterministic exact prime factorization by bounded trial division;
- primality signal;
- Euler `φ(|n|)`;
- divisor count `τ(|n|)`;
- divisor sum `σ(|n|)`;
- Möbius `μ(|n|)`.

Certified factorization boundary:

`|n| ≤ 10^12`.

This is an undergraduate exact arithmetic tool, not a cryptographic large-integer factorization engine.

## Extended Euclidean algorithm

`extended-gcd` returns exact

- `g=gcd(a,b)`;
- Bézout coefficients `x,y`;
- certificate `ax+by=g`.

Arithmetic uses BigInt integer semantics.

## Modular inverses

`modular-inverse` requires modulus `m>1` and returns the canonical residue in `[0,m)` when `gcd(a,m)=1`.

If the gcd is not one, E9 refuses the operation and exposes the obstruction rather than inventing an inverse.

## Linear congruences

`linear-congruence` solves

`a x ≡ b (mod m)`

for positive modulus `m`.

It:

- checks the exact gcd divisibility criterion;
- refuses inconsistent congruences;
- returns **all** solution residue classes modulo `m` when solutions exist.

## Chinese remainder theorem

`chinese-remainder` accepts a matrix

`[[residue, modulus], ...]`

with 1–20 congruences and moduli greater than one.

The implementation uses the **generalized CRT**:

- coprime systems are supported;
- compatible non-coprime moduli are supported;
- incompatible systems are refused;
- output is a canonical residue and combined modulus.

## Linear Diophantine equations

`linear-diophantine` solves

`a x + b y = c`

over the integers.

It checks the exact gcd divisibility criterion and, when solvable, returns:

- one integer solution;
- the complete one-parameter family
  `x=x0+(b/g)t`, `y=y0-(a/g)t`, `t∈Z`.

Higher-dimensional/general nonlinear Diophantine solving is outside E9.

## Capability and discovery integration

E9 is exposed through the cumulative capability surface on compatible existing objects:

- finite sets → finite quantifier;
- recurrences → generating function / extended closed form;
- `master(...)` complexity objects → extended Master theorem;
- weighted graphs → Bellman–Ford;
- weighted directed graphs → max-flow/min-cut;
- unweighted undirected graphs → bipartite matching;
- vectors → LIS;
- compatible `n×2` matrices → knapsack / CRT;
- integer scalars → number-theory operations.

All E9 tools participate in:

- Workspace capability routing;
- shared inspector controls;
- global Tools catalog;
- `Ctrl+K` discovery;
- production Worker execution.

## Exactness policy

Every accepted E9 mathematical operation is **exact**.

E9 does not use floating approximation, sampling, heuristic optimization, or probabilistic primality/factorization inside its certified baseline.

Algorithm traces are deterministic so regression tests can certify both outcome and execution behavior.

## Explicit non-goals

E9 does not claim:

- infinite-domain first-order theorem proving;
- general SAT/SMT solving;
- unrestricted generating-function algebra;
- arbitrary recurrence solving;
- Akra–Bazzi/general divide-and-conquer solving;
- all-pairs shortest paths as a new E9 workflow;
- advanced flow variants;
- weighted/general graph matching;
- general combinatorial optimization;
- cryptographic-scale factorization;
- probabilistic primality systems;
- algebraic number theory;
- elliptic curves;
- discrete logarithms;
- general polynomial congruence solving;
- higher-dimensional/nonlinear Diophantine equations.

Unsupported cases fail explicitly.

## Regression gate

E9 acceptance requires deterministic regression coverage for:

- universal/existential finite predicates;
- recurrence generating functions;
- second-order characteristic-root closed forms;
- logarithmic Master-theorem extension;
- Bellman–Ford with negative edges;
- negative-cycle refusal;
- max-flow/min-cut equality;
- invalid/negative capacity refusal;
- maximum bipartite matching;
- non-bipartite refusal;
- LIS;
- 0/1 knapsack;
- bounded factorization and arithmetic functions;
- factorization-bound refusal;
- extended GCD;
- modular inverse and noninvertible refusal;
- complete linear congruence classes;
- generalized CRT and inconsistent-system refusal;
- complete linear Diophantine families and unsolvable refusal;
- cumulative capability/discovery integration;
- inherited E8 fallback.

The final branch must pass the repository's real **P15 release audit + Vitest + strict TypeScript + Vite production build** gate before promotion to `main`.
