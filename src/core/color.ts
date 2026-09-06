export const INK_DARK = '#241a08';
export const INK_LIGHT = '#fffaf2';

const HEX_COLOR = /^#([0-9a-f]{6})$/i;
/** Relative luminance above which dark text stays readable. */
const LUMINANCE_THRESHOLD = 0.58;

/** Picks the label colour with the better contrast on `background`. */
export function readableTextColor(background: string): string {
  const match = HEX_COLOR.exec(background);
  if (!match) return INK_LIGHT;

  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > LUMINANCE_THRESHOLD ? INK_DARK : INK_LIGHT;
}
