import { MAX_WEIGHT, MIN_WEIGHT, WEIGHT_STEP } from '../core/defaults';
import { clampWeight } from '../core/menu';
import type { Segment } from '../core/types';

/** Upper bound of the slider; the number box still accepts up to MAX_WEIGHT. */
const SLIDER_MAX = 10;

type SegmentRowProps = {
  readonly segment: Segment;
  readonly share: number;
  readonly canRemove: boolean;
  readonly onChange: (id: string, patch: Partial<Segment>) => void;
  readonly onRemove: (id: string) => void;
};

export function SegmentRow({
  segment,
  share,
  canRemove,
  onChange,
  onRemove,
}: SegmentRowProps) {
  const setWeight = (raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    onChange(segment.id, { weight: clampWeight(value) });
  };

  return (
    <li className="row">
      <input
        type="color"
        className="row__color"
        value={segment.color}
        aria-label={`${segment.label} rengi`}
        onChange={(event) => onChange(segment.id, { color: event.target.value })}
      />

      <input
        type="text"
        className="row__label"
        value={segment.label}
        maxLength={40}
        aria-label="Seçenek adı"
        onChange={(event) => onChange(segment.id, { label: event.target.value })}
      />

      <span className="row__share" title="Çıkma ihtimali">
        %{(share * 100).toFixed(1)}
      </span>

      <input
        type="range"
        className="row__slider"
        min={MIN_WEIGHT}
        max={SLIDER_MAX}
        step={WEIGHT_STEP}
        value={Math.min(segment.weight, SLIDER_MAX)}
        aria-label={`${segment.label} ağırlığı`}
        onChange={(event) => setWeight(event.target.value)}
      />

      <input
        type="number"
        className="row__weight"
        min={MIN_WEIGHT}
        max={MAX_WEIGHT}
        step={WEIGHT_STEP}
        value={segment.weight}
        aria-label={`${segment.label} ağırlık değeri`}
        onChange={(event) => setWeight(event.target.value)}
      />

      <button
        type="button"
        className="row__remove"
        onClick={() => onRemove(segment.id)}
        disabled={!canRemove}
        aria-label={`${segment.label} seçeneğini sil`}
        title={canRemove ? 'Sil' : 'En az iki seçenek gerekli'}
      >
        ×
      </button>
    </li>
  );
}
