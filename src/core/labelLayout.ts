import type { SliceGeometry } from './types.ts';

/** Two rings are enough to untangle a run of thin slices without a thicket. */
export const LABEL_LEVELS = 2;
const MIN_GAP_DEGREES = 13;

export type LabelPlacement = {
  readonly index: number;
  /** 0 sits next to the rim; each level further out clears a crowded neighbour. */
  readonly level: number;
};

/**
 * Pushes a label one ring further out whenever its slice is too thin to keep
 * clear of the previous one, so thin slices keep a readable name.
 */
export function layoutLabels(
  geometry: readonly SliceGeometry[],
  minGapDegrees: number = MIN_GAP_DEGREES,
): LabelPlacement[] {
  const placements: LabelPlacement[] = [];
  let previousAngle: number | null = null;
  let previousLevel = 0;

  for (const slice of geometry) {
    const isCrowded = previousAngle !== null && slice.midAngle - previousAngle < minGapDegrees;
    const level = isCrowded ? (previousLevel + 1) % LABEL_LEVELS : 0;
    placements.push({ index: slice.index, level });
    previousAngle = slice.midAngle;
    previousLevel = level;
  }

  return separateWrapNeighbours(placements, geometry, minGapDegrees);
}

/** The first and last labels are neighbours too, across the top of the wheel. */
function separateWrapNeighbours(
  placements: LabelPlacement[],
  geometry: readonly SliceGeometry[],
  minGapDegrees: number,
): LabelPlacement[] {
  const last = placements.length - 1;
  if (last < 1) return placements;

  const gap = 360 - geometry[last].midAngle + geometry[0].midAngle;
  if (gap >= minGapDegrees || placements[last].level !== placements[0].level) return placements;

  return placements.map((placement, index) =>
    index === last ? { ...placement, level: (placement.level + 1) % LABEL_LEVELS } : placement,
  );
}
