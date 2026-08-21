import { describe, expect, it } from 'vitest';
import { createWorkspaceExport, emptyWorkspace, normalizeWorkspace, parseWorkspaceImport } from '../src/lib/storage/workspace';

describe('P15 release hardening', () => {
  it('round-trips the versioned workspace export packet', () => {
    const state = emptyWorkspace();
    const parsed = parseWorkspaceImport(JSON.stringify(createWorkspaceExport(state)));
    expect(parsed.version).toBe(3);
    expect(parsed.objects).toEqual([]);
  });

  it('rejects malformed workspace JSON', () => {
    expect(() => parseWorkspaceImport('{broken')).toThrow('valid JSON');
  });

  it('rejects oversized imports before parsing', () => {
    expect(() => parseWorkspaceImport(' '.repeat(5_000_001))).toThrow('too large');
  });

  it('normalizes stale selection and pin references', () => {
    const state = emptyWorkspace();
    const normalized = normalizeWorkspace({ ...state, activeObjectId: 'missing', pinnedObjectIds: ['missing', 'missing'] });
    expect(normalized.activeObjectId).toBeUndefined();
    expect(normalized.pinnedObjectIds).toEqual([]);
  });
});
