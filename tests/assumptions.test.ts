import { describe, expect, it } from 'vitest';
import { detectAssumptionConflicts, parseAssumption } from '../src/lib/math/assumptions';

describe('P2 assumptions', () => {
  it.each([
    ['x > 0', 'comparison'],
    ['x >= 0', 'comparison'],
    ['n integer', 'domain'],
    ['x in R', 'domain'],
    ['A symmetric', 'property'],
  ])('parses %s', (source, predicateType) => {
    const parsed = parseAssumption(source);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.assumption?.predicate?.type).toBe(predicateType);
  });

  it('rejects unsupported prose', () => {
    const parsed = parseAssumption('suppose x is probably nice');
    expect(parsed.assumption).toBeNull();
    expect(parsed.diagnostics[0]?.code).toBe('assumption-parse-error');
  });

  it('detects competing domain assumptions', () => {
    const real = parseAssumption('x real').assumption!;
    const complex = parseAssumption('x complex').assumption!;
    expect(detectAssumptionConflicts([real, complex])[0]?.code).toBe('assumption-conflict');
  });
});
