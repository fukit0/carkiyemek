import { describe, expect, test } from 'vitest';
import { layoutLabels } from '../labelLayout.ts';
import { buildGeometry } from '../wheel.ts';
import type { Segment } from '../types.ts';

const seg = (id: string, weight: number): Segment => ({
  id,
  label: id,
  weight,
  color: '#000',
});

const levelsOf = (segments: readonly Segment[]) =>
  layoutLabels(buildGeometry(segments)).map((placement) => placement.level);

describe('layoutLabels', () => {
  test('keeps every label on the inner ring when the slices are roomy', () => {
    expect(levelsOf([seg('a', 1), seg('b', 1), seg('c', 1), seg('d', 1)])).toEqual([0, 0, 0, 0]);
  });

  test('alternates rings through a run of thin slices', () => {
    // Arrange: four slivers of 3.6deg each between two wide slices
    const segments = [
      seg('wide', 46),
      seg('t1', 1),
      seg('t2', 1),
      seg('t3', 1),
      seg('t4', 1),
      seg('rest', 50),
    ];

    // Act
    const levels = levelsOf(segments);

    // Assert: no two neighbouring slivers share a ring
    for (let i = 2; i < 5; i += 1) expect(levels[i]).not.toBe(levels[i - 1]);
  });

  test('separates the first and last labels when they crowd across the top', () => {
    const levels = levelsOf([seg('a', 1), seg('wide', 60), seg('b', 1)]);
    expect(levels[0]).not.toBe(levels[levels.length - 1]);
  });

  test('handles an empty wheel and a single slice', () => {
    expect(layoutLabels([])).toEqual([]);
    expect(levelsOf([seg('only', 1)])).toEqual([0]);
  });
});
