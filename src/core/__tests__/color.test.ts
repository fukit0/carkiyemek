import { describe, expect, test } from 'vitest';
import { labelColorOnDark } from '../color.ts';

function luminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

describe('labelColorOnDark', () => {
  test('leaves a colour that is already light alone', () => {
    expect(labelColorOnDark('#e8c547')).toBe('#e8c547');
    expect(labelColorOnDark('#f2a03d')).toBe('#f2a03d');
  });

  test('lifts a dark colour to the readable floor', () => {
    // Arrange / Act
    const lifted = labelColorOnDark('#000000');

    // Assert
    expect(lifted).not.toBe('#000000');
    expect(luminance(lifted)).toBeGreaterThanOrEqual(0.54);
  });

  test('keeps the hue of a dark colour while lifting it', () => {
    const lifted = labelColorOnDark('#101a6b');
    const value = parseInt(lifted.slice(1), 16);
    const blue = value & 0xff;
    const red = (value >> 16) & 0xff;
    expect(blue).toBeGreaterThan(red);
    expect(luminance(lifted)).toBeGreaterThanOrEqual(0.54);
  });

  test('falls back to plain ink for a malformed colour', () => {
    expect(labelColorOnDark('nope')).toBe('#f6ece0');
  });
});
