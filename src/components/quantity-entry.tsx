'use client';

import { isValidDozenField } from '@/lib/pack-quantity';

/** Quantity input — dozens only, in half-dozen steps (1, 1.5, 2 …). */
export function QuantityEntry({
  value,
  onChange,
  fieldClass,
  invalid,
  hint,
  disabled,
  placeholder = 'Dozen',
  ariaLabel = 'Quantity in dozens',
}: {
  value: string;
  onChange: (v: string) => void;
  fieldClass: string;
  invalid?: boolean;
  hint?: string | null;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const badStep = !isValidDozenField(value);
  const inv = invalid || badStep ? ' field-invalid' : '';
  const shownHint = badStep ? 'Use whole or half dozens (e.g. 1, 1.5, 2)' : hint;

  return (
    <div className="qty-entry min-w-0">
      <div className="sale-qty-row">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          disabled={disabled}
          placeholder={placeholder}
          className={`fs-control ${fieldClass} qty-entry-num qty-entry-num--wide flex-1 min-w-0${inv}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
        />
        <span className="qty-entry-unit sale-qty-unit self-center px-2 text-sm font-bold text-[#68776e]">dz</span>
      </div>
      {shownHint ? (
        <p className="sale-qty-units-hint fs-amount truncate" title={shownHint}>
          {shownHint}
        </p>
      ) : null}
    </div>
  );
}
