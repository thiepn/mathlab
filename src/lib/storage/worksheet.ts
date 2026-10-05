import type {
  WorksheetCheckpoint,
  WorksheetExport,
  WorksheetSession,
  WorksheetState,
} from '../math/worksheetTypes';
import { mathLabDb } from './database';

const WORKSHEET_KEY = 'worksheet:p2:default';
const RECOVERY_KEY = 'worksheet:p2:recovery';
const CHECKPOINTS_KEY = 'worksheet:p2:checkpoints';
const MAX_SESSIONS = 40;
const MAX_ENTRIES = 500;
const MAX_CHECKPOINTS = 12;
const MAX_IMPORT_BYTES = 5_000_000;
const BIGINT_TAG = '__mathlab_bigint__';

let saveQueue: Promise<void> = Promise.resolve();

function id(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function sessionTitle(createdAt: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(createdAt));
  } catch {
    return new Date(createdAt).toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function createWorksheetSession(title?: string): WorksheetSession {
  const createdAt = Date.now();
  return {
    id: id('session'),
    title: title?.trim() || `Session · ${sessionTitle(createdAt)}`,
    entries: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function emptyWorksheet(): WorksheetState {
  const session = createWorksheetSession();
  return { version: 1, sessions: [session], activeSessionId: session.id, updatedAt: session.updatedAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validResult(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.operation === 'string'
    && typeof value.input === 'string'
    && typeof value.display === 'string'
    && typeof value.exactness === 'string'
    && Array.isArray(value.assumptions)
    && Array.isArray(value.warnings)
    && Array.isArray(value.steps)
    && typeof value.createdAt === 'number';
}

function validEntry(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.createdAt !== 'number') return false;
  if (value.type === 'input') {
    return typeof value.source === 'string'
      && typeof value.normalizedSource === 'string'
      && typeof value.kind === 'string';
  }
  if (value.type === 'result') {
    return typeof value.input === 'string'
      && typeof value.operation === 'string'
      && validResult(value.result);
  }
  return false;
}

function validSession(value: unknown): value is WorksheetSession {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && value.title.length <= 180
    && Array.isArray(value.entries)
    && value.entries.length <= MAX_ENTRIES
    && value.entries.every(validEntry)
    && typeof value.createdAt === 'number'
    && typeof value.updatedAt === 'number';
}

function validState(value: unknown): value is WorksheetState {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<WorksheetState>;
  return candidate.version === 1
    && Array.isArray(candidate.sessions)
    && candidate.sessions.length > 0
    && candidate.sessions.length <= MAX_SESSIONS
    && candidate.sessions.every(validSession)
    && typeof candidate.activeSessionId === 'string'
    && typeof candidate.updatedAt === 'number';
}

function validCheckpoint(value: unknown): value is WorksheetCheckpoint {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.createdAt === 'number'
    && validSession(value.session);
}

export function normalizeWorksheet(state: WorksheetState): WorksheetState {
  const sessions = state.sessions
    .filter(validSession)
    .slice(-MAX_SESSIONS)
    .map((session) => ({ ...session, entries: session.entries.slice(-MAX_ENTRIES) }));

  if (!sessions.length) return emptyWorksheet();
  const activeSessionId = sessions.some((session) => session.id === state.activeSessionId)
    ? state.activeSessionId
    : sessions.at(-1)!.id;

  return {
    version: 1,
    sessions,
    activeSessionId,
    updatedAt: Number.isFinite(state.updatedAt) ? state.updatedAt : Date.now(),
  };
}

export async function loadWorksheet(): Promise<WorksheetState> {
  const stored = await mathLabDb.get<unknown>(WORKSHEET_KEY);
  if (validState(stored?.value)) return normalizeWorksheet(stored.value);
  const recovery = await mathLabDb.get<unknown>(RECOVERY_KEY);
  if (validState(recovery?.value)) return normalizeWorksheet(recovery.value);
  return emptyWorksheet();
}

async function persistWorksheet(snapshot: WorksheetState): Promise<void> {
  const previous = await mathLabDb.get<unknown>(WORKSHEET_KEY);
  if (validState(previous?.value) && previous.value.updatedAt > snapshot.updatedAt) return;
  if (validState(previous?.value)) await mathLabDb.put(RECOVERY_KEY, previous.value);
  await mathLabDb.put(WORKSHEET_KEY, snapshot);
}

export function saveWorksheet(state: WorksheetState): Promise<void> {
  const snapshot = normalizeWorksheet(state);
  const queued = saveQueue.catch(() => undefined).then(() => persistWorksheet(snapshot));
  saveQueue = queued;
  return queued;
}

export async function loadRecoveryWorksheet(): Promise<WorksheetState | null> {
  const stored = await mathLabDb.get<unknown>(RECOVERY_KEY);
  return validState(stored?.value) ? normalizeWorksheet(stored.value) : null;
}

export async function loadWorksheetCheckpoints(): Promise<WorksheetCheckpoint[]> {
  const stored = await mathLabDb.get<unknown>(CHECKPOINTS_KEY);
  if (!Array.isArray(stored?.value)) return [];
  return stored.value.filter(validCheckpoint).slice(0, MAX_CHECKPOINTS);
}

export async function saveWorksheetCheckpoint(checkpoint: WorksheetCheckpoint): Promise<WorksheetCheckpoint[]> {
  const existing = await loadWorksheetCheckpoints();
  const next = [checkpoint, ...existing.filter((item) => item.id !== checkpoint.id)].slice(0, MAX_CHECKPOINTS);
  await mathLabDb.put(CHECKPOINTS_KEY, next);
  return next;
}

export function createCheckpoint(session: WorksheetSession, label?: string): WorksheetCheckpoint {
  return {
    id: id('checkpoint'),
    label: label?.trim() || `Checkpoint · ${sessionTitle(Date.now())}`,
    session: structuredClone(session),
    createdAt: Date.now(),
  };
}

export function createWorksheetExport(state: WorksheetState): WorksheetExport {
  return { format: 'mathlab-worksheet', version: 1, exportedAt: Date.now(), worksheet: normalizeWorksheet(state) };
}

export function stringifyWorksheetExport(state: WorksheetState): string {
  return JSON.stringify(createWorksheetExport(state), (_key, value) => {
    if (typeof value === 'bigint') return { [BIGINT_TAG]: value.toString() };
    return value;
  }, 2);
}

export function parseWorksheetImport(raw: string): WorksheetState {
  if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES) throw new Error('Worksheet file is too large. The import limit is 5 MB.');
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw, (_key, value: unknown) => {
      if (isRecord(value) && Object.keys(value).length === 1 && typeof value[BIGINT_TAG] === 'string' && /^-?\\d+$/.test(value[BIGINT_TAG])) {
        return BigInt(value[BIGINT_TAG]);
      }
      return value;
    }) as unknown;
  }
  catch { throw new Error('The selected file is not valid JSON.'); }
  if (!isRecord(decoded)) throw new Error('The selected file is not a MathLab worksheet.');
  const packet = decoded as Partial<WorksheetExport>;
  if (packet.format !== 'mathlab-worksheet' || packet.version !== 1 || !validState(packet.worksheet)) {
    throw new Error('Unsupported or corrupted MathLab worksheet file.');
  }
  return normalizeWorksheet(packet.worksheet);
}
