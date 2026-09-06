import { describe, expect, test } from 'vitest';
import { polarToCartesian, slicePath } from '../svgPath';

describe('polarToCartesian', () => {
  test('0 degrees points straight up from the centre', () => {
    const point = polarToCartesian(100, 100, 50, 0);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(50);
  });

  test('90 degrees points to the right', () => {
    const point = polarToCartesian(100, 100, 50, 90);
    expect(point.x).toBeCloseTo(150);
    expect(point.y).toBeCloseTo(100);
  });
});

describe('slicePath', () => {
  test('draws a closed wedge for a normal slice', () => {
    const path = slicePath(100, 100, 90, 0, 90);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.trim().endsWith('Z')).toBe(true);
    expect(path).toContain('A 90 90');
  });

  test('uses the large-arc flag past a half turn', () => {
    expect(slicePath(100, 100, 90, 0, 200)).toContain(' 1 1 ');
    expect(slicePath(100, 100, 90, 0, 100)).toContain(' 0 1 ');
  });

  test('falls back to a full circle when a single slice fills the wheel', () => {
    const path = slicePath(100, 100, 90, 0, 360);
    expect(path).toContain('A 90 90');
    // Two arcs are needed because one arc cannot describe a full circle.
    expect(path.match(/A 90 90/g)).toHaveLength(2);
  });
});
