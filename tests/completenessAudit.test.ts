import { describe, expect, it } from 'vitest';
import {
  COMPLETENESS_DOMAINS,
  COMPLETENESS_RUBRIC,
  completenessBreadthPercent,
  domainsByStatus,
  implementedDomainMaturityPercent,
} from '../src/app/completenessAudit';

describe('M7 mathematical completeness audit', () => {
  it('uses the fixed 22-domain university-math baseline', () => {
    expect(COMPLETENESS_DOMAINS).toHaveLength(22);
    expect(new Set(COMPLETENESS_DOMAINS.map((domain) => domain.id)).size).toBe(22);
  });

  it('keeps status labels consistent with the numerical rubric', () => {
    for (const domain of COMPLETENESS_DOMAINS) {
      expect(domain.status).toBe(COMPLETENESS_RUBRIC[domain.level]);
    }
  });

  it('reports the conservative M7 headline indices', () => {
    expect(completenessBreadthPercent()).toBe(35);
    expect(implementedDomainMaturityPercent()).toBe(58);
  });

  it('does not claim any comprehensive domain and records nine missing major domains', () => {
    expect(domainsByStatus('comprehensive')).toHaveLength(0);
    expect(domainsByStatus('missing')).toHaveLength(9);
  });

  it('identifies the immediate expansion blocker as multivariable calculus', () => {
    const domain = COMPLETENESS_DOMAINS.find((item) => item.id === 'multivariable-calculus');
    expect(domain?.level).toBe(0);
    expect(domain?.nextPhase).toBe('E1');
  });

  it('preserves strong ratings only for evidence-backed core domains', () => {
    expect(domainsByStatus('strong').map((domain) => domain.id).sort()).toEqual(['algebra-cas', 'linear-core', 'single-calculus']);
  });
});
