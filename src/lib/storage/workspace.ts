import type { MathWorkspaceState, WorkspaceExport } from '../math/types';
import { mathLabDb } from './database';

const WORKSPACE_KEY = 'workspace:p15:default';
const LEGACY_P3_KEY = 'workspace:p3:default';
const LEGACY_P2_KEY = 'workspace:p2:default';
const RECOVERY_KEY = 'workspace:p15:recovery';
const LEGACY_RECOVERY_KEY = 'workspace:p3:recovery';
const MAX_ACTIVITY = 100;
const MAX_OBJECTS = 1000;
const MAX_ASSUMPTIONS = 250;
const MAX_IMPORT_BYTES = 5_000_000;

export function emptyWorkspace(): MathWorkspaceState {
  return { version: 3, objects: [], assumptions: [], pinnedObjectIds: [], activity: [], updatedAt: Date.now() };
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function validObject(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.source === 'string' && typeof value.kind === 'string'
    && isRecord(value.ast) && isRecord(value.valueAst) && Array.isArray(value.parameters) && Array.isArray(value.variables)
    && Array.isArray(value.dependencies) && Array.isArray(value.assumptions) && typeof value.updatedAt === 'number';
}
function validAssumption(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.label === 'string';
}

function isP3Workspace(value: unknown): value is MathWorkspaceState {
  if (!isRecord(value)) return false;
  const candidate = value as unknown as Partial<MathWorkspaceState>;
  return candidate.version === 3
    && Array.isArray(candidate.objects) && candidate.objects.length <= MAX_OBJECTS && candidate.objects.every(validObject)
    && Array.isArray(candidate.assumptions) && candidate.assumptions.length <= MAX_ASSUMPTIONS && candidate.assumptions.every(validAssumption)
    && Array.isArray(candidate.pinnedObjectIds) && candidate.pinnedObjectIds.every((id) => typeof id === 'string')
    && Array.isArray(candidate.activity);
}

function migrateP2(value: unknown): MathWorkspaceState | null {
  if (!isRecord(value)) return null;
  const legacy = value as { version?: number; objects?: MathWorkspaceState['objects']; assumptions?: MathWorkspaceState['assumptions']; activeObjectId?: string; updatedAt?: number };
  if (legacy.version !== 2 || !Array.isArray(legacy.objects) || legacy.objects.length > MAX_OBJECTS || !legacy.objects.every(validObject)
    || !Array.isArray(legacy.assumptions) || legacy.assumptions.length > MAX_ASSUMPTIONS || !legacy.assumptions.every(validAssumption)) return null;
  return {
    version: 3,
    objects: legacy.objects,
    assumptions: legacy.assumptions,
    activeObjectId: legacy.activeObjectId,
    pinnedObjectIds: [],
    activity: [],
    updatedAt: legacy.updatedAt ?? Date.now(),
  };
}

export function normalizeWorkspace(state: MathWorkspaceState): MathWorkspaceState {
  const validIds = new Set(state.objects.map((item) => item.id));
  return {
    ...state,
    version: 3,
    activeObjectId: state.activeObjectId && validIds.has(state.activeObjectId) ? state.activeObjectId : undefined,
    pinnedObjectIds: state.pinnedObjectIds.filter((id, index, all) => validIds.has(id) && all.indexOf(id) === index),
    activity: state.activity.filter((item) => item && typeof item.id === 'string' && typeof item.label === 'string').slice(0, MAX_ACTIVITY),
    updatedAt: Date.now(),
  };
}

async function migrateLegacyWorkspace(): Promise<MathWorkspaceState | null> {
  const p3 = await mathLabDb.get<unknown>(LEGACY_P3_KEY);
  if (isP3Workspace(p3?.value)) return normalizeWorkspace(p3.value);
  const p2 = await mathLabDb.get<unknown>(LEGACY_P2_KEY);
  return migrateP2(p2?.value);
}

export async function loadWorkspace(): Promise<MathWorkspaceState> {
  const stored = await mathLabDb.get<unknown>(WORKSPACE_KEY);
  if (isP3Workspace(stored?.value)) return normalizeWorkspace(stored.value);

  const recovery = await mathLabDb.get<unknown>(RECOVERY_KEY);
  if (isP3Workspace(recovery?.value)) return normalizeWorkspace(recovery.value);

  const migrated = await migrateLegacyWorkspace();
  if (migrated) {
    await mathLabDb.put(WORKSPACE_KEY, migrated);
    return migrated;
  }
  return emptyWorkspace();
}

export async function saveWorkspace(state: MathWorkspaceState): Promise<void> {
  if (state.objects.length > MAX_OBJECTS) throw new Error(`Workspace limit exceeded (${MAX_OBJECTS} objects). Export or remove objects before continuing.`);
  if (state.assumptions.length > MAX_ASSUMPTIONS) throw new Error(`Workspace limit exceeded (${MAX_ASSUMPTIONS} assumptions).`);
  const normalized = normalizeWorkspace(state);
  const previous = await mathLabDb.get<unknown>(WORKSPACE_KEY);
  if (isP3Workspace(previous?.value)) await mathLabDb.put(RECOVERY_KEY, previous.value);
  await mathLabDb.put(WORKSPACE_KEY, normalized);
}

export async function loadRecoveryWorkspace(): Promise<MathWorkspaceState | null> {
  const current = await mathLabDb.get<unknown>(RECOVERY_KEY);
  if (isP3Workspace(current?.value)) return normalizeWorkspace(current.value);
  const legacy = await mathLabDb.get<unknown>(LEGACY_RECOVERY_KEY);
  return isP3Workspace(legacy?.value) ? normalizeWorkspace(legacy.value) : null;
}

export function createWorkspaceExport(state: MathWorkspaceState): WorkspaceExport {
  return { format: 'mathlab-workspace', version: 1, exportedAt: Date.now(), workspace: normalizeWorkspace(state) };
}

export function parseWorkspaceImport(raw: string): MathWorkspaceState {
  if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES) throw new Error('Workspace file is too large. The release import limit is 5 MB.');
  let decoded: unknown;
  try { decoded = JSON.parse(raw) as unknown; }
  catch { throw new Error('The selected file is not valid JSON.'); }
  if (!isRecord(decoded)) throw new Error('The selected file is not a MathLab workspace.');
  const packet = decoded as unknown as Partial<WorkspaceExport>;
  if (packet.format !== 'mathlab-workspace' || packet.version !== 1 || !isP3Workspace(packet.workspace)) {
    throw new Error('Unsupported, corrupted, or oversized MathLab workspace file.');
  }
  return normalizeWorkspace(packet.workspace);
}
