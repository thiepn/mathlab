import { describe, expect, it } from 'vitest';
import { LatestOperationGate } from '../src/app/LatestOperationGate';

describe('latest-operation safety', () => {
  it('permits only the latest operation to update the workbench', () => {
    const gate = new LatestOperationGate();
    const first = gate.begin();
    expect(gate.isCurrent(first)).toBe(true);
    const second = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it('invalidates in-flight results when work context changes', () => {
    const gate = new LatestOperationGate();
    const pending = gate.begin();
    gate.invalidate();
    expect(gate.isCurrent(pending)).toBe(false);
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });

  it('prevents older async work from applying after newer work resolves', async () => {
    const gate = new LatestOperationGate();
    const applied: string[] = [];
    let completeOld!: (value: string) => void;
    let completeNew!: (value: string) => void;
    const oldPromise = new Promise<string>((resolve) => { completeOld = resolve; });
    const newPromise = new Promise<string>((resolve) => { completeNew = resolve; });

    const oldRevision = gate.begin();
    const oldHandler = oldPromise.then((value) => {
      if (gate.isCurrent(oldRevision)) applied.push(value);
    });
    const newRevision = gate.begin();
    const newHandler = newPromise.then((value) => {
      if (gate.isCurrent(newRevision)) applied.push(value);
    });

    completeNew('new');
    await newHandler;
    completeOld('old');
    await oldHandler;
    expect(applied).toEqual(['new']);
  });
});
