import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import {
  CAPABILITY_CATEGORIES,
  CAPABILITY_REGISTRY,
  capabilitiesForCourse,
  capabilityRegistryIntegrity,
  capabilitySearchText,
  findCapability,
  preferredCapabilitiesForObject,
  rawRuntimeCapabilitiesForObject,
  resolveCapabilitiesForObject,
  runtimeRegistryGaps,
} from '../src/app/capabilityRegistry';

describe('P4 unified capability registry', () => {
  it('has one valid canonical descriptor per catalog id and operation', () => {
    const report = capabilityRegistryIntegrity();
    expect(report.duplicateIds).toEqual([]);
    expect(report.duplicateOperations).toEqual([]);
    expect(report.invalidEntries).toEqual([]);
    expect(CAPABILITY_REGISTRY.length).toBeGreaterThan(140);
    for (const category of CAPABILITY_CATEGORIES) {
      expect(CAPABILITY_REGISTRY.some((capability) => capability.category === category)).toBe(true);
    }
  });

  it('centralizes search aliases, configuration policy and course ownership', () => {
    expect(CAPABILITY_REGISTRY.find((capability) => capabilitySearchText(capability).includes('spectrum'))?.operation).toBe('eigen');
    expect(findCapability('taylor-polynomial')?.needsConfiguration).toBe(true);
    expect(findCapability('gradient')?.needsConfiguration).toBe(false);
    expect(findCapability('e6-advanced-distributions')?.operation).toBe('distribution-profile');
    expect(findCapability('distribution-profile')?.legacyIds).toContain('e6-advanced-distributions');

    const calculus = capabilitiesForCourse('calculus');
    expect(calculus.some((capability) => capability.category === 'Vector Calculus')).toBe(true);
    expect(calculus.some((capability) => capability.category === 'Visualization')).toBe(true);
    expect(capabilitiesForCourse('linear-algebra').every((capability) => capability.courseIds.includes('linear-algebra'))).toBe(true);
  });

  it('uses canonical registry metadata for runtime Workspace capabilities', () => {
    const parsed = parseMath('f(x) := x^3 - 3*x');
    const resolution = resolveSemanticObject(parsed);
    expect(resolution.object).toBeTruthy();
    const capabilities = resolveCapabilitiesForObject(resolution.object);
    const derivative = capabilities.find((capability) => capability.operation === 'derivative');
    expect(derivative?.label).toBe(findCapability('derivative')?.label);
    expect(derivative?.description).toBe(findCapability('derivative')?.description);
    expect(derivative?.runtimeGroup).toBeTruthy();

    const preferred = preferredCapabilitiesForObject(resolution.object);
    expect(preferred.every((capability) => capability.available && !capability.needsConfiguration)).toBe(true);
    expect(preferred.map((capability) => capability.operation)).toContain('derivative');
    expect(preferred.findIndex((capability) => capability.operation === 'derivative'))
      .toBeLessThan(preferred.findIndex((capability) => capability.operation === 'complex-derivative'));
  });

  it('has registry metadata for every runtime capability emitted by representative objects', () => {
    const sources = [
      '1/3',
      'x^2 - 1',
      '2*x + 5 = 11',
      'x^2 >= 0',
      'x+y=3; x-y=1',
      'f(x) := x^3 - 3*x',
      '[1,2,3]',
      '[[1,2],[3,4]]',
      'a_n := 1/n',
      'data(1,2,3,4,5)',
      'binomial(10,1/2)',
      'bayes(1/100,9/10,27/1000)',
      'implies(and(p,q),p)',
      'set(1,2,3)',
      'relation(3, [[1,1],[2,2],[3,3]])',
      'graph(4, [[1,2],[2,3],[3,4]])',
      'linrec2(0,1,1,1)',
      'complexity(n*log(n))',
      'starsbars(5,3)',
      'ivp(y,0,1)',
      'heatpde(1,1,[1])',
      'group([[1,2],[2,1]])',
      'ring([[1,2],[2,1]],[[1,1],[1,2]])',
      'grouphom([[1,2],[2,1]],[[1,2],[2,1]],[1,2])',
      'metricspace([[0,1],[1,0]])',
      'topology([[0,0],[1,1]])',
      'pointset([[0,0],[1,1]])',
      'rectregion(0,1,0,1)',
    ];

    const gaps = new Set<string>();
    let emitted = 0;
    for (const source of sources) {
      const resolution = resolveSemanticObject(parseMath(source));
      if (!resolution.object) continue;
      const runtime = rawRuntimeCapabilitiesForObject(resolution.object);
      emitted += runtime.length;
      for (const gap of runtimeRegistryGaps(resolution.object)) gaps.add(gap);
    }

    expect(emitted).toBeGreaterThan(120);
    expect([...gaps]).toEqual([]);
  });

  it('keeps every executable catalog entry backed by a runtime capability for its own example', () => {
    const missing: string[] = [];
    for (const descriptor of CAPABILITY_REGISTRY) {
      if (descriptor.specialRoute) continue;
      const parsed = parseMath(descriptor.example);
      const resolution = resolveSemanticObject(parsed);
      if (!resolution.object) {
        missing.push(`${descriptor.id}: example did not resolve`);
        continue;
      }
      const runtime = rawRuntimeCapabilitiesForObject(resolution.object);
      if (!runtime.some((capability) => capability.id === descriptor.operation)) {
        missing.push(`${descriptor.id}: ${descriptor.operation} missing for ${resolution.object.kind}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
