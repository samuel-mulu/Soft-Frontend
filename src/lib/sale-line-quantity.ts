import {
  QtyEntryMode,
  UNITS_PER_DOZEN,
  formatEachBreakdown,
  formatQtyEntryLabel,
  parseQtyField,
  qtyFromMode,
  toEach,
} from './pack-quantity';

export type SaleLine = {
  productId: string;
  qtyMode: QtyEntryMode;
  soldDozen: string;
  soldEach: string;
  retMode: QtyEntryMode;
  retDozen: string;
  retEach: string;
  retEdited?: boolean;
  linePaid?: string;
  lineMethod?: string;
  linePaidEdited?: boolean;
};

export function emptySaleLine(): SaleLine {
  return {
    productId: '',
    qtyMode: 'each',
    soldDozen: '',
    soldEach: '',
    retMode: 'each',
    retDozen: '',
    retEach: '',
    retEdited: false,
  };
}

export function lineSoldEach(line: SaleLine): number {
  try {
    return qtyFromMode(line.qtyMode, line.soldDozen, line.soldEach, UNITS_PER_DOZEN);
  } catch {
    return 0;
  }
}

export function lineReturnedEach(line: SaleLine): number {
  try {
    return qtyFromMode(line.retMode, line.retDozen, line.retEach, UNITS_PER_DOZEN);
  } catch {
    return 0;
  }
}

export function lineSoldEachStrict(line: SaleLine): number {
  return qtyFromMode(line.qtyMode, line.soldDozen, line.soldEach, UNITS_PER_DOZEN);
}

export function lineReturnedEachStrict(line: SaleLine): number {
  return qtyFromMode(line.retMode, line.retDozen, line.retEach, UNITS_PER_DOZEN);
}

export function soldQtyLabel(line: SaleLine): string {
  const total = lineSoldEach(line);
  return formatQtyEntryLabel(line.qtyMode, line.soldDozen, line.soldEach, total);
}

export function returnedQtyLabel(line: SaleLine): string {
  const total = lineReturnedEach(line);
  return formatQtyEntryLabel(line.retMode, line.retDozen, line.retEach, total);
}

export function soldEquivalentHint(line: SaleLine): string | null {
  const total = lineSoldEach(line);
  if (total < 1) return null;
  return `${total} unit${total === 1 ? '' : 's'}`;
}

export function returnedEquivalentHint(line: SaleLine): string | null {
  const total = lineReturnedEach(line);
  if (total < 1) return null;
  return `${total} bottle${total === 1 ? '' : 's'}`;
}

export { formatEachBreakdown, parseQtyField, toEach };
