import { beforeEach, describe, expect, test } from 'vitest';
import { handleWheelRequest, type HandlerDeps } from '../handlers.ts';
import { createMemoryRateLimiter, createMemoryStore } from '../memoryStore.ts';
import { createWheelId, isValidWheelId } from '../../core/wheelId.ts';

const BASE = 'https://carkiyemek.test/api/wheel';
const segments = [
  { id: 'a', label: 'Döner', weight: 2, color: '#f2a03d' },
  { id: 'b', label: 'Pide', weight: 1, color: '#e8c547' },
];

let deps: HandlerDeps;

beforeEach(() => {
  deps = {
    store: createMemoryStore(),
    limiter: createMemoryRateLimiter(),
    now: () => new Date('2026-09-07T10:00:00.000Z'),
  };
});

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(BASE, { method: 'POST', body: JSON.stringify(body), headers });
}

describe('ids', () => {
  test('generated ids pass validation and avoid look-alike characters', () => {
    for (let i = 0; i < 50; i += 1) {
      const id = createWheelId();
      expect(isValidWheelId(id)).toBe(true);
      expect(id).not.toMatch(/[01lio]/);
    }
  });

  test('rejects ids of the wrong shape', () => {
    expect(isValidWheelId('short')).toBe(false);
    expect(isValidWheelId('ABCDEFGH')).toBe(false);
    expect(isValidWheelId(42)).toBe(false);
  });
});

describe('POST /api/wheel', () => {
  test('creates a wheel and returns its id', async () => {
    const response = await handleWheelRequest(post({ segments }), deps);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(isValidWheelId(body.id)).toBe(true);
    expect(body.version).toBe(1);
    expect(body.segments.map((s: { label: string }) => s.label)).toEqual(['Döner', 'Pide']);
  });

  test('rejects a body without usable segments', async () => {
    expect((await handleWheelRequest(post({ segments: [] }), deps)).status).toBe(400);
    expect((await handleWheelRequest(post({ nope: 1 }), deps)).status).toBe(400);
  });

  test('rejects malformed JSON', async () => {
    const request = new Request(BASE, { method: 'POST', body: '{oops' });
    expect((await handleWheelRequest(request, deps)).status).toBe(400);
  });

  test('rejects an oversized body', async () => {
    const huge = { segments, padding: 'x'.repeat(40_000) };
    expect((await handleWheelRequest(post(huge), deps)).status).toBe(413);
  });
});

describe('GET /api/wheel', () => {
  test('reads back what was created', async () => {
    const created = await (await handleWheelRequest(post({ segments }), deps)).json();

    const response = await handleWheelRequest(new Request(`${BASE}?id=${created.id}`), deps);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(created.id);
    expect(body.segments).toHaveLength(2);
  });

  test('404s for an unknown wheel and 400s for a malformed id', async () => {
    expect((await handleWheelRequest(new Request(`${BASE}?id=abcdefgh`), deps)).status).toBe(404);
    expect((await handleWheelRequest(new Request(`${BASE}?id=NOPE`), deps)).status).toBe(400);
    expect((await handleWheelRequest(new Request(BASE), deps)).status).toBe(400);
  });
});

describe('PUT /api/wheel', () => {
  test('bumps the version so other clients notice the change', async () => {
    const created = await (await handleWheelRequest(post({ segments }), deps)).json();
    const next = [...segments, { id: 'c', label: 'Suşi', weight: 1, color: '#7fb069' }];

    const response = await handleWheelRequest(
      new Request(`${BASE}?id=${created.id}`, { method: 'PUT', body: JSON.stringify({ segments: next }) }),
      deps,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.version).toBe(2);
    expect(body.segments).toHaveLength(3);
  });

  test('refuses to create a wheel through PUT', async () => {
    const request = new Request(`${BASE}?id=abcdefgh`, {
      method: 'PUT',
      body: JSON.stringify({ segments }),
    });
    expect((await handleWheelRequest(request, deps)).status).toBe(404);
  });
});

describe('guards', () => {
  test('rate limits a single client without touching another', async () => {
    const noisy = { 'x-forwarded-for': '9.9.9.9' };
    let lastStatus = 0;
    for (let i = 0; i < 45; i += 1) {
      lastStatus = (await handleWheelRequest(post({ segments }, noisy), deps)).status;
    }
    expect(lastStatus).toBe(429);

    const other = await handleWheelRequest(post({ segments }, { 'x-forwarded-for': '1.1.1.1' }), deps);
    expect(other.status).toBe(201);
  });

  test('rejects unsupported methods', async () => {
    const response = await handleWheelRequest(new Request(BASE, { method: 'DELETE' }), deps);
    expect(response.status).toBe(405);
  });

  test('surfaces a server error instead of throwing', async () => {
    const broken: HandlerDeps = {
      ...deps,
      store: { ...deps.store, read: async () => { throw new Error('redis down'); } },
    };
    const response = await handleWheelRequest(new Request(`${BASE}?id=abcdefgh`), broken);
    expect(response.status).toBe(500);
  });
});
