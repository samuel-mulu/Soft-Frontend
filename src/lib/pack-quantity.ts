/**
 * FlowStock works by the dozen, and the size of a dozen is configurable.
 * - Each bottle type has `bottlesPerDozen` (12, 24, …). Returnable products use their
 *   bottle type's size (mirrored in `product.unitsPerCase`); non-returnable products set their own.
 * - Users only type and see dozens, in half-dozen steps (1, 1.5, 2 …).
 * - The API stores single bottles: 1 dozen = `size` bottles (always a multiple of size / 2).
 * - Prices are per dozen: money = price × bottles / size.
 */

export const UNITS_PER_DOZEN = 12;
export const DEFAULT_PACK_SIZE = 12;

export const MAX_PACK_QUANTITY = 1_000_000;

export const DOZEN_STEP_MESSAGE = 'Use whole or half dozens (e.g. 1, 1.5, 2)';

/** A usable dozen size: even whole number ≥ 2, else the default 12. */
export function packSizeOrDefault(size: unknown): number {
  const n = Number(size);
  return Number.isInteger(n) && n >= 2 && n % 2 === 0 ? n : DEFAULT_PACK_SIZE;
}

export function isValidPackSize(size: unknown): boolean {
  const n = Number(size);
  return Number.isInteger(n) && n >= 2 && n <= 1000 && n % 2 === 0;
}

/** Parse a dozen text field. Blank → 0. Throws unless it is a 0.5 step ≥ 0. */
export function parseDozenField(raw: string | number | null | undefined): number {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n * 2)) {
    throw new Error(DOZEN_STEP_MESSAGE);
  }
  return n;
}

/** "2.5" dozen of a 24-bottle dozen → 60 bottles. Throws on invalid input. */
export function dozenToBottles(raw: string | number | null | undefined, size = DEFAULT_PACK_SIZE): number {
  const bottles = Math.round(parseDozenField(raw) * packSizeOrDefault(size));
  if (bottles > MAX_PACK_QUANTITY) throw new Error('Quantity exceeds maximum');
  return bottles;
}

/** Like dozenToBottles but returns 0 for invalid input (for live previews). */
export function safeDozenToBottles(raw: string | number | null | undefined, size = DEFAULT_PACK_SIZE): number {
  try {
    return dozenToBottles(raw, size);
  } catch {
    return 0;
  }
}

export function isValidDozenField(raw: string | number | null | undefined): boolean {
  try {
    parseDozenField(raw);
    return true;
  } catch {
    return false;
  }
}

export function isHalfDozenBottles(n: number, size = DEFAULT_PACK_SIZE): boolean {
  return Number.isInteger(n) && Math.abs(n) % (packSizeOrDefault(size) / 2) === 0;
}

export function bottlesToDozen(bottles: number, size = DEFAULT_PACK_SIZE): number {
  return (Number(bottles) || 0) / packSizeOrDefault(size);
}

/** Dozen number text (no sign): 2.5 → "2.5", 8.333 → "8.33". */
export function formatDozenNumber(dozen: number): string {
  return String(Math.round(Math.abs(Number(dozen) || 0) * 100) / 100);
}

/** Bottle count → dozen number text: 30 (12/dz) → "2.5". */
export function dozenNumber(bottles: number, size = DEFAULT_PACK_SIZE): string {
  return formatDozenNumber(bottlesToDozen(bottles, size));
}

/** Already-summed dozens → "2.5 dz" (use when totals mix bottle types of different sizes). */
export function formatDozenValue(dozen: number): string {
  const sign = dozen < 0 ? '−' : '';
  return `${sign}${formatDozenNumber(dozen)} dz`;
}

/** Bottle count → "2.5 dz". */
export function formatDozen(bottles: number, size = DEFAULT_PACK_SIZE): string {
  return formatDozenValue(bottlesToDozen(bottles, size));
}

/** Signed display: "+2.5 dz", "−1 dz", "0 dz". */
export function formatSignedDozen(bottles: number, size = DEFAULT_PACK_SIZE): string {
  if (Math.abs(bottles) < 0.001) return '0 dz';
  const sign = bottles < 0 ? '−' : '+';
  return `${sign}${dozenNumber(bottles, size)} dz`;
}

/** Money for `bottles` at a per-dozen price, rounded to cents. */
export function perDozenTotal(
  pricePerDozen: number | string | null | undefined,
  bottles: number,
  size = DEFAULT_PACK_SIZE,
): number {
  const p = Number(pricePerDozen ?? 0) || 0;
  return Math.round(((p * bottles) / packSizeOrDefault(size)) * 100) / 100;
}

/** Short explainer, e.g. "1 dz = 24 bottles". */
export function dozenSizeLabel(size = DEFAULT_PACK_SIZE): string {
  return `1 dz = ${packSizeOrDefault(size)} bottles`;
}

type SizedRow = { id?: unknown; bottlesPerDozen?: unknown; unitsPerCase?: unknown; bottleTypeId?: unknown; bottleType?: unknown };

/** Build size lookups from API lists (bottle types and products). */
export function packSizeLookup(bottleTypes: SizedRow[] = [], products: SizedRow[] = []) {
  const byBottle = new Map<string, number>();
  for (const b of bottleTypes || []) byBottle.set(String(b.id), packSizeOrDefault(b.bottlesPerDozen));
  const byProduct = new Map<string, number>();
  for (const p of products || []) {
    const bt = p.bottleType as SizedRow | null | undefined;
    const fromBottle = p.bottleTypeId ? byBottle.get(String(p.bottleTypeId)) : undefined;
    byProduct.set(
      String(p.id),
      packSizeOrDefault(bt?.bottlesPerDozen ?? fromBottle ?? p.unitsPerCase),
    );
  }
  return {
    bottle: (id?: unknown) => (id != null && byBottle.get(String(id))) || DEFAULT_PACK_SIZE,
    product: (id?: unknown) => (id != null && byProduct.get(String(id))) || DEFAULT_PACK_SIZE,
  };
}

export type PackSizes = ReturnType<typeof packSizeLookup>;

export function projectBottleInternal(
  internalBefore: number,
  issuedEach: number,
  returnedEach: number,
): number {
  return internalBefore + issuedEach - returnedEach;
}
