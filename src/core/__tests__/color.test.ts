import { describe, expect, test } from 'vitest';
import { readableTextColor } from '../color.ts';

describe('readableTextColor', () => {
  test('uses dark ink on light fills', () => {
    expect(readableTextColor('#e8c547')).toBe('#241a08');
    expect(readableTextColor('#ffffff')).toBe('#241a08');
  });

  test('uses light ink on dark fills', () => {
    expect(readableTextColor('#000000')).toBe('#fffaf2');
    expect(readableTextColor('#4f83cc')).toBe('#fffaf2');
  });

  test('falls back to light ink for malformed colors', () => {
    expect(readableTextColor('nope')).toBe('#fffaf2');
  });
});
