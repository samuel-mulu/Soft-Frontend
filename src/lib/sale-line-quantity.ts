import { dozenToBottles, formatDozen, safeDozenToBottles } from './pack-quantity';

/** A sale line is entered in dozens only. Helpers return single-bottle counts for the API. */
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
export function lineSoldEach(line: SaleLine): number {
  return safeDozenToBottles(line.soldDozen);
}

/** Bottles returned on the line (0 when the field is blank or invalid). */
export function lineReturnedEach(line: SaleLine): number {
  return safeDozenToBottles(line.retDozen);
}

export function lineSoldEachStrict(line: SaleLine): number {
  return dozenToBottles(line.soldDozen);
}

export function lineReturnedEachStrict(line: SaleLine): number {
  return dozenToBottles(line.retDozen);
}

export function soldQtyLabel(line: SaleLine): string {
  return formatDozen(lineSoldEach(line));
}

export function returnedQtyLabel(line: SaleLine): string {
  return formatDozen(lineReturnedEach(line));
}
