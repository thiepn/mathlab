import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CATALOG } from '../src/app/allToolCatalog';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { E11MathEngine } from '../src/lib/math/e11Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { MathResult } from '../src/lib/math/types';

const engine=new E11MathEngine();
async function run(input:string,operation:string,options?:Record<string,string|number|boolean>):Promise<MathResult>{
  const parsed=parseMath(input);expect(parsed.diagnostics.filter(x=>x.severity==='error')).toHaveLength(0);
  const object=resolveSemanticObject(parsed,[],[]).object;
  return engine.execute({id:`${operation}:${input}`,operation,input,ast:object?.valueAst,variable:object?.kind==='function'?object.parameters[0]:object?.variables[0],options});
}
function fact(result:MathResult,label:string):string|undefined{return result.sections?.flatMap(section=>section.facts).find(item=>item.label===label)?.display;}
const C3='[[1,2,3],[2,3,1],[3,1,2]]';

describe('E11 Proof System II & Upper-Division Reasoning',()=>{
  it('exposes a checker-backed theorem registry',async()=>{
    const result=await engine.execute({id:'registry',operation:'theorem-registry',input:'0'});
    expect(result.exactness).toBe('exact');expect(result.display).toContain('9 deterministic');expect(result.sections?.[0].facts.some(item=>item.label.includes('Rank–nullity'))).toBe(true);
  });

  it('certifies equality substitution at an exact subtree',async()=>{
    const result=await run('x*(y+z)','lemma-rewrite',{lemma:'y+z = z+y',target:'x*(z+y)',direction:'forward',occurrence:'first'});
    expect(result.display).toContain('VERIFIED');expect(fact(result,'Occurrences rewritten')).toBe('1');expect(result.steps[0].verificationStatus).toBe('verified');
  });

  it('certifies a one-way strict-to-nonstrict inequality consequence',async()=>{
    const result=await run('2*x < 6','inequality-consequence',{target:'x <= 3'});
    expect(result.display).toContain('VERIFIED');expect(fact(result,'Positive scale')).toBe('1/2');expect(fact(result,'Status')).toContain('Verified');
  });

  it('proves a universal finite-domain predicate exhaustively',async()=>{
    const result=await run('set(1,2,3)','finite-quantifier-proof',{variable:'x',predicate:'x^2 >= 1',quantifier:'forall'});
    expect(result.resultAst).toMatchObject({type:'symbol',name:'true'});expect(fact(result,'Assignments checked')).toBe('3');expect(fact(result,'Result')).toBe('True');
  });

  it('supports two nested finite quantifiers with exact witnesses',async()=>{
    const result=await run('set(1,2,3)','finite-quantifier-proof',{variable:'x',predicate:'x+y > x',quantifier:'forall',secondSet:'set(1,2)',secondVariable:'y',secondQuantifier:'exists'});
    expect(fact(result,'Assignments checked')).toBe('6');expect(fact(result,'Result')).toBe('True');
  });

  it('returns a finite quantified counterexample when a universal claim fails',async()=>{
    const result=await run('set(-1,0,1)','finite-quantifier-proof',{variable:'x',predicate:'x > 0',quantifier:'forall'});
    expect(fact(result,'Result')).toBe('False');expect(fact(result,'Counterexample / decisive assignment')).toContain('x=-1');
  });

  it('certifies ordinary induction from a base fact and recurrence premise',async()=>{
    const result=await run('S(n) = n*(n+1)/2','induction-certificate',{index:'n',stepVariable:'k',base:1,baseFact:'S(1)=1',recurrence:'S(k+1)=S(k)+(k+1)'});
    expect(result.display).toContain('INDUCTION CERTIFIED');expect(fact(result,'Base obligation')).toBe('Discharged');expect(fact(result,'Successor obligation')).toBe('Discharged');expect(result.steps).toHaveLength(4);
  });

  it('applies differentiability implies continuity only after the prerequisite is established',async()=>{
    const result=await run('x^2','analysis-theorem-certificate',{variable:'x',point:'2'});
    expect(result.display).toContain('VERIFIED');expect(fact(result,'Differentiability prerequisite')).toBe('Discharged');expect(fact(result,'Continuity conclusion')).toBe('Certified');
  });

  it('certifies rank-nullity exactly',async()=>{
    const result=await run('[[1,2,3],[2,4,6]]','linear-algebra-theorem-certificate',{theorem:'rank-nullity'});
    expect(result.display).toContain('RANK–NULLITY');expect(fact(result,'rank(A)')).toBe('1');expect(fact(result,'nullity(A)')).toBe('2');expect(fact(result,'rank + nullity')).toBe('3');
  });

  it('certifies the bounded invertible matrix equivalences',async()=>{
    const result=await run('[[1,0],[0,2]]','linear-algebra-theorem-certificate',{theorem:'invertible-matrix-equivalences'});
    expect(result.display).toContain('INVERTIBLE');expect(fact(result,'det(A) ≠ 0')).toBe('Yes');expect(fact(result,'rank(A) = n')).toBe('Yes');expect(fact(result,'nullity(A) = 0')).toBe('Yes');
  });

  it('applies the Hermitian spectral theorem after exact symmetry certification',async()=>{
    const result=await run('[[1,0],[0,2]]','linear-algebra-theorem-certificate',{theorem:'spectral-theorem-hermitian'});
    expect(result.display).toContain('SPECTRAL');expect(fact(result,'A* = A')).toBe('Yes');expect(fact(result,'Real spectrum')).toContain('Follows');
  });

  it("applies Lagrange's theorem to an exactly certified subgroup",async()=>{
    const result=await run(`group(${C3})`,'finite-group-theorem-certificate',{subset:'set(1)'});
    expect(result.display).toContain('LAGRANGE');expect(fact(result,'|G|')).toBe('3');expect(fact(result,'|H|')).toBe('1');expect(fact(result,'|H| divides |G|')).toBe('Yes');
  });

  it('exposes E11 operations through capabilities',()=>{
    const equation=resolveSemanticObject(parseMath('S(n)=n'),[],[]).object!;const matrix=resolveSemanticObject(parseMath('[[1,0],[0,1]]'),[],[]).object!;const set=resolveSemanticObject(parseMath('set(1,2)'),[],[]).object!;
    expect(capabilitiesFor(equation).some(item=>item.id==='induction-certificate'&&item.available)).toBe(true);expect(capabilitiesFor(matrix).some(item=>item.id==='linear-algebra-theorem-certificate'&&item.available)).toBe(true);expect(capabilitiesFor(set).some(item=>item.id==='finite-quantifier-proof'&&item.available)).toBe(true);
  });

  it('publishes all E11 tools into global discovery',()=>{
    const operations=ALL_TOOL_CATALOG.filter(tool=>tool.phase==='E11').map(tool=>tool.operation);expect(operations).toHaveLength(8);expect(operations).toContain('theorem-registry');expect(operations).toContain('induction-certificate');expect(operations).toContain('finite-group-theorem-certificate');
  });

  it('preserves cumulative E10 fallback',async()=>{
    const result=await run(`group(${C3})`,'finite-group-profile');expect(result.exactness).toBe('exact');expect(fact(result,'Group')).toBe('Yes');
  });
});
