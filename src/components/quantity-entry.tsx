'use client';

import type { QtyEntryMode } from '@/lib/pack-quantity';

const MODES: { id: QtyEntryMode; label: string }[] = [
  { id: 'each', label: 'Each' },
  { id: 'dozen', label: 'Dozen' },
  { id: 'mixed', label: 'Dz + Ea' },
];

export function QuantityEntry({
  mode,
  onModeChange,
  dozen,
  each,
  onDozenChange,
  onEachChange,
  fieldClass,
  invalid,
  hint,
  disabled,
  dozenPlaceholder = 'Dz',
  eachPlaceholder = 'Ea',
}: {
  mode: QtyEntryMode;
  onModeChange: (m: QtyEntryMode) => void;
  dozen: string;
  each: string;
  onDozenChange: (v: string) => void;
  onEachChange: (v: string) => void;
  fieldClass: string;
  invalid?: boolean;
  hint?: string | null;
  disabled?: boolean;
  dozenPlaceholder?: string;
  eachPlaceholder?: string;
}) {
  const inv = invalid ? ' field-invalid' : '';
  const unitSelect = `fs-control qty-entry-unit sale-qty-unit touch-target ${fieldClass}${inv}`;
  const numInput = `fs-control qty-entry-num sale-qty-num ${fieldClass}${inv}`;

  return (
    <div className="qty-entry min-w-0">
      <div className="sale-qty-row">
        {(mode === 'dozen' || mode === 'mixed') && (
          <input
            type="number"
            inputMode="numeric"
            min={0}
            disabled={disabled}
            placeholder={dozenPlaceholder}
            className={numInput}
            value={dozen}
            onChange={(e) => onDozenChange(e.target.value)}
            aria-label="Dozen quantity"
          />
        )}
        {(mode === 'each' || mode === 'mixed') && (
          <input
            type="number"
            inputMode="numeric"
            min={0}
            disabled={disabled}
            placeholder={eachPlaceholder}
            className={
              mode === 'each'
                ? `${fieldClass} qty-entry-num qty-entry-num--wide flex-1 min-w-0${inv}`
                : numInput
            }
            value={each}
            onChange={(e) => onEachChange(e.target.value)}
            aria-label="Each quantity"
          />
        )}
        <select
          disabled={disabled}
          className={unitSelect}
          value={mode}
          aria-label="Quantity unit"
          onChange={(e) => onModeChange(e.target.value as QtyEntryMode)}
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {hint ? (
        <p className="sale-qty-units-hint fs-amount truncate" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
