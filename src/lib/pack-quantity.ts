/**
 * FlowStock works by the dozen.
 * - Users only type and see dozens, in half-dozen steps (1, 1.5, 2 …).
 * - The API still stores single bottles: 1 dozen = 12 bottles (always a multiple of 6).
 * - Prices are per dozen: money = price × bottles / 12.
 */

export const UNITS_PER_DOZEN = 12;
export const HALF_DOZEN = 6;

export const MAX_PACK_QUANTITY = 1_000_000;

export const DOZEN_STEP_MESSAGE = 'Use whole or half dozens (e.g. 1, 1.5, 2)';

/** Parse a dozen text field. Blank → 0. Throws unless it is a 0.5 step ≥ 0. */
export function parseDozenField(raw: string | number | null | undefined): number {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n * 2)) {
    throw new Error(DOZEN_STEP_MESSAGE);
  }
  if (n * UNITS_PER_DOZEN > MAX_PACK_QUANTITY) {
    throw new Error('Quantity exceeds maximum');
  }
  return n;
}

/** "2.5" dozen → 30 bottles. Throws on invalid input. */
export function dozenToBottles(raw: string | number | null | undefined): number {
  return Math.round(parseDozenField(raw) * UNITS_PER_DOZEN);
}

/** Like dozenToBottles but returns 0 for invalid input (for live previews). */
export function safeDozenToBottles(raw: string | number | null | undefined): number {
  try {
    return dozenToBottles(raw);
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

export function isHalfDozenBottles(n: number): boolean {
  return Number.isInteger(n) && Math.abs(n) % HALF_DOZEN === 0;
}

export function bottlesToDozen(bottles: number): number {
  return (Number(bottles) || 0) / UNITS_PER_DOZEN;
}

/** Bottle count → dozen number text: 30 → "2.5", 24 → "2". */
export function dozenNumber(bottles: number): string {
  const v = Math.abs(bottlesToDozen(bottles));
  const rounded = Math.round(v * 100) / 100;
  return String(rounded);
}

/** Bottle count → "2.5 dz". */
export function formatDozen(bottles: number): string {
  const sign = bottles < 0 ? '−' : '';
  return `${sign}${dozenNumber(bottles)} dz`;
}

/** Signed display: "+2.5 dz", "−1 dz", "0 dz". */
export function formatSignedDozen(bottles: number): string {
  if (Math.abs(bottles) < 0.001) return '0 dz';
  const sign = bottles < 0 ? '−' : '+';
  return `${sign}${dozenNumber(bottles)} dz`;
}

/** Money for `bottles` at a per-dozen price, rounded to cents. */
export function perDozenTotal(pricePerDozen: number | string | null | undefined, bottles: number): number {
  const p = Number(pricePerDozen ?? 0) || 0;
  return Math.round(((p * bottles) / UNITS_PER_DOZEN) * 100) / 100;
}

export function projectBottleInternal(
  internalBefore: number,
  issuedEach: number,
  returnedEach: number,
): number {
  return internalBefore + issuedEach - returnedEach;
}
