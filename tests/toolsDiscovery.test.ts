import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_CATEGORIES,
  CAPABILITY_REGISTRY,
  capabilitySearchText,
  findCapability,
} from '../src/app/capabilityRegistry';

describe('P4 unified capability discovery', () => {
  it('exposes a broad cross-phase mathematical tool surface', () => {
    expect(CAPABILITY_REGISTRY.length).toBeGreaterThan(110);
    for (const category of CAPABILITY_CATEGORIES) expect(CAPABILITY_REGISTRY.some((tool) => tool.category === category)).toBe(true);
  });

  it('finds flagship features by mathematical aliases', () => {
    const eigen = CAPABILITY_REGISTRY.find((tool) => capabilitySearchText(tool).includes('spectrum'));
    const bayes = CAPABILITY_REGISTRY.find((tool) => capabilitySearchText(tool).includes('bayes'));
    const rk4 = CAPABILITY_REGISTRY.find((tool) => capabilitySearchText(tool).includes('runge kutta'));
    const rref = CAPABILITY_REGISTRY.find((tool) => capabilitySearchText(tool).includes('gauss jordan'));
    const gradient = CAPABILITY_REGISTRY.find((tool) => capabilitySearchText(tool).includes('nabla'));
    const lagrange = CAPABILITY_REGISTRY.find((tool) => capabilitySearchText(tool).includes('constrained optimization'));
    expect(eigen?.id).toBe('eigen');
    expect(bayes?.id).toBe('evaluate-probability');
    expect(rk4?.id).toBe('ode-solve');
    expect(rref?.id).toBe('rref');
    expect(gradient?.id).toBe('gradient');
    expect(lagrange?.id).toBe('lagrange-multipliers');
  });

  it('publishes E3 visualization modes as searchable dedicated-workspace tools', () => {
    expect(findCapability('implicit-plot')?.phase).toBe('E3');
    expect(findCapability('implicit-plot')?.specialRoute).toBe('visualize');
    expect(findCapability('surface-3d')?.category).toBe('Visualization');
    expect(capabilitySearchText(findCapability('vector-field-plot')!)).toContain('quiver');
    expect(capabilitySearchText(findCapability('phase-portrait')!)).toContain('dynamical system');
    expect(capabilitySearchText(findCapability('contour-plot')!)).toContain('level sets');
  });

  it('distinguishes direct and configurable operations', () => {
    expect(findCapability('taylor-polynomial')!.needsConfiguration).toBe(true);
    expect(findCapability('numerical-root')!.needsConfiguration).toBe(true);
    expect(findCapability('partial-derivative')!.needsConfiguration).toBe(true);
    expect(findCapability('lagrange-multipliers')!.needsConfiguration).toBe(true);
    expect(findCapability('gradient')!.needsConfiguration).toBe(false);
    expect(findCapability('rref')!.needsConfiguration).toBe(false);
    expect(findCapability('eigen')!.needsConfiguration).toBe(false);
  });

  it('provides examples and descriptions for every catalog item', () => {
    for (const tool of CAPABILITY_REGISTRY) {
      expect(tool.label.trim().length).toBeGreaterThan(0);
      expect(tool.description.trim().length).toBeGreaterThan(12);
      expect(tool.example.trim().length).toBeGreaterThan(0);
      expect(tool.phase).toMatch(/^[PME]\d+$/);
    }
  });
});
