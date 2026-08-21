import { describe, expect, it } from 'vitest';
import { verifyChain, verifyPropositionalEntailment, verifySingleTransition } from '../src/lib/math/proofLab';

describe('P13 Verify My Work & Proof Lab', () => {
  it('verifies reversible polynomial equation steps', () => {
    expect(verifySingleTransition('2*x+2=6', '2*x=4').status).toBe('verified');
    expect(verifySingleTransition('2*x=4', 'x=2').status).toBe('verified');
  });

  it('preserves domain restrictions when cancelling rational factors', () => {
    expect(verifySingleTransition('x/x', '1').status).toBe('conditionally-valid');
    expect(verifySingleTransition('x/x', '1', 'x != 0').status).toBe('verified');
  });

  it('detects factor conditions in equation transformations', () => {
    const report = verifySingleTransition('x=1', 'x^2=x');
    expect(report.status).toBe('conditionally-valid');
    expect(report.transitions[0].conditions.length).toBeGreaterThan(0);
  });

  it('uses counterexamples to reject false algebraic claims', () => {
    const report = verifySingleTransition('x+1', 'x+2');
    expect(report.status).toBe('invalid');
    expect(report.transitions[0].counterexample).toBeTruthy();
  });

  it('verifies linear inequalities through exact solution sets', () => {
    expect(verifySingleTransition('-3*x+2>11', 'x<-3').status).toBe('verified');
  });

  it('verifies chains transition by transition', () => {
    const report = verifyChain('2*x+2=6\n2*x=4\nx=2');
    expect(report.status).toBe('verified');
    expect(report.transitions).toHaveLength(2);
  });

  it('verifies propositional entailment exhaustively', () => {
    expect(verifyPropositionalEntailment('implies(p,q)\np', 'q').status).toBe('verified');
  });

  it('returns a truth-assignment counterexample when entailment fails', () => {
    const report = verifyPropositionalEntailment('or(p,q)', 'p');
    expect(report.status).toBe('invalid');
    expect(report.transitions[0].counterexample).toContain('p=F');
  });
});
