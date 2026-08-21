import { forwardRef, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import type { GraphAnnotationKind, GraphSeriesModel, GraphViewport } from '../../lib/math/visualization';
import { evaluateNumeric, formatNumeric, niceTicks, panViewport, zoomViewport } from '../../lib/math/visualization';

interface GraphOverlaySettings {
  grid: boolean;
  zeros: boolean;
  extrema: boolean;
  inflections: boolean;
  asymptotes: boolean;
  trace: boolean;
}

interface GraphCanvasProps {
  series: GraphSeriesModel[];
  viewport: GraphViewport;
  onViewportChange: (viewport: GraphViewport) => void;
  overlays: GraphOverlaySettings;
}

interface Size { width: number; height: number }
interface DragState { pointerId: number; clientX: number; clientY: number; viewport: GraphViewport }

const PADDING = { left: 52, right: 18, top: 18, bottom: 40 };

function visibleAnnotation(kind: GraphAnnotationKind, overlays: GraphOverlaySettings): boolean {
  if (kind === 'zero') return overlays.zeros;
  if (kind === 'extremum') return overlays.extrema;
  if (kind === 'inflection') return overlays.inflections;
  if (kind === 'vertical-asymptote' || kind === 'horizontal-asymptote' || kind === 'hole') return overlays.asymptotes;
  return true;
}

export const GraphCanvas = forwardRef<SVGSVGElement, GraphCanvasProps>(function GraphCanvas({ series, viewport, onViewportChange, overlays }, forwardedRef) {
  const shellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [size, setSize] = useState<Size>({ width: 900, height: 560 });
  const [cursor, setCursor] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;
    const resize = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.max(320, rect.width), height: Math.max(360, Math.min(680, rect.width * 0.64)) });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const plot = useMemo(() => ({
    left: PADDING.left,
    top: PADDING.top,
    width: Math.max(1, size.width - PADDING.left - PADDING.right),
    height: Math.max(1, size.height - PADDING.top - PADDING.bottom),
  }), [size]);

  const xToScreen = (x: number) => plot.left + (x - viewport.xMin) / (viewport.xMax - viewport.xMin) * plot.width;
  const yToScreen = (y: number) => plot.top + (viewport.yMax - y) / (viewport.yMax - viewport.yMin) * plot.height;
  const screenToX = (sx: number) => viewport.xMin + (sx - plot.left) / plot.width * (viewport.xMax - viewport.xMin);
  const screenToY = (sy: number) => viewport.yMax - (sy - plot.top) / plot.height * (viewport.yMax - viewport.yMin);

  const xTicks = niceTicks(viewport.xMin, viewport.xMax, Math.max(5, Math.floor(plot.width / 90)));
  const yTicks = niceTicks(viewport.yMin, viewport.yMax, Math.max(5, Math.floor(plot.height / 70)));
  const xAxisY = yToScreen(0);
  const yAxisX = xToScreen(0);
  const axisYVisible = xAxisY >= plot.top && xAxisY <= plot.top + plot.height;
  const axisXVisible = yAxisX >= plot.left && yAxisX <= plot.left + plot.width;

  const pointerCoordinates = (clientX: number, clientY: number) => {
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    if (sx < plot.left || sx > plot.left + plot.width || sy < plot.top || sy > plot.top + plot.height) return null;
    return { sx, sy, x: screenToX(sx), y: screenToY(sy) };
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, viewport };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const dxPixels = event.clientX - drag.clientX;
      const dyPixels = event.clientY - drag.clientY;
      const dx = -dxPixels / plot.width * (drag.viewport.xMax - drag.viewport.xMin);
      const dy = dyPixels / plot.height * (drag.viewport.yMax - drag.viewport.yMin);
      onViewportChange(panViewport(drag.viewport, dx, dy));
      setCursor(null);
      return;
    }
    if (overlays.trace) setCursor(pointerCoordinates(event.clientX, event.clientY));
  };

  const stopDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const point = pointerCoordinates(event.clientX, event.clientY);
    if (!point) return;
    const factor = event.deltaY > 0 ? 1.16 : 0.86;
    onViewportChange(zoomViewport(viewport, factor, point.x, point.y));
  };

  const traceValues = cursor && overlays.trace ? series.flatMap((item, index) => {
    const y = evaluateNumeric(item.ast, item.variable, cursor.x);
    if (!Number.isFinite(y)) return [];
    return [{ id: item.id, name: item.name, y, sy: yToScreen(y), index }];
  }) : [];

  return (
    <div ref={shellRef} className="graph-canvas-shell">
      <svg
        ref={forwardedRef}
        className="graph-canvas"
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label="Interactive Cartesian graph. Drag to pan and use the mouse wheel to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={(event) => { stopDrag(event); if (!dragRef.current) setCursor(null); }}
        onWheel={onWheel}
      >
        <defs>
          <clipPath id="mathlab-plot-clip"><rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} /></clipPath>
        </defs>
        <rect className="graph-background" x="0" y="0" width={size.width} height={size.height} />
        <rect className="graph-plot-background" x={plot.left} y={plot.top} width={plot.width} height={plot.height} />

        {overlays.grid && <g className="graph-grid" aria-hidden="true">
          {xTicks.map((tick) => <line key={`gx:${tick}`} x1={xToScreen(tick)} x2={xToScreen(tick)} y1={plot.top} y2={plot.top + plot.height} />)}
          {yTicks.map((tick) => <line key={`gy:${tick}`} x1={plot.left} x2={plot.left + plot.width} y1={yToScreen(tick)} y2={yToScreen(tick)} />)}
        </g>}

        <g className="graph-axes" aria-hidden="true">
          <line x1={plot.left} x2={plot.left + plot.width} y1={axisYVisible ? xAxisY : yToScreen(viewport.yMin)} y2={axisYVisible ? xAxisY : yToScreen(viewport.yMin)} />
          <line x1={axisXVisible ? yAxisX : xToScreen(viewport.xMin)} x2={axisXVisible ? yAxisX : xToScreen(viewport.xMin)} y1={plot.top} y2={plot.top + plot.height} />
        </g>

        <g className="graph-tick-labels" aria-hidden="true">
          {xTicks.map((tick) => <text key={`tx:${tick}`} x={xToScreen(tick)} y={plot.top + plot.height + 22} textAnchor="middle">{formatNumeric(tick, 5)}</text>)}
          {yTicks.map((tick) => <text key={`ty:${tick}`} x={plot.left - 9} y={yToScreen(tick) + 4} textAnchor="end">{formatNumeric(tick, 5)}</text>)}
        </g>

        <g clipPath="url(#mathlab-plot-clip)">
          {series.map((item, seriesIndex) => (
            <g key={item.id} className={`graph-series graph-series-${seriesIndex % 6}`}>
              {item.annotations.filter((annotation) => visibleAnnotation(annotation.kind, overlays)).map((annotation) => {
                if (annotation.kind === 'vertical-asymptote' && annotation.x !== undefined) return <line key={annotation.id} className="graph-asymptote" x1={xToScreen(annotation.x)} x2={xToScreen(annotation.x)} y1={plot.top} y2={plot.top + plot.height}><title>{annotation.label}</title></line>;
                if (annotation.kind === 'horizontal-asymptote' && annotation.y !== undefined) return <line key={annotation.id} className="graph-asymptote" x1={plot.left} x2={plot.left + plot.width} y1={yToScreen(annotation.y)} y2={yToScreen(annotation.y)}><title>{annotation.label}</title></line>;
                return null;
              })}
              {item.segments.map((segment, segmentIndex) => (
                <polyline
                  key={`${item.id}:segment:${segmentIndex}`}
                  className="graph-series-line"
                  points={segment.points.map((point) => `${xToScreen(point.x)},${yToScreen(point.y)}`).join(' ')}
                  fill="none"
                />
              ))}
              {item.annotations.filter((annotation) => visibleAnnotation(annotation.kind, overlays) && annotation.x !== undefined && annotation.kind !== 'vertical-asymptote').map((annotation) => {
                if (annotation.kind === 'hole') {
                  const leftY = evaluateNumeric(item.ast, item.variable, annotation.x! - Math.max(1e-6, (viewport.xMax - viewport.xMin) * 1e-6));
                  const rightY = evaluateNumeric(item.ast, item.variable, annotation.x! + Math.max(1e-6, (viewport.xMax - viewport.xMin) * 1e-6));
                  const y = Number.isFinite(leftY) && Number.isFinite(rightY) ? (leftY + rightY) / 2 : Number.NaN;
                  if (!Number.isFinite(y)) return null;
                  return <circle key={annotation.id} className="graph-hole" cx={xToScreen(annotation.x!)} cy={yToScreen(y)} r="5"><title>{annotation.label}</title></circle>;
                }
                if (annotation.y === undefined) return null;
                return <circle key={annotation.id} className={`graph-feature graph-feature-${annotation.kind}`} cx={xToScreen(annotation.x!)} cy={yToScreen(annotation.y)} r={annotation.kind === 'zero' ? 4 : 5}><title>{`${annotation.label}${annotation.exact ? ' · exact' : ' · numeric'}`}</title></circle>;
              })}
            </g>
          ))}

          {cursor && overlays.trace && <g className="graph-trace" aria-hidden="true">
            <line x1={cursor.sx} x2={cursor.sx} y1={plot.top} y2={plot.top + plot.height} />
            <line x1={plot.left} x2={plot.left + plot.width} y1={cursor.sy} y2={cursor.sy} />
            {traceValues.map((value) => <circle key={value.id} className={`graph-trace-point graph-series-${value.index % 6}`} cx={cursor.sx} cy={value.sy} r="4" />)}
          </g>}
        </g>

        {cursor && overlays.trace && (
          <g className="graph-trace-label" transform={`translate(${Math.min(cursor.sx + 12, size.width - 190)},${Math.max(plot.top + 10, Math.min(cursor.sy + 12, size.height - 34 - traceValues.length * 17))})`}>
            <rect width="176" height={28 + traceValues.length * 17} />
            <text x="9" y="17">x = {formatNumeric(cursor.x, 7)}</text>
            {traceValues.map((value, index) => <text key={value.id} className={`graph-series-fill graph-series-${value.index % 6}`} x="9" y={36 + index * 17}>{value.name}: {formatNumeric(value.y, 7)}</text>)}
          </g>
        )}
      </svg>
      <div className="graph-interaction-hint">Drag to pan · wheel or controls to zoom · hover to trace values</div>
    </div>
  );
});
