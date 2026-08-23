import { describe, expect, it } from 'vitest';
import { E9MathEngine } from '../src/lib/math/e9Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const engine=new E9MathEngine();
async function run(input:string,operation:string,options?:Record<string,string|number|boolean>){const parsed=parseMath(input);expect(parsed.diagnostics.filter(x=>x.severity==='error')).toHaveLength(0);const object=resolveSemanticObject(parsed,[],[]).object!;return engine.execute({id:`${operation}:${input}`,operation,input,ast:object.valueAst,variable:object.kind==='function'?object.parameters[0]:object.variables[0],options});}

describe('E9 correctness boundaries',()=>{
  it('detects reachable negative cycles instead of returning false shortest paths',async()=>{
    await expect(run('wdigraph(3, [[1,2,1],[2,3,-2],[3,2,-2]])','bellman-ford',{start:1,target:3})).rejects.toThrow('negative-weight cycle');
  });
  it('rejects non-bipartite graphs in matching workflows',async()=>{
    await expect(run('graph(3, [[1,2],[2,3],[3,1]])','bipartite-matching')).rejects.toThrow('not bipartite');
  });
  it('rejects negative flow capacities and invalid flow object kinds',async()=>{
    await expect(run('wdigraph(2, [[1,2,-1]])','max-flow-min-cut',{source:1,sink:2})).rejects.toThrow('nonnegative');
    await expect(run('wgraph(2, [[1,2,3]])','max-flow-min-cut',{source:1,sink:2})).rejects.toThrow('weighted directed');
  });
  it('refuses unsolvable modular inverses and congruences',async()=>{
    await expect(run('6','modular-inverse',{modulus:'15'})).rejects.toThrow('No modular inverse');
    await expect(run('6','linear-congruence',{rhs:'5',modulus:'14'})).rejects.toThrow('No solution');
  });
  it('rejects inconsistent generalized CRT systems',async()=>{
    await expect(run('[[0,2],[1,4]]','chinese-remainder')).rejects.toThrow('inconsistent');
  });
  it('rejects unsolvable linear Diophantine equations',async()=>{
    await expect(run('6','linear-diophantine',{b:'10',c:'7'})).rejects.toThrow('No integer solution');
  });
  it('enforces bounded finite quantifier and knapsack inputs',async()=>{
    await expect(run('set(1,2,3)','finite-quantifier-profile',{quantifier:'forall',boundVariable:'x',predicate:'y>0'})).rejects.toThrow('resolve exactly');
    await expect(run('[[2,3]]','knapsack-dp',{capacity:501})).rejects.toThrow('[0,500]');
  });
  it('refuses the degenerate double-zero recurrence closed form rather than fabricating one',async()=>{
    await expect(run('linrec2(2,3,0,0)','recurrence-closed-form-e9')).rejects.toThrow('degenerate double-zero');
  });
  it('keeps bounded factorization explicit',async()=>{
    await expect(run('1000000000001','number-theory-profile')).rejects.toThrow('10^12');
  });
});
