# E6 Acceptance — Probability & Statistics II

E6 extends MathLab's existing `dataset`, `matrix`, and `distribution` semantic objects. It does **not** introduce a second statistics language or a disconnected family of calculator pages.

## Accepted architecture

E6 preserves the cumulative computation flow:

```text
Input → AST → Semantic Object → Capability → MathOperationRequest
      → E6MathEngine → structured MathResult → Workspace / Tools
```

`E6MathEngine` extends E5 and is the production Worker engine. Earlier P/E operations remain available through the inherited engine chain.

The accepted representation deliberately reuses existing mathematical objects:

- `data(...)` / one-row vectors for univariate samples and category counts;
- matrices for multivariate observations, paired/two-sample data, contingency tables, ANOVA groups, regression designs, and finite Markov transition matrices;
- distribution objects for P10 families and the new E6 univariate families;
- `jointpmf(...)` as the one new joint-distribution constructor required by this phase.

## Extended univariate distributions

E6 adds first-class semantic distribution constructors:

- `exponential(lambda)` with `lambda > 0`;
- `chisquare(df)` with `df > 0`;
- `studentt(df)` with `df > 0`;
- `fdist(df1,df2)` with positive degrees of freedom.

These distributions participate in the existing P10 operation IDs for:

- profile / moments;
- CDF, tail and interval probability;
- quantiles;
- sampling-mean profiles when finite moments exist;
- deterministic seeded simulation.

CDFs and quantiles are evaluated numerically using bounded gamma/beta special-function routines and deterministic numerical inversion where required. They are therefore exposed as **approximate**.

Continuous E6 quantiles require `0 < p < 1`; endpoint requests that imply non-finite quantiles are rejected explicitly.

## Joint discrete distributions

E6 accepts finite tables of the form:

```text
jointpmf([[p00,p01,...],[p10,p11,...],...])
```

with:

- nonnegative entries;
- total probability equal to 1 to tolerance;
- rectangular finite support.

The current support convention is explicit and deterministic:

- row `i` represents `X=i`;
- column `j` represents `Y=j`.

For that represented support E6 reports:

- `X` marginal;
- `Y` marginal;
- `E[X]` and `E[Y]`;
- variances;
- covariance;
- correlation when both marginal variances are positive.

Users with non-zero-based support labels must transform the random variables explicitly rather than relying on an implicit hidden support mapping.

## Random-variable transformations

For a supported univariate distribution and configured affine transform

```text
Y = aX + b
```

E6 propagates:

- `E[Y] = aE[X] + b`;
- `Var(Y) = a² Var(X)`;
- standard deviation where finite.

The moment identities are mathematical identities; displayed decimal evaluation is binary64 and therefore marked approximate.

General nonlinear random-variable transformations and Jacobian-based density transformation are outside E6.

## Covariance and correlation matrices

For a resolved real numeric matrix:

- rows are independent observations;
- columns are variables;
- sample covariance uses denominator `n-1`;
- Pearson correlation is derived from the sample covariance matrix.

A correlation matrix is refused if any variable has zero sample variance. E6 does not print `NaN` correlations as if they were meaningful results.

## Two-sample mean inference

For an `n×2` matrix with one independent sample in each column, E6 uses Welch inference:

- separate sample means and variances;
- Welch standard error;
- Welch–Satterthwaite degrees of freedom;
- Student-t p-value;
- confidence interval for the mean difference.

Equal population variances are **not** assumed. Independence between samples remains a modeling assumption that cannot be inferred from the numeric matrix alone.

A zero estimated standard error is rejected rather than producing an infinite/undefined test statistic.

## Paired mean inference

For an `n×2` matrix whose rows are matched pairs:

- pairwise differences are formed in row order;
- a one-sample t workflow is applied to those differences;
- mean difference, standard error, degrees of freedom, p-value and confidence interval are returned.

Rows are semantically paired. A zero sample variance in the paired differences is rejected explicitly.

## Two-proportion inference

For an `n×2` matrix:

- every observation must be exactly `0` or `1`;
- column success proportions are compared;
- the null test uses the pooled large-sample standard error;
- the interval uses the unpooled Wald standard error;
- alternative hypotheses are configurable.

This workflow is **approximate**. Small/extreme samples may require exact procedures outside E6. All-success/all-failure inputs with zero pooled standard error are refused.

## Chi-square procedures

### Goodness of fit

Observed category counts come from `data(...)` or a vector. Expected input may be:

- positive expected counts summing to the observed total; or
- positive proportions summing to 1.

E6 returns the chi-square statistic, degrees of freedom and asymptotic p-value.

### Independence

A resolved numeric matrix is treated as a contingency table of nonnegative integer counts. E6 reports:

- expected counts;
- chi-square statistic;
- degrees of freedom;
- asymptotic p-value;
- Cramér's V.

Both chi-square workflows warn when expected counts below 5 make the asymptotic approximation questionable. Fisher/exact categorical tests are outside the accepted E6 scope.

## One-way ANOVA

E6's baseline ANOVA representation uses a rectangular matrix:

- each column is one group;
- every group therefore has the same number of represented observations;
- at least two groups and at least two observations per group are required.

The workflow reports:

- group means;
- between/within sums of squares;
- F statistic;
- degrees of freedom;
- F-distribution p-value;
- eta-squared effect size.

