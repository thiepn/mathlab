import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { E4MathEngine } from '../src/lib/math/e4Engine';
import {
  adaptiveOdeSolve,
  convertOdeToSystem,
  equilibriumProfile,
  odeStability,
  odeVisualizationVectorField,
  symbolicOdeSolve,
} from '../src/lib/math/e4Ode';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

function ast(source: string) {
  const parsed = parseMath(source);
  expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  expect(parsed.ast).not.toBeNull();
  return parsed.ast!;
}

describe('E4 ODEs & dynamical systems II', () => {
  it('parses and resolves first-class ODE systems with intrinsic state variables', () => {
    const parsed = parseMath('sys = odesys([x,y],[-x,-2*y],0,[1,1])');
    expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const resolved = resolveSemanticObject(parsed);
    expect(resolved.object?.kind).toBe('ode');
    expect(resolved.object?.shape).toEqual({ type: 'ode', variables: 2 });
    expect(resolved.object?.variables).toEqual([]);

    const capabilities = capabilitiesFor(resolved.object);
    expect(capabilities.find((item) => item.id === 'ode-stability')?.available).toBe(true);
    expect(capabilities.find((item) => item.id === 'ode-adaptive-solve')?.available).toBe(true);
    expect(capabilities.find((item) => item.id === 'ode-solve')?.applicable).toBe(false);
  });

  it('solves supported scalar textbook classes symbolically without claiming a general solver', () => {
    const separable = symbolicOdeSolve(ast('separable(1,y)'));
    expect(separable.exactness).toBe('exact');
    expect(separable.display.length).toBeGreaterThan(0);

    const linear = symbolicOdeSolve(ast('linearode(1,0)'));
    expect(linear.exactness).toBe('exact');
    expect(linear.sections[0]?.title).toContain('First-order linear');

    const exact = symbolicOdeSolve(ast('exactode(2*x+y,x+2*y)'));
    expect(exact.exactness).toBe('exact');
    expect(exact.sections[0]?.title).toBe('Exact differential equation');
    expect(exact.sections[0]?.facts.some((fact) => fact.label === 'Potential Φ')).toBe(true);

    const secondOrder = symbolicOdeSolve(ast('ode2(1,0,1)'));
    expect(secondOrder.exactness).toBe('exact');
    expect(secondOrder.sections[0]?.facts.some((fact) => fact.label === 'Root family')).toBe(true);
  });

  it('converts bounded higher-order constant-coefficient equations to first-order systems', () => {
    const converted = convertOdeToSystem(ast('oden([1,0,0,0],0,0,[1,0,0])'));
    expect(converted.ast?.type).toBe('call');
    if (converted.ast?.type !== 'call') throw new Error('expected odesys call');
    expect(converted.ast.name).toBe('odesys');
    expect(converted.ast.args[0]?.type).toBe('matrix');
    if (converted.ast.args[0]?.type !== 'matrix') throw new Error('expected state vector');
    expect(converted.ast.args[0].rows[0]).toHaveLength(3);
  });

  it('certifies equilibria and planar local stability from the exact Jacobian', () => {
    const system = ast('odesys([x,y],[-x,-2*y])');
    const equilibria = equilibriumProfile(system);
    expect(equilibria.display).toContain('x=0');
    expect(equilibria.display).toContain('y=0');

    const stability = odeStability(system);
    expect(stability.display).toContain('Stable node');
    expect(stability.exactness).toBe('exact');
  });

  it('integrates scalar IVPs and systems with adaptive Dormand-Prince RK45 and event stopping', () => {
    const scalar = adaptiveOdeSolve(ast('ivp(y,0,1)'), { endpoint: 1, tolerance: 1e-9 });
    expect(scalar.exactness).toBe('approximate');
    expect(scalar.ast?.type).toBe('matrix');
    if (scalar.ast?.type !== 'matrix') throw new Error('expected numeric endpoint vector');
    const y1 = Number(scalar.ast.rows[0][1]?.type === 'number' ? scalar.ast.rows[0][1].value : Number.NaN);
    expect(y1).toBeCloseTo(Math.E, 6);

    const event = adaptiveOdeSolve(ast('odesys([x,y],[-y,x],0,[1,0],x)'), { endpoint: 4, tolerance: 1e-8 });
    expect(event.warnings.some((warning) => warning.includes('event'))).toBe(true);
    expect(event.sections[0]?.facts.some((fact) => fact.label === 'Event')).toBe(true);
  });

  it('adapts autonomous two-state systems into the existing E3 phase-plane vector field', () => {
    const field = odeVisualizationVectorField(ast('odesys([x,y],[y,-x])'));
    expect(field?.variables).toEqual(['x','y']);
    expect(field?.ast.type).toBe('matrix');
  });

  it('routes E4 operations through the production math engine', async () => {
    const system = ast('odesys([x,y],[-x,-2*y])');
    const engine = new E4MathEngine();
    const result = await engine.execute({
      id: 'e4-test',
      operation: 'ode-stability',
      input: 'odesys([x,y],[-x,-2*y])',
      ast: system,
    });
    expect(result.display).toContain('Stable node');
    expect(result.exactness).toBe('exact');
  });
});
