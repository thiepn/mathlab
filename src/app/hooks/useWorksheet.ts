import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SemanticResolution, MathResult } from '../../lib/math/types';
import type {
  WorksheetCheckpoint,
  WorksheetSession,
  WorksheetState,
} from '../../lib/math/worksheetTypes';
import {
  createCheckpoint,
  createWorksheetSession,
  emptyWorksheet,
  loadRecoveryWorksheet,
  loadWorksheet,
  loadWorksheetCheckpoints,
  normalizeWorksheet,
  parseWorksheetImport,
  saveWorksheet,
  saveWorksheetCheckpoint,
  stringifyWorksheetExport,
} from '../../lib/storage/worksheet';

const MAX_UNDO = 40;

function entryId(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function replaceSession(state: WorksheetState, next: WorksheetSession): WorksheetState {
  return {
    ...state,
    sessions: state.sessions.map((session) => session.id === next.id ? next : session),
    updatedAt: next.updatedAt,
  };
}

export function useWorksheet() {
  const [state, setState] = useState<WorksheetState>(() => emptyWorksheet());
  const [checkpoints, setCheckpoints] = useState<WorksheetCheckpoint[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [past, setPast] = useState<WorksheetSession[]>([]);
  const [future, setFuture] = useState<WorksheetSession[]>([]);
  const skipHydratedSaveRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([loadWorksheet(), loadWorksheetCheckpoints()]).then(([loaded, savedCheckpoints]) => {
      if (!mounted) return;
      skipHydratedSaveRef.current = true;
      setState(loaded);
      setCheckpoints(savedCheckpoints);
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
    if (skipHydratedSaveRef.current) {
      skipHydratedSaveRef.current = false;
      return;
    }
    setSaveState('saving');
    const handle = window.setTimeout(() => {
      void saveWorksheet(state).then(() => setSaveState('saved')).catch(() => setSaveState('error'));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [state, hydrated]);

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.id === state.activeSessionId) ?? state.sessions[0],
    [state.sessions, state.activeSessionId],
  );

  const mutateActive = useCallback((mutator: (session: WorksheetSession) => WorksheetSession) => {
    if (!activeSession) return;
    setPast((items) => [...items, structuredClone(activeSession)].slice(-MAX_UNDO));
    setFuture([]);
    setState((current) => {
      const active = current.sessions.find((session) => session.id === current.activeSessionId);
      if (!active) return current;
      const next = mutator(active);
      return replaceSession(current, { ...next, updatedAt: Date.now() });
    });
  }, [activeSession]);

  const recordInput = useCallback((source: string, normalizedSource: string, kind: string, resolution?: SemanticResolution) => {
    const entry = {
      id: entryId('input'),
      type: 'input' as const,
      source,
      normalizedSource,
      kind,
      objectId: resolution?.object?.id,
      objectName: resolution?.object?.name,
      createdAt: Date.now(),
    };
    mutateActive((session) => ({ ...session, entries: [...session.entries, entry] }));
    return entry.id;
  }, [mutateActive]);

  const recordResult = useCallback((result: MathResult) => {
    mutateActive((session) => {
      let entries = session.entries;
      const latestInput = [...entries].reverse().find((entry) => entry.type === 'input' && (entry.source === result.input || entry.normalizedSource === result.input));
      let sourceEntryId = latestInput?.id;

      if (!sourceEntryId) {
        const synthetic = {
          id: entryId('input'),
          type: 'input' as const,
          source: result.input,
          normalizedSource: result.input,
          kind: 'context',
          createdAt: Math.max(0, result.createdAt - 1),
        };
        entries = [...entries, synthetic];
        sourceEntryId = synthetic.id;
      }

      return {
        ...session,
        entries: [...entries, {
          id: entryId('result'),
          type: 'result' as const,
          sourceEntryId,
          input: result.input,
          operation: result.operation,
          result: structuredClone(result),
          createdAt: result.createdAt,
        }],
      };
    });
  }, [mutateActive]);

  const removeEntry = useCallback((id: string) => {
    mutateActive((session) => ({ ...session, entries: session.entries.filter((entry) => entry.id !== id && (entry.type !== 'result' || entry.sourceEntryId !== id)) }));
  }, [mutateActive]);

  const clearSession = useCallback(() => {
    mutateActive((session) => ({ ...session, entries: [] }));
  }, [mutateActive]);

  const renameSession = useCallback((title: string) => {
    const trimmed = title.trim().slice(0, 180);
    if (!trimmed || trimmed === activeSession?.title) return;
    mutateActive((session) => ({ ...session, title: trimmed }));
  }, [mutateActive, activeSession?.title]);

  const newSession = useCallback(() => {
    const session = createWorksheetSession();
    setPast([]);
    setFuture([]);
    setState((current) => normalizeWorksheet({
      ...current,
      sessions: [...current.sessions, session],
      activeSessionId: session.id,
      updatedAt: session.updatedAt,
    }));
  }, []);

  const selectSession = useCallback((id: string) => {
    setPast([]);
    setFuture([]);
    setState((current) => current.sessions.some((session) => session.id === id)
      ? { ...current, activeSessionId: id, updatedAt: Date.now() }
      : current);
  }, []);

  const undo = useCallback(() => {
    const previous = past.at(-1);
    if (!previous || !activeSession || previous.id !== activeSession.id) return;
    setPast(past.slice(0, -1));
    setFuture([structuredClone(activeSession), ...future].slice(0, MAX_UNDO));
    setState((current) => replaceSession(current, { ...structuredClone(previous), updatedAt: Date.now() }));
  }, [past, future, activeSession]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next || !activeSession || next.id !== activeSession.id) return;
    setFuture(future.slice(1));
    setPast([...past, structuredClone(activeSession)].slice(-MAX_UNDO));
    setState((current) => replaceSession(current, { ...structuredClone(next), updatedAt: Date.now() }));
  }, [past, future, activeSession]);

  const checkpoint = useCallback(async (label?: string) => {
    if (!activeSession) return;
    const saved = await saveWorksheetCheckpoint(createCheckpoint(activeSession, label));
    setCheckpoints(saved);
  }, [activeSession]);

  const restoreCheckpoint = useCallback((id: string) => {
    const checkpoint = checkpoints.find((item) => item.id === id);
    if (!checkpoint) return;
    setState((current) => {
      const active = current.sessions.find((session) => session.id === current.activeSessionId);
      if (active) {
        setPast((items) => [...items, structuredClone(active)].slice(-MAX_UNDO));
        setFuture([]);
      }
      const restored: WorksheetSession = {
        ...structuredClone(checkpoint.session),
        id: current.activeSessionId,
        title: active?.title ?? checkpoint.session.title,
        updatedAt: Date.now(),
      };
      return replaceSession(current, restored);
    });
  }, [checkpoints]);

  const restoreRecovery = useCallback(async () => {
    const recovered = await loadRecoveryWorksheet();
    if (!recovered) return false;
    setPast([]);
    setFuture([]);
    setState(recovered);
    return true;
  }, []);

  const exportWorksheet = useCallback(() => stringifyWorksheetExport(state), [state]);

  const importWorksheet = useCallback((raw: string) => {
    setPast([]);
    setFuture([]);
    setState(parseWorksheetImport(raw));
  }, []);

  return {
    state,
    activeSession,
    checkpoints,
    hydrated,
    saveState,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    recordInput,
    recordResult,
    removeEntry,
    clearSession,
    renameSession,
    newSession,
    selectSession,
    undo,
    redo,
    checkpoint,
    restoreCheckpoint,
    restoreRecovery,
    exportWorksheet,
    importWorksheet,
  };
}

export type WorksheetController = ReturnType<typeof useWorksheet>;
