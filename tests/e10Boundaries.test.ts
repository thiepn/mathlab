import { describe, expect, it } from 'vitest';
import { E10MathEngine } from '../src/lib/math/e10Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine=new E10MathEngine();
async function run(input:string,operation:string,options?:Record<string,string|number|boolean>){const parsed=parseMath(input);expect(parsed.diagnostics.filter(x=>x.severity==='error')).toHaveLength(0);const object=resolveSemanticObject(parsed,[],[]).object!;return engine.execute({id:`${operation}:${input}`,operation,input,ast:object.valueAst,variable:object.kind==='function'?object.parameters[0]:object.variables[0],options});}
function fact(result:Awaited<ReturnType<typeof run>>,label:string):string|undefined{return result.sections?.flatMap(s=>s.facts).find(x=>x.label===label)?.display;}
const C3='[[1,2,3],[2,3,1],[3,1,2]]';

describe('E10 correctness boundaries',()=>{
  it('refuses nonpositive canonical PDE geometry/physical parameters',async()=>{
    await expect(run('heatpde(1,-1,[1])','pde-profile')).rejects.toThrow('positive');
    await expect(run('laplacepde(1,0,[1])','pde-modal-solution')).rejects.toThrow('positive');
  });

  it('refuses mismatched wave initial-data coefficient vectors',async()=>{
    await expect(run('wavepde(1,1,[1,2],[0])','pde-modal-solution')).rejects.toThrow('same length');
  });

  it('does not label an invalid Cayley table as a group',async()=>{
    const result=await run('group([[1,1],[1,1]])','finite-group-profile');
    expect(fact(result,'Group')).toBe('No');
    await expect(run('group([[1,1],[1,1]])','subgroup-check',{subset:'set(1)'})).rejects.toThrow('valid finite group');
  });

  it('does not promote a non-homomorphic map to a group homomorphism',async()=>{
    const result=await run(`grouphom(${C3},${C3},[1,2,2])`,'group-homomorphism-profile');
    expect(fact(result,'Operation preserving')).toBe('No');expect(fact(result,'Kernel')).toBe('Undefined');
  });

  it('detects metric triangle-inequality violations',async()=>{
    const result=await run('metricspace([[0,3,1],[3,0,1],[1,1,0]])','metric-space-profile');
    expect(fact(result,'Metric')).toBe('No');
    await expect(run('metricspace([[0,3,1],[3,0,1],[1,1,0]])','metric-ball',{center:1,radius:'1'})).rejects.toThrow('valid metric space');
  });

  it('rejects negative metric-ball radii',async()=>{
    await expect(run('metricspace([[0,1],[1,0]])','metric-ball',{center:1,radius:'-1'})).rejects.toThrow('nonnegative');
  });

  it('detects finite open families that are not topologies',async()=>{
    const invalid='topology([[0,0,0],[1,1,0],[0,1,1],[1,1,1]])';
    const result=await run(invalid,'finite-topology-profile');expect(fact(result,'Topology')).toBe('No');
    await expect(run(invalid,'topology-subset-profile',{subset:'set(2)'})).rejects.toThrow('valid finite topology');
  });

  it('enforces the 2D/3D point-set boundary',async()=>{
    await expect(run('pointset([[0,0,0,0],[1,1,1,1]])','point-set-profile')).rejects.toThrow('R^2 or R^3');
  });

  it('rejects degenerate/reversed owned geometry intervals',async()=>{
    await expect(run('rectregion(1,0,0,1)','geometry-profile')).rejects.toThrow('lower bounds');
    await expect(run('paramcurve([t,t^2],1,1)','geometry-profile')).rejects.toThrow('lower bound');
  });

  it('keeps topology subset encodings dimension-safe',async()=>{
    await expect(run('topology([[0,0],[1,0],[0,1],[1,1]])','topology-subset-profile',{subset:'[1,0,1]'})).rejects.toThrow('exactly 2');
  });
});
