import { useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface Props {
  operation: string;
  object: SemanticMathObject;
  running: boolean;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
}

const CONTROLLED = new Set(['convolution','fourier-series','numerical-fourier-transform','numerical-inverse-fourier-transform']);
export function isE7ControlledOperation(operation: string): boolean { return CONTROLLED.has(operation); }

export function E7OperationControls({ operation, object, running, onAction }: Props) {
  const variable = object.kind === 'function' ? object.parameters[0] ?? 't' : object.variables[0] ?? 't';
  const [second, setSecond] = useState(`exp(-${variable})`);
  const [period, setPeriod] = useState(String(2 * Math.PI));
  const [order, setOrder] = useState('8');
  const [lower, setLower] = useState('-10');
  const [upper, setUpper] = useState('10');
  const [evaluation, setEvaluation] = useState('0');
  const [intervals, setIntervals] = useState('1600');

  const intervalCount = Number(intervals);
  const boundsValid = Number.isFinite(Number(lower)) && Number.isFinite(Number(upper)) && Number(upper) > Number(lower);
  const intervalsValid = Number.isInteger(intervalCount) && intervalCount >= 100 && intervalCount <= 8192;

  if (operation === 'convolution') {
    return <div className="operation-control"><label><span>Second expression g({variable})</span><input value={second} onChange={(e)=>setSecond(e.target.value)} placeholder={`exp(-${variable})`} /></label><button disabled={!second.trim()||running} onClick={()=>onAction?.(operation,{second:second.trim()})}>Convolve</button></div>;
  }
  if (operation === 'fourier-series') {
    const p=Number(period),q=Number(order); const valid=Number.isFinite(p)&&p>0&&Number.isInteger(q)&&q>=1&&q<=40&&intervalsValid;
    return <div className="operation-control"><label><span>Period T</span><input value={period} onChange={(e)=>setPeriod(e.target.value)} /></label><label><span>Harmonics</span><input inputMode="numeric" value={order} onChange={(e)=>setOrder(e.target.value)} /></label><label><span>Quadrature intervals</span><input inputMode="numeric" value={intervals} onChange={(e)=>setIntervals(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{period:p,order:q,intervals:intervalCount})}>Compute Fourier series</button></div>;
  }
  if (operation === 'numerical-fourier-transform' || operation === 'numerical-inverse-fourier-transform') {
    const point=Number(evaluation); const valid=boundsValid&&intervalsValid&&Number.isFinite(point);
    return <div className="operation-control"><label><span>Lower integration bound</span><input value={lower} onChange={(e)=>setLower(e.target.value)} /></label><label><span>Upper integration bound</span><input value={upper} onChange={(e)=>setUpper(e.target.value)} /></label><label><span>{operation==='numerical-fourier-transform'?'Angular frequency ω':'Time t'}</span><input value={evaluation} onChange={(e)=>setEvaluation(e.target.value)} /></label><label><span>Quadrature intervals</span><input inputMode="numeric" value={intervals} onChange={(e)=>setIntervals(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{lower:Number(lower),upper:Number(upper),[operation==='numerical-fourier-transform'?'frequency':'time']:point,intervals:intervalCount})}>{operation==='numerical-fourier-transform'?'Evaluate Fourier transform':'Evaluate inverse transform'}</button></div>;
  }
  return null;
}
