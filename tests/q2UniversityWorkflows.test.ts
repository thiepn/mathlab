import { describe, expect, it } from 'vitest';
import { P7MathEngine } from '../src/lib/math/p7Engine';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import type { MathResult } from '../src/lib/math/types';

const engine = new P7MathEngine();

async function solve(
  input: string,
  operation: string,
  options: Record<string, string | number | boolean> = {},
): Promise<MathResult> {
  const parsed = parseMath(input);
  expect(parsed.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  const resolved = resolveSemanticObject(parsed, [], []);
  expect(resolved.object, 'student input should resolve as a first-class MathLab object').not.toBeNull();
  return engine.execute({
    id: 'q2:' + operation,
    input,
    ast: resolved.object!.valueAst,
    operation,
    options,
  });
}

function fact(result: MathResult, label: string): string {
  const value = result.sections?.flatMap((section) => section.facts)
    .find((entry) => entry.label === label)?.display;
  expect(value, 'Missing result fact: ' + label).toBeDefined();
  return value!;
}

describe('Q2 — representative semester university workflows through the production engine', () => {
  it('Differentialgleichungen: exact first-order linear solution and independently checkable RK45 IVP', async () => {
    const textbook = await solve('linearode(1,0)', 'ode-symbolic-solve');
    expect(textbook.exactness).toBe('exact');
    expect(textbook.sections?.[0].title).toContain('First-order linear');

    // y' = y, y(0) = 1 => y(1) = e; a numeric solve must remain approximate.
    const numeric = await solve('ivp(y,0,1)', 'ode-adaptive-solve', {
      endpoint: 1,
      tolerance: 1e-9,
    });
    expect(numeric.exactness).toBe('approximate');
    expect(numeric.resultAst?.type).toBe('matrix');
    if (numeric.resultAst?.type !== 'matrix') throw new Error('ODE endpoint vector missing');
    const endpoint = numeric.resultAst.rows[0][1];
    expect(endpoint?.type).toBe('number');
    expect(Number(endpoint?.type === 'number' ? endpoint.value : Number.NaN)).toBeCloseTo(Math.E, 6);
  });

  it('Stochastik: continuous CDF symmetry and discrete joint moments with explicit support', async () => {
    // The Student-t distribution is symmetric; for any positive degrees of freedom P(T <= 0) = 1/2.
    const cdf = await solve('studentt(10)', 'distribution-probability', { event: 'le', value: '0' });
    expect(cdf.exactness).toBe('approximate');
    expect(Number(cdf.display)).toBeCloseTo(0.5, 9);

    const joint = await solve('jointpmf([[1/4,1/4],[1/8,3/8]])', 'joint-distribution-profile');
    expect(Number(fact(joint, 'E[X]'))).toBeCloseTo(0.5, 12);
    expect(Number(fact(joint, 'E[Y]'))).toBeCloseTo(0.625, 12);
    expect(Number(fact(joint, 'Cov(X,Y)'))).toBeCloseTo(0.0625, 12);
    expect(joint.warnings.join(' ')).toContain('zero-based support');
  });

  it('Theoretische Informatik: Master theorem and a weighted graph shortest-path exercise', async () => {
    // T(n) = 2T(n/2) + n has asymptotic complexity Theta(n log n).
    const recurrence = await solve('master(2,2,1)', 'complexity-profile');
    expect(recurrence.exactness).toBe('exact');
    expect(recurrence.display).toBe('Θ(n log n)');

    // 1 -> 3 -> 2 -> 4 costs 1+1+2 = 4, beating the alternative direct edges.
    const graph = await solve('wgraph(4, [[1,2,3],[1,3,1],[3,2,1],[2,4,2],[3,4,10]])', 'shortest-path', {
      start: 1, target: 4,
    });
    expect(graph.exactness).toBe('exact');
    expect(graph.display).toBe('1 → 3 → 2 → 4 · distance 4');
  });

  it('Algorithmische Mathematik & Programmieren: QR polynomial fit and numerical eigenspectrum', async () => {
    // Five observations lie exactly on y = x^2 + 2x + 1.
    const fitting = await solve('[[0,1],[1,4],[2,9],[3,16],[4,25]]', 'polynomial-least-squares', {
      degree: 2, predictAt: 5,
    });
    expect(fitting.exactness).toBe('approximate');
    expect(Number(fact(fitting, 'R²'))).toBeCloseTo(1, 9);
    expect(Number(fact(fitting, 'Prediction at x=5'))).toBeCloseTo(36, 7);
    expect(fitting.warnings.join(' ')).toContain('ill-conditioned');

    // A real symmetric 2x2 matrix has eigenvalues 3 and 1.
    const eigen = await solve('[[2,1],[1,2]]', 'numerical-eigen', { tolerance: 1e-12 });
    expect(eigen.exactness).toBe('approximate');
    expect(eigen.resultAst?.type).toBe('matrix');
    if (eigen.resultAst?.type !== 'matrix') throw new Error('Eigenvalue vector missing');
    const values = eigen.resultAst.rows[0].map((item) => Number(item.type === 'number' ? item.value : Number.NaN));
    expect(values[0]).toBeCloseTo(3, 8);
    expect(values[1]).toBeCloseTo(1, 8);
  });
});
