import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { recomputeSemanticObjects, resolveSemanticObject } from '../src/lib/math/semantic';
import { dependentObjects, duplicateObject, renameObjectAndReferences } from '../src/lib/math/workspaceLifecycle';
import type { SemanticMathObject } from '../src/lib/math/types';
import { createWorkspaceExport, emptyWorkspace, parseWorkspaceImport } from '../src/lib/storage/workspace';

function object(source: string, context: SemanticMathObject[] = []) {
  const resolution = resolveSemanticObject(parseMath(source), context, []);
  if (!resolution.object) throw new Error(`Could not resolve ${source}`);
  return resolution.object;
}

describe('P3 workspace lifecycle', () => {
  it('finds direct dependents', () => {
    const A = object('A = [[1,2],[3,4]]');
    const B = object('B := A', [A]);
    expect(dependentObjects([A, B], 'A').map((item) => item.name)).toEqual(['B']);
  });

  it('renames a saved object and rewrites dependent references', () => {
    const A = object('A = [[1,2],[3,4]]');
    const B = object('B := A', [A]);
    const objects = recomputeSemanticObjects([A, B], []);
    const result = renameObjectAndReferences(objects, [], A.id, 'M');
    const renamedB = result.objects.find((item) => item.id === B.id)!;
    expect(result.objects.some((item) => item.name === 'M')).toBe(true);
    expect(renamedB.dependencies).toContain('M');
    expect(renamedB.source).not.toContain('A');
  });

  it('duplicates definitions with a collision-safe name', () => {
    const f = object('f(x) := x + 1');
    const copy = duplicateObject([f], [], f.id);
    expect(copy.name).toBe('f_2');
    expect(copy.kind).toBe('function');
    expect(copy.parameters).toEqual(['x']);
  });

  it('round-trips the versioned workspace export format', () => {
    const A = object('A = [[1,2],[3,4]]');
    const state = { ...emptyWorkspace(), objects: [A], pinnedObjectIds: [A.id] };
    const imported = parseWorkspaceImport(JSON.stringify(createWorkspaceExport(state)));
    expect(imported.version).toBe(3);
    expect(imported.objects).toHaveLength(1);
    expect(imported.pinnedObjectIds).toEqual([A.id]);
  });

  it('rejects unrelated JSON files', () => {
    expect(() => parseWorkspaceImport('{"hello":"world"}')).toThrow();
  });
});
