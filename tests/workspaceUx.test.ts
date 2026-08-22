import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '../src/lib/math/capabilities';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { operationNeedsControls, preferredWorkspaceActions } from '../src/app/workspaceOperations';

function objectFrom(source: string) {
  const parsed = parseMath(source);
  const resolved = resolveSemanticObject(parsed, [], []);
  if (!resolved.object) throw new Error(`Could not resolve ${source}`);
  return resolved.object;
}

describe('M3 workspace operation UX', () => {
  it('surfaces solve first for equations', () => {
    const actions = preferredWorkspaceActions(capabilitiesFor(objectFrom('2*x+5=11')));
    expect(actions[0]?.id).toBe('solve');
  });

  it('surfaces high-value matrix operations without requiring the inspector', () => {
    const actions = preferredWorkspaceActions(capabilitiesFor(objectFrom('[[1,2],[3,4]]'))).map((item) => item.id);
    expect(actions).toContain('det');
    expect(actions).toContain('rref');
    expect(actions).toContain('rank');
  });

  it('does not surface operations that need extra parameters as one-click actions', () => {
    const actions = preferredWorkspaceActions(capabilitiesFor(objectFrom('f(x)=x^2')));
    expect(actions.some((item) => operationNeedsControls(item.id))).toBe(false);
    expect(operationNeedsControls('definite-integral')).toBe(true);
    expect(operationNeedsControls('limit')).toBe(true);
  });

  it('keeps graph as a direct action where available', () => {
    const actions = preferredWorkspaceActions(capabilitiesFor(objectFrom('f(x)=x^2'))).map((item) => item.id);
    expect(actions).toContain('graph');
  });
});
