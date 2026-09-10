import { describe, expect, test } from 'vitest';
import { MIN_WEIGHT } from '../defaults.ts';
import { resizeAtBoundary } from '../resize.ts';
import { indexAtPointer, totalWeight } from '../wheel.ts';
import type { Segment } from '../types.ts';

const seg = (id: string, weight: number): Segment => ({
  id,
  label: id,
  weight,
  color: '#000',
});

describe('resizeAtBoundary, ordinary border', () => {
  test('moving the border to the middle of the pair equalises the two slices', () => {
    // Arrange: a=90deg, b=90deg out of 360 -> the pair spans 0..180
    const segments = [seg('a', 1), seg('b', 1), seg('c', 2)];

    // Act
    const { segments: result, rotationDelta } = resizeAtBoundary(segments, 0, 45);

    // Assert
    expect(result[0].weight).toBeCloseTo(0.5, 1);
    expect(result[1].weight).toBeCloseTo(1.5, 1);
    expect(rotationDelta).toBe(0);
  });

  test('keeps the total weight and every other slice untouched', () => {
    const segments = [seg('a', 1), seg('b', 3), seg('c', 2)];
    const { segments: result } = resizeAtBoundary(segments, 1, 200);
    expect(totalWeight(result)).toBeCloseTo(totalWeight(segments), 1);
    expect(result[0]).toEqual(segments[0]);
  });

  test('never lets a slice collapse below the minimum weight', () => {
    const segments = [seg('a', 2), seg('b', 2)];
    expect(resizeAtBoundary(segments, 0, 0).segments[0].weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
    expect(resizeAtBoundary(segments, 0, 360).segments[1].weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
  });
});

describe('resizeAtBoundary, wrap-around border', () => {
  // c spans 270..360, a spans 0..90; their shared border sits at 0deg.
  const segments = [seg('a', 1), seg('b', 2), seg('c', 1)];

  test('trades weight between the last and the first slice', () => {
    // Act: drag the border 30deg clockwise, into the first slice
    const { segments: result } = resizeAtBoundary(segments, 2, 30);

    // Assert: the last slice grew by exactly what the first one lost
    expect(result[2].weight).toBeGreaterThan(segments[2].weight);
    expect(result[0].weight).toBeLessThan(segments[0].weight);
    expect(result[2].weight + result[0].weight).toBeCloseTo(2, 1);
    expect(result[1]).toEqual(segments[1]);
  });

  test('turns the wheel so the border follows the pointer', () => {
    // Weights move in 0.1 steps, so the border can only land on the angles
    // those steps allow; it must stay within one step of the pointer.
    const stepAngle = (0.1 / totalWeight(segments)) * 360;

    expect(resizeAtBoundary(segments, 2, 30).rotationDelta - 30).toBeLessThanOrEqual(stepAngle);
    expect(resizeAtBoundary(segments, 2, 30).rotationDelta).toBeGreaterThan(0);
    expect(resizeAtBoundary(segments, 2, 350).rotationDelta + 10).toBeLessThanOrEqual(stepAngle);
    expect(resizeAtBoundary(segments, 2, 350).rotationDelta).toBeLessThan(0);
  });

  test('the other borders do not move on screen after the trade', () => {
    // Arrange: the border between a and b sits at 90deg with no rotation.
    const before = indexAtPointer(segments, -89);

    // Act
    const { segments: result, rotationDelta } = resizeAtBoundary(segments, 2, 30);

    // Assert: the same screen angle still points at the same slice
    expect(indexAtPointer(result, -89 + rotationDelta)).toBe(before);
  });

  test('respects the minimum weight at both ends of the wrap', () => {
    const pair = [seg('a', 2), seg('b', 1), seg('c', 2)];
    expect(resizeAtBoundary(pair, 2, 143).segments[0].weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
    expect(resizeAtBoundary(pair, 2, 217).segments[2].weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
  });
});

describe('resizeAtBoundary, pointer dragged outside the pair', () => {
  const segments = [seg('a', 1), seg('b', 2), seg('c', 1)];

  test('snaps to the near end instead of jumping across the wheel', () => {
    // Arrange: the a|b border sits at 90deg; 80deg is just short of it.
    // Act: aim far behind the pair start, at 350deg
    const { segments: result } = resizeAtBoundary(segments, 0, 350);

    // Assert: slice a collapses to the minimum rather than swallowing b
    expect(result[0].weight).toBe(MIN_WEIGHT);
    expect(result[1].weight).toBeGreaterThan(segments[1].weight);
  });

  test('holding the pointer off the wrap pair does not keep turning the wheel', () => {
    // Arrange: replay a drag the way the wheel does, with a fixed pointer
    // far outside the wrap pair — this is the runaway-spin regression.
    const pointerOnScreen = 150;
    let current: readonly Segment[] = segments;
    let rotation = 0;
    const deltas: number[] = [];

    // Act
    for (let move = 0; move < 6; move += 1) {
      const local = ((pointerOnScreen - rotation) % 360 + 360) % 360;
      const step = resizeAtBoundary(current, current.length - 1, local);
      current = step.segments;
      rotation += step.rotationDelta;
      deltas.push(step.rotationDelta);
    }

    // Assert: the wheel settles instead of ratcheting round on every move
    expect(Math.abs(deltas[deltas.length - 1])).toBeLessThan(0.01);
    expect(Math.abs(rotation)).toBeLessThan(360);
  });

  test('a drag that stays put reports no further turn', () => {
    const first = resizeAtBoundary(segments, segments.length - 1, 30);
    const rotation = first.rotationDelta;
    const second = resizeAtBoundary(first.segments, segments.length - 1, 30 - rotation);
    expect(Math.abs(second.rotationDelta)).toBeLessThan(0.01);
  });
});

describe('resizeAtBoundary, rejected input', () => {
  test('returns the original list for a border that does not exist', () => {
    const segments = [seg('a', 1), seg('b', 1)];
    expect(resizeAtBoundary(segments, 2, 100).segments).toBe(segments);
    expect(resizeAtBoundary(segments, -1, 100).segments).toBe(segments);
  });

  test('a single-slice wheel has no border to drag', () => {
    const single = [seg('a', 1)];
    expect(resizeAtBoundary(single, 0, 100).segments).toBe(single);
  });
});
