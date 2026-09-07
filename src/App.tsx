import { useCallback, useMemo, useState } from 'react';
import { SegmentRow } from './components/SegmentRow';
import { SyncBadge } from './components/SyncBadge';
import { Wheel } from './components/Wheel';
import { DEFAULT_SEGMENTS, DEFAULT_WEIGHT, paletteColor } from './core/defaults';
import { createId } from './core/menu';
import { resizeAtBoundary } from './core/resize';
import { playTick, playWin } from './core/sound';
import type { Segment } from './core/types';
import { totalWeight } from './core/wheel';
import { useSpin } from './hooks/useSpin';
import { useWheel } from './hooks/useWheel';

const MIN_SEGMENTS = 2;
const COPY_FEEDBACK_MS = 2200;

export default function App() {
  const { segments, setSegments, status, notice, isShared, share, refresh } = useWheel();
  const [winner, setWinner] = useState<Segment | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const total = useMemo(() => totalWeight(segments), [segments]);

  const handleTick = useCallback(() => {
    if (!isMuted) playTick();
  }, [isMuted]);

  const handleFinish = useCallback(
    (segment: Segment) => {
      setWinner(segment);
      if (!isMuted) playWin();
    },
    [isMuted],
  );

  const { rotation, isSpinning, spin } = useSpin({
    segments,
    onTick: handleTick,
    onFinish: handleFinish,
  });

  const editMenu = useCallback(
    (next: readonly Segment[]) => {
      setWinner(null);
      setSegments(next);
    },
    [setSegments],
  );

  const updateSegment = useCallback(
    (id: string, patch: Partial<Segment>) => {
      editMenu(segments.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)));
    },
    [editMenu, segments],
  );

  const removeSegment = useCallback(
    (id: string) => {
      if (segments.length <= MIN_SEGMENTS) return;
      editMenu(segments.filter((segment) => segment.id !== id));
    },
    [editMenu, segments],
  );

  const addSegment = useCallback(() => {
    editMenu([
      ...segments,
      {
        id: createId(),
        label: 'Yeni seçenek',
        weight: DEFAULT_WEIGHT,
        color: paletteColor(segments.length),
      },
    ]);
  }, [editMenu, segments]);

  const equalize = useCallback(() => {
    editMenu(segments.map((segment) => ({ ...segment, weight: DEFAULT_WEIGHT })));
  }, [editMenu, segments]);

  const reset = useCallback(() => {
    if (!window.confirm('Menü varsayılan listeye dönecek. Devam edilsin mi?')) return;
    editMenu(DEFAULT_SEGMENTS.map((segment) => ({ ...segment, id: createId() })));
  }, [editMenu]);

  const resizeBoundary = useCallback(
    (boundaryIndex: number, angle: number) => {
      setWinner(null);
      setSegments(resizeAtBoundary(segments, boundaryIndex, angle));
    },
    [segments, setSegments],
  );

  const copyShareLink = useCallback(async () => {
    const url = await share();
    if (!url) {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
    } catch (error) {
      console.warn('Bağlantı kopyalanamadı:', error);
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
  }, [share]);

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1>Çarkıyemek</h1>
          <p className="page__tagline">Öğlen ne yesek tartışmasını 5 saniyede bitir.</p>
        </div>
        <div className="page__tools">
          <SyncBadge status={status} />
          <button
            type="button"
            className="ghost"
            onClick={() => setIsMuted((muted) => !muted)}
            aria-pressed={isMuted}
          >
            {isMuted ? '🔇 Ses kapalı' : '🔊 Ses açık'}
          </button>
        </div>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <main className="page__body">
        <section className="panel panel--wheel">
          <Wheel
            segments={segments}
            rotation={rotation}
            isSpinning={isSpinning}
            winnerId={winner?.id ?? null}
            onResizeBoundary={resizeBoundary}
            onSpin={spin}
          />
          <div className="result" aria-live="polite">
            {winner ? (
              <>
                <span className="result__dot" style={{ background: winner.color }} />
                <strong>{winner.label}</strong>
                <span className="result__note">Afiyet olsun.</span>
              </>
            ) : (
              <span className="result__note">
                Çarkı çevir ya da dilim sınırlarını sürükleyerek payları ayarla.
              </span>
            )}
          </div>
        </section>

        <section className="panel panel--editor">
          <div className="panel__head">
            <h2>Seçenekler</h2>
            <span className="panel__hint">{segments.length} seçenek · toplam ağırlık {total.toFixed(1)}</span>
          </div>

          <ul className="rows">
            {segments.map((segment) => (
              <SegmentRow
                key={segment.id}
                segment={segment}
                share={total > 0 ? segment.weight / total : 0}
                canRemove={segments.length > MIN_SEGMENTS}
                onChange={updateSegment}
                onRemove={removeSegment}
              />
            ))}
          </ul>

          <div className="actions">
            <button type="button" className="primary" onClick={addSegment}>
              + Seçenek ekle
            </button>
            <button type="button" className="ghost" onClick={equalize}>
              Eşitle
            </button>
            <button type="button" className="ghost" onClick={reset}>
              Sıfırla
            </button>
            {isShared && (
              <button type="button" className="ghost" onClick={() => void refresh()}>
                ↻ Yenile
              </button>
            )}
            <button type="button" className="ghost" onClick={copyShareLink}>
              {copyState === 'copied'
                ? '✓ Kopyalandı'
                : copyState === 'failed'
                  ? 'Kopyalanamadı'
                  : isShared
                    ? '🔗 Linki kopyala'
                    : '🔗 Ekiple paylaş'}
            </button>
          </div>
        </section>
      </main>

      <footer className="page__foot">
        {isShared
          ? 'Ortak çark: değişiklikler herkes için kaydedilir, bağlantıyı açan aynı listeyi görür.'
          : 'Menü şimdilik sadece bu tarayıcıda. "Ekiple paylaş" dediğinde kısa bir bağlantı oluşturulur ve ekip aynı çarkı düzenler.'}
      </footer>
    </div>
  );
}
