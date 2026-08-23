import { useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';

interface Props {
  operation: string;
  object: SemanticMathObject;
  running: boolean;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
}

const CONTROLLED = new Set([
  'finite-quantifier-profile','extended-master-theorem','bellman-ford','max-flow-min-cut','knapsack-dp',
  'extended-gcd','modular-inverse','linear-congruence','linear-diophantine',
]);
export function isE9ControlledOperation(operation: string): boolean { return CONTROLLED.has(operation); }

export function E9OperationControls({ operation, running, onAction }: Props) {
  const [quantifier,setQuantifier]=useState<'forall'|'exists'>('forall');
  const [boundVariable,setBoundVariable]=useState('x');
  const [predicate,setPredicate]=useState('x>0');
  const [logPower,setLogPower]=useState('1');
  const [start,setStart]=useState('1'); const [target,setTarget]=useState('2');
  const [source,setSource]=useState('1'); const [sink,setSink]=useState('2');
  const [capacity,setCapacity]=useState('10');
  const [other,setOther]=useState('30'); const [modulus,setModulus]=useState('7'); const [rhs,setRhs]=useState('1');
  const [bCoef,setBCoef]=useState('1'); const [cValue,setCValue]=useState('0');
  const int=(value:string)=>/^-?\d+$/.test(value.trim());

  if(operation==='finite-quantifier-profile'){
    const valid=/^[A-Za-z][A-Za-z0-9_]*$/.test(boundVariable)&&Boolean(predicate.trim());
    return <div className="operation-control"><label><span>Quantifier</span><select value={quantifier} onChange={e=>setQuantifier(e.target.value as 'forall'|'exists')}><option value="forall">For all (∀)</option><option value="exists">There exists (∃)</option></select></label><label><span>Bound variable</span><input value={boundVariable} onChange={e=>setBoundVariable(e.target.value)} /></label><label><span>Predicate</span><input value={predicate} onChange={e=>setPredicate(e.target.value)} placeholder="x^2 >= 0" /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{quantifier,boundVariable,predicate:predicate.trim()})}>Evaluate quantifier</button></div>;
  }
  if(operation==='extended-master-theorem'){
    const j=Number(logPower),valid=Number.isInteger(j)&&j>=0&&j<=20;
    return <div className="operation-control"><label><span>Log power j in f(n)=n^k(log n)^j</span><input inputMode="numeric" value={logPower} onChange={e=>setLogPower(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{logPower:j})}>Apply extended Master theorem</button></div>;
  }
  if(operation==='bellman-ford'){
    const valid=int(start)&&int(target);
    return <div className="operation-control"><label><span>Start vertex</span><input inputMode="numeric" value={start} onChange={e=>setStart(e.target.value)} /></label><label><span>Target vertex</span><input inputMode="numeric" value={target} onChange={e=>setTarget(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{start:Number(start),target:Number(target)})}>Find shortest path</button></div>;
  }
  if(operation==='max-flow-min-cut'){
    const valid=int(source)&&int(sink);
    return <div className="operation-control"><label><span>Source</span><input inputMode="numeric" value={source} onChange={e=>setSource(e.target.value)} /></label><label><span>Sink</span><input inputMode="numeric" value={sink} onChange={e=>setSink(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{source:Number(source),sink:Number(sink)})}>Compute max flow / min cut</button></div>;
  }
  if(operation==='knapsack-dp'){
    const c=Number(capacity),valid=Number.isInteger(c)&&c>=0&&c<=500;
    return <div className="operation-control"><label><span>Integer capacity</span><input inputMode="numeric" value={capacity} onChange={e=>setCapacity(e.target.value)} /></label><button disabled={!valid||running} onClick={()=>onAction?.(operation,{capacity:c})}>Run 0/1 knapsack DP</button></div>;
  }
  if(operation==='extended-gcd') return <div className="operation-control"><label><span>Second integer b</span><input value={other} onChange={e=>setOther(e.target.value)} /></label><button disabled={!int(other)||running} onClick={()=>onAction?.(operation,{other:other.trim()})}>Run extended Euclid</button></div>;
  if(operation==='modular-inverse') return <div className="operation-control"><label><span>Modulus m</span><input value={modulus} onChange={e=>setModulus(e.target.value)} /></label><button disabled={!int(modulus)||running} onClick={()=>onAction?.(operation,{modulus:modulus.trim()})}>Find modular inverse</button></div>;
  if(operation==='linear-congruence') return <div className="operation-control"><label><span>Right side b</span><input value={rhs} onChange={e=>setRhs(e.target.value)} /></label><label><span>Modulus m</span><input value={modulus} onChange={e=>setModulus(e.target.value)} /></label><button disabled={!int(rhs)||!int(modulus)||running} onClick={()=>onAction?.(operation,{rhs:rhs.trim(),modulus:modulus.trim()})}>Solve ax ≡ b (mod m)</button></div>;
  if(operation==='linear-diophantine') return <div className="operation-control"><label><span>Coefficient b</span><input value={bCoef} onChange={e=>setBCoef(e.target.value)} /></label><label><span>Right side c</span><input value={cValue} onChange={e=>setCValue(e.target.value)} /></label><button disabled={!int(bCoef)||!int(cValue)||running} onClick={()=>onAction?.(operation,{b:bCoef.trim(),c:cValue.trim()})}>Solve ax + by = c</button></div>;
  return null;
}
