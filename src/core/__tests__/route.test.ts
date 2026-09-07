import { describe, expect, test } from 'vitest';
import { readWheelIdFromPath, wheelPath, wheelUrl } from '../route.ts';

describe('readWheelIdFromPath', () => {
  test('reads a valid shared id', () => {
    expect(readWheelIdFromPath('/c/abcdefgh')).toBe('abcdefgh');
    expect(readWheelIdFromPath('/c/abcdefgh/')).toBe('abcdefgh');
  });

  test('returns null for the local-mode routes', () => {
    expect(readWheelIdFromPath('/')).toBeNull();
    expect(readWheelIdFromPath('/index.html')).toBeNull();
  });

  test('returns null for an id that does not fit the format', () => {
    expect(readWheelIdFromPath('/c/NOPE')).toBeNull();
    expect(readWheelIdFromPath('/c/../../etc/passwd')).toBeNull();
    expect(readWheelIdFromPath('/c/')).toBeNull();
  });
});

describe('wheelPath / wheelUrl', () => {
  test('builds the shareable address', () => {
    expect(wheelPath('abcdefgh')).toBe('/c/abcdefgh');
    expect(wheelUrl('https://carkiyemek.app', 'abcdefgh')).toBe(
      'https://carkiyemek.app/c/abcdefgh',
    );
  });
});
