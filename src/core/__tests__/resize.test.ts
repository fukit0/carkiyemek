import { describe, expect, test } from 'vitest';
import { MIN_WEIGHT } from '../defaults';
import { resizeAtBoundary } from '../resize';
import { totalWeight } from '../wheel';
import type { Segment } from '../types';

const seg = (id: string, weight: number): Segment => ({
  id,
  label: id,
  weight,
  color: '#000',
});

describe('resizeAtBoundary', () => {
  test('moving the boundary to the middle of the pair equalises the two slices', () => {
    // Arrange: a=90deg, b=90deg out of 360 -> pair spans 0..180
    const segments = [seg('a', 1), seg('b', 1), seg('c', 2)];

    // Act
    const result = resizeAtBoundary(segments, 0, 45);

    // Assert
    expect(result[0].weight).toBeCloseTo(0.5, 1);
    expect(result[1].weight).toBeCloseTo(1.5, 1);
  });

  test('keeps the total weight and every other slice untouched', () => {
    const segments = [seg('a', 1), seg('b', 3), seg('c', 2)];
    const result = resizeAtBoundary(segments, 1, 200);
    expect(totalWeight(result)).toBeCloseTo(totalWeight(segments), 1);
    expect(result[0]).toEqual(segments[0]);
  });

  test('never lets a slice collapse below the minimum weight', () => {
    const segments = [seg('a', 2), seg('b', 2)];
    expect(resizeAtBoundary(segments, 0, 0)[0].weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
    expect(resizeAtBoundary(segments, 0, 360)[1].weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
  });

  test('returns the original list for a boundary that does not exist', () => {
    const segments = [seg('a', 1), seg('b', 1)];
    expect(resizeAtBoundary(segments, 1, 100)).toBe(segments);
    expect(resizeAtBoundary(segments, -1, 100)).toBe(segments);
  });
});
