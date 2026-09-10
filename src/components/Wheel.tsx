import { useRef } from 'react';
import { labelColorOnDark } from '../core/color.ts';
import { layoutLabels } from '../core/labelLayout.ts';
import { slicePath } from '../core/svgPath.ts';
import type { Segment } from '../core/types.ts';
import { buildGeometry } from '../core/wheel.ts';
import { useBoundaryDrag } from '../hooks/useBoundaryDrag.ts';

const SIZE = 560;
const CENTER = SIZE / 2;
const RADIUS = 150;
const RIM_WIDTH = 8;
const HANDLE_RADIUS = RADIUS - 2;

/** Labels live outside the rim so a sliver of a slice still shows its name. */
const LABEL_GAP = 12;
const LABEL_LEVEL_STEP = 24;
const TICK_INSET = 5;
const MAX_LABEL_CHARS = 15;

const POINTER_BASE_Y = CENTER - RADIUS - RIM_WIDTH - 12;
const POINTER_TIP_Y = CENTER - RADIUS + 30;
const POINTER_HALF_WIDTH = 21;

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function shorten(label: string): string {
  return label.length > MAX_LABEL_CHARS ? `${label.slice(0, MAX_LABEL_CHARS - 1)}…` : label;
}

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
  const placements = layoutLabels(geometry);
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
        <circle cx={CENTER} cy={CENTER} r={RADIUS + RIM_WIDTH} className="wheel__rim" />

        <g transform={`rotate(${rotation} ${CENTER} ${CENTER})`}>
          {geometry.map((slice) => (
            <path
              key={`slice-${segments[slice.index].id}`}
              d={slicePath(CENTER, CENTER, RADIUS, slice.startAngle, slice.endAngle)}
              fill={segments[slice.index].color}
              className={
                segments[slice.index].id === winnerId ? 'wheel__slice is-winner' : 'wheel__slice'
              }
            />
          ))}

          {geometry.map((slice) => {
            const segment = segments[slice.index];
            // Flip on the on-screen angle so every label reads left to right.
            const isFlipped = normalizeAngle(slice.midAngle + rotation) > 180;
            const direction = isFlipped ? -1 : 1;
            const anchor = RADIUS + LABEL_GAP + placements[slice.index].level * LABEL_LEVEL_STEP;
            return (
              <g
                key={`label-${segment.id}`}
                transform={`rotate(${isFlipped ? slice.midAngle + 90 : slice.midAngle - 90} ${CENTER} ${CENTER})`}
              >
                <line
                  className="wheel__tick"
                  x1={CENTER + direction * (RADIUS + 2)}
                  y1={CENTER}
                  x2={CENTER + direction * (anchor - TICK_INSET)}
                  y2={CENTER}
                  stroke={segment.color}
                />
                <text
                  className={segment.id === winnerId ? 'wheel__label is-winner' : 'wheel__label'}
                  x={CENTER + direction * anchor}
                  y={CENTER}
                  fill={labelColorOnDark(segment.color)}
                  textAnchor={isFlipped ? 'end' : 'start'}
                  dominantBaseline="middle"
                >
                  {shorten(segment.label)}
                  <title>{segment.label}</title>
                </text>
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

        <path
          className="wheel__pointer"
          d={`M ${CENTER - POINTER_HALF_WIDTH} ${POINTER_BASE_Y} L ${CENTER + POINTER_HALF_WIDTH} ${POINTER_BASE_Y} L ${CENTER} ${POINTER_TIP_Y} Z`}
        />
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
