export type Point = { readonly x: number; readonly y: number };

const DEG_TO_RAD = Math.PI / 180;
/** Below this span an arc is treated as a full circle. */
const FULL_CIRCLE_EPSILON = 0.01;

/** 0deg is 12 o'clock and angles grow clockwise, matching the wheel geometry. */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): Point {
  const radians = (angle - 90) * DEG_TO_RAD;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function arcTo(cx: number, cy: number, radius: number, angle: number, largeArc: 0 | 1): string {
  const point = polarToCartesian(cx, cy, radius, angle);
  return `A ${radius} ${radius} 0 ${largeArc} 1 ${round(point.x)} ${round(point.y)}`;
}

/** Pie wedge from `startAngle` to `endAngle`, closed back to the centre. */
export function slicePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const span = endAngle - startAngle;
  const start = polarToCartesian(cx, cy, radius, startAngle);

  if (span >= 360 - FULL_CIRCLE_EPSILON) {
    // A single arc cannot close a full circle, so sweep it in two halves.
    return [
      `M ${round(start.x)} ${round(start.y)}`,
      arcTo(cx, cy, radius, startAngle + 180, 1),
      arcTo(cx, cy, radius, startAngle + 359.999, 1),
      'Z',
    ].join(' ');
  }

  const largeArc: 0 | 1 = span > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${round(start.x)} ${round(start.y)}`,
    arcTo(cx, cy, radius, endAngle, largeArc),
    'Z',
  ].join(' ');
}
