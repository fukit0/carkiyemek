import { DEFAULT_SEGMENTS } from './defaults.ts';
import { decodeMenu, sanitizeSegments } from './menu.ts';
import type { Segment } from './types.ts';

const STORAGE_KEY = 'carkiyemek.menu.v1';
const SHARE_PARAM = 'm';

/** Legacy hash links (`#m=...`) still seed the local wheel. */
export function readHashMenu(): Segment[] | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const shared = new URLSearchParams(hash).get(SHARE_PARAM);
  if (!shared) return null;

  const decoded = decodeMenu(shared);
  if (decoded) {
    // The hash is only a seed; drop it so later edits are not misrepresented.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return decoded;
}

export function readStoredMenu(): Segment[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeSegments(JSON.parse(raw)) : null;
  } catch (error) {
    console.warn('Kayıtlı menü okunamadı, varsayılana dönülüyor:', error);
    return null;
  }
}

export function loadLocalMenu(): readonly Segment[] {
  return readHashMenu() ?? readStoredMenu() ?? DEFAULT_SEGMENTS;
}

export function persistLocalMenu(segments: readonly Segment[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(segments));
  } catch (error) {
    console.warn('Menü kaydedilemedi:', error);
  }
}
