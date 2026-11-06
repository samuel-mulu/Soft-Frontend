import { DEFAULT_PACK_SIZE, DOZEN_STEP_MESSAGE, dozenToBottles, formatDozen } from '@/lib/pack-quantity';

export type InitialReceiveMode = 'FROM_EXISTING_EMPTIES' | 'WITH_BOTTLES' | 'MIXED_SOURCE';

export type InitialStockFields = {
  enableInitialStock: boolean;
  receiveMode: InitialReceiveMode;
  /** All quantity fields are dozens (0.5 steps). */
  dozen: string;
  mixedFromDozen: string;
  mixedSupDozen: string;
  unitOnlyQty: string;
  initialSupplierId: string;
  initialUnitCost: string;
  stockNote: string;
  supplierName: string;
};

export const defaultInitialStockFields = (): InitialStockFields => ({
  enableInitialStock: false,
  receiveMode: 'WITH_BOTTLES',
  dozen: '',
  mixedFromDozen: '',
  mixedSupDozen: '',
  unitOnlyQty: '',
  initialSupplierId: '',
  initialUnitCost: '',
  stockNote: '',
  supplierName: '',
});

/** Dozen text -> bottle count for a dozen of `perDozen` bottles. */
function resolveEach(dozen: string, perDozen: number): { total: number; error?: string } {
  try {
    return { total: dozenToBottles(dozen, perDozen) };
  } catch {
    return { total: 0, error: DOZEN_STEP_MESSAGE };
  }
}

export function computeInitialStockQuantities(
  fields: InitialStockFields,
  returnable: boolean,
  perDozen = DEFAULT_PACK_SIZE,
): {
  fromExisting: number;
  withSupplier: number;
  totalFull: number;
  error?: string;
} {
  if (!fields.enableInitialStock) {
    return { fromExisting: 0, withSupplier: 0, totalFull: 0 };
  }
  if (!returnable) {
    const r = resolveEach(fields.unitOnlyQty, perDozen);
    if (r.error) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: r.error };
    const q = r.total;
    if (q === 0) return { fromExisting: 0, withSupplier: 0, totalFull: 0 };
    return { fromExisting: 0, withSupplier: q, totalFull: q };
  }

  if (fields.receiveMode === 'FROM_EXISTING_EMPTIES') {
    const r = resolveEach(fields.dozen, perDozen);
    if (r.error) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: r.error };
    if (r.total <= 0) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: 'Quantity must be greater than zero' };
    return { fromExisting: r.total, withSupplier: 0, totalFull: r.total };
  }
  if (fields.receiveMode === 'WITH_BOTTLES') {
    const r = resolveEach(fields.dozen, perDozen);
    if (r.error) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: r.error };
    if (r.total <= 0) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: 'Quantity must be greater than zero' };
    return { fromExisting: 0, withSupplier: r.total, totalFull: r.total };
  }

  const fromR = resolveEach(fields.mixedFromDozen, perDozen);
  const supR = resolveEach(fields.mixedSupDozen, perDozen);
  if (fromR.error) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: fromR.error };
  if (supR.error) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: supR.error };
  if (fromR.total <= 0 && supR.total <= 0) {
    return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: 'Enter at least one mixed quantity' };
  }
  return {
    fromExisting: fromR.total,
    withSupplier: supR.total,
    totalFull: fromR.total + supR.total,
  };
}

export function validateInitialStock(
  fields: InitialStockFields,
  returnable: boolean,
  availableEmpty: number,
  options?: { allowZero?: boolean; perDozen?: number },
): string | null {
  const perDozen = options?.perDozen ?? DEFAULT_PACK_SIZE;
  const q = computeInitialStockQuantities(fields, returnable, perDozen);
  if (q.error) {
    const zeroQty =
      q.error === 'Quantity must be greater than zero' ||
      q.error === 'Enter at least one mixed quantity';
    if (options?.allowZero && zeroQty) return null;
    return q.error;
  }
  if (!fields.enableInitialStock || q.totalFull === 0) return null;
  if (returnable && q.fromExisting > availableEmpty) {
    return `Not enough empty bottles in warehouse (${formatDozen(availableEmpty, perDozen)} available, ${formatDozen(q.fromExisting, perDozen)} requested)`;
  }
  if (
    returnable &&
    q.withSupplier > 0 &&
    fields.initialSupplierId &&
    (!fields.initialUnitCost.trim() || !Number.isFinite(Number(fields.initialUnitCost)))
  ) {
    return 'Unit cost is required when a supplier is selected for supplier-bottled quantity';
  }
  return null;
}

export function buildProductCreateStockPayload(
  fields: InitialStockFields,
  returnable: boolean,
  perDozen = DEFAULT_PACK_SIZE,
): {
  initialQuantity?: number;
  initialFromExistingEmpties?: number;
  initialSupplierId?: string;
  initialUnitCost?: string;
  stockNote?: string;
  supplierName?: string;
} {
  const q = computeInitialStockQuantities(fields, returnable, perDozen);
  if (!fields.enableInitialStock || q.totalFull === 0) return {};
  const out: ReturnType<typeof buildProductCreateStockPayload> = {};
  if (q.withSupplier > 0) out.initialQuantity = q.withSupplier;
  if (returnable && q.fromExisting > 0) out.initialFromExistingEmpties = q.fromExisting;
  if (fields.initialSupplierId) out.initialSupplierId = fields.initialSupplierId;
  if (fields.initialUnitCost.trim()) out.initialUnitCost = fields.initialUnitCost.trim();
  if (fields.stockNote.trim()) out.stockNote = fields.stockNote.trim();
  if (fields.supplierName.trim()) out.supplierName = fields.supplierName.trim();
  return out;
}
