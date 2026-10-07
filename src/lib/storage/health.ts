import { mathLabDb } from './database';

export type StoragePressure = 'unknown' | 'normal' | 'elevated' | 'critical';

export interface StorageHealth {
  indexedDbReady: boolean;
  persisted: boolean | null;
  persistenceSupported: boolean;
  usage: number | null;
  quota: number | null;
  ratio: number | null;
  pressure: StoragePressure;
  message?: string;
}

export function classifyStoragePressure(usage: number | null, quota: number | null): StoragePressure {
  if (usage === null || quota === null || quota <= 0) return 'unknown';
  const ratio = usage / quota;
  if (ratio >= 0.9) return 'critical';
  if (ratio >= 0.75) return 'elevated';
  return 'normal';
}

export async function inspectStorageHealth(): Promise<StorageHealth> {
  let indexedDbReady = true;
  let message: string | undefined;
  try {
    await mathLabDb.get('__mathlab:p9:health-probe__');
  } catch (error) {
    indexedDbReady = false;
    message = error instanceof Error ? error.message : 'IndexedDB is unavailable.';
  }

  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  const persistenceSupported = Boolean(storage?.persist && storage?.persisted);
  let persisted: boolean | null = null;
  let usage: number | null = null;
  let quota: number | null = null;

  try {
    if (storage?.persisted) persisted = await storage.persisted();
  } catch {
    persisted = null;
  }

  try {
    if (storage?.estimate) {
      const estimate = await storage.estimate();
      usage = typeof estimate.usage === 'number' ? estimate.usage : null;
      quota = typeof estimate.quota === 'number' ? estimate.quota : null;
    }
  } catch {
    usage = null;
    quota = null;
  }

  return {
    indexedDbReady,
    persisted,
    persistenceSupported,
    usage,
    quota,
    ratio: usage !== null && quota !== null && quota > 0 ? usage / quota : null,
    pressure: classifyStoragePressure(usage, quota),
    ...(message ? { message } : {}),
  };
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
