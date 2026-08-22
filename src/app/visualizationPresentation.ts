import type { GraphAnnotationKind, GraphViewport } from '../lib/math/visualization';

export type GraphLineStyle = 'solid' | 'dashed' | 'dotted';

export interface SeriesPresentation {
  colorSlot: number;
  lineStyle: GraphLineStyle;
}

export interface TraceSeriesValue {
  id: string;
  name: string;
  y: number;
  colorSlot: number;
}

export interface GraphTraceSnapshot {
  x: number;
  y: number;
  values: TraceSeriesValue[];
}

const LINE_STYLES: GraphLineStyle[] = ['solid', 'dashed', 'dotted'];

export function defaultSeriesPresentation(index: number): SeriesPresentation {
  return { colorSlot: ((index % 6) + 6) % 6, lineStyle: 'solid' };
}

export function cycleLineStyle(style: GraphLineStyle): GraphLineStyle {
  const index = LINE_STYLES.indexOf(style);
  return LINE_STYLES[(index + 1) % LINE_STYLES.length];
}

export function cycleColorSlot(slot: number): number {
  return (Math.max(0, Math.trunc(slot)) + 1) % 6;
}

export function presentationFor(id: string, index: number, presentations: Record<string, SeriesPresentation>): SeriesPresentation {
  return presentations[id] ?? defaultSeriesPresentation(index);
}

export function annotationLabel(kind: GraphAnnotationKind): string {
  switch (kind) {
    case 'zero': return 'Zero';
    case 'extremum': return 'Extremum';
    case 'inflection': return 'Inflection';
    case 'vertical-asymptote': return 'Vertical asymptote';
    case 'horizontal-asymptote': return 'Horizontal asymptote';
    case 'hole': return 'Hole';
    default: return String(kind).replace(/-/g, ' ');
  }
}

export function parseViewportDraft(draft: Record<'xMin' | 'xMax' | 'yMin' | 'yMax', string>): GraphViewport | null {
  const xMin = Number(draft.xMin);
  const xMax = Number(draft.xMax);
  const yMin = Number(draft.yMin);
  const yMax = Number(draft.yMax);
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return null;
  if (xMin >= xMax || yMin >= yMax) return null;
  if (xMax - xMin < 1e-12 || yMax - yMin < 1e-12) return null;
  return { xMin, xMax, yMin, yMax };
}

export function viewportDraft(viewport: GraphViewport): Record<'xMin' | 'xMax' | 'yMin' | 'yMax', string> {
  return {
    xMin: String(viewport.xMin),
    xMax: String(viewport.xMax),
    yMin: String(viewport.yMin),
    yMax: String(viewport.yMax),
  };
}
