import { describe, expect, it } from 'vitest';
import { E11MathEngine } from '../src/lib/math/e11Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { MathResult } from '../src/lib/math/types';

const engine=new E11MathEngine();
async function run(input:string,operation:string,options?:Record<string,string|number|boolean>):Promise<MathResult>{const parsed=parseMath(input);const object=resolveSemanticObject(parsed,[],[]).object;return engine.execute({id:`b:${operation}`,operation,input,ast:object?.valueAst,variable:object?.kind==='function'?object.parameters[0]:object?.variables[0],options});}
function fact(result:MathResult,label:string):string|undefined{return result.sections?.flatMap(section=>section.facts).find(item=>item.label===label)?.display;}
const C3='[[1,2,3],[2,3,1],[3,1,2]]';

describe('E11 proof boundaries',()=>{
  it('rejects a lemma whose selected side does not occur',async()=>{await expect(run('x+y','lemma-rewrite',{lemma:'a=b',target:'x+b'})).rejects.toThrow(/does not occur/i);});
  it('rejects a proposed target that hides an extra unproved step',async()=>{await expect(run('x+y','lemma-rewrite',{lemma:'y=z',target:'2*(x+z)'})).rejects.toThrow(/not to the proposed target|hide/i);});
  it('rejects negative inequality scaling',async()=>{await expect(run('x < 1','inequality-consequence',{target:'-x < -1'})).rejects.toThrow(/positive rational scaling/i);});
  it('rejects upgrading a non-strict inequality to a strict one',async()=>{await expect(run('x <= 1','inequality-consequence',{target:'x < 1'})).rejects.toThrow(/does not imply/i);});
  it('rejects oversized nested finite quantifier products',async()=>{const values=Array.from({length:65},(_,i)=>String(i+1)).join(',');await expect(run(`set(${values})`,'finite-quantifier-proof',{variable:'x',predicate:'x+y>=0',quantifier:'forall',secondSet:`set(${values})`,secondVariable:'y',secondQuantifier:'forall'})).rejects.toThrow(/4096/);});
  it('rejects repeated bound variables in nested quantifiers',async()=>{await expect(run('set(1,2)','finite-quantifier-proof',{variable:'x',predicate:'x>0',quantifier:'forall',secondSet:'set(1)',secondVariable:'x',secondQuantifier:'exists'})).rejects.toThrow(/distinct bound variables/i);});
  it('rejects an induction proof with a false base fact',async()=>{await expect(run('S(n)=n*(n+1)/2','induction-certificate',{index:'n',stepVariable:'k',base:1,baseFact:'S(1)=2',recurrence:'S(k+1)=S(k)+(k+1)'})).rejects.toThrow(/Base obligation/i);});
  it('rejects an induction recurrence that never uses the induction hypothesis',async()=>{await expect(run('S(n)=n','induction-certificate',{index:'n',stepVariable:'k',base:1,baseFact:'S(1)=1',recurrence:'S(k+1)=k+1'})).rejects.toThrow(/does not contain the induction-hypothesis/i);});
  it('does not assert continuity when differentiability is not established',async()=>{const result=await run('abs(x)','analysis-theorem-certificate',{variable:'x',point:'0'});expect(result.display).toContain('PREREQUISITE');expect(fact(result,'Conclusion')).toContain('No theorem conclusion');});
  it('does not apply the Hermitian spectral theorem to a non-Hermitian matrix',async()=>{const result=await run('[[0,1],[0,0]]','linear-algebra-theorem-certificate',{theorem:'spectral-theorem-hermitian'});expect(result.display).toContain('PREREQUISITE');expect(fact(result,'A* = A')).toBe('No');});
  it("does not apply Lagrange's theorem to a non-subgroup",async()=>{const result=await run(`group(${C3})`,'finite-group-theorem-certificate',{subset:'set(1,2)'});expect(result.display).toContain('PREREQUISITE');expect(fact(result,'Certified subgroup')).toBe('No');});
  it('rejects unknown linear-algebra theorem identifiers',async()=>{await expect(run('[[1,0],[0,1]]','linear-algebra-theorem-certificate',{theorem:'magic'})).rejects.toThrow(/theorem must be/i);});
});
