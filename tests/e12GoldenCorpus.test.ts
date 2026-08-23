import { describe, expect, it } from 'vitest';
import { COMPLETENESS_DOMAINS } from '../src/app/completenessAudit';
import { E12_CERTIFICATION_DOMAINS, E12_GOLDEN_CORPUS } from '../src/app/e12Certification';
import { E11MathEngine } from '../src/lib/math/e11Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { buildGraphSeries, defaultGraphViewport } from '../src/lib/math/visualization';

const engine=new E11MathEngine();

async function execute(input:string,operation:string,options?:Record<string,string|number|boolean>){
  const parsed=parseMath(input);
  expect(parsed.diagnostics.filter((item)=>item.severity==='error')).toHaveLength(0);
  const object=resolveSemanticObject(parsed,[],[]).object;
  expect(object).not.toBeNull();
  return engine.execute({
    id:`e12:${operation}:${input}`,
    operation,
    input,
    ast:object!.valueAst,
    variable:object!.kind==='function'?object!.parameters[0]:object!.variables.length===1?object!.variables[0]:undefined,
    options,
  });
}

describe('E12 cross-domain golden corpus',()=>{
  it('covers every fixed completeness domain exactly once',()=>{
    expect(E12_GOLDEN_CORPUS).toHaveLength(E12_CERTIFICATION_DOMAINS);
    expect(E12_CERTIFICATION_DOMAINS).toBe(22);
    const audited=[...COMPLETENESS_DOMAINS.map((domain)=>domain.id)].sort();
    const golden=[...E12_GOLDEN_CORPUS.map((entry)=>entry.domainId)].sort();
    expect(golden).toEqual(audited);
    expect(new Set(golden).size).toBe(22);
  });

  for(const golden of E12_GOLDEN_CORPUS){
    it(`${golden.domainId}: ${golden.label}`,async()=>{
      if(golden.runner==='visualization'){
        const parsed=parseMath(golden.input);
        expect(parsed.diagnostics.filter((item)=>item.severity==='error')).toHaveLength(0);
        expect(parsed.ast).not.toBeNull();
        const model=buildGraphSeries({id:'e12-visual',name:'e12-visual',source:golden.input,variable:'x',ast:parsed.ast!},defaultGraphViewport());
        expect(golden.expectedExactness).toBe('approximate');
        expect(model.segments.length).toBeGreaterThan(0);
        expect(model.segments.flatMap((segment)=>segment.points).length).toBeGreaterThan(500);
        return;
      }
      expect(golden.operation).toBeDefined();
      const result=await execute(golden.input,golden.operation!,golden.options);
      expect(result.exactness).toBe(golden.expectedExactness);
      expect(result.exactness).not.toBe('unknown');
      expect(result.display.length).toBeGreaterThan(0);
      if(golden.expectedDisplayIncludes) expect(result.display).toContain(golden.expectedDisplayIncludes);
    });
  }
});
