import { useMemo } from 'react';
import type { AstNode } from '../../lib/math/ast';
import type { SemanticMathObject } from '../../lib/math/types';
import type { GraphSeriesModel, GraphViewport } from '../../lib/math/visualization';
import type { GraphTraceSnapshot } from '../visualizationPresentation';
import {
  buildExplorationTable,
  evaluateExplorationAt,
  type DynamicParameter,
} from '../dynamicExploration';
import { MathValue } from './MathValue';

interface DynamicExplorationPanelProps {
  object: SemanticMathObject;
  resolvedAst: AstNode;
  parameters: DynamicParameter[];
  onParameterChange: (
    name: string,
    patch: Partial<Pick<DynamicParameter, 'value' | 'min' | 'max' | 'step'>>,
  ) => void;
  onResetParameters: () => void;
  series: GraphSeriesModel[];
  viewport: GraphViewport;
  trace: GraphTraceSnapshot | null;
  selectedX: number | null;
  onSelectX: (x: number) => void;
  tableCount: number;
  onTableCount: (count: number) => void;
}

function formatInput(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Number(value.toPrecision(8)).toString();
}

export function DynamicExplorationPanel({
  object,
  resolvedAst,
  parameters,
  onParameterChange,
  onResetParameters,
  series,
  viewport,
  trace,
  selectedX,
  onSelectX,
  tableCount,
  onTableCount,
}: DynamicExplorationPanelProps) {
  const rows = useMemo(
    () => buildExplorationTable(series, viewport.xMin, viewport.xMax, tableCount),
    [series, viewport.xMin, viewport.xMax, tableCount],
  );
  const activeX = selectedX ?? trace?.x ?? (viewport.xMin + viewport.xMax) / 2;
  const evaluation = useMemo(() => evaluateExplorationAt(series, activeX), [series, activeX]);

  return (
    <section className="p6-dynamic-panel" aria-label="Dynamic exploration">
      <header className="p6-dynamic-header">
        <div>
          <span className="section-kicker">Dynamic exploration</span>
          <h2>Formula, graph, values — one state.</h2>
          <p>Change a parameter or select a table row and every linked representation updates from the same deterministic AST.</p>
        </div>
        <div className="p6-link-state" aria-label="Linked exploration state">
          <span>Formula</span><i aria-hidden="true">↔</i><span>Graph</span><i aria-hidden="true">↔</i><span>Table</span>
        </div>
      </header>

      <div className="p6-dynamic-grid">
        <section className="p6-formula-card">
          <header>
            <div><span className="section-kicker">Live formula</span><strong>{object.name ?? object.kind}</strong></div>
            {parameters.length > 0 && <button type="button" onClick={onResetParameters}>Reset parameters</button>}
          </header>
          <div className="p6-live-formula"><MathValue ast={resolvedAst} source={object.source} compact={false} /></div>
          {parameters.length ? (
            <div className="p6-parameter-list">
              {parameters.map((parameter) => (
                <article key={parameter.name} className="p6-parameter">
                  <div className="p6-parameter-heading">
                    <label htmlFor={'p6-param-' + parameter.name}>
                      <strong>{parameter.name}</strong>
                      <span>{parameter.origin === 'workspace' ? 'workspace value' : 'free parameter'}</span>
                    </label>
                    <input
                      aria-label={parameter.name + ' value'}
                      type="number"
                      value={formatInput(parameter.value)}
                      step={parameter.step}
                      onChange={(event) => onParameterChange(parameter.name, { value: Number(event.target.value) })}
                    />
                  </div>
                  <input
                    id={'p6-param-' + parameter.name}
                    aria-label={parameter.name + ' slider'}
                    type="range"
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step}
                    value={parameter.value}
                    onChange={(event) => onParameterChange(parameter.name, { value: Number(event.target.value) })}
                  />
                  <div className="p6-parameter-range">
                    <label>
                      <span>min</span>
                      <input
                        aria-label={parameter.name + ' minimum'}
                        type="number"
                        value={formatInput(parameter.min)}
                        step={parameter.step}
                        onChange={(event) => onParameterChange(parameter.name, { min: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>step</span>
                      <input
                        aria-label={parameter.name + ' step'}
                        type="number"
                        value={formatInput(parameter.step)}
                        min="0.000000001"
                        onChange={(event) => onParameterChange(parameter.name, { step: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>max</span>
                      <input
                        aria-label={parameter.name + ' maximum'}
                        type="number"
                        value={formatInput(parameter.max)}
                        step={parameter.step}
                        onChange={(event) => onParameterChange(parameter.name, { max: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="p6-no-parameters">This object has no free visual parameters. The graph, trace and value table are still linked.</p>
          )}
        </section>

        <section className="p6-evaluation-card" aria-live="polite">
          <header>
            <div><span className="section-kicker">Linked result</span><strong>Evaluate at x = {evaluation?.displayX ?? '—'}</strong></div>
            {trace && <span>graph trace</span>}
          </header>
          <div className="p6-evaluation-values">
            {evaluation?.values.map((value) => (
              <article key={value.id}>
                <span>{value.name}</span>
                <strong>{value.defined ? value.displayY : 'undefined'}</strong>
              </article>
            ))}
          </div>
          <p>Move across the graph in Trace mode or select a row below to update this result.</p>
        </section>

        <section className="p6-table-card">
          <header>
            <div><span className="section-kicker">Value table</span><strong>{series.length} linked series</strong></div>
            <label>
              <span>Rows</span>
              <select value={tableCount} onChange={(event) => onTableCount(Number(event.target.value))}>
                <option value={5}>5</option>
                <option value={9}>9</option>
                <option value={13}>13</option>
                <option value={21}>21</option>
              </select>
            </label>
          </header>
          <div className="p6-table-scroll" tabIndex={0} aria-label="Scrollable function value table">
            <table>
              <thead>
                <tr>
                  <th scope="col">x</th>
                  {series.map((item) => <th key={item.id} scope="col">{item.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const active = selectedX !== null && Math.abs(selectedX - row.x) <= Math.max(1e-10, Math.abs(row.x) * 1e-10);
                  return (
                    <tr key={row.x} className={active ? 'is-active' : ''}>
                      <th scope="row">
                        <button type="button" onClick={() => onSelectX(row.x)} aria-pressed={active}>{row.displayX}</button>
                      </th>
                      {row.values.map((value) => <td key={value.id}>{value.defined ? value.displayY : '—'}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer>
            <span>Domain follows the graph viewport: {viewport.xMin} to {viewport.xMax}.</span>
            <span>Select x to link the table back to the graph.</span>
          </footer>
        </section>
      </div>
    </section>
  );
}
