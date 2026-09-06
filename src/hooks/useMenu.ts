import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SEGMENTS } from '../core/defaults';
import { decodeMenu, encodeMenu, sanitizeSegments } from '../core/menu';
import type { Segment } from '../core/types';

const STORAGE_KEY = 'carkiyemek.menu.v1';
const SHARE_PARAM = 'm';

function readSharedMenu(): Segment[] | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const shared = new URLSearchParams(hash).get(SHARE_PARAM);
  if (!shared) return null;

  const decoded = decodeMenu(shared);
  if (decoded) {
    // The URL is only a seed; drop it so later edits are not misrepresented by a stale link.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return decoded;
}

function readStoredMenu(): Segment[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeSegments(JSON.parse(raw)) : null;
  } catch (error) {
    console.warn('Kayıtlı menü okunamadı, varsayılana dönülüyor:', error);
    return null;
  }
}

function loadInitialMenu(): readonly Segment[] {
  return readSharedMenu() ?? readStoredMenu() ?? DEFAULT_SEGMENTS;
}

export function buildShareUrl(segments: readonly Segment[]): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${SHARE_PARAM}=${encodeMenu(segments)}`;
}

export function useMenu() {
  const [segments, setSegments] = useState<readonly Segment[]>(loadInitialMenu);

  // A shared link pasted into an already-open tab only changes the hash, so watch for that too.
  const applySharedMenu = useCallback(() => {
    const shared = readSharedMenu();
    if (shared) setSegments(shared);
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', applySharedMenu);
    return () => window.removeEventListener('hashchange', applySharedMenu);
  }, [applySharedMenu]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(segments));
    } catch (error) {
      console.warn('Menü kaydedilemedi:', error);
    }
  }, [segments]);

  return { segments, setSegments };
}
