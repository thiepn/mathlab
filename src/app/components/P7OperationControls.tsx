import { useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface Props {
  operation: string;
  object: SemanticMathObject;
  running: boolean;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
}

const CONTROLLED = new Set([
  'simplex-linear-program',
  'assignment-problem',
  'transportation-problem',
  'time-series-profile',
  'exponential-smoothing',
  'polynomial-least-squares',
]);

export function isP7ControlledOperation(operation: string): boolean {
  return CONTROLLED.has(operation);
}

export function P7OperationControls({ operation, running, onAction }: Props) {
  const [objective, setObjective] = useState('[3,2]');
  const [sense, setSense] = useState<'min' | 'max'>('max');
  const [maxIterations, setMaxIterations] = useState('1000');
  const [supply, setSupply] = useState('[20,30]');
  const [demand, setDemand] = useState('[10,15,25]');
  const [maxLag, setMaxLag] = useState('6');
  const [alpha, setAlpha] = useState('0.3');
  const [horizon, setHorizon] = useState('3');
  const [degree, setDegree] = useState('2');
  const [predictAt, setPredictAt] = useState('');

  const maxIterationsN = Number(maxIterations);
  const maxLagN = Number(maxLag);
  const alphaN = Number(alpha);
  const horizonN = Number(horizon);
  const degreeN = Number(degree);
  const predictAtN = predictAt.trim() === '' ? undefined : Number(predictAt);

  if (operation === 'simplex-linear-program') {
    return <div className="operation-control">
      <label><span>Objective vector c</span><input value={objective} onChange={(e)=>setObjective(e.target.value)} placeholder="[3,2]" /></label>
      <label><span>Sense</span><select value={sense} onChange={(e)=>setSense(e.target.value as typeof sense)}><option value="max">Maximize</option><option value="min">Minimize</option></select></label>
      <label><span>Maximum pivots</span><input inputMode="numeric" value={maxIterations} onChange={(e)=>setMaxIterations(e.target.value)} /></label>
      <button disabled={!objective.trim()||!Number.isInteger(maxIterationsN)||maxIterationsN<1||maxIterationsN>10000||running} onClick={()=>onAction?.(operation,{objective:objective.trim(),sense,maxIterations:maxIterationsN})}>Solve with simplex</button>
    </div>;
  }

  if (operation === 'assignment-problem') {
    return <div className="operation-control">
      <label><span>Objective</span><select value={sense} onChange={(e)=>setSense(e.target.value as typeof sense)}><option value="min">Minimize cost</option><option value="max">Maximize profit</option></select></label>
      <button disabled={running} onClick={()=>onAction?.(operation,{sense})}>Solve assignment</button>
    </div>;
  }

  if (operation === 'transportation-problem') {
    return <div className="operation-control">
      <label><span>Supply vector</span><input value={supply} onChange={(e)=>setSupply(e.target.value)} placeholder="[20,30]" /></label>
      <label><span>Demand vector</span><input value={demand} onChange={(e)=>setDemand(e.target.value)} placeholder="[10,15,25]" /></label>
      <button disabled={!supply.trim()||!demand.trim()||running} onClick={()=>onAction?.(operation,{supply:supply.trim(),demand:demand.trim()})}>Optimize transportation</button>
    </div>;
  }

  if (operation === 'time-series-profile') {
    return <div className="operation-control">
      <label><span>Maximum ACF lag</span><input inputMode="numeric" value={maxLag} onChange={(e)=>setMaxLag(e.target.value)} /></label>
      <button disabled={!Number.isInteger(maxLagN)||maxLagN<1||maxLagN>50||running} onClick={()=>onAction?.(operation,{maxLag:maxLagN})}>Analyze time series</button>
    </div>;
  }

  if (operation === 'exponential-smoothing') {
    return <div className="operation-control">
      <label><span>Smoothing α</span><input inputMode="decimal" value={alpha} onChange={(e)=>setAlpha(e.target.value)} /></label>
      <label><span>Forecast horizon</span><input inputMode="numeric" value={horizon} onChange={(e)=>setHorizon(e.target.value)} /></label>
      <button disabled={!(alphaN>0&&alphaN<=1)||!Number.isInteger(horizonN)||horizonN<1||horizonN>100||running} onClick={()=>onAction?.(operation,{alpha:alphaN,horizon:horizonN})}>Forecast with SES</button>
    </div>;
  }

  if (operation === 'polynomial-least-squares') {
    return <div className="operation-control">
      <label><span>Polynomial degree</span><input inputMode="numeric" value={degree} onChange={(e)=>setDegree(e.target.value)} /></label>
      <label><span>Predict at x (optional)</span><input inputMode="decimal" value={predictAt} onChange={(e)=>setPredictAt(e.target.value)} placeholder="5" /></label>
      <button disabled={!Number.isInteger(degreeN)||degreeN<1||degreeN>6||(predictAtN!==undefined&&!Number.isFinite(predictAtN))||running} onClick={()=>onAction?.(operation,{degree:degreeN,...(predictAtN===undefined?{}:{predictAt:predictAtN})})}>Fit polynomial</button>
    </div>;
  }

  return null;
}
