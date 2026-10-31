'use client';

import { QuantityEntry } from '@/components/quantity-entry';
import type { QtyEntryMode } from '@/lib/pack-quantity';
import {
  lineReturnedEach,
  lineSoldEach,
  returnedEquivalentHint,
  soldEquivalentHint,
  type SaleLine,
} from '@/lib/sale-line-quantity';
import { X } from 'lucide-react';

export function SaleLineRow({
  line,
  i,
  product,
  lineReturnable,
  showBottleReturns,
  paymentModeDetail,
  lineGrid,
  sellField,
  badQty,
  badPaid,
  badRet,
  lineAmountLabel,
  lineTotalNumber,
  canRemove,
  productSelect,
  payMethods,
  onPatch,
  onRemove,
}: {
  line: SaleLine;
  i: number;
  product: Record<string, unknown> | undefined;
  lineReturnable: boolean;
  showBottleReturns: boolean;
  paymentModeDetail: boolean;
  lineGrid: string;
  sellField: string;
  badQty: boolean;
  badPaid: boolean;
  badRet: boolean;
  lineAmountLabel: string;
  lineTotalNumber: number;
  canRemove: boolean;
  productSelect: React.ReactNode;
  payMethods: { id: string; name: string }[];
  onPatch: (patch: Partial<SaleLine>) => void;
  onRemove: () => void;
}) {
  const qtyField = `${sellField} touch-target min-h-[38px]! h-auto! py-1.5! text-sm`;
  return (
    <div className="sale-line-card">
      <div className={lineGrid}>
        <div className="sale-line-product">
          <span className="sale-line-mobile-label">Product</span>
          {productSelect}
        </div>
        <div className="sale-line-qty">
          <span className="sale-line-mobile-label">Qty</span>
          <QuantityEntry
            mode={line.qtyMode}
            onModeChange={(m: QtyEntryMode) => onPatch({ qtyMode: m })}
            dozen={line.soldDozen}
            each={line.soldEach}
            onDozenChange={(v) => onPatch({ soldDozen: v })}
            onEachChange={(v) => onPatch({ soldEach: v })}
            fieldClass={qtyField}
            invalid={badQty}
            disabled={!product}
            hint={product ? soldEquivalentHint(line) : null}
          />
        </div>
        {showBottleReturns && (
          <div className="sale-line-return">
            <span className="sale-line-mobile-label">Return</span>
            {lineReturnable ? (
              <QuantityEntry
                mode={line.retMode}
                onModeChange={(m: QtyEntryMode) => onPatch({ retMode: m, retEdited: true })}
                dozen={line.retDozen}
                each={line.retEach}
                onDozenChange={(v) => onPatch({ retDozen: v, retEdited: true })}
                onEachChange={(v) => onPatch({ retEach: v, retEdited: true })}
                fieldClass={qtyField}
                invalid={badRet}
                disabled={!product}
                hint={product ? returnedEquivalentHint(line) : null}
              />
            ) : (
              <span className="text-center text-xs muted py-2 block">—</span>
            )}
          </div>
        )}
        {paymentModeDetail && (
          <>
            <div className="sale-line-paid">
              <span className="sale-line-mobile-label">Paid</span>
              <input
                type="number"
                inputMode="decimal"
                className={`${sellField}${badPaid ? ' field-invalid' : ''} w-full`}
                value={line.linePaid ?? (product ? String(lineTotalNumber) : '')}
                disabled={!product}
                onChange={(e) => onPatch({ linePaid: e.target.value, linePaidEdited: true })}
              />
            </div>
            <div className="sale-line-method">
              <span className="sale-line-mobile-label">Method</span>
              <select
                className={`${sellField} touch-target w-full`}
                value={line.lineMethod || 'CASH'}
                disabled={!product}
                onChange={(e) => onPatch({ lineMethod: e.target.value, linePaidEdited: true })}
              >
                {payMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="sale-line-total">
          <span className="sale-line-mobile-label">Line total</span>
          <span className="sale-line-amount">{product ? lineAmountLabel : '—'}</span>
          <button
            type="button"
            className="sale-line-remove"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Remove line"
          >
            <X size={20} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** For checkout hints without rendering full row */
export { lineSoldEach, lineReturnedEach };
