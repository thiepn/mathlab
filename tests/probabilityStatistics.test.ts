import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { LocalMathEngine } from '../src/lib/math/localEngine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new LocalMathEngine();

async function run(input: string, operation: string, options?: Record<string, string | number | boolean>) {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
  const object = resolveSemanticObject(parsed, [], []).object;
  expect(object).not.toBeNull();
  return engine.execute({ id: `${operation}:${input}`, operation, input, ast: object!.valueAst, options });
}

describe('P10 probability and statistics', () => {
  it('creates dataset, distribution and probability semantic objects', () => {
    const data = resolveSemanticObject(parseMath('D := data(1,2,3)'), [], []).object!;
    const distribution = resolveSemanticObject(parseMath('X := binomial(10,1/2)'), [], []).object!;
    const probability = resolveSemanticObject(parseMath('q := bayes(1/10,1/2,1/4)'), [], []).object!;
    expect(data.kind).toBe('dataset');
    expect(data.shape).toEqual({ type: 'dataset', size: 3 });
    expect(distribution.kind).toBe('distribution');
    expect(distribution.shape).toEqual({ type: 'distribution', family: 'binomial' });
    expect(probability.kind).toBe('probability');
    expect(capabilitiesFor(distribution).some((item) => item.id === 'distribution-probability' && item.available)).toBe(true);
  });

  it('computes exact descriptive summaries and keeps sample/population variance separate', async () => {
    const result = await run('data(1,2,3,4)', 'descriptive-statistics');
    expect(result.sections?.[0].facts.find((fact) => fact.label === 'Mean')?.display).toBe('5/2');
    expect(result.sections?.[1].facts.find((fact) => fact.label === 'Population variance σ²')?.display).toBe('5/4');
    expect(result.sections?.[1].facts.find((fact) => fact.label === 'Sample variance s²')?.display).toBe('5/3');
  });

  it('evaluates exact combinatorics and Bayes arithmetic', async () => {
    expect((await run('choose(10,3)', 'evaluate-probability')).display).toBe('120');
    expect((await run('permute(5,2)', 'evaluate-probability')).display).toBe('20');
    expect((await run('bayes(1/100,9/10,27/1000)', 'evaluate-probability')).display).toBe('1/3');
    expect((await run('conditional(1/4,1/2)', 'evaluate-probability')).display).toBe('1/2');
  });

  it('profiles distributions and computes exact discrete/uniform probabilities', async () => {
    const profile = await run('binomial(10,1/2)', 'distribution-profile');
    expect(profile.sections?.[0].facts.find((fact) => fact.label === 'Support')?.display).toBe('{0, …, 10}');
    expect((await run('binomial(4,1/2)', 'distribution-probability', { event: 'eq', value: '2' })).display).toBe('3/8');
    expect((await run('binomial(4,1/2)', 'distribution-probability', { event: 'le', value: '2' })).display).toBe('11/16');
    expect((await run('uniform(0,10)', 'distribution-probability', { event: 'between', lower: '2', upper: '5' })).display).toBe('3/10');
  });

  it('labels normal probabilities and quantiles as approximate', async () => {
    expect((await run('normal(0,1)', 'distribution-probability', { event: 'le', value: '0' })).exactness).toBe('approximate');
    expect((await run('normal(0,1)', 'distribution-quantile', { probability: '0.975' })).exactness).toBe('approximate');
  });

  it('separates exact sampling moments from CLT approximation', async () => {
    expect((await run('normal(10,2)', 'sampling-mean-profile', { sampleSize: 25 })).exactness).toBe('exact');
    const bernoulli = await run('bernoulli(1/2)', 'sampling-mean-profile', { sampleSize: 100 });
    expect(bernoulli.exactness).toBe('approximate');
    expect(bernoulli.warnings.join(' ')).toContain('central limit theorem');
  });

  it('runs numerical one-sample t inference with visible approximation boundaries', async () => {
    const ci = await run('data(1,2,3,4,5)', 'mean-confidence-interval', { confidence: 0.95 });
    expect(ci.exactness).toBe('approximate');
    expect(ci.sections?.[0].facts.some((fact) => fact.label === 't*')).toBe(true);
    const test = await run('data(1,2,3,4,5)', 'mean-hypothesis-test', { nullValue: 3, alternative: 'two-sided' });
    expect(test.sections?.[0].facts.find((fact) => fact.label === 'p-value')?.display).toBe('1');
  });

  it('supports Wilson intervals and guards small-sample proportion tests', async () => {
    const ci = await run('data(1,1,1,0,0,1,0,1,1,0)', 'proportion-confidence-interval', { confidence: 0.95 });
    expect(ci.exactness).toBe('approximate');
    const test = await run('data(1,0,1,0)', 'proportion-hypothesis-test', { nullValue: 0.5, alternative: 'two-sided' });
    expect(test.warnings.join(' ')).toContain('expected successes or failures');
  });

  it('computes exact simple linear regression coefficients', async () => {
    const result = await run('[[1,2],[2,4],[3,6]]', 'correlation-regression');
    expect(result.sections?.[0].facts.find((fact) => fact.label === 'Slope')?.display).toBe('2');
    expect(result.sections?.[0].facts.find((fact) => fact.label === 'R²')?.display).toBe('1');
    expect(result.warnings.join(' ')).toContain('does not establish causation');
  });

  it('keeps simulation deterministic and explicitly heuristic', async () => {
    const first = await run('bernoulli(1/2)', 'simulate-distribution', { count: 100, seed: 42 });
    const second = await run('bernoulli(1/2)', 'simulate-distribution', { count: 100, seed: 42 });
    expect(first.exactness).toBe('heuristic');
    expect(first.sections?.[0].facts.find((fact) => fact.label === 'First 10 draws')?.display)
      .toBe(second.sections?.[0].facts.find((fact) => fact.label === 'First 10 draws')?.display);
  });
});
