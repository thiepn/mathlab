import { describe, expect, it } from 'vitest';
import '../src/app/e3VisualTools';
import { TOOL_CATALOG, TOOL_CATEGORIES, findTool, toolNeedsConfiguration, toolSearchText } from '../src/app/toolCatalog';

describe('M4+ tool catalog', () => {
  it('exposes a broad cross-phase mathematical tool surface', () => {
    expect(TOOL_CATALOG.length).toBeGreaterThan(110);
    for (const category of TOOL_CATEGORIES) expect(TOOL_CATALOG.some((tool) => tool.category === category)).toBe(true);
  });

  it('finds flagship features by mathematical aliases', () => {
    const eigen = TOOL_CATALOG.find((tool) => toolSearchText(tool).includes('spectrum'));
    const bayes = TOOL_CATALOG.find((tool) => toolSearchText(tool).includes('bayes'));
    const rk4 = TOOL_CATALOG.find((tool) => toolSearchText(tool).includes('runge kutta'));
    const rref = TOOL_CATALOG.find((tool) => toolSearchText(tool).includes('gauss jordan'));
    const gradient = TOOL_CATALOG.find((tool) => toolSearchText(tool).includes('nabla'));
    const lagrange = TOOL_CATALOG.find((tool) => toolSearchText(tool).includes('constrained optimization'));
    expect(eigen?.id).toBe('eigen');
    expect(bayes?.id).toBe('evaluate-probability');
    expect(rk4?.id).toBe('ode-solve');
    expect(rref?.id).toBe('rref');
    expect(gradient?.id).toBe('gradient');
    expect(lagrange?.id).toBe('lagrange-multipliers');
  });

  it('publishes E3 visualization modes as searchable dedicated-workspace tools', () => {
    expect(findTool('implicit-plot')?.phase).toBe('E3');
    expect(findTool('implicit-plot')?.specialRoute).toBe('visualize');
    expect(findTool('surface-3d')?.category).toBe('Visualization');
    expect(toolSearchText(findTool('vector-field-plot')!)).toContain('quiver');
    expect(toolSearchText(findTool('phase-portrait')!)).toContain('dynamical system');
    expect(toolSearchText(findTool('contour-plot')!)).toContain('level sets');
  });

  it('distinguishes direct and configurable operations', () => {
    expect(toolNeedsConfiguration(findTool('taylor-polynomial')!)).toBe(true);
    expect(toolNeedsConfiguration(findTool('numerical-root')!)).toBe(true);
    expect(toolNeedsConfiguration(findTool('partial-derivative')!)).toBe(true);
    expect(toolNeedsConfiguration(findTool('lagrange-multipliers')!)).toBe(true);
    expect(toolNeedsConfiguration(findTool('gradient')!)).toBe(false);
    expect(toolNeedsConfiguration(findTool('rref')!)).toBe(false);
    expect(toolNeedsConfiguration(findTool('eigen')!)).toBe(false);
  });

  it('provides examples and descriptions for every catalog item', () => {
    for (const tool of TOOL_CATALOG) {
      expect(tool.label.trim().length).toBeGreaterThan(0);
      expect(tool.description.trim().length).toBeGreaterThan(12);
      expect(tool.example.trim().length).toBeGreaterThan(0);
      expect(tool.phase).toMatch(/^[PME]\d+$/);
    }
  });
});
