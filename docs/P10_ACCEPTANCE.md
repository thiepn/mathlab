# P10 Acceptance — Probability & Statistics

P10 extends the same parser → semantic object → capability → Worker → `MathResult` architecture with probability and statistical workflows. It must preserve the distinction between exact probability arithmetic, algebraic distribution facts, numerical tail/quantile calculations, statistical inference, and empirical simulation.

## Statistical datasets

`data(…)` is a first-class dataset constructor. Numeric vectors such as `[1,2,3]` can also use descriptive and one-sample inference workflows.

P10 reports exact rational summaries where possible:

- count, sum, mean, median and modes;
- min/max/range;
- population variance and sample variance separately;
- symbolic standard deviations;
- Tukey median-of-halves Q1/Q3, IQR and 1.5×IQR outlier fences.

Quartile convention must be stated because different software packages use different quantile definitions for small samples.

## Exact probability and combinatorics

Recognized probability objects include:

- `choose(n,k)`;
- `permute(n,k)`;
- `conditional(PAB, PB)`;
- `bayes(PA, PBgivenA, PB)`;
- `unionprob(PA, PB, PAB)`;
- `independentjoint(PA, PB)`;
- `complement(PA)`.

These are exact rational/integer workflows and must reject impossible probabilities or zero conditioning/evidence probabilities.

## Distribution objects

Supported first-class distributions:

- `bernoulli(p)`;
- `binomial(n,p)`;
- `geometric(p)` using trial count until first success;
- `poisson(lambda)`;
- `uniform(a,b)`;
- `normal(mu,sigma)`.

Profiles expose support, discrete/continuous type, expectation, variance and standard deviation. Parameters must resolve and satisfy the distribution domain.

## Distribution probabilities and quantiles

P10 provides:

- point probabilities for discrete distributions;
- exact point probability zero for continuous distributions;
- lower/upper/between probabilities;
- quantiles;
- explicit approximate labeling for normal tails/quantiles and bounded numerical Poisson threshold calculations.

P10 must not present an erf/normal-CDF approximation as exact arithmetic.

## Sampling distributions

For the sample mean, P10 reports exact expectation/variance/standard-error formulas. If the source population is normal, normality of the sample mean is exact. For supported non-normal distributions, CLT normality is only described as an approximation and only surfaced by default for sufficiently large n.

## Confidence intervals and hypothesis tests

Dataset workflows include:

- one-sample Student-t confidence intervals for a mean;
- one-sample Student-t tests;
- Wilson confidence intervals for a binary proportion;
- large-sample one-proportion z tests.

Statistical results must expose their assumptions and numerical nature. `p < 0.05` must not be rewritten into a universal scientific conclusion. One-proportion z tests warn when expected successes/failures are small.

## Correlation and regression

An `n×2` numeric matrix represents paired observations for P10 simple linear regression. P10 reports exact rational slope/intercept/R² where possible and Pearson r as an exact signed square root. It must explicitly state that linear association does not establish causation.

## Simulation

Distribution simulation is deterministic for a supplied integer seed and supports up to 10,000 draws. Simulation results are labeled heuristic/empirical and must never replace exact distribution or inference results.

## Correctness boundaries

P10 intentionally defers:

- arbitrary multivariate datasets/dataframes;
- weighted/robust statistics beyond the listed summaries;
- exact binomial hypothesis tests and Fisher exact tests;
- ANOVA, chi-square workflows and nonparametric tests;
- multivariable regression;
- general maximum-likelihood estimation;
- Bayesian posterior distributions beyond exact Bayes-rule arithmetic;
- arbitrary distribution composition/convolution;
- high-accuracy specialist numerical libraries.

## Regression requirement

Representative P4–P9 algebra, calculus, visualization, linear algebra and analysis behavior must remain deterministic after P10.
