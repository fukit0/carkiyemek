import { Redis } from '@upstash/redis';
import type { RateLimiter, StoredWheel, WheelStore } from './types';

const KEY_PREFIX = 'wheel:';
const RATE_PREFIX = 'rate:';
/** Untouched wheels fall out of the store after half a year. */
const WHEEL_TTL_SECONDS = 60 * 60 * 24 * 180;

export type RedisConfig = { readonly url: string; readonly token: string };

/**
 * Vercel's Upstash integration injects KV_REST_API_*; a manually created
 * Upstash database exposes UPSTASH_REDIS_REST_*. Accept either.
 */
export function readRedisConfig(env: Record<string, string | undefined>): RedisConfig | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
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
