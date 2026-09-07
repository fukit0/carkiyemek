import { useCallback, useEffect, useRef, useState } from 'react';
import { createRemoteWheel, fetchRemoteWheel, saveRemoteWheel } from '../core/api';
import { loadLocalMenu, persistLocalMenu } from '../core/localMenu';
import { readWheelIdFromPath, wheelPath, wheelUrl } from '../core/route';
import type { Segment } from '../core/types';

const SAVE_DEBOUNCE_MS = 700;
/** How often an open, visible tab looks for somebody else's edits. */
const REFRESH_INTERVAL_MS = 60_000;

export type SyncStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';

export type WheelState = {
  readonly segments: readonly Segment[];
  readonly setSegments: (next: readonly Segment[]) => void;
  readonly status: SyncStatus;
  readonly notice: string | null;
  readonly isShared: boolean;
  /** Creates the shared wheel on first use; returns the link to copy. */
  readonly share: () => Promise<string | null>;
  /** Pulls the newest shared list; no-op for a local wheel. */
  readonly refresh: () => Promise<void>;
};

export function useWheel(): WheelState {
  const [segments, setSegments] = useState<readonly Segment[]>(loadLocalMenu);
  const [wheelId, setWheelId] = useState<string | null>(() =>
    readWheelIdFromPath(window.location.pathname),
  );
  const [status, setStatus] = useState<SyncStatus>(wheelId ? 'loading' : 'local');
  const [notice, setNotice] = useState<string | null>(null);

  const versionRef = useRef(0);
  const pendingRef = useRef<readonly Segment[] | null>(null);
  const timerRef = useRef<number | null>(null);

  const accept = useCallback((wheel: { segments: readonly Segment[]; version: number }) => {
    versionRef.current = wheel.version;
    setSegments(wheel.segments);
  }, []);

  // Back/forward between the local wheel and a shared one.
  useEffect(() => {
    const onPopState = () => setWheelId(readWheelIdFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!wheelId) {
      setStatus('local');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    void fetchRemoteWheel(wheelId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        accept(result.wheel);
        setStatus('synced');
        setNotice(null);
        return;
      }
      // A dead or unreachable-by-design link should not trap the user in a
      // shared mode where every edit fails; fall back to the local wheel.
      if (result.failure.kind === 'not_found' || result.failure.kind === 'unconfigured') {
        window.history.replaceState(null, '', '/');
        setWheelId(null);
        setNotice(`${result.failure.message} Kendi çarkına dönüldü.`);
        return;
      }
      setStatus('error');
      setNotice(result.failure.message);
    });
    return () => {
      cancelled = true;
    };
  }, [accept, wheelId]);

  useEffect(() => {
    if (!wheelId) persistLocalMenu(segments);
  }, [segments, wheelId]);

  const flush = useCallback(async () => {
    const next = pendingRef.current;
    if (!wheelId || !next) return;
    pendingRef.current = null;
    setStatus('saving');

    const result = await saveRemoteWheel(wheelId, next);
    if (result.ok) {
      versionRef.current = result.wheel.version;
      setStatus('synced');
      setNotice(null);
      return;
    }
    setStatus('error');
    setNotice(result.failure.message);
  }, [wheelId]);

  const updateSegments = useCallback(
    (next: readonly Segment[]) => {
      setSegments(next);
      if (!wheelId) return;
      pendingRef.current = next;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush, wheelId],
  );

  const refresh = useCallback(async () => {
    // Never overwrite edits that have not reached the server yet.
    if (!wheelId || pendingRef.current) return;
    const result = await fetchRemoteWheel(wheelId);
    if (!result.ok || result.wheel.version === versionRef.current) return;
    accept(result.wheel);
    setNotice('Listeyi başka biri güncelledi.');
  }, [accept, wheelId]);

  // Pick up somebody else's edits when the tab comes back, and never lose our own.
  useEffect(() => {
    if (!wheelId) return;
    const onFocus = () => void refresh();
    const onVisibilityChange = () => (document.hidden ? void flush() : void refresh());
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, REFRESH_INTERVAL_MS);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [flush, refresh, wheelId]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const share = useCallback(async (): Promise<string | null> => {
    if (wheelId) return wheelUrl(window.location.origin, wheelId);

    setStatus('saving');
    const result = await createRemoteWheel(segments);
    if (!result.ok) {
      setStatus('error');
      setNotice(result.failure.message);
      return null;
    }
    versionRef.current = result.wheel.version;
    window.history.pushState(null, '', wheelPath(result.wheel.id));
    setWheelId(result.wheel.id);
    return wheelUrl(window.location.origin, result.wheel.id);
  }, [segments, wheelId]);

  return {
    segments,
    setSegments: updateSegments,
    status,
    notice,
    isShared: wheelId !== null,
    share,
    refresh,
  };
}
