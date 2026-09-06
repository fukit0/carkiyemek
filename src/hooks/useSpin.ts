import { useCallback, useEffect, useRef, useState } from 'react';
import type { Segment } from '../core/types';
import { indexAtPointer, pickWeightedIndex, rotationToLandOn } from '../core/wheel';

const SPIN_DURATION_MS = 5200;
const MIN_FULL_TURNS = 5;
const EXTRA_TURN_SPREAD = 2;

function easeOutQuart(progress: number): number {
  return 1 - Math.pow(1 - progress, 4);
}

type SpinOptions = {
  readonly segments: readonly Segment[];
  readonly onTick: () => void;
  readonly onFinish: (segment: Segment) => void;
};

export function useSpin({ segments, onTick, onFinish }: SpinOptions) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const spin = useCallback(() => {
    if (isSpinning || segments.length === 0) return;

    const winnerIndex = pickWeightedIndex(segments);
    if (winnerIndex < 0) return;

    const turns = MIN_FULL_TURNS + Math.floor(Math.random() * EXTRA_TURN_SPREAD);
    const from = rotation;
    const to = rotationToLandOn(segments, winnerIndex, from, turns, Math.random());
    const startedAt = performance.now();
    let lastIndex = indexAtPointer(segments, from);

    setIsSpinning(true);

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / SPIN_DURATION_MS);
      const current = from + (to - from) * easeOutQuart(progress);
      setRotation(current);

      const currentIndex = indexAtPointer(segments, current);
      if (currentIndex !== lastIndex) {
        lastIndex = currentIndex;
        onTick();
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      frameRef.current = null;
      setRotation(to);
      setIsSpinning(false);
      onFinish(segments[winnerIndex]);
    };

    frameRef.current = requestAnimationFrame(step);
  }, [isSpinning, onFinish, onTick, rotation, segments]);

  return { rotation, isSpinning, spin, setRotation };
}
