import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { objectJourneyState } from '../src/app/objectJourney';

function mathematicalObject(source: string) {
  const resolved = resolveSemanticObject(parseMath(source), [], []);
  if (!resolved.object) throw new Error('Expected supported mathematical object');
  return resolved.object;
}

describe('D1 object workflow ownership and available destinations', () => {
  it('allows persisted functions to reopen and enter graph exploration', () => {
    expect(objectJourneyState(mathematicalObject('f(x) := x^2 + 1'), true)).toMatchObject({
      name: 'f', ownership: 'Saved locally', canReopen: true, canExplore: true,
    });
  });
  it('does not pretend unsaved mathematical input is persisted or re-openable', () => {
    expect(objectJourneyState(mathematicalObject('f(x) := x^2 + 1'), false)).toMatchObject({
      ownership: 'Temporary work', canReopen: false, canExplore: false,
    });
  });
  it('does not advertise graph navigation for unsupported saved objects', () => {
    expect(objectJourneyState(mathematicalObject('a := 2'), true).canExplore).toBe(false);
  });
});
