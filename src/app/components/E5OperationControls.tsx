import { useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface Props {
  operation: string;
  object: SemanticMathObject;
  running: boolean;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
}

const CONTROLLED = new Set([
  'numerical-eigen','numerical-svd','pseudoinverse','numerical-rank','spectral-condition','conjugate-gradient',
  'nonlinear-system-solve','numerical-optimize','constrained-optimize','convexity-diagnostic','linear-program',
]);

export function isE5ControlledOperation(operation: string): boolean { return CONTROLLED.has(operation); }

export function E5OperationControls({ operation, object, running, onAction }: Props) {
  const dimension = object.kind === 'function' ? object.parameters.length : object.variables.length;
  const defaultPoint = `[${Array.from({ length: Math.max(2, dimension) }, () => '0').join(', ')}]`;
  const [tolerance, setTolerance] = useState('1e-9');
  const [maxIterations, setMaxIterations] = useState('200');
  const [point, setPoint] = useState(defaultPoint);
  const [method, setMethod] = useState<'gradient-descent'|'newton'|'bfgs'>('bfgs');
  const [constraint, setConstraint] = useState(object.kind === 'function' && object.parameters.length >= 2 ? `${object.parameters[0]}+${object.parameters[1]}-1` : 'x+y-1');
  const [objective, setObjective] = useState('[3,2]');
  const [sense, setSense] = useState<'max'|'min'>('max');

  const numericOptions = { tolerance: Number(tolerance), maxIterations: Number(maxIterations) };
  const numericValid = Number.isFinite(Number(tolerance)) && Number(tolerance) > 0 && Number.isInteger(Number(maxIterations)) && Number(maxIterations) > 0;

  if (['numerical-eigen','numerical-svd','pseudoinverse','numerical-rank','spectral-condition'].includes(operation)) {
    return <div className="operation-control"><label><span>Tolerance</span><input value={tolerance} onChange={(e)=>setTolerance(e.target.value)} /></label><button disabled={!numericValid||running} onClick={()=>onAction?.(operation,{tolerance:Number(tolerance)})}>Run numerical analysis</button></div>;
  }
  if (operation === 'conjugate-gradient') {
    return <div className="operation-control"><label><span>Residual tolerance</span><input value={tolerance} onChange={(e)=>setTolerance(e.target.value)} /></label><label><span>Maximum iterations</span><input inputMode="numeric" value={maxIterations} onChange={(e)=>setMaxIterations(e.target.value)} /></label><button disabled={!numericValid||running} onClick={()=>onAction?.(operation,numericOptions)}>Solve with CG</button></div>;
  }
  if (operation === 'nonlinear-system-solve') {
    return <div className="operation-control"><label><span>Starting point</span><input value={point} onChange={(e)=>setPoint(e.target.value)} placeholder={defaultPoint} /></label><label><span>Residual tolerance</span><input value={tolerance} onChange={(e)=>setTolerance(e.target.value)} /></label><label><span>Maximum iterations</span><input value={maxIterations} onChange={(e)=>setMaxIterations(e.target.value)} /></label><button disabled={!point.trim()||!numericValid||running} onClick={()=>onAction?.(operation,{point:point.trim(),...numericOptions})}>Solve nonlinear system</button></div>;
  }
  if (operation === 'numerical-optimize') {
    return <div className="operation-control"><label><span>Method</span><select value={method} onChange={(e)=>setMethod(e.target.value as typeof method)}><option value="bfgs">BFGS</option><option value="newton">Newton</option><option value="gradient-descent">Gradient descent</option></select></label><label><span>Starting point</span><input value={point} onChange={(e)=>setPoint(e.target.value)} /></label><label><span>Gradient tolerance</span><input value={tolerance} onChange={(e)=>setTolerance(e.target.value)} /></label><label><span>Maximum iterations</span><input value={maxIterations} onChange={(e)=>setMaxIterations(e.target.value)} /></label><button disabled={!point.trim()||!numericValid||running} onClick={()=>onAction?.(operation,{method,point:point.trim(),...numericOptions})}>Minimize locally</button></div>;
  }
  if (operation === 'constrained-optimize') {
    return <div className="operation-control"><label><span>Equality constraint g(x)=0</span><input value={constraint} onChange={(e)=>setConstraint(e.target.value)} placeholder="x+y-1" /></label><label><span>Starting point</span><input value={point} onChange={(e)=>setPoint(e.target.value)} /></label><label><span>Tolerance</span><input value={tolerance} onChange={(e)=>setTolerance(e.target.value)} /></label><label><span>Maximum iterations</span><input value={maxIterations} onChange={(e)=>setMaxIterations(e.target.value)} /></label><button disabled={!constraint.trim()||!point.trim()||!numericValid||running} onClick={()=>onAction?.(operation,{constraint:constraint.trim(),point:point.trim(),...numericOptions})}>Minimize with constraint</button></div>;
  }
  if (operation === 'convexity-diagnostic') {
    return <div className="operation-control"><label><span>Point (optional)</span><input value={point} onChange={(e)=>setPoint(e.target.value)} placeholder="Leave blank for constant-Hessian global check" /></label><button disabled={running} onClick={()=>onAction?.(operation,{point:point.trim()})}>Analyze curvature</button></div>;
  }
  if (operation === 'linear-program') {
    return <div className="operation-control"><label><span>Objective vector c</span><input value={objective} onChange={(e)=>setObjective(e.target.value)} placeholder="[3,2]" /></label><label><span>Sense</span><select value={sense} onChange={(e)=>setSense(e.target.value as 'max'|'min')}><option value="max">Maximize</option><option value="min">Minimize</option></select></label><button disabled={!objective.trim()||running} onClick={()=>onAction?.(operation,{objective:objective.trim(),sense})}>Solve bounded LP</button></div>;
  }
  return null;
}
