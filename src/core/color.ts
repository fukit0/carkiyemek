const HEX_COLOR = /^#([0-9a-f]{6})$/i;
/** Labels sit on the dark panel, so a slice colour has to clear this to stay readable. */
const MIN_LUMINANCE = 0.55;
const FALLBACK = '#f6ece0';

function luminanceOf(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function toHex(channel: number): string {
  return Math.round(channel).toString(16).padStart(2, '0');
}

/**
 * The slice colour itself when it is light enough, otherwise the same hue
 * blended towards white just far enough to be legible on the dark panel.
 */
export function labelColorOnDark(color: string): string {
  const match = HEX_COLOR.exec(color);
  if (!match) return FALLBACK;

  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
  const luminance = luminanceOf(channels[0], channels[1], channels[2]);
  if (luminance >= MIN_LUMINANCE) return color;

  // Luminance is linear in the channels, so this mix lands exactly on the floor.
  const mix = (MIN_LUMINANCE - luminance) / (1 - luminance);
  return `#${channels.map((channel) => toHex(channel + (255 - channel) * mix)).join('')}`;
}
