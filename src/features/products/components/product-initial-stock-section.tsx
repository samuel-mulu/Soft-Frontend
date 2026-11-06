'use client';

import { QuantityEntry } from '@/components/quantity-entry';
import { formatDozen } from '@/lib/pack-quantity';
import {
  buildProductCreateStockPayload,
  computeInitialStockQuantities,
  defaultInitialStockFields,
  validateInitialStock,
  type InitialReceiveMode,
  type InitialStockFields,
} from './product-initial-stock-logic';

export type { InitialReceiveMode, InitialStockFields };
export {
  buildProductCreateStockPayload,
  computeInitialStockQuantities,
  defaultInitialStockFields,
  validateInitialStock,
};

type Supplier = { id: string; name: string };

export function ProductInitialStockSection({
  returnable,
  availableEmpty,
  fields,
  onChange,
  suppliers,
  owner,
  purpose = 'create',
}: {
  returnable: boolean;
  availableEmpty: number;
  fields: InitialStockFields;
  onChange: (patch: Partial<InitialStockFields>) => void;
  suppliers: Supplier[];
  owner: boolean;
  /** Edit always shows the three receive modes. Blank quantity leaves stock unchanged. */
  purpose?: 'create' | 'edit';
}) {
  const enabled = purpose === 'edit' || fields.enableInitialStock;
  const activeFields = enabled ? { ...fields, enableInitialStock: true } : fields;
  const q = computeInitialStockQuantities(activeFields, returnable);
  const projectedEmpty = availableEmpty - q.fromExisting;
  const showSupplier =
    returnable &&
    enabled &&
    (fields.receiveMode === 'WITH_BOTTLES' || fields.receiveMode === 'MIXED_SOURCE');

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      {purpose === 'create' ? (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={fields.enableInitialStock}
            onChange={(e) => onChange({ enableInitialStock: e.target.checked })}
          />
          Add initial full stock when creating product
        </label>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Add stock</p>
          <p className="text-xs text-muted-foreground">
            Leave the quantity at 0 to keep stock unchanged.
          </p>
        </div>
      )}

      {purpose === 'create' && !fields.enableInitialStock && (
        <p className="text-xs text-muted-foreground">
          Leave unchecked to create the product with zero stock. Receive later from{' '}
          <span className="font-semibold text-foreground">Inventory → Bottle warehouse</span>.
        </p>
      )}

      {enabled && !returnable && (
        <div>
          <p className="label mb-2">Starting stock (dozen)</p>
          <QuantityEntry
            fieldClass="field"
            value={fields.unitOnlyQty}
            onChange={(v) => onChange({ unitOnlyQty: v })}
          />
        </div>
      )}

      {enabled && returnable && (
        <>
          <p className="text-xs font-bold text-muted-foreground">How is this stock received?</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['FROM_EXISTING_EMPTIES', 'Use existing empty bottles'],
                ['WITH_BOTTLES', 'Full drinks with supplier bottles'],
                ['MIXED_SOURCE', 'Mixed — both sources'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  fields.receiveMode === mode
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card'
                }`}
                onClick={() => onChange({ receiveMode: mode })}
              >
                {label}
              </button>
            ))}
          </div>

          {fields.receiveMode !== 'MIXED_SOURCE' && (
            <>
              {fields.receiveMode === 'FROM_EXISTING_EMPTIES' && (
                <p className="text-xs text-muted-foreground">
                  Available empty in warehouse:{' '}
                  <span className="font-bold tabular-nums text-foreground">{formatDozen(availableEmpty)}</span>
                </p>
              )}
              <p className="label mb-1">Quantity (dozen)</p>
              <QuantityEntry
                fieldClass="field"
                value={fields.dozen}
                onChange={(v) => onChange({ dozen: v })}
              />
            </>
          )}

          {fields.receiveMode === 'MIXED_SOURCE' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Available empty:{' '}
                <span className="font-bold tabular-nums">{formatDozen(availableEmpty)}</span>. Total full stock
                increases by both portions combined.
              </p>
              <div>
                <p className="label mb-1">Using my empty bottles (dozen)</p>
                <QuantityEntry
                  fieldClass="field"
                  value={fields.mixedFromDozen}
                  onChange={(v) => onChange({ mixedFromDozen: v })}
                />
              </div>
              <div>
                <p className="label mb-1">With new supplier bottles (dozen)</p>
                <QuantityEntry
                  fieldClass="field"
                  value={fields.mixedSupDozen}
                  onChange={(v) => onChange({ mixedSupDozen: v })}
                />
              </div>
            </div>
          )}

          {showSupplier && owner && (
            <>
              <p className="label mb-1">
                Supplier{' '}
                {fields.receiveMode === 'MIXED_SOURCE'
                  ? '(for supplier-bottled portion only)'
                  : '(optional — creates purchase when set)'}
              </p>
              <select
                className="field touch-target"
                value={fields.initialSupplierId}
                onChange={(e) => onChange({ initialSupplierId: e.target.value })}
              >
                <option value="">No supplier record</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fields.initialSupplierId && (
                <input
                  className="field mt-2"
                  placeholder="Unit cost ETB per dozen"
                  value={fields.initialUnitCost}
                  onChange={(e) => onChange({ initialUnitCost: e.target.value })}
                />
              )}
            </>
          )}

          {q.totalFull > 0 && (
            <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-1">
              <p>
                Full stock added: <b className="tabular-nums">{formatDozen(q.totalFull)}</b>
              </p>
              {returnable && q.fromExisting > 0 && (
                <>
                  <p>
                    From empties: <b className="tabular-nums">{formatDozen(q.fromExisting)}</b>
                  </p>
                  <p>
                    Projected empty stock:{' '}
                    <b className={`tabular-nums ${projectedEmpty < 0 ? 'text-destructive' : ''}`}>
                      {formatDozen(projectedEmpty)}
                    </b>
                  </p>
                </>
              )}
              {returnable && q.withSupplier > 0 && (
                <p>
                  With supplier bottles: <b className="tabular-nums">{formatDozen(q.withSupplier)}</b>
                </p>
              )}
            </div>
          )}
        </>
      )}

      {enabled && (
        <>
          <input
            className="field"
            placeholder="Supplier name for note (optional)"
            value={fields.supplierName}
            onChange={(e) => onChange({ supplierName: e.target.value })}
          />
          <input
            className="field"
            placeholder="Stock note (optional)"
            value={fields.stockNote}
            onChange={(e) => onChange({ stockNote: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
