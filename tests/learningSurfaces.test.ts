import { describe, expect, it } from 'vitest';
import type { MathResult } from '../src/lib/math/types';
import { answeredQuestionCount, proofOutcome, toolsForCourse } from '../src/app/learningSurfaces';

function result(display: string, verificationStatus?: 'verified' | 'conditionally-valid' | 'invalid' | 'not-proven'): MathResult {
  return {
    id: 'm6-test',
    operation: 'verify-transition',
    input: 'x',
    exactness: 'exact',
    value: null,
    display,
    assumptions: [],
    warnings: [],
    steps: verificationStatus ? [{ id: 'step', before: 'x', after: 'x', rule: 'test', verified: verificationStatus === 'verified', verificationStatus }] : [],
    createdAt: 0,
  };
}

describe('M6 learning surfaces', () => {
  it('maps course tracks to the implemented tool catalog', () => {
    expect(toolsForCourse('linear-algebra').some((tool) => tool.id === 'eigen')).toBe(true);
    expect(toolsForCourse('analysis').some((tool) => tool.id === 'taylor-polynomial')).toBe(true);
    expect(toolsForCourse('numerical').some((tool) => tool.id === 'ode-solve')).toBe(true);
    expect(toolsForCourse('proof').some((tool) => tool.id === 'verify-chain')).toBe(true);
  });

  it('does not mix unrelated catalog categories into a course track', () => {
    expect(toolsForCourse('algebra').every((tool) => tool.category === 'Algebra')).toBe(true);
    expect(toolsForCourse('probability').every((tool) => tool.category === 'Probability & Statistics')).toBe(true);
  });

  it('prefers explicit proof-step verification status', () => {
    expect(proofOutcome(result('Anything', 'conditionally-valid'))).toBe('conditionally-valid');
    expect(proofOutcome(result('Anything', 'invalid'))).toBe('invalid');
  });

  it('falls back conservatively when a proof result lacks step metadata', () => {
    expect(proofOutcome(result('Verified by exact identity'))).toBe('verified');
    expect(proofOutcome(result('Not proven by the supported rule set'))).toBe('not-proven');
    expect(proofOutcome(null)).toBe('pending');
  });

  it('counts only nonblank submitted practice answers', () => {
    expect(answeredQuestionCount({ a: '1/2', b: '   ', c: 'q', d: '' })).toBe(2);
  });
});
