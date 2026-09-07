import type { SyncStatus } from '../hooks/useWheel';

const LABELS: Record<SyncStatus, string> = {
  local: 'Bu cihazda kayıtlı',
  loading: 'Yükleniyor…',
  saving: 'Kaydediliyor…',
  synced: 'Ortak çark · kayıtlı',
  error: 'Kaydedilemedi',
};

export function SyncBadge({ status }: { readonly status: SyncStatus }) {
  return (
    <span className={`sync sync--${status}`} aria-live="polite">
      <span className="sync__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
