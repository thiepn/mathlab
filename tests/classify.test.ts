import { describe, expect, it } from 'vitest';
import { classifyPreview } from '../src/lib/math/classify';

describe('classifyPreview', () => {
  it('recognizes P1 AST-backed object classes', () => {
    expect(classifyPreview('')).toBe('unknown');
    expect(classifyPreview('42')).toBe('scalar');
    expect(classifyPreview('x^2 + 1')).toBe('expression');
    expect(classifyPreview('x^2 = 4')).toBe('equation');
    expect(classifyPreview('f(x) = x^2')).toBe('function');
    expect(classifyPreview('A = [[1,2],[3,4]]')).toBe('matrix');
    expect(classifyPreview('[1,2,3]')).toBe('vector');
  });
});
