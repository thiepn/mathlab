import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CATALOG } from '../src/app/allToolCatalog';
import { COMPLETENESS_DOMAINS } from '../src/app/completenessAudit';
import { E12_AUTOMATED_GATES, E12_EXTERNAL_RELEASE_GATES, E12_GOLDEN_CORPUS, E12_TARGET_VERSION } from '../src/app/e12Certification';
import { OPERATIONS_REQUIRING_CONTROLS } from '../src/app/workspaceOperations';
import { capabilitiesFor } from '../src/lib/math/capabilitiesE5';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

describe('E12 mathematical integration invariants',()=>{
  it('keeps global tool identities unique and metadata complete',()=>{
    const ids=ALL_TOOL_CATALOG.map((tool)=>tool.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const tool of ALL_TOOL_CATALOG){
      expect(tool.id.trim().length).toBeGreaterThan(0);
      expect(tool.operation.trim().length).toBeGreaterThan(0);
      expect(tool.label.trim().length).toBeGreaterThan(0);
      expect(tool.description.trim().length).toBeGreaterThan(0);
      expect(tool.example.trim().length).toBeGreaterThan(0);
      // Dedicated Proof Lab route tools may be object-independent because their
      // grammar owns a proof session rather than one Workspace semantic object.
      expect(tool.objectKinds.length>0||tool.specialRoute==='proof').toBe(true);
    }
  });

  it('keeps every main-parser tool example parseable by the production parser',()=>{
    const failures:string[]=[];
    for(const tool of ALL_TOOL_CATALOG){
      // Proof Lab route examples such as chains and entailment use their own line grammar,
      // so they are intentionally not single parseMath expressions.
      if(tool.specialRoute==='proof') continue;
      const parsed=parseMath(tool.example);
      const errors=parsed.diagnostics.filter((item)=>item.severity==='error');
      if(!parsed.ast||errors.length) failures.push(`${tool.id}: ${errors.map((item)=>item.message).join('; ')||'no AST'}`);
    }
    expect(failures).toEqual([]);
  });

  it('keeps controlled Workspace operations discoverable in the global catalog',()=>{
    const operations=new Set(ALL_TOOL_CATALOG.map((tool)=>tool.operation));
    const missing=[...OPERATIONS_REQUIRING_CONTROLS].filter((operation)=>!operations.has(operation));
    expect(missing).toEqual([]);
  });

  it('keeps every engine golden case both discoverable and capability-routed',()=>{
    const failures:string[]=[];
    for(const golden of E12_GOLDEN_CORPUS.filter((entry)=>entry.runner==='engine')){
      const parsed=parseMath(golden.input);
      const object=resolveSemanticObject(parsed,[],[]).object;
      if(!object||!golden.operation){failures.push(`${golden.domainId}: unresolved golden object`);continue;}
      if(!ALL_TOOL_CATALOG.some((tool)=>tool.operation===golden.operation)) failures.push(`${golden.domainId}: ${golden.operation} absent from catalog`);
      const capability=capabilitiesFor(object).find((item)=>item.id===golden.operation);
      if(!capability?.available) failures.push(`${golden.domainId}: ${golden.operation} not available for ${object.kind}${capability?.reason?` (${capability.reason})`:''}`);
    }
    expect(failures).toEqual([]);
  });

  it('requires explicit exactness provenance for the complete golden corpus',()=>{
    const allowed=new Set(['exact','approximate','heuristic']);
    expect(E12_GOLDEN_CORPUS.every((entry)=>allowed.has(entry.expectedExactness))).toBe(true);
    expect(E12_GOLDEN_CORPUS.some((entry)=>entry.expectedExactness==='exact')).toBe(true);
    expect(E12_GOLDEN_CORPUS.some((entry)=>entry.expectedExactness==='approximate')).toBe(true);
  });

  it('records stable automated coverage separately from physical-device claims',()=>{
    expect(E12_TARGET_VERSION).toBe('2.0.0');
    expect(E12_AUTOMATED_GATES).toContain('golden-cross-domain-corpus');
    expect(E12_AUTOMATED_GATES).toContain('pwa-static-contract');
    expect(E12_AUTOMATED_GATES).toContain('chromium-firefox-webkit-smoke');
    expect(E12_AUTOMATED_GATES).toContain('android-ios-engine-emulation');
    expect(E12_EXTERNAL_RELEASE_GATES).toContain('physical Android Chrome spot check');
    expect(E12_EXTERNAL_RELEASE_GATES).toContain('physical iOS Safari spot check');
  });

  it('does not equate zero missing domains with comprehensive mathematics',()=>{
    expect(COMPLETENESS_DOMAINS.every((domain)=>domain.level>0)).toBe(true);
    expect(COMPLETENESS_DOMAINS.every((domain)=>domain.level<5)).toBe(true);
  });
});
