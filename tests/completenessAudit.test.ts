import { describe, expect, it } from 'vitest';
import {
  COMPLETENESS_DOMAINS,
  COMPLETENESS_RUBRIC,
  completenessBreadthPercent,
  domainsByStatus,
  implementedDomainMaturityPercent,
} from '../src/app/completenessAudit';

describe('M7/E1 mathematical completeness registry', () => {
  it('keeps the fixed 22-domain university-math baseline', () => {
    expect(COMPLETENESS_DOMAINS).toHaveLength(22);
    expect(new Set(COMPLETENESS_DOMAINS.map((domain) => domain.id)).size).toBe(22);
  });

  it('keeps status labels consistent with the numerical rubric', () => {
    for (const domain of COMPLETENESS_DOMAINS) expect(domain.status).toBe(COMPLETENESS_RUBRIC[domain.level]);
  });

  it('advances the audit only for evidence actually added by E1', () => {
    expect(completenessBreadthPercent()).toBe(38);
    expect(implementedDomainMaturityPercent()).toBe(56);
    expect(domainsByStatus('missing')).toHaveLength(7);
  });

  it('records multivariable calculus as partial rather than complete', () => {
    const domain = COMPLETENESS_DOMAINS.find((item) => item.id === 'multivariable-calculus');
    expect(domain?.level).toBe(3);
    expect(domain?.status).toBe('partial');
    expect(domain?.evidence.join(' ')).toContain('Gradient');
    expect(domain?.gaps.join(' ')).toContain('Double and triple integration');
    expect(domain?.nextPhase).toBe('E2');
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

  it('preserves strong ratings only for evidence-backed core domains', () => {
    expect(domainsByStatus('strong').map((domain) => domain.id).sort()).toEqual(['algebra-cas', 'linear-core', 'single-calculus']);
  });
});
