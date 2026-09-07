import {
  DEFAULT_WEIGHT,
  MAX_LABEL_LENGTH,
  MAX_SEGMENTS,
  MAX_WEIGHT,
  MIN_WEIGHT,
  paletteColor,
} from './defaults.ts';
import type { Segment } from './types.ts';

const SCHEMA_VERSION = 1;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;

type CompactSegment = [label: string, weight: number, color: string];
type CompactMenu = { v: number; s: CompactSegment[] };

export function createId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clampWeight(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, rounded));
}

function readWeight(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_WEIGHT;
  return clampWeight(value);
}

function readLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_LABEL_LENGTH);
}

function readColor(raw: unknown, index: number): string {
  return typeof raw === 'string' && HEX_COLOR.test(raw) ? raw : paletteColor(index);
}

/** Keeps a caller's id when it is safe and unused, so React keys survive a round trip. */
function readId(raw: unknown, used: Set<string>): string {
  if (typeof raw === 'string' && SAFE_ID.test(raw) && !used.has(raw)) {
    used.add(raw);
    return raw;
  }
  let generated = createId();
  while (used.has(generated)) generated = createId();
  used.add(generated);
  return generated;
}

/** Validates untrusted input (URL hash, localStorage) into a usable wheel. */
export function sanitizeSegments(raw: unknown): Segment[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const segments: Segment[] = [];
  const usedIds = new Set<string>();
  for (const entry of raw.slice(0, MAX_SEGMENTS)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    const label = readLabel(candidate.label);
    if (label === null) continue;
    segments.push({
      id: readId(candidate.id, usedIds),
      label,
      weight: readWeight(candidate.weight),
      color: readColor(candidate.color, segments.length),
    });
  }

  return segments.length > 0 ? segments : null;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeMenu(segments: readonly Segment[]): string {
  const payload: CompactMenu = {
    v: SCHEMA_VERSION,
    s: segments.map((segment) => [segment.label, segment.weight, segment.color]),
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeMenu(encoded: string): Segment[] | null {
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { s } = parsed as Partial<CompactMenu>;
    if (!Array.isArray(s)) return null;
    return sanitizeSegments(
      s.map((entry) =>
        Array.isArray(entry)
          ? { label: entry[0], weight: entry[1], color: entry[2] }
          : entry,
      ),
    );
  } catch {
    return null;
  }
}
