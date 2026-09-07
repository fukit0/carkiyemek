import { MIN_WEIGHT } from './defaults.ts';
import { clampWeight } from './menu.ts';
import type { Segment } from './types.ts';
import { buildGeometry, totalWeight } from './wheel.ts';

const FULL_TURN = 360;

export type ResizeResult = {
  readonly segments: readonly Segment[];
  /**
   * Degrees the wheel must also turn. Only the wrap-around border needs this:
   * that border is pinned at 0deg by the layout, so turning the wheel by the
   * same amount is what makes it follow the pointer while the other borders
   * stay exactly where they are.
   */
  readonly rotationDelta: number;
};

type Pair = {
  readonly leftIndex: number;
  readonly rightIndex: number;
  /** Where the pair's combined arc starts, in wheel-local degrees. */
  readonly spanStart: number;
  readonly spanLength: number;
  /** Position of the current border inside that arc. */
  readonly borderOffset: number;
};

function describePair(
  segments: readonly Segment[],
  boundaryIndex: number,
): Pair | null {
  const geometry = buildGeometry(segments);
  const isWrap = boundaryIndex === segments.length - 1;
  const rightIndex = isWrap ? 0 : boundaryIndex + 1;
  const left = geometry[boundaryIndex];
  const right = geometry[rightIndex];
  if (!left || !right || left === right) return null;

  if (!isWrap) {
    return {
      leftIndex: boundaryIndex,
      rightIndex,
      spanStart: left.startAngle,
      spanLength: right.endAngle - left.startAngle,
      borderOffset: left.endAngle - left.startAngle,
    };
  }

  // The last slice runs up to 360deg and the first one continues from 0deg.
  const headLength = FULL_TURN - left.startAngle;
  return {
    leftIndex: boundaryIndex,
    rightIndex,
    spanStart: left.startAngle,
    spanLength: headLength + right.endAngle,
    borderOffset: headLength,
  };
}

/** Distance from the pair's start to `angle`, walking clockwise. */
function offsetInPair(pair: Pair, angle: number): number {
  return ((angle - pair.spanStart) % FULL_TURN + FULL_TURN) % FULL_TURN;
}

/**
 * Moves the border between two neighbouring slices to `angle`, trading weight
 * between them so the rest of the wheel is untouched.
 */
export function resizeAtBoundary(
  segments: readonly Segment[],
  boundaryIndex: number,
  angle: number,
): ResizeResult {
  const unchanged: ResizeResult = { segments, rotationDelta: 0 };
  if (boundaryIndex < 0 || segments.length < 2) return unchanged;

  const pair = describePair(segments, boundaryIndex);
  const total = totalWeight(segments);
  if (!pair || total <= 0) return unchanged;

  const minAngle = (MIN_WEIGHT / total) * FULL_TURN;
  const offset = Math.min(
    pair.spanLength - minAngle,
    Math.max(minAngle, offsetInPair(pair, angle)),
  );

  const left = segments[pair.leftIndex];
  const right = segments[pair.rightIndex];
  const pairWeight = left.weight + right.weight;
  const leftWeight = clampWeight((pairWeight * offset) / pair.spanLength);
  const rightWeight = clampWeight(pairWeight - leftWeight);

  const resized = segments.map((segment, index) => {
    if (index === pair.leftIndex) return { ...segment, weight: leftWeight };
    if (index === pair.rightIndex) return { ...segment, weight: rightWeight };
    return segment;
  });

  const isWrap = pair.rightIndex === 0;
  return { segments: resized, rotationDelta: isWrap ? offset - pair.borderOffset : 0 };
}
