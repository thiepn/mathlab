import { Fragment, useEffect, useMemo, useState } from 'react';
import { domainSymbol } from '../../lib/math/assumptions';
import { capabilitiesFor } from '../../lib/math/capabilities';
import { shapeLabel } from '../../lib/math/semantic';
import type { SemanticDiagnostic, SemanticMathObject } from '../../lib/math/types';
import { operationNeedsControls } from '../workspaceOperations';
import { E1OperationControls, isE1ControlledOperation } from './E1OperationControls';

interface ContextPanelProps {
  object: SemanticMathObject | null;
  persisted: boolean;
  pinned?: boolean;
  dependents?: SemanticMathObject[];
  diagnostics?: SemanticDiagnostic[];
  onRename?: (name: string) => void;
  onDuplicate?: () => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  onAction?: (operation: string, options?: Record<string, string | number | boolean>) => void;
  runningOperation?: string;
}

type Alternative = 'two-sided' | 'less' | 'greater';
type LimitDirection = 'both' | 'left' | 'right';

type ControlState = {
  subSymbol: string; subValue: string; evaluateValue: string; derivativeOrder: string;
  lowerBound: string; upperBound: string; limitPoint: string; limitDirection: LimitDirection;
  dotOperand: string; advancedTarget: string; analysisPoint: string; seriesCenter: string; seriesOrder: string;
  sequenceStart: string; sequenceCount: string; sequenceEnd: string;
  statConfidence: string; statNullValue: string; statAlternative: Alternative;
  distributionEvent: 'eq' | 'le' | 'ge' | 'between'; distributionValue: string; distributionLower: string; distributionUpper: string;
  quantileProbability: string; samplingSize: string; simulationCount: string; simulationSeed: string;
  setOther: string; graphStart: string; graphTarget: string; recurrenceCount: string;
  sortAlgorithm: 'insertion' | 'selection' | 'bubble' | 'merge'; binaryTarget: string;
  numericRootMethod: 'bisection' | 'newton' | 'secant'; numericA: string; numericB: string; numericX0: string; numericX1: string;
  numericTolerance: string; numericPoint: string; numericStep: string;
  quadratureMethod: 'adaptive-simpson' | 'simpson' | 'trapezoid'; quadraturePanels: string;
  iterativeMethod: 'jacobi' | 'gauss-seidel'; odeMethod: 'euler' | 'heun' | 'rk4'; odeEndpoint: string; odeStep: string;
  proofNext: string; proofCandidate: string; proofAssumptions: string;
};

function initialControls(object: SemanticMathObject | null): ControlState {
  const parameters = object?.kind === 'function' ? object.parameters : object?.variables ?? [];
  return {
    subSymbol: parameters[0] ?? '', subValue: '', evaluateValue: '', derivativeOrder: '2',
    lowerBound: '0', upperBound: '1', limitPoint: '0', limitDirection: 'both', dotOperand: '', advancedTarget: '', analysisPoint: '0', seriesCenter: '0', seriesOrder: '5',
    sequenceStart: '1', sequenceCount: '8', sequenceEnd: '10', statConfidence: '0.95', statNullValue: '0', statAlternative: 'two-sided',
    distributionEvent: 'eq', distributionValue: '0', distributionLower: '0', distributionUpper: '1', quantileProbability: '0.5', samplingSize: '30', simulationCount: '1000', simulationSeed: '42',
    setOther: 'set(2, 3)', graphStart: '1', graphTarget: '2', recurrenceCount: '10', sortAlgorithm: 'insertion', binaryTarget: '0',
    numericRootMethod: 'bisection', numericA: '-1', numericB: '1', numericX0: '1', numericX1: '2', numericTolerance: '1e-10', numericPoint: '0', numericStep: '0.0001',
    quadratureMethod: 'adaptive-simpson', quadraturePanels: '100', iterativeMethod: 'gauss-seidel', odeMethod: 'rk4', odeEndpoint: '1', odeStep: '0.1',
    proofNext: '', proofCandidate: '', proofAssumptions: '',
  };
}

