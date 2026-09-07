import { sanitizeSegments } from './menu.ts';
import type { Segment } from './types.ts';
import { isValidWheelId } from './wheelId.ts';

const ENDPOINT = '/api/wheel';

export type RemoteWheel = {
  readonly id: string;
  readonly segments: readonly Segment[];
  readonly version: number;
};

export type ApiFailure = {
  readonly kind: 'not_found' | 'unconfigured' | 'offline' | 'rate_limited' | 'error';
  readonly message: string;
};

export type ApiResult =
  | { readonly ok: true; readonly wheel: RemoteWheel }
  | { readonly ok: false; readonly failure: ApiFailure };

const MESSAGES: Record<ApiFailure['kind'], string> = {
  not_found: 'Bu çark bulunamadı; bağlantı yanlış olabilir ya da süresi dolmuş olabilir.',
  unconfigured: 'Ortak çark deposu bu sunucuda bağlı değil.',
  offline: 'Sunucuya ulaşılamadı; değişiklikler şimdilik sadece bu cihazda.',
  rate_limited: 'Çok sık değişiklik yapıldı, birazdan tekrar denenecek.',
  error: 'Beklenmeyen bir sunucu hatası oluştu.',
};

function fail(kind: ApiFailure['kind'], message?: string): ApiResult {
  return { ok: false, failure: { kind, message: message ?? MESSAGES[kind] } };
}

function kindForStatus(status: number): ApiFailure['kind'] {
  if (status === 404) return 'not_found';
  if (status === 503) return 'unconfigured';
  if (status === 429) return 'rate_limited';
  return 'error';
}

/** The server is still an external boundary, so its payload is validated too. */
function readWheel(payload: unknown): RemoteWheel | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { id, version, segments } = payload as Record<string, unknown>;
  if (!isValidWheelId(id) || typeof version !== 'number') return null;
  const clean = sanitizeSegments(segments);
  return clean ? { id, version, segments: clean } : null;
}

async function call(url: string, init?: RequestInit): Promise<ApiResult> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    return fail('offline');
  }

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    const body = await response.json().catch(() => null);
    const detail = (body as { message?: unknown } | null)?.message;
    return fail(kind, typeof detail === 'string' ? detail : undefined);
  }

  const wheel = readWheel(await response.json().catch(() => null));
  return wheel ? { ok: true, wheel } : fail('error', 'Sunucudan beklenmeyen bir yanıt geldi.');
}

function writeInit(method: 'POST' | 'PUT', segments: readonly Segment[]): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ segments }),
    // Lets a save started right before the tab closes still reach the server.
    keepalive: true,
  };
}

export function createRemoteWheel(segments: readonly Segment[]): Promise<ApiResult> {
  return call(ENDPOINT, writeInit('POST', segments));
}

export function fetchRemoteWheel(id: string): Promise<ApiResult> {
  return call(`${ENDPOINT}?id=${encodeURIComponent(id)}`);
}

export function saveRemoteWheel(id: string, segments: readonly Segment[]): Promise<ApiResult> {
  return call(`${ENDPOINT}?id=${encodeURIComponent(id)}`, writeInit('PUT', segments));
}
