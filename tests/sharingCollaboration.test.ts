import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { emptyWorkspace } from '../src/lib/storage/workspace';
import { createWorksheetSession } from '../src/lib/storage/worksheet';
import {
  createShareBundle,
  decodeShareToken,
  parseShareSnapshot,
  stringifyShareSnapshot,
} from '../src/lib/share/snapshot';
import type { MathWorkspaceState } from '../src/lib/math/types';
import type { WorksheetSession } from '../src/lib/math/worksheetTypes';

function workspace(): MathWorkspaceState {
  const a = resolveSemanticObject(parseMath('a := 2'), [], []).object!;
  const f = resolveSemanticObject(parseMath('f(x) := a*x^2'), [a], []).object!;
  return {
    ...emptyWorkspace(),
    objects:[a,f],
    activeObjectId:f.id,
    pinnedObjectIds:[f.id],
    updatedAt:1000,
  };
}

function worksheet(): WorksheetSession {
  const session=createWorksheetSession('Shared analysis');
  session.entries.push({
    id:'input:1',
    type:'input',
    source:'f(x) := a*x^2',
    normalizedSource:'f(x):=a*x^2',
    kind:'function',
    createdAt:1001,
  });
  session.entries.push({
    id:'result:1',
    type:'result',
    sourceEntryId:'input:1',
    input:'1/3',
    operation:'inspect-exact',
    result:{
      id:'math-result:1',
      operation:'inspect-exact',
      input:'1/3',
      exactness:'exact',
      value:{numerator:1n,denominator:3n},
      display:'1/3',
      assumptions:[],
      warnings:[],
      steps:[],
      createdAt:1002,
    },
    createdAt:1002,
  });
  session.updatedAt=1002;
  return session;
}

describe('P8 sharing snapshot',()=>{
  it('round-trips an immutable workspace + worksheet link with BigInt results',async()=>{
    const bundle=await createShareBundle(workspace(),worksheet(),{title:'Optimization review',note:'Check the setup.'});
    expect(bundle.token).toBeTruthy();
    expect(bundle.snapshot.workspace.activity).toEqual([]);
    const restored=await decodeShareToken(bundle.token!);
    expect(restored.title).toBe('Optimization review');
    expect(restored.note).toBe('Check the setup.');
    expect(restored.workspace.objects.map((item)=>item.name)).toEqual(['a','f']);
    expect(restored.worksheet?.entries).toHaveLength(2);
    const result=restored.worksheet?.entries[1];
    if(result?.type!=='result') throw new Error('Expected shared result.');
    expect((result.result.value as {numerator:bigint}).numerator).toBe(1n);
  });

  it('rejects a modified snapshot through its SHA-256 integrity check',async()=>{
    const bundle=await createShareBundle(workspace(),worksheet(),{title:'Original'});
    const modified=stringifyShareSnapshot({...bundle.snapshot,title:'Modified'});
    await expect(parseShareSnapshot(modified)).rejects.toThrow(/integrity/i);
  });

  it('can deliberately omit worksheet history',async()=>{
    const bundle=await createShareBundle(workspace(),worksheet(),{includeWorksheet:false});
    expect(bundle.snapshot.worksheet).toBeUndefined();
    const restored=await parseShareSnapshot(bundle.raw);
    expect(restored.worksheet).toBeUndefined();
  });

  it('falls back to a snapshot file when the encoded URL would be too large',async()=>{
    const session=worksheet();
    const first=session.entries[0];
    if(first.type!=='input') throw new Error('Expected input fixture.');
    first.source='x+'.repeat(14000)+'1';
    first.normalizedSource=first.source;
    const bundle=await createShareBundle(workspace(),session,{title:'Large collaboration packet'});
    expect(bundle.linkEligible).toBe(false);
    expect(bundle.token).toBeNull();
    expect(bundle.raw.length).toBeGreaterThan(24000);
    expect((await parseShareSnapshot(bundle.raw)).title).toBe('Large collaboration packet');
  });
});
