import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

describe('P5 function semantics and capability routing', () => {
  it('preserves unary function parameters as calculus variables', () => {
    const resolution = resolveSemanticObject(parseMath('f(x)=x^2+1'));
    expect(resolution.object?.kind).toBe('function');
    expect(resolution.object?.parameters).toEqual(['x']);
    expect(resolution.object?.variables).toEqual([]);
    expect(resolution.object?.shape).toEqual({ type: 'function', arity: 1 });
  });

  it('activates P5 function workflows and P6 graphing', () => {
    const object = resolveSemanticObject(parseMath('f(x)=x^2+1')).object!;
    const actions = capabilitiesFor(object);
    expect(actions.find((item) => item.id === 'function-profile')?.available).toBe(true);
    expect(actions.find((item) => item.id === 'derivative')?.available).toBe(true);
    expect(actions.find((item) => item.id === 'graph')?.available).toBe(true);
  });

  it('keeps multivariable function calculus and P6 graphing explicitly inapplicable', () => {
    const object = resolveSemanticObject(parseMath('f(x,y)=x^2+y^2')).object!;
    const derivative = capabilitiesFor(object).find((item) => item.id === 'derivative');
    expect(derivative?.applicable).toBe(false);
    expect(derivative?.reason).toContain('unary functions');
    const graph = capabilitiesFor(object).find((item) => item.id === 'graph');
    expect(graph?.applicable).toBe(false);
  });
});
