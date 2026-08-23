import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CATALOG } from '../src/app/allToolCatalog';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { E9MathEngine } from '../src/lib/math/e9Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { MathResult } from '../src/lib/math/types';

const engine = new E9MathEngine();
async function run(input:string,operation:string,options?:Record<string,string|number|boolean>):Promise<MathResult>{
  const parsed=parseMath(input); expect(parsed.diagnostics.filter(x=>x.severity==='error')).toHaveLength(0);
  const object=resolveSemanticObject(parsed,[],[]).object; expect(object).not.toBeNull();
  return engine.execute({id:`${operation}:${input}`,operation,input,ast:object!.valueAst,variable:object!.kind==='function'?object!.parameters[0]:object!.variables[0],options});
}
function fact(result:MathResult,label:string):string|undefined{return result.sections?.flatMap(s=>s.facts).find(x=>x.label===label)?.display;}

describe('E9 Discrete Mathematics II, Algorithms & Number Theory',()=>{
  it('evaluates universal and existential predicates exhaustively on finite sets',async()=>{
    const universal=await run('set(-2,-1,0,1,2)','finite-quantifier-profile',{quantifier:'forall',boundVariable:'x',predicate:'x^2>=0'});
    expect(universal.exactness).toBe('exact'); expect(fact(universal,'Result')).toBe('True');
    const exists=await run('set(-2,-1,0,1,2)','finite-quantifier-profile',{quantifier:'exists',boundVariable:'x',predicate:'x^2=4'});
    expect(fact(exists,'Result')).toBe('True'); expect(fact(exists,'Witness')).toBeDefined();
  });

  it('derives an exact ordinary generating function for Fibonacci recurrence data',async()=>{
    const result=await run('linrec2(0,1,1,1)','recurrence-generating-function');
    expect(result.exactness).toBe('exact'); expect(result.display).toContain('x'); expect(result.display).toContain('A(x)');
  });

  it('builds a stronger exact second-order recurrence closed form',async()=>{
    const result=await run('linrec2(0,1,1,1)','recurrence-closed-form-e9');
    expect(result.exactness).toBe('exact'); expect(result.display).toContain('sqrt(5)'); expect(fact(result,'r1')).toContain('sqrt(5)');
  });

  it('extends the Master theorem to logarithmic toll powers',async()=>{
    const result=await run('master(2,2,1)','extended-master-theorem',{logPower:1});
    expect(result.exactness).toBe('exact'); expect(fact(result,'Tight bound')).toContain('(log n)^2');
  });

  it('runs Bellman–Ford with negative edges and returns an exact path',async()=>{
    const result=await run('wdigraph(4, [[1,2,4],[1,3,5],[2,3,-2],[3,4,3]])','bellman-ford',{start:1,target:4});
    expect(result.exactness).toBe('exact'); expect(fact(result,'Path')).toBe('1 → 2 → 3 → 4'); expect(fact(result,'Exact distance')).toBe('5');
  });

  it('computes exact max-flow/min-cut equality',async()=>{
    const result=await run('wdigraph(4, [[1,2,3],[1,3,2],[2,3,1],[2,4,2],[3,4,3]])','max-flow-min-cut',{source:1,sink:4});
    expect(result.exactness).toBe('exact'); expect(fact(result,'Value')).toBe('5'); expect(fact(result,'Cut capacity')).toBe('5');
  });

  it('finds a maximum bipartite matching',async()=>{
    const result=await run('graph(6, [[1,4],[1,5],[2,4],[2,6],[3,5]])','bipartite-matching');
    expect(result.exactness).toBe('exact'); expect(fact(result,'Cardinality')).toBe('3');
  });

  it('produces a deterministic longest-increasing-subsequence DP trace',async()=>{
    const result=await run('[3,1,8,2,5]','longest-increasing-subsequence');
    expect(result.exactness).toBe('exact'); expect(fact(result,'Length')).toBe('3'); expect(fact(result,'One optimal subsequence')).toContain('1'); expect(fact(result,'One optimal subsequence')).toContain('5');
  });

  it('solves bounded 0/1 knapsack exactly',async()=>{
    const result=await run('[[2,3],[3,4],[4,5],[5,8]]','knapsack-dp',{capacity:7});
    expect(result.exactness).toBe('exact'); expect(fact(result,'Optimal value')).toBe('11'); expect(fact(result,'Chosen item indices (1-based)')).toContain('1'); expect(fact(result,'Chosen item indices (1-based)')).toContain('4');
  });

  it('factors integers and computes standard arithmetic functions exactly',async()=>{
    const result=await run('360','number-theory-profile');
    expect(result.exactness).toBe('exact'); expect(fact(result,'Prime factorization')).toContain('2^3'); expect(fact(result,'Euler φ(|n|)')).toBe('96'); expect(fact(result,'τ(|n|) divisors')).toBe('24'); expect(fact(result,'σ(|n|) divisor sum')).toBe('1170'); expect(fact(result,'μ(|n|)')).toBe('0');
  });

  it('computes Bézout coefficients with extended Euclid',async()=>{
    const result=await run('84','extended-gcd',{other:'30'});
    expect(fact(result,'gcd(a,b)')).toBe('6'); expect(fact(result,'Certificate')).toContain('= 6');
  });

  it('computes modular inverses exactly',async()=>{
    const result=await run('17','modular-inverse',{modulus:'43'});
    expect(result.display).toContain('38'); expect(fact(result,'Inverse')).toBe('38');
  });

  it('returns every residue class of a solvable linear congruence',async()=>{
    const result=await run('6','linear-congruence',{rhs:'8',modulus:'14'});
    expect(fact(result,'gcd(a,m)')).toBe('2'); expect(fact(result,'Solution classes')).toBe('6, 13');
  });

  it('solves generalized Chinese-remainder systems exactly',async()=>{
    const result=await run('[[2,3],[3,5],[2,7]]','chinese-remainder');
    expect(fact(result,'Canonical solution')).toBe('23'); expect(fact(result,'Combined modulus')).toBe('105');
  });

  it('returns the complete family of a linear Diophantine equation',async()=>{
    const result=await run('15','linear-diophantine',{b:'25',c:'5'});
    expect(result.exactness).toBe('exact'); expect(fact(result,'gcd(a,b)')).toBe('5'); expect(fact(result,'All solutions')).toContain('t∈Z');
  });

  it('exposes E9 capabilities and global discovery while preserving E8 fallback',async()=>{
    const setObj=resolveSemanticObject(parseMath('set(1,2,3)'),[],[]).object!;
    const graphObj=resolveSemanticObject(parseMath('wdigraph(3, [[1,2,1],[2,3,-1]])'),[],[]).object!;
    const scalarObj=resolveSemanticObject(parseMath('42'),[],[]).object!;
    expect(capabilitiesFor(setObj).some(x=>x.id==='finite-quantifier-profile'&&x.available)).toBe(true);
    expect(capabilitiesFor(graphObj).some(x=>x.id==='bellman-ford'&&x.available)).toBe(true);
    expect(capabilitiesFor(scalarObj).some(x=>x.id==='number-theory-profile'&&x.available)).toBe(true);
    const operations=ALL_TOOL_CATALOG.filter(t=>t.phase==='E9').map(t=>t.operation);
    expect(operations).toContain('max-flow-min-cut'); expect(operations).toContain('chinese-remainder'); expect(operations).toContain('linear-diophantine');
    const inherited=await run('f(z) := z^2','complex-derivative'); expect(inherited.exactness).toBe('exact'); expect(inherited.display).toContain('z');
  });
});
