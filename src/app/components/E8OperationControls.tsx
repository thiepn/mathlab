import { useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface Props {
  operation: string;
  object: SemanticMathObject;
  running: boolean;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
}

const CONTROLLED = new Set(['complex-map','complex-series','singularity-profile','complex-residue','complex-contour-integral','residue-theorem']);
export function isE8ControlledOperation(operation: string): boolean { return CONTROLLED.has(operation); }

export function E8OperationControls({ operation, running, onAction }: Props) {
  const [pointRe, setPointRe] = useState('0');
  const [pointIm, setPointIm] = useState('0');
  const [center, setCenter] = useState('0');
  const [order, setOrder] = useState('6');
  const [radius, setRadius] = useState('1');
  const [smallRadius, setSmallRadius] = useState('0.001');
  const [intervals, setIntervals] = useState('1200');
  const [path, setPath] = useState<'circle'|'line'>('circle');
  const [startRe, setStartRe] = useState('0');
  const [startIm, setStartIm] = useState('0');
  const [endRe, setEndRe] = useState('1');
  const [endIm, setEndIm] = useState('0');

  const finite = (...values: string[]) => values.every(value => Number.isFinite(Number(value)));
  const intervalCount = Number(intervals);
  const intervalsValid = Number.isInteger(intervalCount) && intervalCount >= 100 && intervalCount <= 8192;

  if (operation === 'complex-map') {
    const valid = finite(pointRe, pointIm);
    return <div className="operation-control"><label><span>Re(z)</span><input value={pointRe} onChange={(e)=>setPointRe(e.target.value)} /></label><label><span>Im(z)</span><input value={pointIm} onChange={(e)=>setPointIm(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{pointRe:Number(pointRe),pointIm:Number(pointIm)})}>Map point</button></div>;
  }
  if (operation === 'complex-series') {
    const q = Number(order); const valid = finite(center) && Number.isInteger(q) && q >= 0 && q <= 30;
    return <div className="operation-control"><label><span>Series center z₀ (real rational)</span><input value={center} onChange={(e)=>setCenter(e.target.value)} /></label><label><span>Highest displayed exponent</span><input inputMode="numeric" value={order} onChange={(e)=>setOrder(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{center:Number(center),order:q})}>Build local series</button></div>;
  }
  if (operation === 'singularity-profile') {
    const valid = finite(center);
    return <div className="operation-control"><label><span>Point z₀ (real rational)</span><input value={center} onChange={(e)=>setCenter(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{center:Number(center)})}>Classify singularity</button></div>;
  }
  if (operation === 'complex-residue') {
    const valid = finite(pointRe, pointIm, smallRadius) && Number(smallRadius) > 0 && intervalsValid;
    return <div className="operation-control"><label><span>Re(z₀)</span><input value={pointRe} onChange={(e)=>setPointRe(e.target.value)} /></label><label><span>Im(z₀)</span><input value={pointIm} onChange={(e)=>setPointIm(e.target.value)} /></label><label><span>Numerical fallback radius</span><input value={smallRadius} onChange={(e)=>setSmallRadius(e.target.value)} /></label><label><span>Quadrature intervals</span><input inputMode="numeric" value={intervals} onChange={(e)=>setIntervals(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{pointRe:Number(pointRe),pointIm:Number(pointIm),radius:Number(smallRadius),intervals:intervalCount})}>Compute residue</button></div>;
  }
  if (operation === 'complex-contour-integral') {
    const circleValid = finite(pointRe, pointIm, radius) && Number(radius) > 0;
    const lineValid = finite(startRe, startIm, endRe, endIm);
    const valid = intervalsValid && (path === 'circle' ? circleValid : lineValid);
    return <div className="operation-control"><label><span>Contour</span><select value={path} onChange={(e)=>setPath(e.target.value as 'circle'|'line')}><option value="circle">Circle</option><option value="line">Line segment</option></select></label>{path==='circle'?<><label><span>Center Re</span><input value={pointRe} onChange={(e)=>setPointRe(e.target.value)} /></label><label><span>Center Im</span><input value={pointIm} onChange={(e)=>setPointIm(e.target.value)} /></label><label><span>Radius</span><input value={radius} onChange={(e)=>setRadius(e.target.value)} /></label></>:<><label><span>Start Re</span><input value={startRe} onChange={(e)=>setStartRe(e.target.value)} /></label><label><span>Start Im</span><input value={startIm} onChange={(e)=>setStartIm(e.target.value)} /></label><label><span>End Re</span><input value={endRe} onChange={(e)=>setEndRe(e.target.value)} /></label><label><span>End Im</span><input value={endIm} onChange={(e)=>setEndIm(e.target.value)} /></label></>}<label><span>Quadrature intervals</span><input inputMode="numeric" value={intervals} onChange={(e)=>setIntervals(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{path,centerRe:Number(pointRe),centerIm:Number(pointIm),radius:Number(radius),startRe:Number(startRe),startIm:Number(startIm),endRe:Number(endRe),endIm:Number(endIm),intervals:intervalCount})}>Integrate contour</button></div>;
  }
  if (operation === 'residue-theorem') {
    const valid = finite(pointRe, pointIm, radius) && Number(radius) > 0;
    return <div className="operation-control"><label><span>Circle center Re</span><input value={pointRe} onChange={(e)=>setPointRe(e.target.value)} /></label><label><span>Circle center Im</span><input value={pointIm} onChange={(e)=>setPointIm(e.target.value)} /></label><label><span>Radius</span><input value={radius} onChange={(e)=>setRadius(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{centerRe:Number(pointRe),centerIm:Number(pointIm),radius:Number(radius)})}>Apply residue theorem</button></div>;
  }
  return null;
}
