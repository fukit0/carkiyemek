import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

const FULL_TURN = 360;

/** Angle of a screen point around the wheel centre: 0 at 12 o'clock, growing clockwise. */
function screenAngle(element: SVGSVGElement, clientX: number, clientY: number): number {
  const rect = element.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (degrees + FULL_TURN) % FULL_TURN;
}

type DragOptions = {
  readonly svgRef: RefObject<SVGSVGElement | null>;
  readonly rotation: number;
  readonly disabled: boolean;
  readonly onResize: (boundaryIndex: number, angle: number) => void;
};

export function useBoundaryDrag({ svgRef, rotation, disabled, onResize }: DragOptions) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);

  const toWheelAngle = useCallback(
    (clientX: number, clientY: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      // Undo the wheel's own rotation so the angle is expressed in slice coordinates.
      const local = screenAngle(svg, clientX, clientY) - (rotation % FULL_TURN);
      return (local + FULL_TURN) % FULL_TURN;
    },
    [rotation, svgRef],
  );

  const handlePointerDown = useCallback(
    (boundaryIndex: number) => (event: ReactPointerEvent<SVGElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      activeIndexRef.current = boundaryIndex;
      setDraggingIndex(boundaryIndex);
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGElement>) => {
      const boundaryIndex = activeIndexRef.current;
      if (boundaryIndex === null) return;
      const angle = toWheelAngle(event.clientX, event.clientY);
      if (angle === null) return;
      onResize(boundaryIndex, angle);
    },
    [onResize, toWheelAngle],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<SVGElement>) => {
    if (activeIndexRef.current === null) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    activeIndexRef.current = null;
    setDraggingIndex(null);
  }, []);

  return { draggingIndex, handlePointerDown, handlePointerMove, handlePointerUp };
}
