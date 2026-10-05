import type { MathResult } from './types';

export interface WorksheetInputEntry {
  id: string;
  type: 'input';
  source: string;
  normalizedSource: string;
  kind: string;
  objectId?: string;
  objectName?: string;
  createdAt: number;
}

export interface WorksheetResultEntry {
  id: string;
  type: 'result';
  sourceEntryId?: string;
  input: string;
  operation: string;
  result: MathResult;
  createdAt: number;
}

export type WorksheetEntry = WorksheetInputEntry | WorksheetResultEntry;

export interface WorksheetSession {
  id: string;
  title: string;
  entries: WorksheetEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface WorksheetState {
  version: 1;
  sessions: WorksheetSession[];
  activeSessionId: string;
  updatedAt: number;
}

export interface WorksheetCheckpoint {
  id: string;
  label: string;
  session: WorksheetSession;
  createdAt: number;
}

export interface WorksheetExport {
  format: 'mathlab-worksheet';
  version: 1;
  exportedAt: number;
  worksheet: WorksheetState;
}