The classical independence/normal-error/comparable-variance assumptions are surfaced as analysis assumptions, not inferred from the data. A zero within-group mean square is refused as a degenerate classical F-test case.

Unequal-length group storage, Welch ANOVA and repeated-measures ANOVA are outside this phase.

## Multiple linear regression

For a resolved real matrix:

```text
[x1, x2, ..., xp, y]
```

- the final column is the response;
- all preceding columns are predictors;
- an intercept column is included automatically;
- there must be more observations than fitted coefficients;
- singular/rank-deficient normal equations fail explicitly.

E6 reports:

- OLS coefficient vector;
- coefficient standard errors;
- t statistics and approximate t p-values;
- `R²`;
- adjusted `R²`;
- residual standard error and degrees of freedom.

Classical coefficient inference relies on the ordinary linear-model assumptions. The numeric matrix alone cannot prove linearity, independence, homoscedasticity or normal errors.

A constant response column is rejected because the standard `R²`/diagnostic interpretation is undefined.

## Regression diagnostics

For the same OLS representation, E6 provides bounded diagnostics:

- raw residuals;
- standardized residuals;
- leverage;
- Cook's distance;
- variance-inflation factors;
- threshold-oriented warning signals.

These diagnostics are **diagnostic evidence, not automatic assumption proofs**. They do not replace residual plots, design review, domain knowledge or formal model criticism.

## Nonparametric tests

E6 adds:

- Mann–Whitney U for two sample columns;
- Wilcoxon signed-rank for matched row pairs.

Ties are handled with average ranks and tie corrections. The reported p-values use normal approximations with continuity/tie correction and are therefore **approximate**, not exact small-sample permutation/enumeration results.

## Bootstrap / resampling

For a univariate sample, E6 provides a deterministic seeded percentile bootstrap for the sample mean:

- 100–10,000 resamples;
- configured confidence level;
- reproducible seed;
- bootstrap bias diagnostic;
- percentile confidence interval.

Bootstrap output is explicitly **heuristic/resampling evidence** conditional on the observed sample. It is not presented as an exact coverage theorem.

BCa intervals, bootstrap regression, permutation tests and general resampling pipelines are outside E6.

## Finite Markov chains

A resolved real square matrix may be used as a transition matrix when:

- every entry lies in `[0,1]`;
- every row sums to 1 to tolerance.

E6 provides:

- state count;
- row-stochastic certification;
- reachability-based irreducibility signal;
- self-loop signal;
- numerical stationary candidate by power iteration from a uniform initial distribution;
- configured finite-step propagation from a supplied probability vector.

For an irreducible finite chain, a detected self-loop is stated only as a sufficient aperiodicity condition. E6 does not claim a complete period decomposition.

Stationary and propagated decimals are **approximate** binary64 results.

## Exactness / provenance policy

E6 uses the existing MathLab exactness vocabulary deliberately:

- special-function distribution CDFs/quantiles: **approximate**;
- joint-distribution decimal summaries: **approximate**;
- covariance/correlation and parametric inference: **approximate**;
- chi-square/ANOVA/regression inference: **approximate**;
- rank-test normal approximations: **approximate**;
- finite Markov numerical results: **approximate**;
- bootstrap resampling: **heuristic**.

No p-value, confidence interval, bootstrap interval, regression diagnostic or numerical stationary distribution is labeled exact merely because the algorithm is deterministic.

## Explicit failure boundaries

E6 must refuse rather than fabricate results for cases such as:

- invalid distribution parameters;
- non-finite continuous quantile endpoints;
- joint PMFs that are negative or not normalized;
- unresolved/non-real statistical matrices;
- zero-variance correlation columns;
- zero-standard-error Welch/paired/two-proportion tests;
- non-binary two-proportion observations;
- invalid expected-count vectors;
- invalid contingency counts;
- zero within-group ANOVA error variance;
- rank-deficient OLS normal equations;
- constant-response OLS diagnostics;
- invalid row-stochastic matrices or initial Markov distributions.

## Explicit non-goals

E6 does **not** claim:

- a general symbolic probability algebra;
- arbitrary continuous joint densities or copulas;
- general nonlinear random-variable density transformations;
- Bayesian posterior modeling, conjugate-prior systems or MCMC;
- generalized linear models;
- logistic/Poisson regression;
- mixed-effects/hierarchical models;
- survival analysis;
- MANOVA or broad multivariate distribution theory;
- unequal-length ANOVA group objects, Welch ANOVA or repeated-measures ANOVA;
- exact small-sample Mann–Whitney/Wilcoxon enumeration;
- Fisher's exact test;
- BCa/general bootstrap frameworks;
- time-series models such as ARIMA;
- continuous-time Markov chains;
- stochastic differential equations;
- full communicating-class / recurrent-transient / period decomposition;
- hidden causal claims from regression or association statistics.

Unsupported mathematics must fail explicitly or remain outside capability discovery rather than returning plausible-looking output.

## Discovery integration

E6 also consolidates the expansion tool catalog used by the Tools page and global `Ctrl+K` command palette. E4, E5 and E6 extension tools therefore share one discoverable catalog source rather than being visible only on one navigation surface.

## Release gate

E6 is accepted only when the exact branch head passes the real repository `Check MathLab` workflow covering:

- P15 release audit;
- complete Vitest regression suite, including E6 mathematical and boundary tests;
- strict TypeScript compilation;
- Vite production build.

The final accepted head must be the exact head merged into `main`.