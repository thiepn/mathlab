import { describe, expect, it } from 'vitest';
import {
  COMPLETENESS_DOMAINS,
  COMPLETENESS_RUBRIC,
  completenessBreadthPercent,
  domainsByStatus,
  implementedDomainMaturityPercent,
} from '../src/app/completenessAudit';

describe('E12 fixed-rubric mathematical completeness audit', () => {
  it('keeps the exact 22-domain M7 university-math baseline', () => {
    expect(COMPLETENESS_DOMAINS).toHaveLength(22);
    expect(new Set(COMPLETENESS_DOMAINS.map((domain) => domain.id)).size).toBe(22);
  });

  it('keeps every status label mechanically consistent with the numerical rubric', () => {
    for (const domain of COMPLETENESS_DOMAINS) expect(domain.status).toBe(COMPLETENESS_RUBRIC[domain.level]);
  });

  it('records the conservative E12 re-score without inventing comprehensive domains', () => {
    expect(completenessBreadthPercent()).toBe(66);
    expect(implementedDomainMaturityPercent()).toBe(66);
    expect(domainsByStatus('missing')).toHaveLength(0);
    expect(domainsByStatus('incidental')).toHaveLength(0);
    expect(domainsByStatus('narrow')).toHaveLength(2);
    expect(domainsByStatus('partial')).toHaveLength(11);
    expect(domainsByStatus('strong')).toHaveLength(9);
    expect(domainsByStatus('comprehensive')).toHaveLength(0);
  });

  it('recognizes every formerly missing M7 major domain as first-class but still bounded', () => {
    for (const id of ['complex-analysis','pde','optimization','transforms','number-theory','abstract-algebra','geometry-topology']) {
      const domain=COMPLETENESS_DOMAINS.find((item)=>item.id===id);
      expect(domain?.level).toBeGreaterThan(0);
      expect(domain?.evidence.length).toBeGreaterThan(0);
      expect(domain?.gaps.length).toBeGreaterThan(0);
    }
  });

  it('promotes E5 numerical linear algebra while retaining advanced gaps', () => {
    const domain=COMPLETENESS_DOMAINS.find((item)=>item.id==='linear-advanced');
    expect(domain?.level).toBe(4);
    expect(domain?.evidence.join(' ')).toContain('SVD');
    expect(domain?.gaps.join(' ')).toContain('Jordan');
  });

  it('promotes E6 probability/statistics and E9 discrete mathematics to strong', () => {
    for (const id of ['probability','statistics','discrete']) expect(COMPLETENESS_DOMAINS.find((item)=>item.id===id)?.status).toBe('strong');
  });

  it('keeps PDE and geometry/topology narrow rather than overstating foundation phases', () => {
    expect(COMPLETENESS_DOMAINS.find((item)=>item.id==='pde')?.level).toBe(2);
    expect(COMPLETENESS_DOMAINS.find((item)=>item.id==='geometry-topology')?.level).toBe(2);
  });

  it('keeps proof reasoning partial despite E11 theorem certificates', () => {
    const domain=COMPLETENESS_DOMAINS.find((item)=>item.id==='proof');
    expect(domain?.level).toBe(3);
    expect(domain?.evidence.join(' ')).toContain('induction');
    expect(domain?.gaps.join(' ')).toContain('Infinite-domain');
  });

  it('removes stale future-phase pointers after the E-series capability expansion', () => {
    expect(COMPLETENESS_DOMAINS.every((domain)=>domain.nextPhase===undefined)).toBe(true);
  });
});
