import { describe, expect, it } from 'vitest';
import {
  COMPLETENESS_DOMAINS,
  COMPLETENESS_RUBRIC,
  completenessBreadthPercent,
  domainsByStatus,
  implementedDomainMaturityPercent,
} from '../src/app/completenessAudit';

describe('M7/E1/E2/E3 mathematical completeness registry', () => {
  it('keeps the fixed 22-domain university-math baseline', () => {
    expect(COMPLETENESS_DOMAINS).toHaveLength(22);
    expect(new Set(COMPLETENESS_DOMAINS.map((domain) => domain.id)).size).toBe(22);
  });

  it('keeps status labels consistent with the numerical rubric', () => {
    for (const domain of COMPLETENESS_DOMAINS) expect(domain.status).toBe(COMPLETENESS_RUBRIC[domain.level]);
  });

  it('advances the audit only for evidence actually added through E3', () => {
    expect(completenessBreadthPercent()).toBe(43);
    expect(implementedDomainMaturityPercent()).toBe(59);
    expect(domainsByStatus('missing')).toHaveLength(6);
  });

  it('keeps multivariable calculus partial while recognizing integration moved into E2', () => {
    const domain = COMPLETENESS_DOMAINS.find((item) => item.id === 'multivariable-calculus');
    expect(domain?.level).toBe(3);
    expect(domain?.status).toBe('partial');
    expect(domain?.evidence.join(' ')).toContain('double/triple integration');
    expect(domain?.gaps.join(' ')).not.toContain('Double and triple integration');
    expect(domain?.nextPhase).toBe('E5');
  });

  it('keeps vector calculus partial while recognizing its E3 geometry views', () => {
    const domain = COMPLETENESS_DOMAINS.find((item) => item.id === 'vector-calculus');
    expect(domain?.level).toBe(3);
    expect(domain?.status).toBe('partial');
    expect(domain?.evidence.join(' ')).toContain('vector fields');
    expect(domain?.evidence.join(' ')).toContain('graph surfaces');
    expect(domain?.nextPhase).toBe('E10');
  });

  it('promotes visualization to strong only after E3 adds multiple geometry families', () => {
    const domain = COMPLETENESS_DOMAINS.find((item) => item.id === 'visualization');
    expect(domain?.level).toBe(4);
    expect(domain?.status).toBe('strong');
    expect(domain?.evidence.join(' ')).toContain('Parameterized');
    expect(domain?.evidence.join(' ')).toContain('phase portraits');
    expect(domain?.evidence.join(' ')).toContain('3D');
    expect(domain?.gaps.join(' ')).toContain('Implicit 3D');
    expect(domain?.nextPhase).toBe('E12');
  });

  it('records optimization only incidentally because E1 Lagrange solving is bounded', () => {
    const domain = COMPLETENESS_DOMAINS.find((item) => item.id === 'optimization');
    expect(domain?.level).toBe(1);
    expect(domain?.status).toBe('incidental');
    expect(domain?.nextPhase).toBe('E5');
  });

  it('does not claim any comprehensive domain', () => {
    expect(domainsByStatus('comprehensive')).toHaveLength(0);
  });

  it('adds visualization to the evidence-backed strong domains', () => {
    expect(domainsByStatus('strong').map((domain) => domain.id).sort()).toEqual(['algebra-cas', 'linear-core', 'single-calculus', 'visualization']);
  });
});
