import { Redis } from '@upstash/redis';
import type { RateLimiter, StoredWheel, WheelStore } from './types.ts';

const KEY_PREFIX = 'wheel:';
const RATE_PREFIX = 'rate:';
/** Untouched wheels fall out of the store after half a year. */
const WHEEL_TTL_SECONDS = 60 * 60 * 24 * 180;

export type RedisConfig = { readonly url: string; readonly token: string };

/** Marketplace integrations prefix these names (e.g. STORAGE_KV_REST_API_URL). */
const REST_URL_SUFFIXES = ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL'] as const;
const STORAGE_ENV_HINT = /(KV|UPSTASH|REDIS)/;

/**
 * Finds the REST credentials whatever prefix the integration chose: a key is
 * usable only when its matching token exists under the same prefix.
 */
export function readRedisConfig(env: Record<string, string | undefined>): RedisConfig | null {
  for (const urlSuffix of REST_URL_SUFFIXES) {
    const tokenSuffix = urlSuffix.replace('_URL', '_TOKEN');
    for (const [key, url] of Object.entries(env)) {
      if (!url || !key.endsWith(urlSuffix)) continue;
      const token = env[key.slice(0, key.length - urlSuffix.length) + tokenSuffix];
      if (token) return { url, token };
    }
  }
  return null;
}

/** Names only, never values: tells whether a store was wired under other names. */
export function listStorageEnvNames(env: Record<string, string | undefined>): string[] {
  return Object.keys(env).filter((key) => STORAGE_ENV_HINT.test(key)).sort().slice(0, 20);
}

export function createRedisStore(config: RedisConfig): WheelStore {
  const redis = new Redis(config);

  return {
    async create(wheel) {
      const result = await redis.set(KEY_PREFIX + wheel.id, wheel, {
        nx: true,
        ex: WHEEL_TTL_SECONDS,
      });
      return result === 'OK';
    },
    async read(id) {
      return (await redis.get<StoredWheel>(KEY_PREFIX + id)) ?? null;
    },
    async write(wheel) {
      await redis.set(KEY_PREFIX + wheel.id, wheel, { ex: WHEEL_TTL_SECONDS });
    },
  };
}

export function createRedisRateLimiter(config: RedisConfig): RateLimiter {
  const redis = new Redis(config);

  return {
    async hit(key, windowSeconds) {
      const redisKey = RATE_PREFIX + key;
      const count = await redis.incr(redisKey);
      // Only the first hit of a window needs an expiry.
      if (count === 1) await redis.expire(redisKey, windowSeconds);
      return count;
    },
  };
}