export function ContextPanel({ object, persisted, pinned = false, dependents = [], diagnostics = [], onRename, onDuplicate, onTogglePin, onDelete, onAction, runningOperation }: ContextPanelProps) {
  const actions = capabilitiesFor(object);
  const groups = [...new Set(actions.map((item) => item.group))];
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(object?.name ?? '');
  const [renameError, setRenameError] = useState('');
  const [controlOpen, setControlOpen] = useState('');
  const [c, setC] = useState<ControlState>(() => initialControls(object));
  const running = Boolean(runningOperation);
  const set = <K extends keyof ControlState>(key: K, value: ControlState[K]) => setC((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setName(object?.name ?? '');
    setRenaming(false);
    setRenameError('');
    setControlOpen('');
    setC(initialControls(object));
  }, [object?.id, object?.name, object?.source]);

  const dependencyText = useMemo(() => object?.dependencies.join(', ') || '—', [object]);
  const functionInputs = object?.kind === 'function' ? object.parameters : [];

  const submitRename = () => {
    if (!onRename) return;
    try { onRename(name); setRenaming(false); setRenameError(''); }
    catch (error) { setRenameError(error instanceof Error ? error.message : 'Could not rename object.'); }
  };

  const renderControl = (id: string) => {
    if (!object || controlOpen !== id) return null;
    if (isE1ControlledOperation(id)) return <E1OperationControls operation={id} object={object} running={running} onAction={onAction} />;

    if (id === 'substitute') return <div className="operation-control"><label><span>Symbol</span><input value={c.subSymbol} onChange={(e)=>set('subSymbol',e.target.value)} placeholder="x" /></label><label><span>Replace with</span><input value={c.subValue} onChange={(e)=>set('subValue',e.target.value)} placeholder="2/3" /></label><button disabled={!c.subSymbol.trim()||!c.subValue.trim()||running} onClick={()=>onAction?.(id,{symbol:c.subSymbol.trim(),value:c.subValue.trim()})}>Apply substitution</button></div>;
    if (id === 'evaluate-function') return <div className="operation-control"><label><span>{functionInputs.length>1?`Input point (${functionInputs.join(', ')})`:'Input'}</span><input value={c.evaluateValue} onChange={(e)=>set('evaluateValue',e.target.value)} placeholder={functionInputs.length>1?functionInputs.map((_,i)=>String(i+1)).join(', '):'2'} /></label><button disabled={!c.evaluateValue.trim()||running} onClick={()=>onAction?.(id,{value:c.evaluateValue.trim()})}>Evaluate function</button></div>;
    if (id === 'higher-derivative') return <div className="operation-control"><label><span>Order</span><input inputMode="numeric" value={c.derivativeOrder} onChange={(e)=>set('derivativeOrder',e.target.value)} /></label><button disabled={!/^\d+$/.test(c.derivativeOrder)||Number(c.derivativeOrder)<2||Number(c.derivativeOrder)>12||running} onClick={()=>onAction?.(id,{order:Number(c.derivativeOrder)})}>Compute derivative</button></div>;
    if (id === 'definite-integral') return <div className="operation-control"><label><span>Lower</span><input value={c.lowerBound} onChange={(e)=>set('lowerBound',e.target.value)} /></label><label><span>Upper</span><input value={c.upperBound} onChange={(e)=>set('upperBound',e.target.value)} /></label><button disabled={!c.lowerBound.trim()||!c.upperBound.trim()||running} onClick={()=>onAction?.(id,{lower:c.lowerBound.trim(),upper:c.upperBound.trim()})}>Evaluate integral</button></div>;
    if (id === 'limit') return <div className="operation-control"><label><span>Point</span><input value={c.limitPoint} onChange={(e)=>set('limitPoint',e.target.value)} /></label><label><span>Side</span><select value={c.limitDirection} onChange={(e)=>set('limitDirection',e.target.value as LimitDirection)}><option value="both">Two-sided</option><option value="left">From left</option><option value="right">From right</option></select></label><button disabled={!c.limitPoint.trim()||running} onClick={()=>onAction?.(id,{point:c.limitPoint.trim(),direction:c.limitDirection})}>Compute limit</button></div>;
    if (id === 'dot-product') return <div className="operation-control"><label><span>Second vector</span><input value={c.dotOperand} onChange={(e)=>set('dotOperand',e.target.value)} placeholder="[4, 5, 6]" /></label><button disabled={!c.dotOperand.trim()||running} onClick={()=>onAction?.(id,{other:c.dotOperand.trim()})}>Compute dot product</button></div>;
    if (['projection','project-column-space','least-squares'].includes(id)) return <div className="operation-control"><label><span>{id==='least-squares'?'Target b':'Target vector'}</span><input value={c.advancedTarget} onChange={(e)=>set('advancedTarget',e.target.value)} placeholder="[1, 2, 3]" /></label><button disabled={!c.advancedTarget.trim()||running} onClick={()=>onAction?.(id,{target:c.advancedTarget.trim()})}>{id==='least-squares'?'Solve least squares':'Compute projection'}</button></div>;
    if (['continuity-at','differentiability-at','analysis-limit'].includes(id)) return <div className="operation-control"><label><span>Point</span><input value={c.analysisPoint} onChange={(e)=>set('analysisPoint',e.target.value)} /></label>{id==='analysis-limit'&&<label><span>Side</span><select value={c.limitDirection} onChange={(e)=>set('limitDirection',e.target.value as LimitDirection)}><option value="both">Two-sided</option><option value="left">From left</option><option value="right">From right</option></select></label>}<button disabled={!c.analysisPoint.trim()||running} onClick={()=>onAction?.(id,id==='analysis-limit'?{point:c.analysisPoint.trim(),direction:c.limitDirection}:{point:c.analysisPoint.trim()})}>{id==='analysis-limit'?'Analyze limit':id==='differentiability-at'?'Check differentiability':'Check continuity'}</button></div>;
    if (['taylor-polynomial','power-series-profile'].includes(id)) return <div className="operation-control"><label><span>Center</span><input value={c.seriesCenter} onChange={(e)=>set('seriesCenter',e.target.value)} /></label>{id==='taylor-polynomial'&&<label><span>Order</span><input inputMode="numeric" value={c.seriesOrder} onChange={(e)=>set('seriesOrder',e.target.value)} /></label>}<button disabled={!c.seriesCenter.trim()||(id==='taylor-polynomial'&&(!/^\d+$/.test(c.seriesOrder)||Number(c.seriesOrder)>10))||running} onClick={()=>onAction?.(id,id==='taylor-polynomial'?{center:c.seriesCenter.trim(),order:Number(c.seriesOrder)}:{center:c.seriesCenter.trim()})}>{id==='taylor-polynomial'?'Build Taylor polynomial':'Analyze power series'}</button></div>;
    if (id === 'sequence-terms') return <div className="operation-control"><label><span>Start index</span><input value={c.sequenceStart} onChange={(e)=>set('sequenceStart',e.target.value)} /></label><label><span>Term count</span><input value={c.sequenceCount} onChange={(e)=>set('sequenceCount',e.target.value)} /></label><button disabled={!/^-?\d+$/.test(c.sequenceStart)||!/^\d+$/.test(c.sequenceCount)||Number(c.sequenceCount)<1||Number(c.sequenceCount)>50||running} onClick={()=>onAction?.(id,{start:Number(c.sequenceStart),count:Number(c.sequenceCount)})}>Preview terms</button></div>;
    if (id === 'partial-sum') return <div className="operation-control"><label><span>Start index</span><input value={c.sequenceStart} onChange={(e)=>set('sequenceStart',e.target.value)} /></label><label><span>End index</span><input value={c.sequenceEnd} onChange={(e)=>set('sequenceEnd',e.target.value)} /></label><button disabled={!/^-?\d+$/.test(c.sequenceStart)||!/^-?\d+$/.test(c.sequenceEnd)||Number(c.sequenceEnd)<Number(c.sequenceStart)||Number(c.sequenceEnd)-Number(c.sequenceStart)>999||running} onClick={()=>onAction?.(id,{start:Number(c.sequenceStart),end:Number(c.sequenceEnd)})}>Compute partial sum</button></div>;
    if (['series-convergence','sequence-series-profile'].includes(id)) return <div className="operation-control"><label><span>Series starts at n =</span><input value={c.sequenceStart} onChange={(e)=>set('sequenceStart',e.target.value)} /></label><button disabled={!/^-?\d+$/.test(c.sequenceStart)||running} onClick={()=>onAction?.(id,{start:Number(c.sequenceStart)})}>Run convergence workflow</button></div>;
    if (id === 'distribution-probability') return <div className="operation-control"><label><span>Event</span><select value={c.distributionEvent} onChange={(e)=>set('distributionEvent',e.target.value as ControlState['distributionEvent'])}><option value="eq">P(X = k)</option><option value="le">P(X ≤ x)</option><option value="ge">P(X ≥ x)</option><option value="between">P(a ≤ X ≤ b)</option></select></label>{c.distributionEvent==='between'?<><label><span>Lower</span><input value={c.distributionLower} onChange={(e)=>set('distributionLower',e.target.value)} /></label><label><span>Upper</span><input value={c.distributionUpper} onChange={(e)=>set('distributionUpper',e.target.value)} /></label></>:<label><span>Value</span><input value={c.distributionValue} onChange={(e)=>set('distributionValue',e.target.value)} /></label>}<button disabled={running} onClick={()=>onAction?.(id,{event:c.distributionEvent,value:c.distributionValue,lower:c.distributionLower,upper:c.distributionUpper})}>Compute probability</button></div>;
    if (id === 'distribution-quantile') return <div className="operation-control"><label><span>Probability p</span><input value={c.quantileProbability} onChange={(e)=>set('quantileProbability',e.target.value)} /></label><button disabled={!c.quantileProbability.trim()||running} onClick={()=>onAction?.(id,{probability:c.quantileProbability.trim()})}>Find quantile</button></div>;
    if (id === 'sampling-mean-profile') return <div className="operation-control"><label><span>Sample size n</span><input value={c.samplingSize} onChange={(e)=>set('samplingSize',e.target.value)} /></label><button disabled={!/^\d+$/.test(c.samplingSize)||Number(c.samplingSize)<1||running} onClick={()=>onAction?.(id,{sampleSize:Number(c.samplingSize)})}>Analyze sampling mean</button></div>;
    if (id === 'simulate-distribution') return <div className="operation-control"><label><span>Draws</span><input value={c.simulationCount} onChange={(e)=>set('simulationCount',e.target.value)} /></label><label><span>Seed</span><input value={c.simulationSeed} onChange={(e)=>set('simulationSeed',e.target.value)} /></label><button disabled={!/^\d+$/.test(c.simulationCount)||Number(c.simulationCount)<1||Number(c.simulationCount)>10000||!/^-?\d+$/.test(c.simulationSeed)||running} onClick={()=>onAction?.(id,{count:Number(c.simulationCount),seed:Number(c.simulationSeed)})}>Run simulation</button></div>;
    if (['mean-confidence-interval','proportion-confidence-interval'].includes(id)) return <div className="operation-control"><label><span>Confidence</span><input value={c.statConfidence} onChange={(e)=>set('statConfidence',e.target.value)} /></label><button disabled={!c.statConfidence.trim()||Number(c.statConfidence)<=0||Number(c.statConfidence)>=1||running} onClick={()=>onAction?.(id,{confidence:Number(c.statConfidence)})}>Compute interval</button></div>;
    if (['mean-hypothesis-test','proportion-hypothesis-test'].includes(id)) return <div className="operation-control"><label><span>Null value</span><input value={c.statNullValue} onChange={(e)=>set('statNullValue',e.target.value)} /></label><label><span>Alternative</span><select value={c.statAlternative} onChange={(e)=>set('statAlternative',e.target.value as Alternative)}><option value="two-sided">≠</option><option value="less">&lt;</option><option value="greater">&gt;</option></select></label><button disabled={!c.statNullValue.trim()||!Number.isFinite(Number(c.statNullValue))||running} onClick={()=>onAction?.(id,{nullValue:Number(c.statNullValue),alternative:c.statAlternative})}>Run hypothesis test</button></div>;
    if (['set-union','set-intersection','set-difference','set-symmetric-difference','cartesian-product','subset-check'].includes(id)) return <div className="operation-control"><label><span>Second set</span><input value={c.setOther} onChange={(e)=>set('setOther',e.target.value)} /></label><button disabled={!c.setOther.trim()||running} onClick={()=>onAction?.(id,{other:c.setOther.trim()})}>Run set operation</button></div>;
    if (['graph-bfs','graph-dfs'].includes(id)) return <div className="operation-control"><label><span>Start vertex</span><input value={c.graphStart} onChange={(e)=>set('graphStart',e.target.value)} /></label><button disabled={!/^\d+$/.test(c.graphStart)||running} onClick={()=>onAction?.(id,{start:Number(c.graphStart)})}>Run {id==='graph-bfs'?'BFS':'DFS'}</button></div>;
    if (id === 'shortest-path') return <div className="operation-control"><label><span>Start</span><input value={c.graphStart} onChange={(e)=>set('graphStart',e.target.value)} /></label><label><span>Target</span><input value={c.graphTarget} onChange={(e)=>set('graphTarget',e.target.value)} /></label><button disabled={!/^\d+$/.test(c.graphStart)||!/^\d+$/.test(c.graphTarget)||running} onClick={()=>onAction?.(id,{start:Number(c.graphStart),target:Number(c.graphTarget)})}>Find shortest path</button></div>;
    if (id === 'recurrence-terms') return <div className="operation-control"><label><span>Term count</span><input value={c.recurrenceCount} onChange={(e)=>set('recurrenceCount',e.target.value)} /></label><button disabled={!/^\d+$/.test(c.recurrenceCount)||Number(c.recurrenceCount)<1||Number(c.recurrenceCount)>100||running} onClick={()=>onAction?.(id,{count:Number(c.recurrenceCount)})}>Generate terms</button></div>;
    if (id === 'sorting-trace') return <div className="operation-control"><label><span>Algorithm</span><select value={c.sortAlgorithm} onChange={(e)=>set('sortAlgorithm',e.target.value as ControlState['sortAlgorithm'])}><option value="insertion">Insertion sort</option><option value="selection">Selection sort</option><option value="bubble">Bubble sort</option><option value="merge">Merge sort</option></select></label><button disabled={running} onClick={()=>onAction?.(id,{algorithm:c.sortAlgorithm})}>Trace sort</button></div>;
    if (id === 'binary-search') return <div className="operation-control"><label><span>Target</span><input value={c.binaryTarget} onChange={(e)=>set('binaryTarget',e.target.value)} /></label><button disabled={!c.binaryTarget.trim()||running} onClick={()=>onAction?.(id,{target:c.binaryTarget.trim()})}>Trace binary search</button></div>;
    if (id === 'numerical-root') return <div className="operation-control"><label><span>Method</span><select value={c.numericRootMethod} onChange={(e)=>set('numericRootMethod',e.target.value as ControlState['numericRootMethod'])}><option value="bisection">Bisection</option><option value="newton">Newton</option><option value="secant">Secant</option></select></label>{c.numericRootMethod==='bisection'?<><label><span>a</span><input value={c.numericA} onChange={(e)=>set('numericA',e.target.value)} /></label><label><span>b</span><input value={c.numericB} onChange={(e)=>set('numericB',e.target.value)} /></label></>:<><label><span>x₀</span><input value={c.numericX0} onChange={(e)=>set('numericX0',e.target.value)} /></label>{c.numericRootMethod==='secant'&&<label><span>x₁</span><input value={c.numericX1} onChange={(e)=>set('numericX1',e.target.value)} /></label>}</>}<label><span>Tolerance</span><input value={c.numericTolerance} onChange={(e)=>set('numericTolerance',e.target.value)} /></label><button disabled={running} onClick={()=>onAction?.(id,{method:c.numericRootMethod,a:Number(c.numericA),b:Number(c.numericB),x0:Number(c.numericX0),x1:Number(c.numericX1),tolerance:Number(c.numericTolerance),maxIterations:80})}>Find root</button></div>;
    if (id === 'numerical-derivative') return <div className="operation-control"><label><span>Point</span><input value={c.numericPoint} onChange={(e)=>set('numericPoint',e.target.value)} /></label><label><span>Step h</span><input value={c.numericStep} onChange={(e)=>set('numericStep',e.target.value)} /></label><button disabled={running} onClick={()=>onAction?.(id,{point:Number(c.numericPoint),step:Number(c.numericStep)})}>Approximate derivative</button></div>;
    if (id === 'numerical-integral') return <div className="operation-control"><label><span>Method</span><select value={c.quadratureMethod} onChange={(e)=>set('quadratureMethod',e.target.value as ControlState['quadratureMethod'])}><option value="adaptive-simpson">Adaptive Simpson</option><option value="simpson">Composite Simpson</option><option value="trapezoid">Composite trapezoid</option></select></label><label><span>Lower</span><input value={c.lowerBound} onChange={(e)=>set('lowerBound',e.target.value)} /></label><label><span>Upper</span><input value={c.upperBound} onChange={(e)=>set('upperBound',e.target.value)} /></label>{c.quadratureMethod==='adaptive-simpson'?<label><span>Tolerance</span><input value={c.numericTolerance} onChange={(e)=>set('numericTolerance',e.target.value)} /></label>:<label><span>Panels</span><input value={c.quadraturePanels} onChange={(e)=>set('quadraturePanels',e.target.value)} /></label>}<button disabled={running} onClick={()=>onAction?.(id,{method:c.quadratureMethod,lower:Number(c.lowerBound),upper:Number(c.upperBound),tolerance:Number(c.numericTolerance),panels:Number(c.quadraturePanels)})}>Approximate integral</button></div>;
    if (id === 'iterative-linear-solve') return <div className="operation-control"><label><span>Method</span><select value={c.iterativeMethod} onChange={(e)=>set('iterativeMethod',e.target.value as ControlState['iterativeMethod'])}><option value="jacobi">Jacobi</option><option value="gauss-seidel">Gauss–Seidel</option></select></label><label><span>Tolerance</span><input value={c.numericTolerance} onChange={(e)=>set('numericTolerance',e.target.value)} /></label><button disabled={running} onClick={()=>onAction?.(id,{method:c.iterativeMethod,tolerance:Number(c.numericTolerance),maxIterations:1000})}>Iterate system</button></div>;
    if (id === 'ode-solve') return <div className="operation-control"><label><span>Method</span><select value={c.odeMethod} onChange={(e)=>set('odeMethod',e.target.value as ControlState['odeMethod'])}><option value="euler">Euler</option><option value="heun">Heun</option><option value="rk4">RK4</option></select></label><label><span>Endpoint x</span><input value={c.odeEndpoint} onChange={(e)=>set('odeEndpoint',e.target.value)} /></label><label><span>Requested step</span><input value={c.odeStep} onChange={(e)=>set('odeStep',e.target.value)} /></label><button disabled={running} onClick={()=>onAction?.(id,{method:c.odeMethod,endpoint:Number(c.odeEndpoint),step:Number(c.odeStep)})}>Solve IVP</button></div>;
    if (id === 'verify-transition') return <div className="operation-control"><label><span>Proposed next line</span><input value={c.proofNext} onChange={(e)=>set('proofNext',e.target.value)} /></label><label><span>Assumptions</span><input value={c.proofAssumptions} onChange={(e)=>set('proofAssumptions',e.target.value)} /></label><button disabled={!c.proofNext.trim()||running} onClick={()=>onAction?.(id,{next:c.proofNext.trim(),proofAssumptions:c.proofAssumptions.trim()})}>Verify transformation</button></div>;
    if (id === 'verify') return <div className="operation-control"><label><span>Candidate solution</span><input value={c.proofCandidate} onChange={(e)=>set('proofCandidate',e.target.value)} /></label><button disabled={!c.proofCandidate.trim()||running} onClick={()=>onAction?.(id,{candidate:c.proofCandidate.trim()})}>Check solution</button></div>;
    return null;
  };

  return (
    <aside className="context-panel">
      <div className="context-object"><span className="eyebrow">{persisted?'Workspace object':object?'Scratch object':'Context'}</span><strong>{object ? object.name ?? shapeLabel(object.shape) : 'No resolved object'}</strong><small>{object ? `${shapeLabel(object.shape)} · ${domainSymbol(object.domain)} · ${object.exactness}` : 'Enter valid mathematics'}</small></div>

      {object && persisted && <section className="context-section object-lifecycle"><h2>Object</h2>{renaming?<div className="rename-control"><input value={name} onChange={(e)=>setName(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter')submitRename();if(e.key==='Escape')setRenaming(false);}} autoFocus aria-label="New object name"/><div><button onClick={submitRename}>Apply</button><button onClick={()=>setRenaming(false)}>Cancel</button></div>{renameError&&<small className="rename-error">{renameError}</small>}</div>:<div className="lifecycle-grid"><button onClick={()=>setRenaming(true)}>Rename</button><button onClick={onDuplicate}>Duplicate</button><button onClick={onTogglePin}>{pinned?'Unpin':'Pin'}</button><button className="danger-subtle" onClick={onDelete}>Delete</button></div>}</section>}

      {object && <section className="context-section semantic-context"><h2>Meaning</h2><dl><div><dt>{object.kind==='function'?'Parameters':'Variables'}</dt><dd>{(object.kind==='function'?object.parameters:object.variables).join(', ')||'—'}</dd></div><div><dt>Depends on</dt><dd>{dependencyText}</dd></div><div><dt>Used by</dt><dd>{dependents.map((item)=>item.name).filter(Boolean).join(', ')||'—'}</dd></div><div><dt>Assumptions</dt><dd>{object.assumptions.length||'—'}</dd></div></dl></section>}

      {groups.map((group)=><section className="context-section" key={group}><h2>{group}</h2>{actions.filter((item)=>item.group===group).map((item)=><Fragment key={item.id}><button className={`context-action ${item.available?'is-available':item.applicable?'is-locked':'is-inapplicable'}`} disabled={!item.available||running} title={item.available?`Run ${item.label}`:item.applicable?`Available in ${item.phase}`:item.reason} onClick={()=>{if(!item.available)return;if(operationNeedsControls(item.id)){setControlOpen((value)=>value===item.id?'':item.id);}else onAction?.(item.id);}}><span>{runningOperation===item.id?'Computing…':item.label}</span><span className="phase-lock">{item.available?item.id==='graph'?'OPEN':'RUN':item.applicable?item.phase:'N/A'}</span></button>{item.available&&renderControl(item.id)}</Fragment>)}</section>)}

      {diagnostics.length>0&&<div className="context-diagnostic">{diagnostics[0].message}</div>}
      <div className="context-footnote">MathLab exposes only operations that match the resolved object. E1 multivariable controls preserve parameter order from the function definition and keep unsupported higher-dimensional workflows explicit.</div>
    </aside>
  );
}
