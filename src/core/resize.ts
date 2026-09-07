import { MIN_WEIGHT } from './defaults.ts';
import { clampWeight } from './menu.ts';
import type { Segment } from './types.ts';
import { buildGeometry, totalWeight } from './wheel.ts';

/**
 * Moves the border between slice `boundaryIndex` and its neighbour to `angle`,
 * trading weight between the two so the rest of the wheel is untouched.
 */
export function resizeAtBoundary(
  segments: readonly Segment[],
  boundaryIndex: number,
  angle: number,
): readonly Segment[] {
  const left = segments[boundaryIndex];
  const right = segments[boundaryIndex + 1];
  if (boundaryIndex < 0 || !left || !right) return segments;

  const geometry = buildGeometry(segments);
  const total = totalWeight(segments);
  if (geometry.length === 0 || total <= 0) return segments;

  const spanStart = geometry[boundaryIndex].startAngle;
  const spanEnd = geometry[boundaryIndex + 1].endAngle;
  const minAngle = (MIN_WEIGHT / total) * 360;

  const clampedAngle = Math.min(
    spanEnd - minAngle,
    Math.max(spanStart + minAngle, angle),
  );
  const pairWeight = left.weight + right.weight;
  const ratio = (clampedAngle - spanStart) / (spanEnd - spanStart);

  const leftWeight = clampWeight(pairWeight * ratio);
  const rightWeight = clampWeight(pairWeight - leftWeight);

  return segments.map((segment, index) => {
    if (index === boundaryIndex) return { ...segment, weight: leftWeight };
    if (index === boundaryIndex + 1) return { ...segment, weight: rightWeight };
    return segment;
  });
}
