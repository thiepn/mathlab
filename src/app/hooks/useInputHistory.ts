import { useCallback, useEffect, useState } from 'react';
import { addInputHistory, clearInputHistory, loadInputHistory, type InputHistoryEntry } from '../../lib/storage/inputHistory';

export function useInputHistory() {
  const [history, setHistory] = useState<InputHistoryEntry[]>([]);

  useEffect(() => {
    loadInputHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const add = useCallback(async (entry: Omit<InputHistoryEntry, 'id' | 'createdAt'>) => {
    try { setHistory(await addInputHistory(entry)); } catch { /* storage is optional */ }
  }, []);

  const clear = useCallback(async () => {
    try { await clearInputHistory(); } finally { setHistory([]); }
  }, []);

  return { history, add, clear };
}
