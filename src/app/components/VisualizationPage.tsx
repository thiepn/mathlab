import { useEffect, useMemo, useRef, useState } from 'react';
import type { SemanticMathObject } from '../../lib/math/types';
import {
  buildGraphSeries,
  defaultGraphViewport,
  fitGraphViewport,
  formatNumeric,
  zoomViewport,
  type GraphSeriesInput,
  type GraphViewport,
} from '../../lib/math/visualization';
import { domainNotes } from '../../lib/math/calculus';
import {
  annotationLabel,
  cycleColorSlot,
  cycleLineStyle,
  parseViewportDraft,
  presentationFor,
  viewportDraft,
  type GraphTraceSnapshot,
  type SeriesPresentation,
} from '../visualizationPresentation';
import { GraphCanvas } from './GraphCanvas';
import { MathValue } from './MathValue';

interface VisualizationPageProps {
  objects: SemanticMathObject[];
  activeObject: SemanticMathObject | null;
  onActivateObject: (id: string) => void;
  onOpenObject: (id: string) => void;
}

type OverlayKey = 'grid' | 'zeros' | 'extrema' | 'inflections' | 'asymptotes' | 'trace';
type ViewportDraft = Record<'xMin' | 'xMax' | 'yMin' | 'yMax', string>;

function graphable(object: SemanticMathObject): boolean {
  if (object.kind === 'function') return object.shape.type === 'function' && object.shape.arity === 1 && object.parameters.length === 1;
  return object.kind === 'expression' && object.variables.length === 1;
}

function graphVariable(object: SemanticMathObject): string {
  return object.kind === 'function' ? object.parameters[0] : object.variables[0];
}

function seriesInput(object: SemanticMathObject, objects: SemanticMathObject[]): GraphSeriesInput {
  return {
    id: object.id,
    name: object.name ?? (object.kind === 'function' ? 'f' : 'expression'),
    source: object.source,
    variable: graphVariable(object),
    ast: object.valueAst,
    bindings: objects
      .filter((item) => item.name && item.id !== object.id && (item.kind === 'scalar' || item.kind === 'expression'))
      .map((item) => ({ name: item.name!, ast: item.valueAst })),
  };
}

