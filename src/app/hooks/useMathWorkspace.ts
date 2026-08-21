import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ParsedMath } from '../../lib/math/ast';
import { detectAssumptionConflicts, parseAssumption } from '../../lib/math/assumptions';
import { dependentObjects, duplicateObject, renameObjectAndReferences } from '../../lib/math/workspaceLifecycle';
import { recomputeSemanticObjects, resolveSemanticObject, upsertSemanticObject } from '../../lib/math/semantic';
import type { MathWorkspaceState, SemanticMathObject, SemanticResolution, WorkspaceActivity, WorkspaceActivityType } from '../../lib/math/types';
import {
  createWorkspaceExport,
  emptyWorkspace,
  loadRecoveryWorkspace,
  loadWorkspace,
  parseWorkspaceImport,
  saveWorkspace,
} from '../../lib/storage/workspace';

function activity(type: WorkspaceActivityType, label: string, object?: SemanticMathObject): WorkspaceActivity {
  const createdAt = Date.now();
  return {
    id: `${type}:${createdAt}:${Math.random().toString(36).slice(2, 8)}`,
    type,
    label,
    source: object?.source,
    objectId: object?.id,
    objectName: object?.name,
    createdAt,
  };
}

function prependActivity(state: MathWorkspaceState, item: WorkspaceActivity): WorkspaceActivity[] {
  return [item, ...state.activity].slice(0, 100);
}

