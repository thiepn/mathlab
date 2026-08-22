import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { E2MathEngine } from '../src/lib/math/e2Engine';
import { astToPlainText } from '../src/lib/math/format';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { findTool, toolSearchText } from '../src/app/toolCatalog';

const engine = new E2MathEngine();

async function run(input:string,operation:string,options?:Record<string,string|number|boolean>){
  const parsed=parseMath(input);
  expect(parsed.diagnostics.filter((item)=>item.severity==='error')).toHaveLength(0);
  const resolved=resolveSemanticObject(parsed,[],[]);
  expect(resolved.object).not.toBeNull();
  const object=resolved.object!;
  const result=await engine.execute({id:`${operation}:${input}`,operation,input:object.source,ast:object.valueAst,assumptions:object.assumptions,options});
  return{object,result,text:result.resultAst?astToPlainText(result.resultAst):result.display};
}

function fact(result:Awaited<ReturnType<typeof run>>['result'],label:string):string|undefined{
  return result.sections?.flatMap((section)=>section.facts).find((item)=>item.label===label)?.display;
}
function compact(value:string):string{return value.replace(/\s+/g,'');}

describe('E2 vector calculus and multivariable integration',()=>{
  it('evaluates an exact variable-bound double integral',async()=>{
    const out=await run('f(x,y) := 1','double-integral',{coordinate:'cartesian',innerVariable:'x',outerVariable:'y',innerLower:'0',innerUpper:'y',outerLower:'0',outerUpper:'1'});
    expect(out.result.exactness).toBe('exact');
    expect(compact(out.text)).toBe('1/2');
  });

  it('evaluates an exact triple integral over the unit cube',async()=>{
    const out=await run('f(x,y,z) := 1','triple-integral',{coordinate:'cartesian',innerVariable:'x',middleVariable:'y',outerVariable:'z',innerLower:'0',innerUpper:'1',middleLower:'0',middleUpper:'1',outerLower:'0',outerUpper:'1'});
    expect(out.result.exactness).toBe('exact');
    expect(out.text).toBe('1');
  });

  it('builds polar, cylindrical, and spherical Jacobian-weighted integrands',async()=>{
    const polar=await run('f(x,y) := 1','coordinate-transform',{coordinate:'polar'});
    expect(polar.text).toBe('r');
    expect(fact(polar.result,'Jacobian')).toBe('r');
    const cylindrical=await run('f(x,y,z) := 1','coordinate-transform',{coordinate:'cylindrical'});
    expect(cylindrical.text).toBe('r');
    const spherical=await run('f(x,y,z) := 1','coordinate-transform',{coordinate:'spherical'});
    expect(compact(spherical.text)).toContain('rho^2');
    expect(compact(spherical.text)).toContain('sin(phi)');
  });

  it('computes exact divergence and curl for 3D vector fields',async()=>{
    const div=await run('F(x,y,z) := [x,y,z]','divergence');
    expect(div.text).toBe('3');
    const rot=await run('F(x,y,z) := [-y,x,0]','curl');
    expect(rot.text).toContain('0');
    expect(rot.text).toContain('2');
    expect(rot.result.resultAst?.type).toBe('matrix');
  });

  it('uses scalar curl in two dimensions',async()=>{
    const rot=await run('F(x,y) := [-y,x]','curl');
    expect(rot.text).toBe('2');
  });

  it('reconstructs a scalar potential for a supported conservative field',async()=>{
    const out=await run('F(x,y) := [2*x,2*y]','scalar-potential');
    expect(compact(out.text)).toContain('x^2');
    expect(compact(out.text)).toContain('y^2');
    expect(out.result.warnings.join(' ')).toContain('additive constant');
  });

  it('rejects a scalar potential for a field with nonzero curl',async()=>{
    await expect(run('F(x,y) := [-y,x]','scalar-potential')).rejects.toThrow(/curl/i);
  });

  it('evaluates an exact work line integral along a parameterized curve',async()=>{
    const out=await run('F(x,y) := [1,0]','line-integral',{curve:'[t,t^2]',curveParameter:'t',lower:'0',upper:'1'});
    expect(out.result.exactness).toBe('exact');
    expect(out.text).toBe('1');
  });

  it('evaluates upward flux through a flat unit graph surface',async()=>{
    const out=await run('F(x,y,z) := [0,0,1]','flux-integral',{surface:'z=0',xLower:'0',xUpper:'1',yLower:'0',yUpper:'1',orientation:'up'});
    expect(out.result.exactness).toBe('exact');
    expect(out.text).toBe('1');
  });

  it("verifies Green's theorem on a rectangular region",async()=>{
    const out=await run('F(x,y) := [-y,x]','green-theorem',{xLower:'0',xUpper:'1',yLower:'0',yUpper:'1'});
    expect(fact(out.result,'Verdict')).toBe('VERIFIED');
    expect(fact(out.result,'Boundary / flux side')).toBe('2');
    expect(fact(out.result,'Derivative / region side')).toBe('2');
  });

  it("verifies Gauss' divergence theorem on a rectangular box",async()=>{
    const out=await run('F(x,y,z) := [x,y,z]','gauss-theorem',{xLower:'0',xUpper:'1',yLower:'0',yUpper:'1',zLower:'0',zUpper:'1'});
    expect(fact(out.result,'Verdict')).toBe('VERIFIED');
    expect(fact(out.result,'Boundary / flux side')).toBe('3');
    expect(fact(out.result,'Derivative / region side')).toBe('3');
  });

  it("verifies Stokes' theorem for an upward flat graph",async()=>{
    const out=await run('F(x,y,z) := [-y,x,0]','stokes-theorem',{surface:'z=0',xLower:'0',xUpper:'1',yLower:'0',yUpper:'1',orientation:'up'});
    expect(fact(out.result,'Verdict')).toBe('VERIFIED');
    expect(fact(out.result,'Boundary / flux side')).toBe('2');
    expect(fact(out.result,'Derivative / region side')).toBe('2');
  });

  it('falls back explicitly to deterministic cubature when no exact antiderivative exists',async()=>{
    const out=await run('f(x,y) := sin(x*y)','double-integral',{coordinate:'cartesian',innerVariable:'x',outerVariable:'y',innerLower:'0',innerUpper:'1',outerLower:'0',outerUpper:'1',panels:24});
    expect(out.result.exactness).toBe('approximate');
    expect(Number(out.text)).toBeCloseTo(0.239811742,6);
    expect(out.result.warnings.join(' ')).toContain('Simpson');
  });

  it('separates scalar-field and vector-field capability discovery',()=>{
    const scalar=resolveSemanticObject(parseMath('f(x,y) := x+y'),[],[]).object!;
    const vector=resolveSemanticObject(parseMath('F(x,y) := [-y,x]'),[],[]).object!;
    expect(capabilitiesFor(scalar).find((item)=>item.id==='double-integral')?.available).toBe(true);
    expect(capabilitiesFor(scalar).find((item)=>item.id==='curl')?.available).toBe(false);
    expect(capabilitiesFor(vector).find((item)=>item.id==='curl')?.available).toBe(true);
    expect(capabilitiesFor(vector).find((item)=>item.id==='double-integral')?.available).toBe(false);
  });

  it('publishes E2 tools through the searchable Vector Calculus catalog',()=>{
    expect(findTool('green-theorem')?.phase).toBe('E2');
    expect(findTool('double-integral')?.category).toBe('Vector Calculus');
    expect(toolSearchText(findTool('gauss-theorem')!)).toContain('divergence theorem');
    expect(toolSearchText(findTool('coordinate-transform')!)).toContain('spherical coordinates');
  });
});
