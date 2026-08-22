import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CATALOG, findAllTool } from '../src/app/allToolCatalog';
import { E6MathEngine } from '../src/lib/math/e6Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine=new E6MathEngine();
async function run(input:string,operation:string,options?:Record<string,string|number|boolean>){const parsed=parseMath(input);const object=resolveSemanticObject(parsed,[],[]).object!;return engine.execute({id:`boundary:${operation}`,operation,input,ast:object.valueAst,options});}

describe('E6 correctness boundaries',()=>{
  it('rejects non-finite endpoint quantiles for continuous E6 distributions',async()=>{
    await expect(run('exponential(2)','distribution-quantile',{probability:'1'})).rejects.toThrow('0 < p < 1');
    await expect(run('studentt(10)','distribution-quantile',{probability:'0'})).rejects.toThrow('0 < p < 1');
  });

  it('rejects zero-standard-error parametric inference instead of emitting NaN',async()=>{
    await expect(run('[[1,2],[1,2],[1,2]]','two-sample-mean-inference',{confidence:0.95,nullValue:0,alternative:'two-sided'})).rejects.toThrow('standard error is zero');
    await expect(run('[[3,1],[4,2],[5,3]]','paired-mean-inference',{confidence:0.95,nullValue:0,alternative:'two-sided'})).rejects.toThrow('zero sample variance');
    await expect(run('[[1,1],[1,1],[1,1]]','two-proportion-inference',{confidence:0.95,nullValue:0,alternative:'two-sided'})).rejects.toThrow('pooled two-proportion standard error is zero');
  });

  it('rejects undefined correlation, ANOVA, and constant-response regression cases',async()=>{
    await expect(run('[[1,2],[1,3],[1,4]]','covariance-correlation-matrix')).rejects.toThrow('zero variance');
    await expect(run('[[1,4],[1,4],[1,4]]','one-way-anova')).rejects.toThrow('within-group mean square is zero');
    await expect(run('[[1,5],[2,5],[3,5],[4,5]]','multiple-linear-regression')).rejects.toThrow('response column with nonzero sample variance');
  });

  it('makes expansion tools discoverable through the unified Ctrl+K catalog source',()=>{
    expect(ALL_TOOL_CATALOG.some(tool=>tool.id==='multiple-linear-regression'&&tool.phase==='E6')).toBe(true);
    expect(findAllTool('markov-profile')?.phase).toBe('E6');
    expect(findAllTool('numerical-svd')?.phase).toBe('E5');
    expect(findAllTool('ode-stability')?.phase).toBe('E4');
  });
});