export function useMathWorkspace() {
  const [state, setState] = useState<MathWorkspaceState>(() => emptyWorkspace());
  const [workingObject, setWorkingObject] = useState<SemanticMathObject | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');

  useEffect(() => {
    let mounted = true;
    void loadWorkspace().then((loaded) => {
      if (!mounted) return;
      setState(loaded);
      setHydrated(true);
      setSaveState('saved');
    }).catch(() => {
      if (!mounted) return;
      setHydrated(true);
      setSaveState('error');
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState('saving');
    const handle = window.setTimeout(() => {
      void saveWorkspace(state).then(() => setSaveState('saved')).catch(() => setSaveState('error'));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [state, hydrated]);

  const activeObject = useMemo(
    () => state.objects.find((item) => item.id === state.activeObjectId) ?? workingObject,
    [state.objects, state.activeObjectId, workingObject],
  );

  const resolve = useCallback(
    (parsed: ParsedMath): SemanticResolution => resolveSemanticObject(parsed, state.objects, state.assumptions),
    [state.objects, state.assumptions],
  );

  const commitParsed = useCallback((parsed: ParsedMath): SemanticResolution => {
    const resolution = resolveSemanticObject(parsed, state.objects, state.assumptions);
    if (!resolution.object || resolution.diagnostics.some((item) => item.severity === 'error')) return resolution;

    if (!resolution.isDefinition || !resolution.object.name) {
      setWorkingObject(resolution.object);
      setState((current) => ({ ...current, activeObjectId: undefined, updatedAt: Date.now() }));
      return resolution;
    }

    setWorkingObject(null);
    setState((current) => {
      const existed = current.objects.find((item) => item.name === resolution.object!.name);
      const inserted = upsertSemanticObject(current.objects, resolution.object!);
      const objects = recomputeSemanticObjects(inserted, current.assumptions);
      const committed = objects.find((item) => item.name === resolution.object!.name)!;
      const log = activity(existed ? 'updated' : 'created', `${existed ? 'Updated' : 'Created'} ${committed.name}`, committed);
      return {
        ...current,
        objects,
        activeObjectId: committed.id,
        activity: prependActivity(current, log),
        updatedAt: Date.now(),
      };
    });
    return resolution;
  }, [state.objects, state.assumptions]);

  const addAssumption = useCallback((source: string) => {
    const parsed = parseAssumption(source);
    if (!parsed.assumption) return parsed;
    setState((current) => {
      const assumptions = [...current.assumptions.filter((item) => item.id !== parsed.assumption!.id), parsed.assumption!];
      const objects = recomputeSemanticObjects(current.objects, assumptions);
      return {
        ...current,
        assumptions,
        objects,
        activity: prependActivity(current, activity('assumption-added', `Added ${parsed.assumption!.label}`)),
        updatedAt: Date.now(),
      };
    });
    return parsed;
  }, []);

  const removeAssumption = useCallback((id: string) => {
    setState((current) => {
      const removed = current.assumptions.find((item) => item.id === id);
      const assumptions = current.assumptions.filter((item) => item.id !== id);
      return {
        ...current,
        assumptions,
        objects: recomputeSemanticObjects(current.objects, assumptions),
        activity: removed ? prependActivity(current, activity('assumption-removed', `Removed ${removed.label}`)) : current.activity,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const getDependents = useCallback((id: string) => {
    const object = state.objects.find((item) => item.id === id);
    return dependentObjects(state.objects, object?.name);
  }, [state.objects]);

  const removeObject = useCallback((id: string) => {
    setState((current) => {
      const removed = current.objects.find((item) => item.id === id);
      const objects = recomputeSemanticObjects(current.objects.filter((item) => item.id !== id), current.assumptions);
      return {
        ...current,
        objects,
        pinnedObjectIds: current.pinnedObjectIds.filter((item) => item !== id),
        activeObjectId: current.activeObjectId === id ? undefined : current.activeObjectId,
        activity: removed ? prependActivity(current, activity('deleted', `Deleted ${removed.name ?? 'object'}`, removed)) : current.activity,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const selectObject = useCallback((id: string) => {
    setWorkingObject(null);
    setState((current) => ({ ...current, activeObjectId: id, updatedAt: Date.now() }));
  }, []);

  const clearSelection = useCallback(() => {
    setWorkingObject(null);
    setState((current) => ({ ...current, activeObjectId: undefined, updatedAt: Date.now() }));
  }, []);

  const renameObject = useCallback((id: string, name: string) => {
    const before = state.objects.find((item) => item.id === id);
    if (!before?.name) throw new Error('Only named workspace objects can be renamed.');
    const renamed = renameObjectAndReferences(state.objects, state.assumptions, id, name);
    const after = renamed.objects.find((item) => item.id === id);
    setState((current) => ({
      ...current,
      objects: renamed.objects,
      assumptions: renamed.assumptions,
      activity: prependActivity(current, activity('renamed', `Renamed ${before.name} to ${after?.name ?? name}`, after)),
      updatedAt: Date.now(),
    }));
  }, [state.objects, state.assumptions]);

  const duplicate = useCallback((id: string) => {
    const copy = duplicateObject(state.objects, state.assumptions, id);
    const objects = recomputeSemanticObjects([...state.objects, copy], state.assumptions);
    const committed = objects.find((item) => item.name === copy.name)!;
    setState((current) => ({
      ...current,
      objects,
      activeObjectId: committed.id,
      activity: prependActivity(current, activity('duplicated', `Duplicated as ${committed.name}`, committed)),
      updatedAt: Date.now(),
    }));
    setWorkingObject(null);
  }, [state.objects, state.assumptions]);

  const togglePin = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      pinnedObjectIds: current.pinnedObjectIds.includes(id)
        ? current.pinnedObjectIds.filter((item) => item !== id)
        : [id, ...current.pinnedObjectIds],
      updatedAt: Date.now(),
    }));
  }, []);

  const exportWorkspace = useCallback(() => JSON.stringify(createWorkspaceExport(state), null, 2), [state]);

  const importWorkspace = useCallback((raw: string) => {
    const imported = parseWorkspaceImport(raw);
    const importLog = activity('imported', `Imported workspace with ${imported.objects.length} object${imported.objects.length === 1 ? '' : 's'}`);
    setWorkingObject(null);
    setState({ ...imported, activity: [importLog, ...imported.activity].slice(0, 100), updatedAt: Date.now() });
  }, []);

  const restoreRecovery = useCallback(async () => {
    const recovered = await loadRecoveryWorkspace();
    if (!recovered) return false;
    setWorkingObject(null);
    setState(recovered);
    return true;
  }, []);

  const resetWorkspace = useCallback(() => {
    setWorkingObject(null);
    setState(emptyWorkspace());
  }, []);

  const assumptionDiagnostics = useMemo(() => detectAssumptionConflicts(state.assumptions), [state.assumptions]);

  return {
    state,
    hydrated,
    saveState,
    activeObject,
    workingObject,
    resolve,
    commitParsed,
    addAssumption,
    removeAssumption,
    removeObject,
    getDependents,
    selectObject,
    clearSelection,
    renameObject,
    duplicate,
    togglePin,
    exportWorkspace,
    importWorkspace,
    restoreRecovery,
    resetWorkspace,
    assumptionDiagnostics,
  };
}

export type MathWorkspaceController = ReturnType<typeof useMathWorkspace>;
