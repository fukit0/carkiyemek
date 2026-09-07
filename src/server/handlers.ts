import { sanitizeSegments } from '../core/menu';
import type { Segment } from '../core/types';
import { createWheelId, isValidWheelId } from '../core/wheelId';
import type { RateLimiter, StoredWheel, WheelStore } from './types';

const MAX_BODY_BYTES = 32_768;
const RATE_WINDOW_SECONDS = 60;
const MAX_WRITES_PER_WINDOW = 40;
const ID_COLLISION_RETRIES = 4;

export type HandlerDeps = {
  readonly store: WheelStore;
  readonly limiter: RateLimiter;
  readonly now: () => Date;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'bilinmeyen';
}

type ParsedBody =
  | { readonly ok: true; readonly segments: Segment[] }
  | { readonly ok: false; readonly response: Response };

async function readSegments(request: Request): Promise<ParsedBody> {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return { ok: false, response: json({ error: 'payload_too_large' }, 413) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, response: json({ error: 'invalid_json' }, 400) };
  }

  const segments = sanitizeSegments((parsed as { segments?: unknown } | null)?.segments);
  if (!segments) return { ok: false, response: json({ error: 'invalid_segments' }, 400) };
  return { ok: true, segments };
}

async function guardRate(request: Request, deps: HandlerDeps): Promise<Response | null> {
  const hits = await deps.limiter.hit(clientKey(request), RATE_WINDOW_SECONDS);
  if (hits <= MAX_WRITES_PER_WINDOW) return null;
  return json({ error: 'rate_limited', retryAfter: RATE_WINDOW_SECONDS }, 429);
}

async function createWheel(request: Request, deps: HandlerDeps): Promise<Response> {
  const limited = await guardRate(request, deps);
  if (limited) return limited;

  const body = await readSegments(request);
  if (!body.ok) return body.response;

  for (let attempt = 0; attempt < ID_COLLISION_RETRIES; attempt += 1) {
    const wheel: StoredWheel = {
      id: createWheelId(),
      segments: body.segments,
      version: 1,
      updatedAt: deps.now().toISOString(),
    };
    if (await deps.store.create(wheel)) return json(wheel, 201);
  }
  return json({ error: 'id_collision' }, 503);
}

async function readWheel(id: string, deps: HandlerDeps): Promise<Response> {
  const wheel = await deps.store.read(id);
  return wheel ? json(wheel) : json({ error: 'not_found' }, 404);
}

async function updateWheel(id: string, request: Request, deps: HandlerDeps): Promise<Response> {
  const limited = await guardRate(request, deps);
  if (limited) return limited;

  const existing = await deps.store.read(id);
  if (!existing) return json({ error: 'not_found' }, 404);

  const body = await readSegments(request);
  if (!body.ok) return body.response;

  const updated: StoredWheel = {
    id,
    segments: body.segments,
    version: existing.version + 1,
    updatedAt: deps.now().toISOString(),
  };
  await deps.store.write(updated);
  return json(updated);
}

/** Single entry point for /api/wheel, shared by Vercel and the dev server. */
export async function handleWheelRequest(
  request: Request,
  deps: HandlerDeps,
): Promise<Response> {
  try {
    const id = new URL(request.url).searchParams.get('id');

    if (request.method === 'POST') return await createWheel(request, deps);

    if (request.method === 'GET' || request.method === 'PUT') {
      if (!isValidWheelId(id)) return json({ error: 'invalid_id' }, 400);
      return request.method === 'GET'
        ? await readWheel(id, deps)
        : await updateWheel(id, request, deps);
    }

    return json({ error: 'method_not_allowed' }, 405);
  } catch (error) {
    console.error('Çark isteği başarısız:', error);
    return json({ error: 'server_error' }, 500);
  }
}
