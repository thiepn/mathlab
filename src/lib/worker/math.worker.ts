import { E11MathEngine } from '../math/e11Engine';
import type { MathWorkerRequest, MathWorkerResponse } from './protocol';

const engine = new E11MathEngine();
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<MathWorkerRequest>) => void) | null;
  postMessage: (message: MathWorkerResponse) => void;
};

workerScope.onmessage = async (event: MessageEvent<MathWorkerRequest>) => {
  const request = event.data;
  if (request.type === 'ping') {
    workerScope.postMessage({ type: 'pong', id: request.id });
    return;
  }

  try {
    const result = await engine.execute(request.payload);
    workerScope.postMessage({ type: 'result', id: request.id, payload: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error.';
    workerScope.postMessage({ type: 'error', id: request.id, message });
  }
};
