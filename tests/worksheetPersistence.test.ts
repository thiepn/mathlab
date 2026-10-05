import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MathResult } from '../src/lib/math/types';
import type { WorksheetState } from '../src/lib/math/worksheetTypes';

const fake = vi.hoisted(() => {
  const records = new Map<string, { id: string; value: unknown; updatedAt: number }>();
  const mathLabDb = {
    get: vi.fn(async (id: string) => records.get(id)),
    put: vi.fn(async (id: string, value: unknown) => {
      records.set(id, { id, value, updatedAt: Date.now() });
    }),
    delete: vi.fn(async (id: string) => { records.delete(id); }),
  };
  return {
    records,
    mathLabDb,
    reset() {
      records.clear();
      mathLabDb.get.mockClear();
      mathLabDb.put.mockClear();
      mathLabDb.delete.mockClear();
    },
  };
});

vi.mock('../src/lib/storage/database', () => ({ mathLabDb: fake.mathLabDb }));

import {
  createCheckpoint,
  createWorksheetExport,
  emptyWorksheet,
  loadRecoveryWorksheet,
  loadWorksheet,
  loadWorksheetCheckpoints,
  parseWorksheetImport,
  saveWorksheet,
  saveWorksheetCheckpoint,
  stringifyWorksheetExport,
} from '../src/lib/storage/worksheet';

function withInput(state: WorksheetState, source: string, updatedAt: number): WorksheetState {
  const session = state.sessions[0];
  return {
    ...state,
    sessions: [{
      ...session,
      entries: [{
        id: `input:${updatedAt}`,
        type: 'input',
        source,
        normalizedSource: source,
        kind: 'expression',
        createdAt: updatedAt,
      }],
      updatedAt,
    }],
    updatedAt,
  };
}

describe('P2 worksheet persistence', () => {
  beforeEach(() => fake.reset());

  it('starts with one active local worksheet session', () => {
    const state = emptyWorksheet();
    expect(state.version).toBe(1);
    expect(state.sessions).toHaveLength(1);
    expect(state.activeSessionId).toBe(state.sessions[0].id);
    expect(state.sessions[0].entries).toEqual([]);
  });

  it('persists the newest worksheet and keeps the previous state as recovery', async () => {
    const base = withInput(emptyWorksheet(), 'x^2-1', 100);
    const newer = withInput(base, 'x^3-1', 200);

    await saveWorksheet(base);
    await saveWorksheet(newer);

    expect((await loadWorksheet()).updatedAt).toBe(200);
    const recovery = await loadRecoveryWorksheet();
    expect(recovery?.updatedAt).toBe(100);
    expect(recovery?.sessions[0].entries[0]).toMatchObject({ type: 'input', source: 'x^2-1' });
  });

  it('round-trips the worksheet export format', () => {
    const state = withInput(emptyWorksheet(), 'sin(x)', 300);
    const restored = parseWorksheetImport(JSON.stringify(createWorksheetExport(state)));
    expect(restored.version).toBe(1);
    expect(restored.sessions[0].entries[0]).toMatchObject({ type: 'input', source: 'sin(x)' });
  });

  it('rejects unrelated worksheet imports', () => {
    expect(() => parseWorksheetImport('{"hello":"world"}')).toThrow();
  });

  it('stores immutable manual checkpoints', async () => {
    const state = withInput(emptyWorksheet(), 'A=[[1,2],[3,4]]', 400);
    const checkpoint = createCheckpoint(state.sessions[0], 'Before matrix work');
    const saved = await saveWorksheetCheckpoint(checkpoint);
    expect(saved).toHaveLength(1);
    expect(saved[0].label).toBe('Before matrix work');

    state.sessions[0].entries.length = 0;
    const loaded = await loadWorksheetCheckpoints();
    expect(loaded[0].session.entries).toHaveLength(1);
  });

  it('accepts serializable deterministic engine results in a session export', () => {
    const state = emptyWorksheet();
    const result: MathResult = {
      id: 'result:1',
      operation: 'factor',
      input: 'x^2-1',
      exactness: 'exact',
      value: null,
      display: '(x-1)*(x+1)',
      assumptions: [],
      warnings: [],
      steps: [],
      createdAt: 500,
    };
    state.sessions[0].entries.push({
      id: 'worksheet-result:1',
      type: 'result',
      input: result.input,
      operation: result.operation,
      result,
      createdAt: result.createdAt,
    });

    const restored = parseWorksheetImport(JSON.stringify(createWorksheetExport(state)));
    expect(restored.sessions[0].entries[0]).toMatchObject({
      type: 'result',
      operation: 'factor',
      result: { exactness: 'exact' },
    });
  });

  it('round-trips exact BigInt result payloads through worksheet JSON export', () => {
    const state = emptyWorksheet();
    const result: MathResult<{ numerator: bigint; denominator: bigint }> = {
      id: 'result:bigint',
      operation: 'inspect-exact',
      input: '1/3',
      exactness: 'exact',
      value: { numerator: 1n, denominator: 3n },
      display: '1/3',
      assumptions: [],
      warnings: [],
      steps: [],
      createdAt: 600,
    };
    state.sessions[0].entries.push({
      id: 'worksheet-result:bigint',
      type: 'result',
      input: result.input,
      operation: result.operation,
      result,
      createdAt: result.createdAt,
    });

    const raw = stringifyWorksheetExport(state);
    expect(raw).toContain('__mathlab_bigint__');
    const restored = parseWorksheetImport(raw);
    const entry = restored.sessions[0].entries[0];
    if (entry?.type !== 'result') throw new Error('Expected restored result entry.');
    expect((entry.result.value as { numerator: bigint }).numerator).toBe(1n);
  });
});
