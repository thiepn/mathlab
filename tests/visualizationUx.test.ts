import { describe, expect, it } from 'vitest';
import {
  annotationLabel,
  cycleColorSlot,
  cycleLineStyle,
  defaultSeriesPresentation,
  parseViewportDraft,
  presentationFor,
  viewportDraft,
} from '../src/app/visualizationPresentation';

describe('M5 visualization presentation', () => {
  it('cycles line styles deterministically', () => {
    expect(cycleLineStyle('solid')).toBe('dashed');
    expect(cycleLineStyle('dashed')).toBe('dotted');
    expect(cycleLineStyle('dotted')).toBe('solid');
  });

  it('cycles the six visual color slots', () => {
    expect(cycleColorSlot(0)).toBe(1);
    expect(cycleColorSlot(5)).toBe(0);
    expect(defaultSeriesPresentation(8)).toEqual({ colorSlot: 2, lineStyle: 'solid' });
  });

  it('uses explicit series presentation when available', () => {
    expect(presentationFor('f', 0, { f: { colorSlot: 4, lineStyle: 'dotted' } })).toEqual({ colorSlot: 4, lineStyle: 'dotted' });
    expect(presentationFor('g', 1, {})).toEqual({ colorSlot: 1, lineStyle: 'solid' });
  });

  it('accepts only finite ordered graph ranges', () => {
    expect(parseViewportDraft({ xMin: '-4', xMax: '8', yMin: '-2', yMax: '6' })).toEqual({ xMin: -4, xMax: 8, yMin: -2, yMax: 6 });
    expect(parseViewportDraft({ xMin: '2', xMax: '2', yMin: '-2', yMax: '6' })).toBeNull();
    expect(parseViewportDraft({ xMin: 'oops', xMax: '2', yMin: '-2', yMax: '6' })).toBeNull();
  });

  it('round-trips viewport drafts and gives readable annotation names', () => {
    const viewport = { xMin: -10, xMax: 10, yMin: -5, yMax: 5 };
    expect(parseViewportDraft(viewportDraft(viewport))).toEqual(viewport);
    expect(annotationLabel('vertical-asymptote')).toBe('Vertical asymptote');
    expect(annotationLabel('inflection')).toBe('Inflection');
  });
});
