import { useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface Props {
  operation: string;
  object: SemanticMathObject;
  running: boolean;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
}

const CONTROLLED=new Set(['subgroup-check','metric-ball','topology-subset-profile']);
export function isE10ControlledOperation(operation:string):boolean{return CONTROLLED.has(operation);}

export function E10OperationControls({operation,object,running,onAction}:Props){
  const [subset,setSubset]=useState('set(1)');
  const [center,setCenter]=useState('1');
  const [radius,setRadius]=useState('1');
  const [closed,setClosed]=useState(false);
  if(operation==='subgroup-check')return <div className="operation-control"><label><span>Candidate subset</span><input value={subset} onChange={e=>setSubset(e.target.value)} placeholder="set(1,3)" /></label><button disabled={!subset.trim()||running} onClick={()=>onAction?.(operation,{subset:subset.trim()})}>Check subgroup</button></div>;
  if(operation==='topology-subset-profile'){
    const fallback=object.shape.type==='topology'?`[${Array.from({length:object.shape.points},(_v,i)=>i===0?'1':'0').join(',')}]`:'set(1)';
    return <div className="operation-control"><label><span>Subset</span><input value={subset} onFocus={()=>{if(subset==='set(1)'&&object.shape.type==='topology')setSubset(fallback);}} onChange={e=>setSubset(e.target.value)} placeholder={fallback} /></label><button disabled={!subset.trim()||running} onClick={()=>onAction?.(operation,{subset:subset.trim()})}>Analyze subset</button></div>;
  }
  if(operation==='metric-ball'){
    const c=Number(center),valid=Number.isInteger(c)&&c>=1&&Boolean(radius.trim());
    return <div className="operation-control"><label><span>Center point</span><input inputMode="numeric" value={center} onChange={e=>setCenter(e.target.value)} /></label><label><span>Radius</span><input value={radius} onChange={e=>setRadius(e.target.value)} /></label><label><span>Ball type</span><select value={closed?'closed':'open'} onChange={e=>setClosed(e.target.value==='closed')}><option value="open">Open ball</option><option value="closed">Closed ball</option></select></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{center:c,radius:radius.trim(),closed})}>Compute metric ball</button></div>;
  }
  return null;
}
