import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MathWorkspaceState } from '../src/lib/math/types';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';

const fake = vi.hoisted(() => {
  const records = new Map<string, { id: string; value: unknown; updatedAt: number }>();
  let workspaceWrites = 0;
  const mathLabDb = {
    get: vi.fn(async (id: string) => records.get(id)),
    put: vi.fn(async (id: string, value: unknown) => {
      workspaceWrites += id === 'workspace:p15:default' ? 1 : 0;
      // Reproduce the production failure mode: the first workspace write is
      // unusually slow while a later save is ready to proceed.
      if (id === 'workspace:p15:default' && workspaceWrites === 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      records.set(id, { id, value, updatedAt: Date.now() });
    }),
  };
  return {
    records,
    mathLabDb,
    reset() {
      records.clear();
      workspaceWrites = 0;
      mathLabDb.get.mockClear();
      mathLabDb.put.mockClear();
    },
  };
});

vi.mock('../src/lib/storage/database', () => ({ mathLabDb: fake.mathLabDb }));

import { emptyWorkspace, loadWorkspace, normalizeWorkspace, saveWorkspace } from '../src/lib/storage/workspace';

function namedWorkspace(name: string, updatedAt: number): MathWorkspaceState {
  const resolution = resolveSemanticObject(parseMath(`${name} := 2`), [], []);
  if (!resolution.object) throw new Error('Regression fixture could not create a semantic object.');
  return {
    ...emptyWorkspace(),
    objects: [resolution.object],
    activeObjectId: resolution.object.id,
    updatedAt,
  };
}

describe('workspace persistence ordering', () => {
  beforeEach(() => fake.reset());

  it('preserves the workspace mutation revision during normalization', () => {
    const state = namedWorkspace('revision_probe', 123456);
    expect(normalizeWorkspace(state).updatedAt).toBe(123456);
  });

  it('serializes overlapping saves so a delayed empty snapshot cannot overwrite newer work', async () => {
    const older: MathWorkspaceState = { ...emptyWorkspace(), updatedAt: 100 };
    const newer = namedWorkspace('race_probe', 200);

    const first = saveWorkspace(older);
    const second = saveWorkspace(newer);
    await Promise.all([first, second]);

    const loaded = await loadWorkspace();
    expect(loaded.updatedAt).toBe(200);
    expect(loaded.objects.map((object) => object.name)).toContain('race_probe');
    expect(loaded.activeObjectId).toBe(newer.activeObjectId);
  });

  it('refuses a late stale snapshot when a newer revision is already stored', async () => {
    const newer = namedWorkspace('newest_probe', 300);
    const stale: MathWorkspaceState = { ...emptyWorkspace(), updatedAt: 250 };

    await saveWorkspace(newer);
    await saveWorkspace(stale);

    const loaded = await loadWorkspace();
    expect(loaded.updatedAt).toBe(300);
    expect(loaded.objects.map((object) => object.name)).toEqual(['newest_probe']);
  });
});
