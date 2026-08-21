import type { MathOperationRequest, MathResult } from './types';

export interface MathEngine {
  readonly id: string;
  readonly label: string;
  isReady(): Promise<boolean>;
  execute(request: MathOperationRequest): Promise<MathResult>;
  cancel?(requestId: string): void;
}

export class EngineUnavailableError extends Error {
  constructor(message = 'The requested mathematical engine is not available yet.') {
    super(message);
    this.name = 'EngineUnavailableError';
  }
}
