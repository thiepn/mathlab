import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { E6MathEngine } from '../src/lib/math/e6Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine = new E6MathEngine();

async function run(input:string,operation:string,options?:Record<string,string|number|boolean>){
  const parsed=parseMath(input);
  expect(parsed.diagnostics.filter(item=>item.severity==='error')).toHaveLength(0);
  const object=resolveSemanticObject(parsed,[],[]).object;
  expect(object).not.toBeNull();
  return engine.execute({id:`${operation}:${input}`,operation,input,ast:object!.valueAst,options});
}
function fact(result:Awaited<ReturnType<typeof run>>,label:string):string|undefined{return result.sections?.flatMap(section=>section.facts).find(item=>item.label===label)?.display;}

describe('E6 probability and statistics II',()=>{
  it('promotes new univariate and joint constructors to distribution semantic objects',()=>{
    const t=resolveSemanticObject(parseMath('T := studentt(10)'),[],[]).object!;
    const joint=resolveSemanticObject(parseMath('J := jointpmf([[1/4,1/4],[1/8,3/8]])'),[],[]).object!;
    expect(t.kind).toBe('distribution');
    expect(t.shape).toEqual({type:'distribution',family:'studentt'});
    expect(joint.kind).toBe('distribution');
    expect(joint.shape).toEqual({type:'distribution',family:'jointpmf'});
    expect(capabilitiesFor(joint).some(item=>item.id==='joint-distribution-profile'&&item.available)).toBe(true);
    expect(capabilitiesFor(joint).some(item=>item.id==='distribution-quantile')).toBe(false);
  });

  it('supports exponential, Student-t, chi-square and F distribution workflows numerically',async()=>{
    const expProfile=await run('exponential(2)','distribution-profile');
    expect(expProfile.exactness).toBe('approximate');
    expect(Number((await run('exponential(2)','distribution-probability',{event:'le',value:'0'})).display)).toBeCloseTo(0,12);
    expect(Number((await run('exponential(2)','distribution-quantile',{probability:'0.5'})).display)).toBeCloseTo(Math.log(2)/2,8);
    expect(Number((await run('studentt(10)','distribution-probability',{event:'le',value:'0'})).display)).toBeCloseTo(0.5,10);
    expect(Number((await run('chisquare(4)','distribution-probability',{event:'le',value:'4'})).display)).toBeGreaterThan(0.5);
    expect(Number((await run('fdist(5,10)','distribution-probability',{event:'le',value:'1'})).display)).toBeGreaterThan(0);
  });

  it('computes joint marginals and covariance with explicit support convention',async()=>{
    const result=await run('jointpmf([[1/4,1/4],[1/8,3/8]])','joint-distribution-profile');
    expect(Number(fact(result,'E[X]'))).toBeCloseTo(0.5,12);
    expect(Number(fact(result,'E[Y]'))).toBeCloseTo(0.625,12);
    expect(Number(fact(result,'Cov(X,Y)'))).toBeCloseTo(0.0625,12);
    expect(result.warnings.join(' ')).toContain('zero-based support');
  });

  it('propagates affine random-variable moments',async()=>{
    const result=await run('normal(10,2)','affine-rv-transform',{scale:3,shift:-1});
    expect(Number(fact(result,'E[Y]'))).toBeCloseTo(29,12);
    expect(Number(fact(result,'Var(Y)'))).toBeCloseTo(36,12);
  });

  it('builds covariance and correlation matrices from observation rows',async()=>{
    const result=await run('[[1,2],[2,4],[3,6],[4,8]]','covariance-correlation-matrix');
    expect(result.exactness).toBe('approximate');
    expect(fact(result,'Correlation')).toContain('[1, 1]');
  });

  it('runs Welch two-sample mean inference',async()=>{
    const result=await run('[[1,2],[2,3],[3,4],[4,5],[5,6]]','two-sample-mean-inference',{confidence:0.95,nullValue:0,alternative:'two-sided'});
    expect(Number(fact(result,'Difference'))).toBeCloseTo(-1,12);
    expect(Number(fact(result,'Welch df'))).toBeCloseTo(8,8);
    expect(result.warnings.join(' ')).toContain('does not assume equal population variances');
  });

  it('runs paired mean inference on row-matched observations',async()=>{
    const result=await run('[[10,8],[12,11],[9,8],[14,12],[13,10]]','paired-mean-inference',{confidence:0.95,nullValue:0,alternative:'two-sided'});
    expect(Number(fact(result,'Mean difference'))).toBeCloseTo(1.8,12);
    expect(fact(result,'Pairs')).toBe('5');
  });

  it('runs two-proportion inference only on binary samples',async()=>{
    const result=await run('[[1,1],[1,0],[1,1],[0,0],[1,0],[0,1],[1,1],[1,0]]','two-proportion-inference',{confidence:0.95,nullValue:0,alternative:'two-sided'});
    expect(result.exactness).toBe('approximate');
    expect(fact(result,'Successes')).toBe('6/8 vs 4/8');
    await expect(run('[[1,2],[0,1]]','two-proportion-inference',{confidence:0.95,nullValue:0,alternative:'two-sided'})).rejects.toThrow('binary 0/1');
  });

  it('computes chi-square goodness of fit and independence',async()=>{
    const gof=await run('data(25,25,25,25)','chi-square-goodness',{expected:'[0.25,0.25,0.25,0.25]'});
    expect(Number(fact(gof,'χ²'))).toBeCloseTo(0,12);
    expect(Number(fact(gof,'p-value'))).toBeCloseTo(1,10);
    const independent=await run('[[10,20],[20,40]]','chi-square-independence');
    expect(Number(fact(independent,'χ²'))).toBeCloseTo(0,12);
    expect(Number(fact(independent,'p-value'))).toBeCloseTo(1,10);
    expect(Number(fact(independent,"Cramér's V"))).toBeCloseTo(0,12);
  });

  it('runs one-way ANOVA with explicit group-column semantics',async()=>{
    const result=await run('[[1,5,9],[2,6,10],[3,7,11],[4,8,12]]','one-way-anova');
    expect(Number(fact(result,'F'))).toBeGreaterThan(20);
    expect(Number(fact(result,'p-value'))).toBeLessThan(0.001);
    expect(result.warnings.join(' ')).toContain('Columns are treated as independent groups');
  });

  it('fits multiple OLS regression and exposes diagnostics',async()=>{
    const source='[[1,2,3.1],[2,1,7.2],[3,4,7.9],[4,2,12.2],[5,5,12.8],[6,3,17.1],[7,6,17.7],[8,4,22.1]]';
    const fit=await run(source,'multiple-linear-regression');
    expect(Number(fact(fit,'R²'))).toBeGreaterThan(0.99);
    expect(fact(fit,'Predictors')).toBe('2');
    const diagnostics=await run(source,'regression-diagnostics');
    expect(fact(diagnostics,'VIFs')).toMatch(/^\[/);
    expect(diagnostics.warnings.join(' ')).toContain('warning signals');
  });

  it('provides approximate rank-based nonparametric tests',async()=>{
    const mw=await run('[[1,4],[2,5],[2,6],[3,8],[4,9]]','mann-whitney');
    expect(mw.exactness).toBe('approximate');
    expect(fact(mw,'U')).toBeDefined();
    const wx=await run('[[10,8],[12,11],[9,8],[14,12],[13,10]]','wilcoxon-signed-rank');
    expect(wx.exactness).toBe('approximate');
    expect(fact(wx,'W')).toBeDefined();
  });

  it('keeps bootstrap resampling deterministic and heuristic',async()=>{
    const first=await run('data(4,5,6,7,9,10)','bootstrap-mean',{count:1000,confidence:0.95,seed:77});
    const second=await run('data(4,5,6,7,9,10)','bootstrap-mean',{count:1000,confidence:0.95,seed:77});
    expect(first.exactness).toBe('heuristic');
    expect(first.display).toBe(second.display);
    expect(fact(first,'Bootstrap bias')).toBe(fact(second,'Bootstrap bias'));
  });

  it('profiles and propagates finite row-stochastic Markov chains',async()=>{
    const profile=await run('[[0.8,0.2],[0.3,0.7]]','markov-profile');
    expect(fact(profile,'Irreducible')).toBe('Yes');
    expect(fact(profile,'Stationary candidate')).toContain('0.6');
    const step=await run('[[0.8,0.2],[0.3,0.7]]','markov-step',{initial:'[1,0]',steps:1});
    expect(fact(step,'Distribution')).toContain('0.8, 0.2');
  });

  it('preserves the cumulative E5 engine beneath E6',async()=>{
    const result=await run('[[1,0],[0,2]]','numerical-rank',{tolerance:1e-10});
    expect(result.operation).toBe('numerical-rank');
    expect(result.exactness).toBe('approximate');
  });
});