function svgMarkup(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .graph-background{fill:#fff}.graph-plot-background{fill:#fbfcfe}.graph-grid line{stroke:#e4e9f0;stroke-width:1}.graph-grid .is-origin-grid{stroke:#d5dde8}.graph-axes line{stroke:#768395;stroke-width:1.35}.graph-axis-name{fill:#5e6b7b;font:italic 13px serif}.graph-tick-labels{fill:#687586;font:11px sans-serif}.graph-series-0{color:#1769e0}.graph-series-1{color:#16845b}.graph-series-2{color:#a76508}.graph-series-3{color:#7a4cc2}.graph-series-4{color:#c44747}.graph-series-5{color:#0f8497}.graph-series-line{fill:none;stroke:currentColor;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}.graph-line-dashed .graph-series-line,.graph-legend-line.graph-line-dashed{stroke-dasharray:10 7}.graph-line-dotted .graph-series-line,.graph-legend-line.graph-line-dotted{stroke-dasharray:2 7}.graph-asymptote{stroke:currentColor;stroke-dasharray:7 6;stroke-width:1.25;opacity:.58}.graph-feature,.graph-hole{fill:#fff;stroke:currentColor;stroke-width:2}.graph-trace{stroke:#7f8b99;stroke-width:1;stroke-dasharray:3 4}.graph-trace-point{fill:#fff;stroke:currentColor;stroke-width:2}.graph-series-fill{fill:currentColor}.graph-legend-line{stroke:currentColor;stroke-width:2.5}.graph-inline-legend text{font:11px sans-serif}.graph-trace-label rect{fill:#fff;stroke:#d8dee7;rx:5}.graph-trace-label text{font:11px sans-serif}`;
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function VisualizationPage({ objects, activeObject, onActivateObject, onOpenObject }: VisualizationPageProps) {
  const availableObjects = useMemo(() => {
    const combined = activeObject && !objects.some((item) => item.id === activeObject.id) ? [activeObject, ...objects] : objects;
    return combined.filter(graphable);
  }, [objects, activeObject]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState('');
  const [viewport, setViewport] = useState<GraphViewport>(() => defaultGraphViewport());
  const [rangeDraft, setRangeDraft] = useState<ViewportDraft>(() => viewportDraft(defaultGraphViewport()));
  const [rangeOpen, setRangeOpen] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'pan' | 'trace'>('pan');
  const [presentations, setPresentations] = useState<Record<string, SeriesPresentation>>({});
  const [traceSnapshot, setTraceSnapshot] = useState<GraphTraceSnapshot | null>(null);
  const [overlays, setOverlays] = useState<Record<OverlayKey, boolean>>({ grid: true, zeros: true, extrema: true, inflections: true, asymptotes: true, trace: true });
  const [exportMessage, setExportMessage] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (activeObject && graphable(activeObject)) {
      setSelectedIds((current) => current.includes(activeObject.id) ? current : [activeObject.id, ...current].slice(0, 6));
      setFocusedId(activeObject.id);
    } else if (!selectedIds.length && availableObjects[0]) {
      setSelectedIds([availableObjects[0].id]);
      setFocusedId(availableObjects[0].id);
    }
  }, [activeObject?.id, availableObjects.length]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => availableObjects.some((item) => item.id === id)));
  }, [objects, availableObjects]);

  useEffect(() => {
    setFocusedId((current) => current && selectedIds.includes(current) ? current : selectedIds[0] ?? '');
  }, [selectedIds]);

  useEffect(() => setRangeDraft(viewportDraft(viewport)), [viewport]);

  const selectedObjects = useMemo(
    () => selectedIds.map((id) => availableObjects.find((item) => item.id === id)).filter((item): item is SemanticMathObject => Boolean(item)),
    [selectedIds, availableObjects],
  );
  const inputs = useMemo(() => selectedObjects.map((object) => seriesInput(object, objects)), [selectedObjects, objects]);
  const models = useMemo(() => inputs.map((input) => buildGraphSeries(input, viewport)), [inputs, viewport]);
  const focusedModel = models.find((item) => item.id === focusedId) ?? models[0];
  const focusedObject = selectedObjects.find((item) => item.id === focusedModel?.id);
  const parsedRange = parseViewportDraft(rangeDraft);

  const toggleSeries = (id: string) => {
    const selected = selectedIds.includes(id);
    if (!selected && selectedIds.length >= 6) return;
    if (!selected && objects.some((item) => item.id === id)) onActivateObject(id);
    setSelectedIds((current) => selected ? current.filter((item) => item !== id) : [...current, id]);
    if (!selected) setFocusedId(id);
  };

  const mutatePresentation = (id: string, mode: 'color' | 'style') => {
    const index = Math.max(0, selectedIds.indexOf(id));
    setPresentations((current) => {
      const base = presentationFor(id, index, current);
      return {
        ...current,
        [id]: mode === 'color'
          ? { ...base, colorSlot: cycleColorSlot(base.colorSlot) }
          : { ...base, lineStyle: cycleLineStyle(base.lineStyle) },
      };
    });
  };

  const toggleOverlay = (key: OverlayKey) => setOverlays((current) => ({ ...current, [key]: !current[key] }));
  const resetView = () => { setViewport(defaultGraphViewport()); setTraceSnapshot(null); };
  const fitY = () => { if (inputs.length) setViewport(fitGraphViewport(inputs, { xMin: viewport.xMin, xMax: viewport.xMax })); };

  const exportSvg = () => {
    if (!svgRef.current) return;
    downloadBlob(new Blob([svgMarkup(svgRef.current)], { type: 'image/svg+xml;charset=utf-8' }), 'mathlab-graph.svg');
    setExportMessage('SVG exported.');
  };

  const exportPng = () => {
    if (!svgRef.current) return;
    const markup = svgMarkup(svgRef.current);
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const width = Math.max(1400, svgRef.current?.viewBox.baseVal.width ?? 1400);
      const height = Math.round(width * ((svgRef.current?.viewBox.baseVal.height ?? 800) / (svgRef.current?.viewBox.baseVal.width ?? 1400)));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) { URL.revokeObjectURL(url); return; }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((png) => { if (png) downloadBlob(png, 'mathlab-graph.png'); }, 'image/png');
      URL.revokeObjectURL(url);
      setExportMessage('PNG exported.');
    };
    image.src = url;
  };

  const overlayLabels: Array<[OverlayKey, string, string]> = [
    ['grid', 'Grid', 'Cartesian guide lines'],
    ['zeros', 'Zeros', 'Exact or sampled intercepts'],
    ['extrema', 'Extrema', 'Supported local extrema'],
    ['inflections', 'Inflections', 'Supported curvature changes'],
    ['asymptotes', 'Asymptotes', 'Asymptotes and holes'],
    ['trace', 'Trace', 'Interactive coordinate inspection'],
  ];

  const focusedFeatures = focusedModel?.annotations.filter((item) => ['zero', 'extremum', 'inflection', 'vertical-asymptote', 'horizontal-asymptote', 'hole'].includes(item.kind)) ?? [];
  const focusedDomain = focusedModel ? domainNotes(focusedModel.ast, focusedModel.variable) : [];

  return (
    <main className="visualization-main m5-visualization-main">
      <header className="m5-visualization-hero">
        <div>
          <span className="eyebrow">Visualization</span>
          <h1>Explore functions on a mathematical canvas.</h1>
          <p>Pan, inspect, compare and annotate up to six one-variable functions without leaving MathLab's exact symbolic workspace.</p>
        </div>
        <div className="m5-visualization-status">
          <strong>{selectedObjects.length}</strong><span>visible series</span>
          <strong>{models.reduce((sum, model) => sum + model.segments.length, 0)}</strong><span>continuous branches</span>
        </div>
      </header>

      {availableObjects.length === 0 ? (
        <section className="visualization-empty m5-visualization-empty">
          <span className="section-kicker">No graphable work yet</span>
          <h2>Create a unary function or a one-variable expression in Workspace.</h2>
          <p>Examples include <code>f(x)=x^3-3x</code>, <code>sin(x)</code>, and <code>1/x</code>. MathLab intentionally does not pretend that matrices, systems or multivariable objects are ordinary 2D function plots.</p>
        </section>
      ) : (
        <>
          <section className="m5-visualization-workbench">
            <aside className="m5-plot-rail" aria-label="Plot series and overlays">
              <div className="m5-rail-heading">
                <div><span className="section-kicker">Functions</span><strong>Plot list</strong></div>
                <span>{selectedIds.length}/6</span>
              </div>

              <div className="m5-series-list">
                {availableObjects.map((object, index) => {
                  const selectedIndex = selectedIds.indexOf(object.id);
                  const selected = selectedIndex >= 0;
                  const presentation = presentationFor(object.id, Math.max(0, selectedIndex), presentations);
                  const disabled = !selected && selectedIds.length >= 6;
                  return (
                    <article className={`m5-series-item ${selected ? `is-selected graph-series-${presentation.colorSlot}` : ''}`} key={object.id}>
                      <button className="m5-series-main" onClick={() => toggleSeries(object.id)} disabled={disabled} title={disabled ? 'At most six functions can be shown simultaneously.' : object.source}>
                        <span className="m5-series-visibility" aria-hidden="true">{selected ? '✓' : '+'}</span>
                        <span className="m5-series-swatch" />
                        <span className="m5-series-copy"><strong>{object.name ?? `Expression ${index + 1}`}</strong><small><MathValue ast={object.valueAst} source={object.source} compact /></small></span>
                      </button>
                      {selected && (
                        <div className="m5-series-actions">
                          <button className={focusedId === object.id ? 'is-active' : ''} onClick={() => setFocusedId(object.id)}>Inspect</button>
                          <button onClick={() => mutatePresentation(object.id, 'color')} title="Cycle series color">Color {presentation.colorSlot + 1}</button>
                          <button onClick={() => mutatePresentation(object.id, 'style')} title="Cycle line style">{presentation.lineStyle}</button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="m5-rail-section">
                <div className="m5-rail-section-heading"><span className="section-kicker">Overlays</span><span>Exact when supported</span></div>
                <div className="m5-overlay-list">
                  {overlayLabels.map(([key, label, detail]) => (
                    <button key={key} className={overlays[key] ? 'is-on' : ''} onClick={() => toggleOverlay(key)} aria-pressed={overlays[key]}>
                      <i /><span><strong>{label}</strong><small>{detail}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="m5-plot-workspace">
              <div className="m5-plot-toolbar" aria-label="Viewport controls">
                <div className="m5-mode-switch" role="group" aria-label="Graph interaction mode">
                  <button className={interactionMode === 'pan' ? 'is-active' : ''} onClick={() => setInteractionMode('pan')}>Pan</button>
                  <button className={interactionMode === 'trace' ? 'is-active' : ''} onClick={() => { setInteractionMode('trace'); setOverlays((current) => ({ ...current, trace: true })); }}>Trace</button>
                </div>
                <div className="m5-view-actions">
                  <button onClick={resetView}>Home</button>
                  <button onClick={fitY} disabled={!inputs.length}>Fit Y</button>
                  <button aria-label="Zoom in" onClick={() => setViewport((current) => zoomViewport(current, 0.72, (current.xMin + current.xMax) / 2, (current.yMin + current.yMax) / 2))}>＋</button>
                  <button aria-label="Zoom out" onClick={() => setViewport((current) => zoomViewport(current, 1.38, (current.xMin + current.xMax) / 2, (current.yMin + current.yMax) / 2))}>−</button>
                  <button className={rangeOpen ? 'is-active' : ''} onClick={() => setRangeOpen((value) => !value)}>Range</button>
                </div>
                <div className="m5-export-actions">
                  <button onClick={exportSvg}>SVG</button>
                  <button onClick={exportPng}>PNG</button>
                </div>
              </div>

              {rangeOpen && (
                <div className="m5-range-editor">
                  {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((key) => (
                    <label key={key}><span>{key === 'xMin' ? 'x min' : key === 'xMax' ? 'x max' : key === 'yMin' ? 'y min' : 'y max'}</span><input inputMode="decimal" value={rangeDraft[key]} onChange={(event) => setRangeDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>
                  ))}
                  <button disabled={!parsedRange} onClick={() => { if (parsedRange) { setViewport(parsedRange); setRangeOpen(false); } }}>Apply range</button>
                  {!parsedRange && <span>Minimum values must be finite and smaller than maximum values.</span>}
                </div>
              )}

              <section className="graph-stage m5-graph-stage">
                <GraphCanvas
                  ref={svgRef}
                  series={models}
                  viewport={viewport}
                  onViewportChange={setViewport}
                  overlays={overlays}
                  presentations={presentations}
                  interactionMode={interactionMode}
                  onTraceChange={setTraceSnapshot}
                  onReset={resetView}
                />
                <div className="graph-coordinate-strip m5-coordinate-strip">
                  <span><MathValue source={`${formatNumeric(viewport.xMin)} <= x <= ${formatNumeric(viewport.xMax)}`} compact /></span>
                  <span><MathValue source={`${formatNumeric(viewport.yMin)} <= y <= ${formatNumeric(viewport.yMax)}`} compact /></span>
                  <span>{interactionMode === 'pan' ? 'Pan mode' : 'Trace mode'}</span>
                  <span>{models[0]?.sampleCount ?? 0} samples / series</span>
                  {exportMessage && <span className="graph-export-message">{exportMessage}</span>}
                </div>
              </section>

              {traceSnapshot && overlays.trace && (
                <section className="m5-trace-readout" aria-live="polite">
                  <div><span className="section-kicker">Trace</span><strong><MathValue source={`x=${formatNumeric(traceSnapshot.x, 8)}`} compact={false} /></strong></div>
                  <div className="m5-trace-values">
                    {traceSnapshot.values.length ? traceSnapshot.values.map((value) => (
                      <div key={value.id} className={`graph-series-${value.colorSlot}`}><i /><span>{value.name}</span><strong><MathValue source={formatNumeric(value.y, 9)} compact /></strong></div>
                    )) : <span>No selected function has a finite real value at this x-coordinate.</span>}
                  </div>
                </section>
              )}
            </div>
          </section>

          {focusedModel && focusedObject && (
            <section className="m5-analysis-inspector">
              <header className="m5-analysis-header">
                <div>
                  <span className="section-kicker">Selected series analysis</span>
                  <div className="m5-analysis-tabs">
                    {models.map((model, index) => {
                      const presentation = presentationFor(model.id, index, presentations);
                      return <button key={model.id} className={`${focusedModel.id === model.id ? 'is-active' : ''} graph-series-${presentation.colorSlot}`} onClick={() => setFocusedId(model.id)}><i />{model.name}</button>;
                    })}
                  </div>
                </div>
                {objects.some((item) => item.id === focusedObject.id) ? <button className="m5-open-object" onClick={() => onOpenObject(focusedObject.id)}>Open in Workspace</button> : <span className="scratch-label">Scratch expression</span>}
              </header>

              <div className="m5-analysis-body">
                <div className="m5-equation-panel">
                  <span>Function</span>
                  <div><MathValue ast={focusedModel.ast} source={focusedModel.source} compact={false} /></div>
                  <dl>
                    <div><dt>Variable</dt><dd><MathValue source={focusedModel.variable} compact /></dd></div>
                    <div><dt>Branches</dt><dd>{focusedModel.segments.length}</dd></div>
                    <div><dt>Samples</dt><dd>{focusedModel.sampleCount}</dd></div>
                  </dl>
                  <div className="m5-domain-notes"><span>Real-domain notes</span>{focusedDomain.length ? focusedDomain.map((note) => <MathValue key={note} source={note} compact />) : <strong>No restriction detected by the current rule set.</strong>}</div>
                </div>

                <div className="m5-feature-panel">
                  <div className="m5-feature-heading"><span>Detected structure</span><strong>{focusedFeatures.length} annotations</strong></div>
                  {focusedFeatures.length ? (
                    <div className="m5-feature-list">
                      {focusedFeatures.slice(0, 18).map((feature) => (
                        <div key={feature.id}>
                          <span>{annotationLabel(feature.kind)}</span>
                          <strong><MathValue source={feature.label} compact /></strong>
                          <em className={feature.exact ? 'is-exact' : 'is-numeric'}>{feature.exact ? 'Exact' : 'Numeric'}</em>
                        </div>
                      ))}
                    </div>
                  ) : <p>No supported special points were detected in the current viewport/rule set.</p>}
                  {focusedModel.warnings.map((warning) => <p className="graph-model-warning" key={warning}>{warning}</p>)}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <div className="phase-notice m5-phase-notice"><strong>Domain-aware 2D visualization.</strong> Curves remain segmented across known poles and invalid real-domain regions; exact symbolic annotations remain visibly distinct from sampled numeric fallbacks. M5 improves the 2D workspace only—3D surfaces, vector fields and multivariable visualization remain candidates for the later mathematical completeness expansion.</div>
    </main>
  );
}
