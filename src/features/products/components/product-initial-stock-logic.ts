import { qtyFromMode, type QtyEntryMode } from '@/lib/pack-quantity';

export type InitialReceiveMode = 'FROM_EXISTING_EMPTIES' | 'WITH_BOTTLES' | 'MIXED_SOURCE';

export type InitialStockFields = {
  enableInitialStock: boolean;
  receiveMode: InitialReceiveMode;
  qtyMode: QtyEntryMode;
  dozen: string;
  each: string;
  mixedFromMode: QtyEntryMode;
  mixedFromDozen: string;
  mixedFromEach: string;
  mixedSupMode: QtyEntryMode;
  mixedSupDozen: string;
  mixedSupEach: string;
  unitOnlyQty: string;
  initialSupplierId: string;
  initialUnitCost: string;
  stockNote: string;
  supplierName: string;
};

export const defaultInitialStockFields = (): InitialStockFields => ({
  enableInitialStock: false,
  receiveMode: 'WITH_BOTTLES',
  qtyMode: 'each',
  dozen: '',
  each: '',
  mixedFromMode: 'each',
  mixedFromDozen: '',
  mixedFromEach: '',
  mixedSupMode: 'each',
  mixedSupDozen: '',
  mixedSupEach: '',
  unitOnlyQty: '',
  initialSupplierId: '',
  initialUnitCost: '',
  stockNote: '',
  supplierName: '',
});

function resolveEach(
  mode: QtyEntryMode,
  dozen: string,
  each: string,
): { total: number; error?: string } {
  try {
    const total = qtyFromMode(mode, dozen, each);
    if (!Number.isSafeInteger(total) || total < 0) {
      return { total: 0, error: 'Enter a valid whole number quantity' };
    }
    return { total };
  } catch {
    return { total: 0, error: 'Enter a valid whole number quantity' };
  }
}

export function computeInitialStockQuantities(
  fields: InitialStockFields,
  returnable: boolean,
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
    const q = Math.floor(Number(fields.unitOnlyQty || 0));
    if (!Number.isFinite(q) || q < 0 || !Number.isInteger(q)) {
      return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: 'Invalid starting stock' };
    }
    if (q === 0) return { fromExisting: 0, withSupplier: 0, totalFull: 0 };
    return { fromExisting: 0, withSupplier: q, totalFull: q };
  }

  if (fields.receiveMode === 'FROM_EXISTING_EMPTIES') {
    const r = resolveEach(fields.qtyMode, fields.dozen, fields.each);
    if (r.error) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: r.error };
    if (r.total <= 0) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: 'Quantity must be greater than zero' };
    return { fromExisting: r.total, withSupplier: 0, totalFull: r.total };
  }
  if (fields.receiveMode === 'WITH_BOTTLES') {
    const r = resolveEach(fields.qtyMode, fields.dozen, fields.each);
    if (r.error) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: r.error };
    if (r.total <= 0) return { fromExisting: 0, withSupplier: 0, totalFull: 0, error: 'Quantity must be greater than zero' };
    return { fromExisting: 0, withSupplier: r.total, totalFull: r.total };
  }

  const fromR = resolveEach(fields.mixedFromMode, fields.mixedFromDozen, fields.mixedFromEach);
  const supR = resolveEach(fields.mixedSupMode, fields.mixedSupDozen, fields.mixedSupEach);
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
): string | null {
  const q = computeInitialStockQuantities(fields, returnable);
  if (q.error) return q.error;
  if (!fields.enableInitialStock || q.totalFull === 0) return null;
  if (returnable && q.fromExisting > availableEmpty) {
    return `Not enough empty bottles in warehouse (${availableEmpty} available, ${q.fromExisting} requested)`;
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
): {
  initialQuantity?: number;
  initialFromExistingEmpties?: number;
  initialSupplierId?: string;
  initialUnitCost?: string;
  stockNote?: string;
  supplierName?: string;
} {
  const q = computeInitialStockQuantities(fields, returnable);
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
