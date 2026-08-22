import { useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface Props{operation:string;object:SemanticMathObject;running:boolean;onAction?:(operation:string,options?:Record<string,string|number|boolean>)=>void;}
const CONTROLLED=new Set(['affine-rv-transform','two-sample-mean-inference','paired-mean-inference','two-proportion-inference','chi-square-goodness','bootstrap-mean','markov-step']);
export function isE6ControlledOperation(operation:string):boolean{return CONTROLLED.has(operation);}
export function E6OperationControls({operation,running,onAction}:Props){
  const[confidence,setConfidence]=useState('0.95');
  const[nullValue,setNullValue]=useState('0');
  const[alternative,setAlternative]=useState<'two-sided'|'less'|'greater'>('two-sided');
  const[expected,setExpected]=useState('[0.25,0.25,0.25,0.25]');
  const[count,setCount]=useState('2000');
  const[seed,setSeed]=useState('42');
  const[scale,setScale]=useState('1');
  const[shift,setShift]=useState('0');
  const[initial,setInitial]=useState('[1,0]');
  const[steps,setSteps]=useState('10');
  const conf=Number(confidence),nullN=Number(nullValue),countN=Number(count),seedN=Number(seed),scaleN=Number(scale),shiftN=Number(shift),stepsN=Number(steps);
  const inferenceValid=conf>0&&conf<1&&Number.isFinite(nullN);
  if(['two-sample-mean-inference','paired-mean-inference','two-proportion-inference'].includes(operation))return <div className="operation-control"><label><span>Confidence</span><input value={confidence} onChange={e=>setConfidence(e.target.value)}/></label><label><span>Null difference</span><input value={nullValue} onChange={e=>setNullValue(e.target.value)}/></label><label><span>Alternative</span><select value={alternative} onChange={e=>setAlternative(e.target.value as typeof alternative)}><option value="two-sided">≠</option><option value="less">&lt;</option><option value="greater">&gt;</option></select></label><button disabled={!inferenceValid||running} onClick={()=>onAction?.(operation,{confidence:conf,nullValue:nullN,alternative})}>Run inference</button></div>;
  if(operation==='chi-square-goodness')return <div className="operation-control"><label><span>Expected counts or proportions</span><input value={expected} onChange={e=>setExpected(e.target.value)} placeholder="[0.25,0.25,0.25,0.25]"/></label><button disabled={!expected.trim()||running} onClick={()=>onAction?.(operation,{expected:expected.trim()})}>Run goodness-of-fit test</button></div>;
  if(operation==='bootstrap-mean')return <div className="operation-control"><label><span>Confidence</span><input value={confidence} onChange={e=>setConfidence(e.target.value)}/></label><label><span>Resamples</span><input value={count} onChange={e=>setCount(e.target.value)}/></label><label><span>Seed</span><input value={seed} onChange={e=>setSeed(e.target.value)}/></label><button disabled={!(conf>0&&conf<1)||!Number.isInteger(countN)||countN<100||countN>10000||!Number.isInteger(seedN)||running} onClick={()=>onAction?.(operation,{confidence:conf,count:countN,seed:seedN})}>Bootstrap mean</button></div>;
  if(operation==='affine-rv-transform')return <div className="operation-control"><label><span>Scale a</span><input value={scale} onChange={e=>setScale(e.target.value)}/></label><label><span>Shift b</span><input value={shift} onChange={e=>setShift(e.target.value)}/></label><button disabled={!Number.isFinite(scaleN)||!Number.isFinite(shiftN)||running} onClick={()=>onAction?.(operation,{scale:scaleN,shift:shiftN})}>Transform Y=aX+b</button></div>;
  if(operation==='markov-step')return <div className="operation-control"><label><span>Initial distribution</span><input value={initial} onChange={e=>setInitial(e.target.value)} placeholder="[1,0]"/></label><label><span>Steps</span><input value={steps} onChange={e=>setSteps(e.target.value)}/></label><button disabled={!initial.trim()||!Number.isInteger(stepsN)||stepsN<0||stepsN>100000||running} onClick={()=>onAction?.(operation,{initial:initial.trim(),steps:stepsN})}>Propagate distribution</button></div>;
  return null;
}
