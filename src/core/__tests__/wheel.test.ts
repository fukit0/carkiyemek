import { describe, expect, test } from 'vitest';
import type { Segment } from '../types';
import {
  buildGeometry,
  indexAtPointer,
  pickWeightedIndex,
  rotationToLandOn,
  totalWeight,
} from '../wheel';

const seg = (id: string, weight: number): Segment => ({
  id,
  label: id,
  weight,
  color: '#000',
});

describe('totalWeight', () => {
  test('sums positive weights', () => {
    expect(totalWeight([seg('a', 1), seg('b', 3)])).toBe(4);
  });

  test('returns 0 for an empty wheel', () => {
    expect(totalWeight([])).toBe(0);
  });
});

describe('buildGeometry', () => {
  test('splits the circle proportionally to weights', () => {
    // Arrange
    const segments = [seg('a', 1), seg('b', 3)];

    // Act
    const geometry = buildGeometry(segments);

    // Assert
    expect(geometry).toHaveLength(2);
    expect(geometry[0].startAngle).toBe(0);
    expect(geometry[0].endAngle).toBeCloseTo(90);
    expect(geometry[0].share).toBeCloseTo(0.25);
    expect(geometry[1].startAngle).toBeCloseTo(90);
    expect(geometry[1].endAngle).toBeCloseTo(360);
    expect(geometry[1].midAngle).toBeCloseTo(225);
  });

  test('ends exactly at 360 degrees so no gap remains', () => {
    const geometry = buildGeometry([seg('a', 1), seg('b', 1), seg('c', 1)]);
    expect(geometry[geometry.length - 1].endAngle).toBe(360);
  });

  test('returns an empty list when there is nothing to spin', () => {
    expect(buildGeometry([])).toEqual([]);
  });
});

describe('pickWeightedIndex', () => {
  test('honours the weights across the random range', () => {
    const segments = [seg('a', 1), seg('b', 3)];
    expect(pickWeightedIndex(segments, () => 0)).toBe(0);
    expect(pickWeightedIndex(segments, () => 0.2)).toBe(0);
    expect(pickWeightedIndex(segments, () => 0.3)).toBe(1);
    expect(pickWeightedIndex(segments, () => 0.999)).toBe(1);
  });

  test('never returns an out-of-range index when random returns 1', () => {
    const segments = [seg('a', 1), seg('b', 1)];
    expect(pickWeightedIndex(segments, () => 1)).toBe(1);
  });

  test('returns -1 when the wheel is empty', () => {
    expect(pickWeightedIndex([], () => 0.5)).toBe(-1);
  });
});

describe('rotationToLandOn / indexAtPointer', () => {
  const segments = [seg('a', 1), seg('b', 3), seg('c', 2)];

  test('the pointer really ends up on the chosen slice', () => {
    for (let index = 0; index < segments.length; index += 1) {
      for (const jitter of [0, 0.25, 0.5, 0.75, 0.99]) {
        const rotation = rotationToLandOn(segments, index, 12.5, 4, jitter);
        expect(indexAtPointer(segments, rotation)).toBe(index);
      }
    }
  });

  test('always spins forward by at least the requested full turns', () => {
    const rotation = rotationToLandOn(segments, 2, 100, 5, 0.5);
    expect(rotation).toBeGreaterThanOrEqual(100 + 5 * 360);
    expect(rotation).toBeLessThan(100 + 6 * 360);
  });

  test('keeps the pointer away from the slice edges', () => {
    const narrow = [seg('a', 1), seg('b', 99)];
    const rotation = rotationToLandOn(narrow, 0, 0, 3, 0);
    expect(indexAtPointer(narrow, rotation)).toBe(0);
  });

  test('indexAtPointer handles rotations far beyond one turn', () => {
    expect(indexAtPointer(segments, 0)).toBe(0);
    expect(indexAtPointer(segments, 3600)).toBe(0);
    expect(indexAtPointer(segments, -3600)).toBe(0);
  });

  test('returns the current rotation when the wheel is empty', () => {
    expect(rotationToLandOn([], 0, 42, 3, 0.5)).toBe(42);
    expect(indexAtPointer([], 42)).toBe(-1);
  });
});
