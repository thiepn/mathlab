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
import { GraphCanvas } from './GraphCanvas';
import { MathValue } from './MathValue';

interface VisualizationPageProps {
  objects: SemanticMathObject[];
  activeObject: SemanticMathObject | null;
  onActivateObject: (id: string) => void;
  onOpenObject: (id: string) => void;
}

type OverlayKey = 'grid' | 'zeros' | 'extrema' | 'inflections' | 'asymptotes' | 'trace';

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
    .graph-background{fill:#fff}.graph-plot-background{fill:#fbfcfe}.graph-grid line{stroke:#e8edf3;stroke-width:1}.graph-axes line{stroke:#8b96a5;stroke-width:1.15}.graph-tick-labels{fill:#6f7b8b;font:11px sans-serif}.graph-series-line{fill:none;stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round}.graph-series-0{color:#1769e0}.graph-series-1{color:#16845b}.graph-series-2{color:#a76508}.graph-series-3{color:#7a4cc2}.graph-series-4{color:#c44747}.graph-series-5{color:#0f8497}.graph-series-line{stroke:currentColor}.graph-trace-point{stroke:currentColor}.graph-asymptote{stroke:currentColor;stroke-dasharray:6 5;stroke-width:1.2;opacity:.58}.graph-feature{fill:#fff;stroke:currentColor;stroke-width:2}.graph-hole{fill:#fff;stroke:currentColor;stroke-width:2}.graph-trace{stroke:#8995a5;stroke-width:1;stroke-dasharray:3 4}.graph-trace-point{fill:#fff;stroke-width:2}`;
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function VisualizationPage({ objects, activeObject, onActivateObject, onOpenObject }: VisualizationPageProps) {
  const availableObjects = useMemo(() => {
    const combined = activeObject && !objects.some((item) => item.id === activeObject.id) ? [activeObject, ...objects] : objects;
    return combined.filter(graphable);
  }, [objects, activeObject]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<GraphViewport>(() => defaultGraphViewport());
  const [overlays, setOverlays] = useState<Record<OverlayKey, boolean>>({ grid: true, zeros: true, extrema: true, inflections: true, asymptotes: true, trace: true });
  const [exportMessage, setExportMessage] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (activeObject && graphable(activeObject)) {
      setSelectedIds((current) => current.includes(activeObject.id) ? current : [activeObject.id, ...current].slice(0, 6));
    } else if (!selectedIds.length && availableObjects[0]) {
      setSelectedIds([availableObjects[0].id]);
    }
  }, [activeObject?.id, availableObjects.length]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => availableObjects.some((item) => item.id === id)));
  }, [objects]);

  const selectedObjects = useMemo(() => selectedIds.map((id) => availableObjects.find((item) => item.id === id)).filter((item): item is SemanticMathObject => Boolean(item)), [selectedIds, availableObjects]);
  const inputs = useMemo(() => selectedObjects.map((object) => seriesInput(object, objects)), [selectedObjects, objects]);
  const models = useMemo(() => inputs.map((input) => buildGraphSeries(input, viewport)), [inputs, viewport]);

  const toggleSeries = (id: string) => {
    const selected = selectedIds.includes(id);
    if (!selected && selectedIds.length >= 6) return;
    if (!selected && objects.some((item) => item.id === id)) onActivateObject(id);
    setSelectedIds((current) => selected ? current.filter((item) => item !== id) : [...current, id]);
  };
  const toggleOverlay = (key: OverlayKey) => setOverlays((current) => ({ ...current, [key]: !current[key] }));

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
      const width = Math.max(1200, svgRef.current?.viewBox.baseVal.width ?? 1200);
      const height = Math.round(width * ((svgRef.current?.viewBox.baseVal.height ?? 700) / (svgRef.current?.viewBox.baseVal.width ?? 1200)));
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) { URL.revokeObjectURL(url); return; }
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((png) => { if (png) downloadBlob(png, 'mathlab-graph.png'); }, 'image/png');
      URL.revokeObjectURL(url); setExportMessage('PNG exported.');
    };
    image.src = url;
  };

  const overlayLabels: Array<[OverlayKey, string]> = [['grid','Grid'],['zeros','Zeros'],['extrema','Extrema'],['inflections','Inflections'],['asymptotes','Asymptotes / holes'],['trace','Trace']];

  return (
    <main className="workspace-main visualization-main">
      <div className="workspace-heading visualization-heading">
        <div><span className="eyebrow">Visualization engine</span><h1>See the structure, not just the curve.</h1></div>
        <div className="visualization-status"><span>{selectedObjects.length}</span> plotted · <strong>{models.reduce((sum, model) => sum + model.segments.length, 0)}</strong> continuous segments</div>
      </div>

      {availableObjects.length === 0 ? (
        <section className="visualization-empty">
          <span className="section-kicker">Nothing graphable yet</span>
          <h2>Save a unary function or enter a one-variable expression.</h2>
          <p>Examples: <code>f(x)=x^3-3x</code>, <code>g(x)=sin(x)</code>, or <code>1/x</code>. Matrices, systems, and multivariable surfaces are deliberately not misrepresented as 2D function graphs.</p>
        </section>
      ) : (
        <>
          <section className="plot-command-deck" aria-label="Graph controls">
            <div className="plot-series-rack">
              <span>Series</span>
              {availableObjects.map((object, index) => {
                const selected = selectedIds.includes(object.id);
                return <button key={object.id} className={`plot-series-toggle ${selected ? `is-selected graph-series-${Math.max(0, selectedIds.indexOf(object.id)) % 6}` : ''}`} onClick={() => toggleSeries(object.id)} title={selected || selectedIds.length < 6 ? object.source : 'MathLab displays at most six simultaneous functions for legibility.'}><i>{selected ? '●' : '○'}</i><strong>{object.name ?? `expr ${index + 1}`}</strong><small><MathValue ast={object.valueAst} source={object.source} compact /></small></button>;
              })}
            </div>
            <div className="plot-toolbar">
              <div className="plot-toolbar-group"><span>View</span><button onClick={() => setViewport(defaultGraphViewport())}>Reset</button><button onClick={() => setViewport(fitGraphViewport(inputs, { xMin: viewport.xMin, xMax: viewport.xMax }))} disabled={!inputs.length}>Fit Y</button><button aria-label="Zoom in" onClick={() => setViewport((current) => zoomViewport(current, 0.72, (current.xMin + current.xMax) / 2, (current.yMin + current.yMax) / 2))}>＋</button><button aria-label="Zoom out" onClick={() => setViewport((current) => zoomViewport(current, 1.38, (current.xMin + current.xMax) / 2, (current.yMin + current.yMax) / 2))}>−</button></div>
              <div className="plot-toolbar-group"><span>Export</span><button onClick={exportSvg}>SVG</button><button onClick={exportPng}>PNG</button></div>
            </div>
          </section>

          <section className="graph-stage">
            <GraphCanvas ref={svgRef} series={models} viewport={viewport} onViewportChange={setViewport} overlays={overlays} />
            <div className="graph-coordinate-strip">
              <span><MathValue source={`${formatNumeric(viewport.xMin)} <= x <= ${formatNumeric(viewport.xMax)}`} compact /></span>
              <span><MathValue source={`${formatNumeric(viewport.yMin)} <= y <= ${formatNumeric(viewport.yMax)}`} compact /></span>
              <span>Sampling <strong>{models[0]?.sampleCount ?? 0} points / series</strong></span>
              {exportMessage && <span className="graph-export-message">{exportMessage}</span>}
            </div>
          </section>

          <section className="overlay-switchboard">
            <div><span className="section-kicker">Mathematical overlays</span><p>Annotations come from the exact algebra/calculus model when supported; numerical fallbacks are marked approximate.</p></div>
            <div className="overlay-toggle-list">{overlayLabels.map(([key, label]) => <button key={key} className={overlays[key] ? 'is-on' : ''} onClick={() => toggleOverlay(key)} aria-pressed={overlays[key]}><i />{label}</button>)}</div>
          </section>

          <section className="visual-analysis-grid">
            {models.map((model, index) => {
              const sourceObject = selectedObjects.find((item) => item.id === model.id)!;
              const domain = domainNotes(model.ast, model.variable);
              const features = model.annotations.filter((item) => ['zero','extremum','inflection','vertical-asymptote','horizontal-asymptote','hole'].includes(item.kind));
              return (
                <article className={`visual-series-card graph-series-${index % 6}`} key={model.id}>
                  <header><div><span className="series-swatch" /><strong>{model.name}</strong></div>{objects.some((item) => item.id === sourceObject.id) ? <button onClick={() => onOpenObject(sourceObject.id)}>Open object</button> : <span className="scratch-label">Scratch</span>}</header>
                  <div className="series-equation"><MathValue ast={model.ast} source={model.source} compact={false} /></div>
                  <dl><div><dt>Variable</dt><dd><MathValue source={model.variable} compact /></dd></div><div><dt>Real-domain notes</dt><dd>{domain.length ? domain.map((note) => <MathValue key={note} source={note} compact />) : 'No restriction detected'}</dd></div><div><dt>Rendered branches</dt><dd>{model.segments.length}</dd></div></dl>
                  <div className="feature-ledger">
                    {features.length ? features.slice(0, 12).map((feature) => <div key={feature.id}><span>{feature.kind.replace(/-/g, ' ')}</span><strong><MathValue source={feature.label} compact /></strong><em>{feature.exact ? 'exact' : 'numeric'}</em></div>) : <p>No supported special points detected in the current rule set.</p>}
                  </div>
                  {model.warnings.map((warning) => <p className="graph-model-warning" key={warning}>{warning}</p>)}
                </article>
              );
            })}
          </section>
        </>
      )}

      <div className="phase-notice p6-notice"><strong>Domain-aware visualization.</strong> The plot never connects across known denominator discontinuities, invalid real-domain samples, or detected poles. Exact calculus annotations stay distinct from numerical fallback detections. 3D and multivariable visualization are not supported in this release.</div>
    </main>
  );
}
