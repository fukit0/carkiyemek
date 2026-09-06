import type { Segment, SliceGeometry } from './types';

const FULL_TURN = 360;
/** Share of a slice kept free at each edge so the pointer never lands on a border. */
const EDGE_PADDING_RATIO = 0.15;

export function totalWeight(segments: readonly Segment[]): number {
  return segments.reduce((sum, segment) => sum + Math.max(0, segment.weight), 0);
}

/** Lays the segments out around the circle: 0deg is 12 o'clock, angles grow clockwise. */
export function buildGeometry(segments: readonly Segment[]): SliceGeometry[] {
  const total = totalWeight(segments);
  if (segments.length === 0 || total <= 0) return [];

  let cursor = 0;
  return segments.map((segment, index) => {
    const share = Math.max(0, segment.weight) / total;
    const startAngle = cursor;
    const isLast = index === segments.length - 1;
    // Snap the last slice to 360 so rounding never leaves a hairline gap.
    const endAngle = isLast ? FULL_TURN : startAngle + share * FULL_TURN;
    cursor = endAngle;
    return {
      index,
      startAngle,
      endAngle,
      midAngle: (startAngle + endAngle) / 2,
      share,
    };
  });
}

/** Picks a winner honouring the weights. `random` must return a value in [0, 1]. */
export function pickWeightedIndex(
  segments: readonly Segment[],
  random: () => number = Math.random,
): number {
  const total = totalWeight(segments);
  if (segments.length === 0 || total <= 0) return -1;

  let threshold = random() * total;
  for (let index = 0; index < segments.length; index += 1) {
    threshold -= Math.max(0, segments[index].weight);
    if (threshold < 0) return index;
  }
  return segments.length - 1;
}

/** Angle of the wheel currently sitting under the fixed pointer at 12 o'clock. */
function pointerAngle(rotation: number): number {
  return (FULL_TURN - (rotation % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/** Which slice the pointer is on for a given wheel rotation. -1 when the wheel is empty. */
export function indexAtPointer(segments: readonly Segment[], rotation: number): number {
  const geometry = buildGeometry(segments);
  if (geometry.length === 0) return -1;

  const angle = pointerAngle(rotation);
  const hit = geometry.find((slice) => angle < slice.endAngle);
  return hit ? hit.index : geometry.length - 1;
}

/**
 * Absolute rotation the wheel must animate to so the pointer lands inside `index`,
 * after at least `turns` extra full turns. `jitter` in [0, 1) picks where inside the slice.
 */
export function rotationToLandOn(
  segments: readonly Segment[],
  index: number,
  currentRotation: number,
  turns: number,
  jitter: number,
): number {
  const geometry = buildGeometry(segments);
  const slice = geometry[index];
  if (!slice) return currentRotation;

  const span = slice.endAngle - slice.startAngle;
  const padding = span * EDGE_PADDING_RATIO;
  const target = slice.startAngle + padding + jitter * (span - 2 * padding);

  const base = currentRotation + turns * FULL_TURN;
  const desired = (FULL_TURN - target) % FULL_TURN;
  const delta = ((desired - (base % FULL_TURN)) % FULL_TURN + FULL_TURN) % FULL_TURN;
  return base + delta;
}
