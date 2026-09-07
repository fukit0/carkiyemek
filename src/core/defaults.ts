import type { Segment } from './types.ts';

export const MIN_WEIGHT = 0.1;
export const MAX_WEIGHT = 100;
export const WEIGHT_STEP = 0.1;
export const DEFAULT_WEIGHT = 1;
export const MAX_SEGMENTS = 40;
export const MAX_LABEL_LENGTH = 40;

/** Warm, high-contrast palette; consecutive entries stay visually distinct. */
export const PALETTE = [
  '#e2574c',
  '#f2a03d',
  '#e8c547',
  '#7fb069',
  '#3fa7a0',
  '#4f83cc',
  '#8a6bbf',
  '#d3628f',
  '#b4794a',
  '#5c8a72',
] as const;

export function paletteColor(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

const DEFAULT_MENU: ReadonlyArray<readonly [string, number]> = [
  ['Esnaf lokantası', 3],
  ['Döner', 2],
  ['Pide', 1.5],
  ['Izgara köfte', 1.5],
  ['Salata / bowl', 1],
  ['Çorba + tost', 1],
  ['Burger', 0.5],
];

export const DEFAULT_SEGMENTS: readonly Segment[] = DEFAULT_MENU.map(
  ([label, weight], index) => ({
    id: `default-${index}`,
    label,
    weight,
    color: paletteColor(index),
  }),
);
