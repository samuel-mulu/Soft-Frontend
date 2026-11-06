'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  CUSTOMER_OPENING_NOTE,
  newOpeningBottleRow,
  type InitialRegistrationFields,
  type OpeningBottleRow,
  type OpeningDirection,
} from '@/lib/customer-initial-registration';

type BottleOption = { id: string; name: string };

function DirectionSelect({
  value,
  onChange,
}: {
  value: OpeningDirection;
  onChange: (v: OpeningDirection) => void;
}) {
  return (
    <select
      className="field touch-target"
      value={value}
      onChange={(e) => onChange(e.target.value as OpeningDirection)}
    >
      <option value="OWES">Customer owes</option>
      <option value="CREDIT">Customer credit</option>
    </select>
  );
}

export function CustomerInitialRegistrationSection({
  fields,
  onChange,
  bottles,
}: {
  fields: InitialRegistrationFields;
  onChange: (patch: Partial<InitialRegistrationFields>) => void;
  bottles: BottleOption[];
}) {
  const patchBottle = (key: string, patch: Partial<OpeningBottleRow>) => {
    onChange({
      openingBottles: fields.openingBottles.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    });
  };

  const removeBottle = (key: string) => {
    onChange({ openingBottles: fields.openingBottles.filter((r) => r.key !== key) });
  };

  return (
    <div className="sm:col-span-2 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <label className="flex items-start gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="mt-1"
          checked={fields.enableInitialRegistration}
          onChange={(e) => onChange({ enableInitialRegistration: e.target.checked })}
        />
        <span>
          Initial registration (manual → digital)
          <span className="block text-xs font-medium text-muted-foreground mt-0.5">
            Start at zero, then set opening payment and bottle balances from the old book.
          </span>
        </span>
      </label>

      {fields.enableInitialRegistration && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="label">Reason</label>
            <input className="field bg-muted" value={CUSTOMER_OPENING_NOTE} disabled readOnly />
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="label">Opening payment balance (ETB)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field"
                placeholder="0"
                value={fields.openingMoneyAmount}
                onChange={(e) => onChange({ openingMoneyAmount: e.target.value })}
              />
            </div>
            <div className="min-w-[10rem]">
              <label className="label">Direction</label>
              <DirectionSelect
                value={fields.openingMoneyDirection}
                onChange={(openingMoneyDirection) => onChange({ openingMoneyDirection })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="label mb-0">Opening bottle balances (dozen)</p>
              <button
                type="button"
                className="btn btn-ghost text-xs py-1.5"
                onClick={() =>
                  onChange({ openingBottles: [...fields.openingBottles, newOpeningBottleRow()] })
                }
              >
                <Plus size={14} /> Add bottle type
              </button>
            </div>

            {!fields.openingBottles.length && (
              <p className="muted text-xs">Optional — add a row if they had bottle debt or credit.</p>
            )}

            {fields.openingBottles.map((row) => (
              <div
                key={row.key}
                className="grid sm:grid-cols-[1.4fr_0.8fr_1fr_auto] gap-2 items-end rounded-lg bg-card/60 p-2"
              >
                <div>
                  <label className="label">Bottle type</label>
                  <select
                    className="field touch-target"
                    value={row.bottleTypeId}
                    onChange={(e) => patchBottle(row.key, { bottleTypeId: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {bottles.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Dozen</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="field"
                    placeholder="0"
                    value={row.dozen}
                    onChange={(e) => patchBottle(row.key, { dozen: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Direction</label>
                  <DirectionSelect
                    value={row.direction}
                    onChange={(direction) => patchBottle(row.key, { direction })}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost text-xs py-2"
                  aria-label="Remove bottle row"
                  onClick={() => removeBottle(row.key)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
