import type { MathOperationRequest, MathResult } from '../math/types';
import type { MathWorkerRequest, MathWorkerResponse } from './protocol';

const WORKER_TIMEOUT_MS = 30_000;

export class MathWorkerClient {
  private worker: Worker | null = null;

  private getWorker(): Worker {
    if (!this.worker) this.worker = new Worker(new URL('./math.worker.ts', import.meta.url), { type: 'module' });
    return this.worker;
  }

  private request<T>(id:string, payload:MathWorkerRequest, resolveValue:(response:MathWorkerResponse)=>T|undefined):Promise<T> {
    const worker=this.getWorker();
    return new Promise((resolve,reject)=>{
      let settled=false;
      const cleanup=()=>{worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError);window.clearTimeout(timeout);};
      const finish=(fn:()=>void)=>{if(settled)return;settled=true;cleanup();fn();};
      const onMessage=(event:MessageEvent<MathWorkerResponse>)=>{
        const response=event.data;
        if(response.id!==id)return;
        if(response.type==='error'){const message=response.message;finish(()=>reject(new Error(message)));return;}
        const value=resolveValue(response);
        if(value!==undefined)finish(()=>resolve(value));
      };
      const onError=(event:ErrorEvent)=>finish(()=>{this.dispose();reject(new Error(event.message||'The mathematics Worker crashed.'));});
      const timeout=window.setTimeout(()=>finish(()=>{this.dispose();reject(new Error('The mathematics operation exceeded the 30 second release safety limit.'));}),WORKER_TIMEOUT_MS);
      worker.addEventListener('message',onMessage);
      worker.addEventListener('error',onError);
      worker.postMessage(payload);
    });
  }

  ping(): Promise<boolean> {
    const id = crypto.randomUUID();
    return this.request(id,{ type: 'ping', id },(response)=>response.type==='pong');
  }

  execute(request: Omit<MathOperationRequest, 'id'> & { id?: string }): Promise<MathResult> {
    const id = request.id ?? crypto.randomUUID();
    const payload: MathOperationRequest = { ...request, id };
    return this.request(id,{ type: 'execute', id, payload },(response)=>response.type==='result'?response.payload:undefined);
  }

  dispose(): void { this.worker?.terminate(); this.worker = null; }
}
