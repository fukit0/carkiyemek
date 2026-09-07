import type { RateLimiter, StoredWheel, WheelStore } from './types';

/** Process-local store used by `npm run dev`; never used on Vercel. */
export function createMemoryStore(): WheelStore {
  const wheels = new Map<string, StoredWheel>();

  return {
    async create(wheel) {
      if (wheels.has(wheel.id)) return false;
      wheels.set(wheel.id, wheel);
      return true;
    },
    async read(id) {
      return wheels.get(id) ?? null;
    },
    async write(wheel) {
      wheels.set(wheel.id, wheel);
    },
  };
}

export function createMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, { count: number; expiresAt: number }>();

  return {
    async hit(key, windowSeconds) {
      const current = hits.get(key);
      if (!current || current.expiresAt <= now()) {
        hits.set(key, { count: 1, expiresAt: now() + windowSeconds * 1000 });
        return 1;
      }
      current.count += 1;
      return current.count;
    },
  };
}
