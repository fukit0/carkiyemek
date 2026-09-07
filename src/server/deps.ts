import type { HandlerDeps } from './handlers.ts';
import { createMemoryRateLimiter, createMemoryStore } from './memoryStore.ts';
import { createRedisRateLimiter, createRedisStore, readRedisConfig } from './redisStore.ts';

const MEMORY_STORE_FLAG = 'CARKIYEMEK_MEMORY_STORE';

let cached: HandlerDeps | null | undefined;

/**
 * Redis when the Marketplace integration is connected; an in-memory store only
 * when explicitly opted in (local dev). Returns null instead of silently losing
 * data when neither is available.
 */
export function resolveDeps(env: NodeJS.ProcessEnv = process.env): HandlerDeps | null {
  if (cached !== undefined) return cached;

  const config = readRedisConfig(env);
  if (config) {
    cached = {
      store: createRedisStore(config),
      limiter: createRedisRateLimiter(config),
      now: () => new Date(),
    };
  } else if (env[MEMORY_STORE_FLAG] === '1') {
    console.warn('Redis yapılandırılmadı; bellek içi depo kullanılıyor (kalıcı değil).');
    cached = {
      store: createMemoryStore(),
      limiter: createMemoryRateLimiter(),
      now: () => new Date(),
    };
  } else {
    cached = null;
  }
  return cached;
}
