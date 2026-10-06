import { describe, expect, it } from 'vitest';
import { classifyStoragePressure } from '../src/lib/storage/health';

describe('P9 storage health', () => {
  it('classifies quota pressure deterministically', () => {
    expect(classifyStoragePressure(null, null)).toBe('unknown');
    expect(classifyStoragePressure(1, 0)).toBe('unknown');
    expect(classifyStoragePressure(100, 1000)).toBe('normal');
    expect(classifyStoragePressure(750, 1000)).toBe('elevated');
    expect(classifyStoragePressure(899, 1000)).toBe('elevated');
    expect(classifyStoragePressure(900, 1000)).toBe('critical');
  });
});
