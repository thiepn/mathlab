import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CATALOG } from '../src/app/allToolCatalog';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { E10MathEngine } from '../src/lib/math/e10Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { MathResult } from '../src/lib/math/types';

const engine=new E10MathEngine();
async function run(input:string,operation:string,options?:Record<string,string|number|boolean>):Promise<MathResult>{
  const parsed=parseMath(input);expect(parsed.diagnostics.filter(x=>x.severity==='error')).toHaveLength(0);
  const object=resolveSemanticObject(parsed,[],[]).object;expect(object).not.toBeNull();
  return engine.execute({id:`${operation}:${input}`,operation,input,ast:object!.valueAst,variable:object!.kind==='function'?object!.parameters[0]:object!.variables[0],options});
}
function fact(result:MathResult,label:string):string|undefined{return result.sections?.flatMap(s=>s.facts).find(x=>x.label===label)?.display;}

const C3='[[1,2,3],[2,3,1],[3,1,2]]';
const F3M='[[1,1,1],[1,2,3],[1,3,2]]';

describe('E10 PDEs, Abstract Structures & Geometry Foundations',()=>{
  it('promotes E10 constructors to first-class semantic objects',()=>{
    const cases:[string,string][]=[
      ['heatpde(1,1,[1])','pde'],[`group(${C3})`,'finite-group'],[`ring(${C3},${F3M})`,'finite-ring'],[`grouphom(${C3},${C3},[1,3,2])`,'homomorphism'],
      ['metricspace([[0,1],[1,0]])','metric-space'],['topology([[0,0],[1,0],[0,1],[1,1]])','topology'],['pointset([[0,0],[1,1]])','point-set'],['rectregion(0,1,0,1)','geometry'],
    ];
    for(const [source,kind] of cases){const parsed=parseMath(source);expect(parsed.diagnostics.filter(x=>x.severity==='error')).toHaveLength(0);expect(resolveSemanticObject(parsed,[],[]).object?.kind).toBe(kind);}
  });

  it('classifies canonical heat PDE problems and owns conditions',async()=>{
    const result=await run('heatpde(1,1,[1,1/2])','pde-profile');
    expect(result.exactness).toBe('exact');expect(fact(result,'Family')).toContain('heat');expect(fact(result,'Canonical equation')).toContain('u_t');expect(fact(result,'Represented modes')).toBe('2');
  });

  it('builds the exact finite heat modal solution',async()=>{
    const result=await run('heatpde(1,1,[1])','pde-modal-solution');
    expect(result.exactness).toBe('exact');expect(result.display).toContain('exp');expect(result.display).toContain('sin');expect(result.warnings[0]).toContain('finite modal solution');
  });

  it('builds wave and rectangular Laplace separation templates',async()=>{
    const wave=await run('wavepde(1,2,[1],[0])','pde-separation-template');
    const laplace=await run('laplacepde(1,1,[1])','pde-separation-template');
    expect(wave.display).toContain('cos');expect(laplace.display).toContain('sinh');
  });

  it('certifies a finite cyclic abelian group from its Cayley table',async()=>{
    const result=await run(`group(${C3})`,'finite-group-profile');
    expect(fact(result,'Group')).toBe('Yes');expect(fact(result,'Abelian')).toBe('Yes');expect(fact(result,'Cyclic')).toBe('Yes');expect(fact(result,'Identity')).toBe('1');
  });

  it('checks finite subgroups exactly',async()=>{
    const singleton=await run(`group(${C3})`,'subgroup-check',{subset:'set(1)'});
    const bad=await run(`group(${C3})`,'subgroup-check',{subset:'set(1,2)'});
    expect(fact(singleton,'Subgroup')).toBe('Yes');expect(fact(bad,'Subgroup')).toBe('No');
  });

  it('recognizes the represented order-three finite field',async()=>{
    const result=await run(`ring(${C3},${F3M})`,'finite-ring-profile');
    expect(fact(result,'Ring')).toBe('Yes');expect(fact(result,'Multiplication commutative')).toBe('Yes');expect(fact(result,'Field')).toBe('Yes');expect(fact(result,'Additive identity 0_R')).toBe('1');
  });

  it('certifies group homomorphism kernel image and isomorphism',async()=>{
    const result=await run(`grouphom(${C3},${C3},[1,3,2])`,'group-homomorphism-profile');
    expect(fact(result,'Operation preserving')).toBe('Yes');expect(fact(result,'Kernel')).toBe('{1}');expect(fact(result,'Image')).toBe('{1, 2, 3}');expect(fact(result,'Isomorphism')).toBe('Yes');
  });

  it('validates exact finite metrics and derives finite-space consequences',async()=>{
    const result=await run('metricspace([[0,1,2],[1,0,1],[2,1,0]])','metric-space-profile');
    expect(fact(result,'Metric')).toBe('Yes');expect(fact(result,'Diameter')).toBe('2');expect(fact(result,'Compact')).toContain('Yes');expect(fact(result,'Connected')).toBe('No');
  });

  it('computes exact open and closed metric balls',async()=>{
    const input='metricspace([[0,1,2],[1,0,1],[2,1,0]])';
    const open=await run(input,'metric-ball',{center:2,radius:'1',closed:false});
    const closed=await run(input,'metric-ball',{center:2,radius:'1',closed:true});
    expect(fact(open,'Points')).toBe('{2}');expect(fact(closed,'Points')).toBe('{1, 2, 3}');
  });

  it('certifies a discrete finite topology and its separation properties',async()=>{
    const result=await run('topology([[0,0],[1,0],[0,1],[1,1]])','finite-topology-profile');
    expect(fact(result,'Topology')).toBe('Yes');expect(fact(result,'Discrete')).toBe('Yes');expect(fact(result,'T0')).toBe('Yes');expect(fact(result,'T1')).toBe('Yes');expect(fact(result,'Connected')).toBe('No');expect(fact(result,'Compact')).toContain('Yes');
  });

  it('computes exact interior closure and boundary in a finite topology',async()=>{
    const result=await run('topology([[0,0],[1,0],[1,1]])','topology-subset-profile',{subset:'set(2)'});
    expect(fact(result,'Open')).toBe('No');expect(fact(result,'Closed')).toBe('Yes');expect(fact(result,'Interior')).toBe('{}');expect(fact(result,'Closure')).toBe('{2}');
  });

  it('computes exact affine dimension and centroid of a point set',async()=>{
    const result=await run('pointset([[0,0],[1,1],[2,2]])','point-set-profile');
    expect(fact(result,'Ambient dimension')).toBe('2');expect(fact(result,'Affine dimension')).toBe('1');expect(fact(result,'Centroid')).toBe('(1, 1)');expect(fact(result,'Collinear')).toBe('Yes');
  });

  it('returns exact symbolic Euclidean distances without decimalizing radicals',async()=>{
    const result=await run('pointset([[0,0],[1,1]])','point-distance-matrix');
    expect(result.exactness).toBe('exact');expect(result.display).toContain('sqrt(2)');
  });

  it('reconstructs exact affine line and plane hulls',async()=>{
    const line=await run('pointset([[0,0],[1,1],[2,2]])','affine-hull-profile');
    const plane=await run('pointset([[0,0,0],[1,0,0],[0,1,0]])','affine-hull-profile');
    expect(fact(line,'Dimension')).toBe('1');expect(fact(line,'Equation')).toBeDefined();expect(fact(plane,'Dimension')).toBe('2');expect(fact(plane,'Equation')).toContain('z');
  });

  it('owns rectangular regions, parameterized curves, and graph surfaces semantically',async()=>{
    const region=await run('rectregion(0,2,0,3)','geometry-profile');
    const curve=await run('paramcurve([t,t^2],0,1)','geometry-profile');
    const surface=await run('graphsurface(x^2+y^2,-1,1,-1,1)','geometry-profile');
    expect(fact(region,'Exact area')).toBe('6');expect(fact(curve,'Parameter')).toBe('t');expect(fact(surface,'Parameterization')).toContain('r(x,y)');
  });

  it('exposes all E10 operations through capabilities and global discovery',()=>{
    const pde=resolveSemanticObject(parseMath('heatpde(1,1,[1])'),[],[]).object!;
    const topology=resolveSemanticObject(parseMath('topology([[0,0],[1,1]])'),[],[]).object!;
    expect(capabilitiesFor(pde).some(x=>x.id==='pde-modal-solution'&&x.available)).toBe(true);
    expect(capabilitiesFor(topology).some(x=>x.id==='finite-topology-profile'&&x.available)).toBe(true);
    const operations=ALL_TOOL_CATALOG.filter(t=>t.phase==='E10').map(t=>t.operation);
    expect(operations).toContain('finite-ring-profile');expect(operations).toContain('metric-space-profile');expect(operations).toContain('affine-hull-profile');
  });

  it('preserves cumulative E9 fallback',async()=>{
    const result=await run('360','number-theory-profile');
    expect(result.exactness).toBe('exact');expect(fact(result,'Euler φ(|n|)')).toBe('96');
  });
});
