import { useRef } from 'react';
import { readableTextColor } from '../core/color.ts';
import { slicePath } from '../core/svgPath.ts';
import type { Segment } from '../core/types.ts';
import { buildGeometry } from '../core/wheel.ts';
import { useBoundaryDrag } from '../hooks/useBoundaryDrag.ts';

const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 186;
const HANDLE_RADIUS = RADIUS - 2;
/** Slices thinner than this keep their label in the list only. */
const MIN_LABEL_SHARE = 0.035;
const LABEL_INSET = 22;

type WheelProps = {
  readonly segments: readonly Segment[];
  readonly rotation: number;
  readonly isSpinning: boolean;
  readonly winnerId: string | null;
  readonly onResizeBoundary: (boundaryIndex: number, angle: number) => void;
  readonly onSpin: () => void;
};

export function Wheel({
  segments,
  rotation,
  isSpinning,
  winnerId,
  onResizeBoundary,
  onSpin,
}: WheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const geometry = buildGeometry(segments);
  const { draggingIndex, handlePointerDown, handlePointerMove, handlePointerUp } =
    useBoundaryDrag({ svgRef, rotation, disabled: isSpinning, onResize: onResizeBoundary });

  return (
    <div className="wheel">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={isSpinning ? 'wheel__svg is-spinning' : 'wheel__svg'}
        role="img"
        aria-label={`Yemek çarkı: ${segments.map((s) => s.label).join(', ')}`}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} className="wheel__rim" />

        <g transform={`rotate(${rotation} ${CENTER} ${CENTER})`}>
          {geometry.map((slice) => {
            const segment = segments[slice.index];
            // Flip on the on-screen angle so every label stays readable wherever the wheel stops.
            const screenAngle = (((slice.midAngle + rotation) % 360) + 360) % 360;
            const isFlipped = screenAngle > 180;
            const labelX = isFlipped ? CENTER - (RADIUS - LABEL_INSET) : CENTER + (RADIUS - LABEL_INSET);
            return (
              <g key={segment.id}>
                <path
                  d={slicePath(CENTER, CENTER, RADIUS, slice.startAngle, slice.endAngle)}
                  fill={segment.color}
                  className={segment.id === winnerId ? 'wheel__slice is-winner' : 'wheel__slice'}
                />
                {slice.share >= MIN_LABEL_SHARE && (
                  <text
                    className="wheel__label"
                    x={labelX}
                    y={CENTER}
                    fill={readableTextColor(segment.color)}
                    textAnchor={isFlipped ? 'start' : 'end'}
                    dominantBaseline="middle"
                    transform={`rotate(${isFlipped ? slice.midAngle + 90 : slice.midAngle - 90} ${CENTER} ${CENTER})`}
                  >
                    {segment.label}
                  </text>
                )}
              </g>
            );
          })}

          {segments.length > 1 &&
            geometry.map((slice) => (
            <g
              key={`handle-${segments[slice.index].id}`}
              className={
                draggingIndex === slice.index ? 'wheel__handle is-dragging' : 'wheel__handle'
              }
              transform={`rotate(${slice.endAngle} ${CENTER} ${CENTER})`}
              onPointerDown={handlePointerDown(slice.index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              role="separator"
              aria-label={`${segments[slice.index].label} ile ${segments[(slice.index + 1) % segments.length].label} arasındaki sınır`}
            >
              <circle cx={CENTER} cy={CENTER - HANDLE_RADIUS} r={16} className="wheel__handle-hit" />
              <circle cx={CENTER} cy={CENTER - HANDLE_RADIUS} r={7} className="wheel__handle-dot" />
            </g>
            ))}
        </g>

        <path className="wheel__pointer" d="M 178 -6 L 222 -6 L 200 48 Z" />
      </svg>

      <button
        type="button"
        className="wheel__spin"
        onClick={onSpin}
        disabled={isSpinning || segments.length === 0}
      >
        {isSpinning ? '…' : 'ÇEVİR'}
      </button>
    </div>
  );
}
