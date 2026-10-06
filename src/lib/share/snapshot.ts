import type { MathWorkspaceState } from '../math/types';
import type { WorksheetSession, WorksheetState } from '../math/worksheetTypes';
import { createWorkspaceExport, normalizeWorkspace, parseWorkspaceImport } from '../storage/workspace';
import { parseWorksheetImport } from '../storage/worksheet';

const BIGINT_TAG = '__mathlab_bigint__';
const MAX_SHARE_BYTES = 5_000_000;
export const MAX_SHARE_LINK_TOKEN = 24_000;

export interface MathLabShareSnapshot {
  format: 'mathlab-share';
  version: 1;
  createdAt: number;
  title: string;
  note?: string;
  workspace: MathWorkspaceState;
  worksheet?: WorksheetSession;
  digest: string;
}

export interface ShareBundle {
  snapshot: MathLabShareSnapshot;
  raw: string;
  token: string | null;
  linkEligible: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? { [BIGINT_TAG]: value.toString() } : value;
}

function jsonReviver(_key: string, value: unknown) {
  if (isRecord(value) && Object.keys(value).length === 1 && typeof value[BIGINT_TAG] === 'string' && /^-?\d+$/.test(value[BIGINT_TAG])) {
    return BigInt(value[BIGINT_TAG] as string);
  }
  return value;
}

function payloadOf(snapshot: Omit<MathLabShareSnapshot, 'digest'>) {
  return JSON.stringify(snapshot, jsonReplacer);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + chunk)));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizedSharedWorkspace(state: MathWorkspaceState): MathWorkspaceState {
  const normalized = normalizeWorkspace(structuredClone(state));
  return { ...normalized, activity: [] };
}

function validateWorksheet(session: unknown): WorksheetSession | undefined {
  if (session === undefined) return undefined;
  if (!isRecord(session) || typeof session.id !== 'string') throw new Error('Shared worksheet session is malformed.');
  const state: WorksheetState = {
    version: 1,
    sessions: [session as unknown as WorksheetSession],
    activeSessionId: session.id,
    updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : Date.now(),
  };
  const raw = JSON.stringify({ format:'mathlab-worksheet', version:1, exportedAt:Date.now(), worksheet:state }, jsonReplacer);
  const parsed = parseWorksheetImport(raw);
  return parsed.sessions[0];
}

export async function createShareBundle(
  workspace: MathWorkspaceState,
  worksheet: WorksheetSession | undefined,
  options: { title?: string; note?: string; includeWorksheet?: boolean } = {},
): Promise<ShareBundle> {
  const title = options.title?.trim().slice(0, 180) || worksheet?.title?.trim().slice(0, 180) || 'MathLab snapshot';
  const note = options.note?.trim().slice(0, 1000) || undefined;
  const base: Omit<MathLabShareSnapshot, 'digest'> = {
    format: 'mathlab-share',
    version: 1,
    createdAt: Date.now(),
    title,
    ...(note ? { note } : {}),
    workspace: normalizedSharedWorkspace(workspace),
    ...(options.includeWorksheet !== false && worksheet ? { worksheet: structuredClone(worksheet) } : {}),
  };
  const digest = await sha256(payloadOf(base));
  const snapshot: MathLabShareSnapshot = { ...base, digest };
  const raw = JSON.stringify(snapshot, jsonReplacer, 2);
  if (new TextEncoder().encode(raw).byteLength > MAX_SHARE_BYTES) {
    throw new Error('Shared snapshot exceeds the 5 MB safety limit. Reduce the workspace or worksheet history before sharing.');
  }
  const token = encodeBase64Url(JSON.stringify(snapshot, jsonReplacer));
  return {
    snapshot,
    raw,
    token: token.length <= MAX_SHARE_LINK_TOKEN ? token : null,
    linkEligible: token.length <= MAX_SHARE_LINK_TOKEN,
  };
}

export async function parseShareSnapshot(raw: string): Promise<MathLabShareSnapshot> {
  if (new TextEncoder().encode(raw).byteLength > MAX_SHARE_BYTES) throw new Error('Shared snapshot exceeds the 5 MB safety limit.');
  let decoded: unknown;
  try { decoded = JSON.parse(raw, jsonReviver) as unknown; }
  catch { throw new Error('This is not valid MathLab shared-snapshot JSON.'); }
  if (!isRecord(decoded) || decoded.format !== 'mathlab-share' || decoded.version !== 1) {
    throw new Error('This file is not a supported MathLab shared snapshot.');
  }
  if (typeof decoded.title !== 'string' || decoded.title.length > 180 || typeof decoded.createdAt !== 'number' || !Number.isFinite(decoded.createdAt)) {
    throw new Error('Shared snapshot metadata is malformed.');
  }
  if (decoded.note !== undefined && (typeof decoded.note !== 'string' || decoded.note.length > 1000)) throw new Error('Shared snapshot note is malformed.');
  if (typeof decoded.digest !== 'string' || !/^[a-f0-9]{64}$/.test(decoded.digest)) throw new Error('Shared snapshot integrity metadata is missing.');

  const workspaceRaw = JSON.stringify(createWorkspaceExport(decoded.workspace as MathWorkspaceState));
  const workspace = parseWorkspaceImport(workspaceRaw);
  const worksheet = validateWorksheet(decoded.worksheet);
  const base: Omit<MathLabShareSnapshot, 'digest'> = {
    format: 'mathlab-share',
    version: 1,
    createdAt: decoded.createdAt,
    title: decoded.title,
    ...(decoded.note ? { note: decoded.note as string } : {}),
    workspace: normalizedSharedWorkspace(workspace),
    ...(worksheet ? { worksheet } : {}),
  };
  const digest = await sha256(payloadOf(base));
  if (digest !== decoded.digest) throw new Error('Shared snapshot failed its SHA-256 integrity check. The link or file may be damaged or modified.');
  return { ...base, digest };
}

export async function decodeShareToken(token: string): Promise<MathLabShareSnapshot> {
  if (!token || token.length > MAX_SHARE_LINK_TOKEN) throw new Error('This MathLab share link is missing or too large.');
  try { return await parseShareSnapshot(decodeBase64Url(token)); }
  catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Could not decode this MathLab share link.');
  }
}

export function shareLinkForToken(token: string): string {
  const base = window.location.href.split('#')[0];
  return `${base}#/share/${token}`;
}

export function stringifyShareSnapshot(snapshot: MathLabShareSnapshot): string {
  return JSON.stringify(snapshot, jsonReplacer, 2);
}
