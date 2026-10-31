/** FlowStock: dozen = exactly 12 individual units (not supplier case size). */

export const UNITS_PER_DOZEN = 12;

export const MAX_PACK_QUANTITY = 1_000_000;

export type QuantityInput = {
  dozen: number;
  each: number;
  unitsPerDozen: number;
};

export type QtyEntryMode = 'each' | 'dozen' | 'mixed';

export function assertWholeNonNegative(n: number, field = 'quantity'): number {
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid ${field}: must be a nonnegative number`);
  }
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid ${field}: must be a whole number`);
  }
  if (n > MAX_PACK_QUANTITY) {
    throw new Error(`Invalid ${field}: exceeds maximum`);
  }
  return n;
}

export function assertUnitsPerDozen(unitsPerDozen: number): number {
  if (unitsPerDozen !== UNITS_PER_DOZEN) {
    throw new Error('unitsPerDozen must be 12 for a standard dozen');
  }
  return unitsPerDozen;
}

export function toEach(input: QuantityInput): number {
  const upc = assertUnitsPerDozen(input.unitsPerDozen);
  const dozen = assertWholeNonNegative(input.dozen, 'dozen');
  const each = assertWholeNonNegative(input.each, 'each');
  const total = dozen * upc + each;
  if (total > MAX_PACK_QUANTITY) {
    throw new Error('Total quantity exceeds maximum');
  }
  return total;
}

export function fromEach(total: number, unitsPerDozen = UNITS_PER_DOZEN): { dozen: number; each: number } {
  assertUnitsPerDozen(unitsPerDozen);
  const abs = assertWholeNonNegative(Math.abs(Math.trunc(total)), 'total');
  return {
    dozen: Math.floor(abs / unitsPerDozen),
    each: abs % unitsPerDozen,
  };
}

/** Parse a blank qty field as 0; reject negative or non-integer text. */
export function parseQtyField(raw: string): number {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const n = Math.floor(Number(s));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Invalid quantity');
  }
  return assertWholeNonNegative(n);
}

export function qtyFromMode(
  mode: QtyEntryMode,
  dozenStr: string,
  eachStr: string,
  unitsPerDozen = UNITS_PER_DOZEN,
): number {
  if (mode === 'each') {
    return parseQtyField(eachStr);
  }
  if (mode === 'dozen') {
    return toEach({ dozen: parseQtyField(dozenStr), each: 0, unitsPerDozen });
  }
  return toEach({
    dozen: parseQtyField(dozenStr),
    each: parseQtyField(eachStr),
    unitsPerDozen,
  });
}

/** Human label for what the cashier entered (or reconstructed from each). */
export function formatQtyEntryLabel(
  mode: QtyEntryMode,
  dozenStr: string,
  eachStr: string,
  totalEach: number,
): string {
  try {
    if (mode === 'each') {
      const e = parseQtyField(eachStr);
      return e === totalEach ? `${e} each` : `${totalEach} units`;
    }
    if (mode === 'dozen') {
      const d = parseQtyField(dozenStr);
      return `${d} dozen`;
    }
    const d = parseQtyField(dozenStr);
    const e = parseQtyField(eachStr);
    if (d && e) return `${d} dozen + ${e} each`;
    if (d) return `${d} dozen`;
    if (e) return `${e} each`;
    return '0';
  } catch {
    return formatEachBreakdown(totalEach);
  }
}

export function formatEachBreakdown(totalEach: number): string {
  const t = Math.max(0, Math.trunc(totalEach));
  const { dozen, each } = fromEach(t);
  if (dozen && each) return `${dozen} dozen + ${each} each`;
  if (dozen) return `${dozen} dozen`;
  if (each) return `${each} each`;
  return '0';
}

/** Customer-facing signed bottle display in dozen + each form (display is already sign-flipped). */
export function formatSignedDozenEach(display: number): string {
  if (Math.abs(display) < 0.001) return '0';
  const sign = display < 0 ? '−' : '+';
  const { dozen, each } = fromEach(display);
  const parts: string[] = [];
  if (dozen) parts.push(`${dozen} dz`);
  if (each) parts.push(`${each} ea`);
  if (!parts.length) return '0';
  return `${sign}(${parts.join(' + ')})`;
}

export function projectBottleInternal(
  internalBefore: number,
  issuedEach: number,
  returnedEach: number,
): number {
  return internalBefore + issuedEach - returnedEach;
}
