import { Fragment, useEffect, useMemo, useState } from 'react';
import { domainSymbol } from '../../lib/math/assumptions';
import { capabilitiesFor } from '../../lib/math/capabilities';
import { shapeLabel } from '../../lib/math/semantic';
import type { SemanticDiagnostic, SemanticMathObject } from '../../lib/math/types';

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

export function ContextPanel({
  object,
  persisted,
  pinned = false,
  dependents = [],
  diagnostics = [],
  onRename,
  onDuplicate,
  onTogglePin,
  onDelete,
  onAction,
  runningOperation,
}: ContextPanelProps) {
  const actions = capabilitiesFor(object);
  const groups = [...new Set(actions.map((item) => item.group))];
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(object?.name ?? '');
  const [renameError, setRenameError] = useState('');
  const [controlOpen, setControlOpen] = useState('');
  const [subSymbol, setSubSymbol] = useState('');
  const [subValue, setSubValue] = useState('');
  const [evaluateValue, setEvaluateValue] = useState('');
  const [derivativeOrder, setDerivativeOrder] = useState('2');
  const [lowerBound, setLowerBound] = useState('0');
  const [upperBound, setUpperBound] = useState('1');
  const [limitPoint, setLimitPoint] = useState('0');
  const [limitDirection, setLimitDirection] = useState<'both' | 'left' | 'right'>('both');
  const [dotOperand, setDotOperand] = useState('');
  const [advancedTarget, setAdvancedTarget] = useState('');
  const [analysisPoint, setAnalysisPoint] = useState('0');
  const [seriesCenter, setSeriesCenter] = useState('0');
  const [seriesOrder, setSeriesOrder] = useState('5');
  const [sequenceStart, setSequenceStart] = useState('1');
  const [sequenceCount, setSequenceCount] = useState('8');
  const [sequenceEnd, setSequenceEnd] = useState('10');
  const [statConfidence, setStatConfidence] = useState('0.95');
  const [statNullValue, setStatNullValue] = useState('0');
  const [statAlternative, setStatAlternative] = useState<'two-sided' | 'less' | 'greater'>('two-sided');
  const [distributionEvent, setDistributionEvent] = useState<'eq' | 'le' | 'ge' | 'between'>('eq');
  const [distributionValue, setDistributionValue] = useState('0');
  const [distributionLower, setDistributionLower] = useState('0');
  const [distributionUpper, setDistributionUpper] = useState('1');
  const [quantileProbability, setQuantileProbability] = useState('0.5');
  const [samplingSize, setSamplingSize] = useState('30');
  const [simulationCount, setSimulationCount] = useState('1000');
  const [simulationSeed, setSimulationSeed] = useState('42');
  const [setOther, setSetOther] = useState('set(2, 3)');
  const [graphStart, setGraphStart] = useState('1');
  const [graphTarget, setGraphTarget] = useState('2');
  const [recurrenceCount, setRecurrenceCount] = useState('10');
  const [sortAlgorithm, setSortAlgorithm] = useState<'insertion' | 'selection' | 'bubble' | 'merge'>('insertion');
  const [binaryTarget, setBinaryTarget] = useState('0');
  const [numericRootMethod, setNumericRootMethod] = useState<'bisection' | 'newton' | 'secant'>('bisection');
  const [numericA, setNumericA] = useState('-1');
  const [numericB, setNumericB] = useState('1');
  const [numericX0, setNumericX0] = useState('1');
  const [numericX1, setNumericX1] = useState('2');
  const [numericTolerance, setNumericTolerance] = useState('1e-10');
  const [numericPoint, setNumericPoint] = useState('0');
  const [numericStep, setNumericStep] = useState('0.0001');
  const [quadratureMethod, setQuadratureMethod] = useState<'adaptive-simpson' | 'simpson' | 'trapezoid'>('adaptive-simpson');
  const [quadraturePanels, setQuadraturePanels] = useState('100');
  const [iterativeMethod, setIterativeMethod] = useState<'jacobi' | 'gauss-seidel'>('gauss-seidel');
  const [odeMethod, setOdeMethod] = useState<'euler' | 'heun' | 'rk4'>('rk4');
  const [odeEndpoint, setOdeEndpoint] = useState('1');
  const [odeStep, setOdeStep] = useState('0.1');
  const [proofNext, setProofNext] = useState('');
  const [proofCandidate, setProofCandidate] = useState('');
  const [proofAssumptions, setProofAssumptions] = useState('');

  useEffect(() => {
    setName(object?.name ?? '');
    setRenaming(false);
    setRenameError('');
    setControlOpen('');
    setSubSymbol(object?.kind === 'function' ? object.parameters[0] ?? '' : object?.variables[0] ?? '');
    setSubValue('');
    setEvaluateValue('');
    setDerivativeOrder('2');
    setLowerBound('0');
    setUpperBound('1');
    setLimitPoint('0');
    setLimitDirection('both');
    setDotOperand('');
    setAdvancedTarget('');
    setAnalysisPoint('0');
    setSeriesCenter('0');
    setSeriesOrder('5');
    setSequenceStart('1');
    setSequenceCount('8');
    setSequenceEnd('10');
    setStatConfidence('0.95');
    setStatNullValue('0');
    setStatAlternative('two-sided');
    setDistributionEvent('eq');
    setDistributionValue('0');
    setDistributionLower('0');
    setDistributionUpper('1');
    setQuantileProbability('0.5');
    setSamplingSize('30');
    setSimulationCount('1000');
    setSimulationSeed('42');
    setSetOther('set(2, 3)');
    setGraphStart('1');
    setGraphTarget('2');
    setRecurrenceCount('10');
    setSortAlgorithm('insertion');
    setBinaryTarget('0');
    setNumericRootMethod('bisection');
    setNumericA('-1'); setNumericB('1'); setNumericX0('1'); setNumericX1('2');
    setNumericTolerance('1e-10'); setNumericPoint('0'); setNumericStep('0.0001');
    setQuadratureMethod('adaptive-simpson'); setQuadraturePanels('100');
    setIterativeMethod('gauss-seidel'); setOdeMethod('rk4'); setOdeEndpoint('1'); setOdeStep('0.1');
    setProofNext(''); setProofCandidate(''); setProofAssumptions('');
  }, [object?.id, object?.name]);

  const dependencyText = useMemo(() => object?.dependencies.join(', ') || '—', [object]);

  const submitRename = () => {
    if (!onRename) return;
    try {
      onRename(name);
      setRenaming(false);
      setRenameError('');
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'Could not rename object.');
    }
  };

  return (
    <aside className="context-panel">
      <div className="context-object">
        <span className="eyebrow">{persisted ? 'Workspace object' : object ? 'Scratch object' : 'Context'}</span>
        <strong>{object ? object.name ?? shapeLabel(object.shape) : 'No resolved object'}</strong>
        <small>{object ? `${shapeLabel(object.shape)} · ${domainSymbol(object.domain)} · ${object.exactness}` : 'Enter valid mathematics'}</small>
      </div>

      {object && persisted && (
        <section className="context-section object-lifecycle">
          <h2>Object</h2>
          {renaming ? (
            <div className="rename-control">
              <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Enter') submitRename();
                if (event.key === 'Escape') setRenaming(false);
              }} autoFocus aria-label="New object name" />
              <div><button onClick={submitRename}>Apply</button><button onClick={() => setRenaming(false)}>Cancel</button></div>
              {renameError && <small className="rename-error">{renameError}</small>}
            </div>
          ) : (
            <div className="lifecycle-grid">
              <button onClick={() => setRenaming(true)}>Rename</button>
              <button onClick={onDuplicate}>Duplicate</button>
              <button onClick={onTogglePin}>{pinned ? 'Unpin' : 'Pin'}</button>
              <button className="danger-subtle" onClick={onDelete}>Delete</button>
            </div>
          )}
        </section>
      )}

      {object && (
        <section className="context-section semantic-context">
          <h2>Meaning</h2>
          <dl>
            <div><dt>Variables</dt><dd>{object.variables.join(', ') || '—'}</dd></div>
            <div><dt>Depends on</dt><dd>{dependencyText}</dd></div>
            <div><dt>Used by</dt><dd>{dependents.map((item) => item.name).filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt>Assumptions</dt><dd>{object.assumptions.length || '—'}</dd></div>
          </dl>
        </section>
      )}

      {groups.map((group) => (
        <section className="context-section" key={group}>
          <h2>{group}</h2>
          {actions.filter((item) => item.group === group).map((item) => (
            <Fragment key={item.id}>
            <button
              className={`context-action ${item.available ? 'is-available' : item.applicable ? 'is-locked' : 'is-inapplicable'}`}
              disabled={!item.available || Boolean(runningOperation)}
              title={item.available ? `Run ${item.label}` : item.applicable ? `Available in ${item.phase}` : item.reason}
              onClick={() => {
                if (!item.available) return;
                if (['substitute','evaluate-function','higher-derivative','definite-integral','limit','dot-product','projection','project-column-space','least-squares','continuity-at','differentiability-at','analysis-limit','taylor-polynomial','power-series-profile','sequence-terms','partial-sum','series-convergence','sequence-series-profile','distribution-probability','distribution-quantile','sampling-mean-profile','simulate-distribution','mean-confidence-interval','mean-hypothesis-test','proportion-confidence-interval','proportion-hypothesis-test','set-union','set-intersection','set-difference','set-symmetric-difference','cartesian-product','subset-check','graph-bfs','graph-dfs','shortest-path','recurrence-terms','sorting-trace','binary-search','numerical-root','numerical-derivative','numerical-integral','iterative-linear-solve','ode-solve','verify-transition','verify'].includes(item.id)) {
                  setControlOpen((value) => value === item.id ? '' : item.id);
                } else onAction?.(item.id);
              }}
            >
              <span>{runningOperation === item.id ? 'Computing…' : item.label}</span><span className="phase-lock">{item.available ? item.id === 'graph' ? 'OPEN' : 'RUN' : item.applicable ? item.phase : 'N/A'}</span>
            </button>
            {item.id === 'substitute' && item.available && controlOpen === 'substitute' && (
              <div className="substitution-control operation-control">
                <label><span>Symbol</span><input value={subSymbol} onChange={(event) => setSubSymbol(event.target.value)} placeholder="x" /></label>
                <label><span>Replace with</span><input value={subValue} onChange={(event) => setSubValue(event.target.value)} placeholder="2/3" onKeyDown={(event) => {
                  if (event.key === 'Enter' && subSymbol.trim() && subValue.trim()) onAction?.('substitute', { symbol: subSymbol.trim(), value: subValue.trim() });
                }} /></label>
                <button disabled={!subSymbol.trim() || !subValue.trim() || Boolean(runningOperation)} onClick={() => onAction?.('substitute', { symbol: subSymbol.trim(), value: subValue.trim() })}>Apply substitution</button>
              </div>
            )}

            {item.id === 'evaluate-function' && item.available && controlOpen === 'evaluate-function' && (
              <div className="operation-control">
                <label><span>Input</span><input value={evaluateValue} onChange={(event) => setEvaluateValue(event.target.value)} placeholder="2" onKeyDown={(event) => {
                  if (event.key === 'Enter' && evaluateValue.trim()) onAction?.('evaluate-function', { value: evaluateValue.trim() });
                }} /></label>
                <button disabled={!evaluateValue.trim() || Boolean(runningOperation)} onClick={() => onAction?.('evaluate-function', { value: evaluateValue.trim() })}>Evaluate function</button>
              </div>
            )}
            {item.id === 'higher-derivative' && item.available && controlOpen === 'higher-derivative' && (
              <div className="operation-control">
                <label><span>Order</span><input inputMode="numeric" value={derivativeOrder} onChange={(event) => setDerivativeOrder(event.target.value)} placeholder="2" /></label>
                <button disabled={!/^\d+$/.test(derivativeOrder) || Number(derivativeOrder) < 2 || Number(derivativeOrder) > 12 || Boolean(runningOperation)} onClick={() => onAction?.('higher-derivative', { order: Number(derivativeOrder) })}>Compute derivative</button>
              </div>
            )}
            {item.id === 'definite-integral' && item.available && controlOpen === 'definite-integral' && (
              <div className="operation-control">
                <label><span>Lower</span><input value={lowerBound} onChange={(event) => setLowerBound(event.target.value)} placeholder="0" /></label>
                <label><span>Upper</span><input value={upperBound} onChange={(event) => setUpperBound(event.target.value)} placeholder="1" onKeyDown={(event) => {
                  if (event.key === 'Enter' && lowerBound.trim() && upperBound.trim()) onAction?.('definite-integral', { lower: lowerBound.trim(), upper: upperBound.trim() });
                }} /></label>
                <button disabled={!lowerBound.trim() || !upperBound.trim() || Boolean(runningOperation)} onClick={() => onAction?.('definite-integral', { lower: lowerBound.trim(), upper: upperBound.trim() })}>Evaluate integral</button>
              </div>
            )}
            {item.id === 'limit' && item.available && controlOpen === 'limit' && (
              <div className="operation-control">
                <label><span>Point</span><input value={limitPoint} onChange={(event) => setLimitPoint(event.target.value)} placeholder="0 or infinity" /></label>
                <label><span>Side</span><select value={limitDirection} onChange={(event) => setLimitDirection(event.target.value as 'both' | 'left' | 'right')}><option value="both">Two-sided</option><option value="left">From left</option><option value="right">From right</option></select></label>
                <button disabled={!limitPoint.trim() || Boolean(runningOperation)} onClick={() => onAction?.('limit', { point: limitPoint.trim(), direction: limitDirection })}>Compute limit</button>
              </div>
            )}
            {item.id === 'dot-product' && item.available && controlOpen === 'dot-product' && (
              <div className="operation-control">
                <label><span>Second vector</span><input value={dotOperand} onChange={(event) => setDotOperand(event.target.value)} placeholder="[4, 5, 6] or saved v" onKeyDown={(event) => {
                  if (event.key === 'Enter' && dotOperand.trim()) onAction?.('dot-product', { other: dotOperand.trim() });
                }} /></label>
                <button disabled={!dotOperand.trim() || Boolean(runningOperation)} onClick={() => onAction?.('dot-product', { other: dotOperand.trim() })}>Compute dot product</button>
              </div>
            )}
            {['projection','project-column-space','least-squares'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>{item.id === 'least-squares' ? 'Target b' : 'Target vector'}</span><input value={advancedTarget} onChange={(event) => setAdvancedTarget(event.target.value)} placeholder="[1, 2, 3] or saved b" onKeyDown={(event) => {
                  if (event.key === 'Enter' && advancedTarget.trim()) onAction?.(item.id, { target: advancedTarget.trim() });
                }} /></label>
                <button disabled={!advancedTarget.trim() || Boolean(runningOperation)} onClick={() => onAction?.(item.id, { target: advancedTarget.trim() })}>
                  {item.id === 'least-squares' ? 'Solve least squares' : 'Compute projection'}
                </button>
              </div>
            )}
            {['continuity-at','differentiability-at','analysis-limit'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>Point</span><input value={analysisPoint} onChange={(event) => setAnalysisPoint(event.target.value)} placeholder="0" /></label>
                {item.id === 'analysis-limit' && <label><span>Side</span><select value={limitDirection} onChange={(event) => setLimitDirection(event.target.value as 'both' | 'left' | 'right')}><option value="both">Two-sided</option><option value="left">From left</option><option value="right">From right</option></select></label>}
                <button disabled={!analysisPoint.trim() || Boolean(runningOperation)} onClick={() => onAction?.(item.id, item.id === 'analysis-limit' ? { point: analysisPoint.trim(), direction: limitDirection } : { point: analysisPoint.trim() })}>
                  {item.id === 'analysis-limit' ? 'Analyze limit' : item.id === 'differentiability-at' ? 'Check differentiability' : 'Check continuity'}
                </button>
              </div>
            )}
            {['taylor-polynomial','power-series-profile'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>Center</span><input value={seriesCenter} onChange={(event) => setSeriesCenter(event.target.value)} placeholder="0" /></label>
                {item.id === 'taylor-polynomial' && <label><span>Order</span><input inputMode="numeric" value={seriesOrder} onChange={(event) => setSeriesOrder(event.target.value)} placeholder="5" /></label>}
                <button disabled={!seriesCenter.trim() || (item.id === 'taylor-polynomial' && (!/^\d+$/.test(seriesOrder) || Number(seriesOrder) > 10)) || Boolean(runningOperation)} onClick={() => onAction?.(item.id, item.id === 'taylor-polynomial' ? { center: seriesCenter.trim(), order: Number(seriesOrder) } : { center: seriesCenter.trim() })}>
                  {item.id === 'taylor-polynomial' ? 'Build Taylor polynomial' : 'Analyze power series'}
                </button>
              </div>
            )}
            {item.id === 'sequence-terms' && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>Start index</span><input inputMode="numeric" value={sequenceStart} onChange={(event) => setSequenceStart(event.target.value)} /></label>
                <label><span>Term count</span><input inputMode="numeric" value={sequenceCount} onChange={(event) => setSequenceCount(event.target.value)} /></label>
                <button disabled={!/^-?\d+$/.test(sequenceStart) || !/^\d+$/.test(sequenceCount) || Number(sequenceCount) < 1 || Number(sequenceCount) > 50 || Boolean(runningOperation)} onClick={() => onAction?.('sequence-terms', { start: Number(sequenceStart), count: Number(sequenceCount) })}>Preview terms</button>
              </div>
            )}
            {item.id === 'partial-sum' && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>Start index</span><input inputMode="numeric" value={sequenceStart} onChange={(event) => setSequenceStart(event.target.value)} /></label>
                <label><span>End index</span><input inputMode="numeric" value={sequenceEnd} onChange={(event) => setSequenceEnd(event.target.value)} /></label>
                <button disabled={!/^-?\d+$/.test(sequenceStart) || !/^-?\d+$/.test(sequenceEnd) || Number(sequenceEnd) < Number(sequenceStart) || Number(sequenceEnd) - Number(sequenceStart) > 999 || Boolean(runningOperation)} onClick={() => onAction?.('partial-sum', { start: Number(sequenceStart), end: Number(sequenceEnd) })}>Compute partial sum</button>
              </div>
            )}
            {['series-convergence','sequence-series-profile'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>Series starts at n =</span><input inputMode="numeric" value={sequenceStart} onChange={(event) => setSequenceStart(event.target.value)} /></label>
                <button disabled={!/^-?\d+$/.test(sequenceStart) || Boolean(runningOperation)} onClick={() => onAction?.(item.id, { start: Number(sequenceStart) })}>{item.id === 'series-convergence' ? 'Run convergence tests' : 'Build full profile'}</button>
              </div>
            )}
            {item.id === 'distribution-probability' && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>Event</span><select value={distributionEvent} onChange={(event) => setDistributionEvent(event.target.value as 'eq' | 'le' | 'ge' | 'between')}><option value="eq">P(X = k)</option><option value="le">P(X ≤ x)</option><option value="ge">P(X ≥ x)</option><option value="between">P(a ≤ X ≤ b)</option></select></label>
                {distributionEvent !== 'between' ? <label><span>Value</span><input value={distributionValue} onChange={(event) => setDistributionValue(event.target.value)} placeholder="0" /></label> : <><label><span>Lower</span><input value={distributionLower} onChange={(event) => setDistributionLower(event.target.value)} placeholder="0" /></label><label><span>Upper</span><input value={distributionUpper} onChange={(event) => setDistributionUpper(event.target.value)} placeholder="1" /></label></>}
                <button disabled={Boolean(runningOperation)} onClick={() => onAction?.('distribution-probability', { event: distributionEvent, value: distributionValue, lower: distributionLower, upper: distributionUpper })}>Compute probability</button>
              </div>
            )}
            {item.id === 'distribution-quantile' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Probability p</span><input value={quantileProbability} onChange={(event) => setQuantileProbability(event.target.value)} placeholder="0.5" /></label><button disabled={!quantileProbability.trim() || Boolean(runningOperation)} onClick={() => onAction?.('distribution-quantile', { probability: quantileProbability.trim() })}>Find quantile</button></div>
            )}
            {item.id === 'sampling-mean-profile' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Sample size n</span><input inputMode="numeric" value={samplingSize} onChange={(event) => setSamplingSize(event.target.value)} /></label><button disabled={!/^\d+$/.test(samplingSize) || Number(samplingSize) < 1 || Boolean(runningOperation)} onClick={() => onAction?.('sampling-mean-profile', { sampleSize: Number(samplingSize) })}>Analyze sampling mean</button></div>
            )}
            {item.id === 'simulate-distribution' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Draws</span><input inputMode="numeric" value={simulationCount} onChange={(event) => setSimulationCount(event.target.value)} /></label><label><span>Seed</span><input inputMode="numeric" value={simulationSeed} onChange={(event) => setSimulationSeed(event.target.value)} /></label><button disabled={!/^\d+$/.test(simulationCount) || Number(simulationCount) < 1 || Number(simulationCount) > 10000 || !/^-?\d+$/.test(simulationSeed) || Boolean(runningOperation)} onClick={() => onAction?.('simulate-distribution', { count: Number(simulationCount), seed: Number(simulationSeed) })}>Run simulation</button></div>
            )}
            {['mean-confidence-interval','proportion-confidence-interval'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Confidence</span><input value={statConfidence} onChange={(event) => setStatConfidence(event.target.value)} placeholder="0.95" /></label><button disabled={!statConfidence.trim() || Number(statConfidence) <= 0 || Number(statConfidence) >= 1 || Boolean(runningOperation)} onClick={() => onAction?.(item.id, { confidence: Number(statConfidence) })}>Compute interval</button></div>
            )}
            {['mean-hypothesis-test','proportion-hypothesis-test'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Null value</span><input value={statNullValue} onChange={(event) => setStatNullValue(event.target.value)} placeholder={item.id === 'proportion-hypothesis-test' ? '0.5' : '0'} /></label><label><span>Alternative</span><select value={statAlternative} onChange={(event) => setStatAlternative(event.target.value as 'two-sided' | 'less' | 'greater')}><option value="two-sided">≠</option><option value="less">&lt;</option><option value="greater">&gt;</option></select></label><button disabled={!statNullValue.trim() || !Number.isFinite(Number(statNullValue)) || Boolean(runningOperation)} onClick={() => onAction?.(item.id, { nullValue: Number(statNullValue), alternative: statAlternative })}>Run hypothesis test</button></div>
            )}
            {['set-union','set-intersection','set-difference','set-symmetric-difference','cartesian-product','subset-check'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Second set</span><input value={setOther} onChange={(event) => setSetOther(event.target.value)} placeholder="set(2, 3, 4)" /></label><button disabled={!setOther.trim() || Boolean(runningOperation)} onClick={() => onAction?.(item.id, { other: setOther.trim() })}>Run set operation</button></div>
            )}
            {['graph-bfs','graph-dfs'].includes(item.id) && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Start vertex</span><input inputMode="numeric" value={graphStart} onChange={(event) => setGraphStart(event.target.value)} /></label><button disabled={!/^\d+$/.test(graphStart) || Number(graphStart) < 1 || Boolean(runningOperation)} onClick={() => onAction?.(item.id, { start: Number(graphStart) })}>{item.id === 'graph-bfs' ? 'Run BFS' : 'Run DFS'}</button></div>
            )}
            {item.id === 'shortest-path' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Start</span><input inputMode="numeric" value={graphStart} onChange={(event) => setGraphStart(event.target.value)} /></label><label><span>Target</span><input inputMode="numeric" value={graphTarget} onChange={(event) => setGraphTarget(event.target.value)} /></label><button disabled={!/^\d+$/.test(graphStart) || !/^\d+$/.test(graphTarget) || Boolean(runningOperation)} onClick={() => onAction?.('shortest-path', { start: Number(graphStart), target: Number(graphTarget) })}>Find shortest path</button></div>
            )}
            {item.id === 'recurrence-terms' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Term count</span><input inputMode="numeric" value={recurrenceCount} onChange={(event) => setRecurrenceCount(event.target.value)} /></label><button disabled={!/^\d+$/.test(recurrenceCount) || Number(recurrenceCount) < 1 || Number(recurrenceCount) > 100 || Boolean(runningOperation)} onClick={() => onAction?.('recurrence-terms', { count: Number(recurrenceCount) })}>Generate terms</button></div>
            )}
            {item.id === 'sorting-trace' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Algorithm</span><select value={sortAlgorithm} onChange={(event) => setSortAlgorithm(event.target.value as 'insertion' | 'selection' | 'bubble' | 'merge')}><option value="insertion">Insertion sort</option><option value="selection">Selection sort</option><option value="bubble">Bubble sort</option><option value="merge">Merge sort</option></select></label><button disabled={Boolean(runningOperation)} onClick={() => onAction?.('sorting-trace', { algorithm: sortAlgorithm })}>Trace sort</button></div>
            )}
            {item.id === 'binary-search' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Target</span><input value={binaryTarget} onChange={(event) => setBinaryTarget(event.target.value)} placeholder="5" /></label><button disabled={!binaryTarget.trim() || Boolean(runningOperation)} onClick={() => onAction?.('binary-search', { target: binaryTarget.trim() })}>Trace binary search</button></div>
            )}
            {item.id === 'numerical-root' && item.available && controlOpen === item.id && (
              <div className="operation-control">
                <label><span>Method</span><select value={numericRootMethod} onChange={(event) => setNumericRootMethod(event.target.value as 'bisection' | 'newton' | 'secant')}><option value="bisection">Bisection</option><option value="newton">Newton</option><option value="secant">Secant</option></select></label>
                {numericRootMethod === 'bisection' ? <><label><span>a</span><input value={numericA} onChange={(event) => setNumericA(event.target.value)} /></label><label><span>b</span><input value={numericB} onChange={(event) => setNumericB(event.target.value)} /></label></> : <><label><span>x₀</span><input value={numericX0} onChange={(event) => setNumericX0(event.target.value)} /></label>{numericRootMethod === 'secant' && <label><span>x₁</span><input value={numericX1} onChange={(event) => setNumericX1(event.target.value)} /></label>}</>}
                <label><span>Tolerance</span><input value={numericTolerance} onChange={(event) => setNumericTolerance(event.target.value)} /></label>
                <button disabled={Boolean(runningOperation)} onClick={() => onAction?.('numerical-root', { method: numericRootMethod, a: Number(numericA), b: Number(numericB), x0: Number(numericX0), x1: Number(numericX1), tolerance: Number(numericTolerance), maxIterations: 80 })}>Find root</button>
              </div>
            )}
            {item.id === 'numerical-derivative' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Point</span><input value={numericPoint} onChange={(event) => setNumericPoint(event.target.value)} /></label><label><span>Step h</span><input value={numericStep} onChange={(event) => setNumericStep(event.target.value)} /></label><button disabled={Boolean(runningOperation)} onClick={() => onAction?.('numerical-derivative', { point: Number(numericPoint), step: Number(numericStep) })}>Approximate derivative</button></div>
            )}
            {item.id === 'numerical-integral' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Method</span><select value={quadratureMethod} onChange={(event) => setQuadratureMethod(event.target.value as 'adaptive-simpson' | 'simpson' | 'trapezoid')}><option value="adaptive-simpson">Adaptive Simpson</option><option value="simpson">Composite Simpson</option><option value="trapezoid">Composite trapezoid</option></select></label><label><span>Lower</span><input value={lowerBound} onChange={(event) => setLowerBound(event.target.value)} /></label><label><span>Upper</span><input value={upperBound} onChange={(event) => setUpperBound(event.target.value)} /></label>{quadratureMethod === 'adaptive-simpson' ? <label><span>Tolerance</span><input value={numericTolerance} onChange={(event) => setNumericTolerance(event.target.value)} /></label> : <label><span>Panels</span><input value={quadraturePanels} onChange={(event) => setQuadraturePanels(event.target.value)} /></label>}<button disabled={Boolean(runningOperation)} onClick={() => onAction?.('numerical-integral', { method: quadratureMethod, lower: Number(lowerBound), upper: Number(upperBound), tolerance: Number(numericTolerance), panels: Number(quadraturePanels) })}>Approximate integral</button></div>
            )}
            {item.id === 'iterative-linear-solve' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Method</span><select value={iterativeMethod} onChange={(event) => setIterativeMethod(event.target.value as 'jacobi' | 'gauss-seidel')}><option value="jacobi">Jacobi</option><option value="gauss-seidel">Gauss–Seidel</option></select></label><label><span>Tolerance</span><input value={numericTolerance} onChange={(event) => setNumericTolerance(event.target.value)} /></label><button disabled={Boolean(runningOperation)} onClick={() => onAction?.('iterative-linear-solve', { method: iterativeMethod, tolerance: Number(numericTolerance), maxIterations: 1000 })}>Iterate system</button></div>
            )}
            {item.id === 'ode-solve' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Method</span><select value={odeMethod} onChange={(event) => setOdeMethod(event.target.value as 'euler' | 'heun' | 'rk4')}><option value="euler">Euler</option><option value="heun">Heun</option><option value="rk4">RK4</option></select></label><label><span>Endpoint x</span><input value={odeEndpoint} onChange={(event) => setOdeEndpoint(event.target.value)} /></label><label><span>Requested step</span><input value={odeStep} onChange={(event) => setOdeStep(event.target.value)} /></label><button disabled={Boolean(runningOperation)} onClick={() => onAction?.('ode-solve', { method: odeMethod, endpoint: Number(odeEndpoint), step: Number(odeStep) })}>Solve IVP</button></div>
            )}
            {item.id === 'verify-transition' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Proposed next line</span><input value={proofNext} onChange={(event) => setProofNext(event.target.value)} placeholder="x = 2" /></label><label><span>Assumptions</span><input value={proofAssumptions} onChange={(event) => setProofAssumptions(event.target.value)} placeholder="x != 0" /></label><button disabled={!proofNext.trim() || Boolean(runningOperation)} onClick={() => onAction?.('verify-transition', { next: proofNext.trim(), proofAssumptions: proofAssumptions.trim() })}>Verify transformation</button></div>
            )}
            {item.id === 'verify' && item.available && controlOpen === item.id && (
              <div className="operation-control"><label><span>Candidate solution</span><input value={proofCandidate} onChange={(event) => setProofCandidate(event.target.value)} placeholder="3" /></label><button disabled={!proofCandidate.trim() || Boolean(runningOperation)} onClick={() => onAction?.('verify', { candidate: proofCandidate.trim() })}>Check solution</button></div>
            )}
            </Fragment>
          ))}
        </section>
      ))}

      {diagnostics.length > 0 && <div className="context-diagnostic">{diagnostics[0].message}</div>}
      <div className="context-footnote">Practice and course progress live in a separate persistent learning layer, so study history never changes the mathematical meaning of workspace objects.</div>
    </aside>
  );
}
