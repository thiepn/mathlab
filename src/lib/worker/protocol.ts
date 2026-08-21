import type { MathOperationRequest, MathResult } from '../math/types';

export type MathWorkerRequest =
  | { type: 'ping'; id: string }
  | { type: 'execute'; id: string; payload: MathOperationRequest };

export type MathWorkerResponse =
  | { type: 'pong'; id: string }
  | { type: 'result'; id: string; payload: MathResult }
  | { type: 'error'; id: string; message: string };
