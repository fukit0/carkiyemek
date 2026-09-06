import { describe, expect, test } from 'vitest';
import { DEFAULT_SEGMENTS, MAX_WEIGHT, MIN_WEIGHT } from '../defaults';
import { decodeMenu, encodeMenu, sanitizeSegments } from '../menu';

describe('encodeMenu / decodeMenu', () => {
  test('round-trips a menu including Turkish characters', () => {
    // Arrange
    const segments = DEFAULT_SEGMENTS;

    // Act
    const decoded = decodeMenu(encodeMenu(segments));

    // Assert
    expect(decoded).not.toBeNull();
    expect(decoded!.map((s) => s.label)).toEqual(segments.map((s) => s.label));
    expect(decoded!.map((s) => s.weight)).toEqual(segments.map((s) => s.weight));
  });

  test('gives every decoded segment a unique id', () => {
    const decoded = decodeMenu(encodeMenu(DEFAULT_SEGMENTS))!;
    expect(new Set(decoded.map((s) => s.id)).size).toBe(decoded.length);
  });

  test('returns null for garbage input instead of throwing', () => {
    expect(decodeMenu('')).toBeNull();
    expect(decodeMenu('not-base64-!!!')).toBeNull();
    expect(decodeMenu(btoa('{"nope":true}'))).toBeNull();
  });
});

describe('sanitizeSegments', () => {
  test('rejects non-array input', () => {
    expect(sanitizeSegments(null)).toBeNull();
    expect(sanitizeSegments({ label: 'Pide' })).toBeNull();
    expect(sanitizeSegments([])).toBeNull();
  });

  test('drops entries without a usable label', () => {
    const result = sanitizeSegments([
      { label: '   ', weight: 1, color: '#ff0000' },
      { label: 'Pide', weight: 1, color: '#ff0000' },
    ]);
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe('Pide');
  });

  test('clamps weights into the allowed range', () => {
    const result = sanitizeSegments([
      { label: 'A', weight: 0, color: '#ff0000' },
      { label: 'B', weight: 9999, color: '#ff0000' },
      { label: 'C', weight: 'abc', color: '#ff0000' },
    ])!;
    expect(result[0].weight).toBe(MIN_WEIGHT);
    expect(result[1].weight).toBe(MAX_WEIGHT);
    expect(result[2].weight).toBe(1);
  });

  test('replaces unsafe colors with a palette color', () => {
    const result = sanitizeSegments([
      { label: 'A', weight: 1, color: 'javascript:alert(1)' },
    ])!;
    expect(result[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test('truncates absurdly long labels', () => {
    const result = sanitizeSegments([{ label: 'x'.repeat(500), weight: 1, color: '#fff000' }])!;
    expect(result[0].label.length).toBeLessThanOrEqual(40);
  });

  test('caps the number of segments', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      label: `A${i}`,
      weight: 1,
      color: '#ff0000',
    }));
    expect(sanitizeSegments(many)!.length).toBeLessThanOrEqual(40);
  });
});
