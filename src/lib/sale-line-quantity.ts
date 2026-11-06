import { DEFAULT_PACK_SIZE, dozenToBottles, formatDozen, safeDozenToBottles } from './pack-quantity';

/**
 * A sale line is entered in dozens only. Helpers return single-bottle counts for the API,
 * using the product's dozen size (`size`, e.g. 12 or 24).
 */
export type SaleLine = {
  productId: string;
  soldDozen: string;
  retDozen: string;
  retEdited?: boolean;
  linePaid?: string;
  lineMethod?: string;
  linePaidEdited?: boolean;
};

export function emptySaleLine(): SaleLine {
  return {
    productId: '',
    soldDozen: '',
    retDozen: '',
    retEdited: false,
  };
}

/** Bottles sold on the line (0 when the field is blank or invalid). */
export function lineSoldEach(line: SaleLine, size = DEFAULT_PACK_SIZE): number {
  return safeDozenToBottles(line.soldDozen, size);
}

/** Bottles returned on the line (0 when the field is blank or invalid). */
export function lineReturnedEach(line: SaleLine, size = DEFAULT_PACK_SIZE): number {
  return safeDozenToBottles(line.retDozen, size);
}

export function lineSoldEachStrict(line: SaleLine, size = DEFAULT_PACK_SIZE): number {
  return dozenToBottles(line.soldDozen, size);
}

export function lineReturnedEachStrict(line: SaleLine, size = DEFAULT_PACK_SIZE): number {
  return dozenToBottles(line.retDozen, size);
}

export function soldQtyLabel(line: SaleLine, size = DEFAULT_PACK_SIZE): string {
  return formatDozen(lineSoldEach(line, size), size);
}

export function returnedQtyLabel(line: SaleLine, size = DEFAULT_PACK_SIZE): string {
  return formatDozen(lineReturnedEach(line, size), size);
}
