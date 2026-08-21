import { mathLabDb } from './database';

const HISTORY_KEY = 'p1:input-history';
const MAX_HISTORY = 40;

export interface InputHistoryEntry {
  id: string;
  source: string;
  normalizedSource: string;
  kind: string;
  createdAt: number;
}

export async function loadInputHistory(): Promise<InputHistoryEntry[]> {
  if (typeof indexedDB === 'undefined') return [];
  const stored = await mathLabDb.get<InputHistoryEntry[]>(HISTORY_KEY);
  return stored?.value ?? [];
}

export async function addInputHistory(entry: Omit<InputHistoryEntry, 'id' | 'createdAt'>): Promise<InputHistoryEntry[]> {
  const existing = await loadInputHistory();
  const duplicateFiltered = existing.filter((item) => item.source !== entry.source);
  const next: InputHistoryEntry[] = [
    { ...entry, id: crypto.randomUUID(), createdAt: Date.now() },
    ...duplicateFiltered,
  ].slice(0, MAX_HISTORY);
  await mathLabDb.put(HISTORY_KEY, next);
  return next;
}

export async function clearInputHistory(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await mathLabDb.delete(HISTORY_KEY);
}
