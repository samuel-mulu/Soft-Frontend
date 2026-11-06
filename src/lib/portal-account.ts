/** Customer portal account view models (read-only presentation). */
import { formatDozen } from './pack-quantity';

export type PortalMoneyStatus = 'settled' | 'owe' | 'credit';

export function portalMoneyStatus(internalOutstanding: number): {
  status: PortalMoneyStatus;
  headline: string;
  amountEtb: number;
} {
  const internal = Number(internalOutstanding || 0);
  if (Math.abs(internal) < 0.001) {
    return { status: 'settled', headline: 'Account settled', amountEtb: 0 };
  }
  if (internal > 0) {
    return { status: 'owe', headline: 'Amount to pay', amountEtb: internal };
  }
  return { status: 'credit', headline: 'Available credit', amountEtb: -internal };
}

export type BottleSummaryLine = {
  bottleTypeId: string;
  name: string;
  capacityLabel?: string;
  internal: number;
  owed: number;
  credit: number;
  statusLabel: string;
};

export function buildBottleSummaryLines(
  summaryLines: { bottleTypeId: string; outstanding: number }[],
  bottleTypes: { id: string; name?: string; capacityLabel?: string }[],
): BottleSummaryLine[] {
  const nameOf = (id: string) =>
    String(bottleTypes.find((b) => String(b.id) === id)?.name || 'Bottle');
  const capOf = (id: string) => bottleTypes.find((b) => String(b.id) === id)?.capacityLabel;

  return summaryLines.map((row) => {
    const internal = Number(row.outstanding || 0);
    const owed = internal > 0.001 ? internal : 0;
    const credit = internal < -0.001 ? -internal : 0;
    let statusLabel = 'Settled';
    if (owed > 0) statusLabel = 'Return bottles';
    else if (credit > 0) statusLabel = 'Bottle credit';
    return {
      bottleTypeId: row.bottleTypeId,
      name: nameOf(row.bottleTypeId),
      capacityLabel: capOf(row.bottleTypeId) ? String(capOf(row.bottleTypeId)) : undefined,
      internal,
      owed,
      credit,
      statusLabel,
    };
  });
}

export type PortalPaymentRow = {
  id: string;
  at: string;
  category: 'payment' | 'charge';
  title: string;
  amountEtb: number;
  method?: string;
  status?: string;
};

function n(v: unknown): number {
  return Number(v || 0);
}

function payMethodLabel(m: unknown): string {
  const x = String(m || 'CASH').toUpperCase();
  if (x === 'CASH') return 'Cash';
  if (x === 'BANK') return 'Bank';
  if (x === 'MOBILE') return 'Mobile';
  return String(m || '');
}

export function buildPortalPaymentRows(history: Record<string, unknown>): PortalPaymentRow[] {
  const rows: PortalPaymentRow[] = [];
  const sales = (history.sales as Record<string, unknown>[]) || [];
  const compensations = (history.compensations as Record<string, unknown>[]) || [];
  const payments = (history.payments as Record<string, unknown>[]) || [];

  for (const sale of sales) {
    if (String(sale.status) !== 'POSTED') continue;
    const inv = sale.invoiceNo ? String(sale.invoiceNo) : 'Invoice';
    rows.push({
      id: `sale-${sale.id}`,
      at: String(sale.createdAt),
      category: 'charge',
      title: `Drink purchase · ${inv}`,
      amountEtb: n(sale.total),
      status: 'Charge',
    });
  }

  for (const c of compensations) {
    const bt = (c.bottleType as Record<string, unknown> | undefined)?.name || 'bottles';
    rows.push({
      id: `comp-${c.id}`,
      at: String(c.createdAt),
      category: 'charge',
      title: `Bottle compensation · ${formatDozen(Number(c.quantity || 0))} ${bt}`,
      amountEtb: n(c.totalAmount),
      status: String(c.status || 'Charge'),
    });
  }

  for (const p of payments) {
    const purpose = String(p.purpose || 'GENERAL');
    const allocComp = n(p.allocatedToCompensation);
    const allocSales = n(p.allocatedToSales);
    let title = 'Payment received';
    if (purpose === 'COMPENSATION') title = 'Compensation payment';
    else if (allocComp > 0 && allocSales > 0) {
      title = `Payment · compensation ${allocComp.toFixed(0)} ETB · drinks ${allocSales.toFixed(0)} ETB`;
    } else if (allocComp > 0) title = 'Payment toward bottle compensation';
    else if (allocSales > 0) title = 'Payment toward drink purchases';

    rows.push({
      id: `pay-${p.id}`,
      at: String(p.createdAt),
      category: 'payment',
      title,
      amountEtb: n(p.amount),
      method: payMethodLabel(p.method),
      status: 'Received',
    });
  }

  return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export type PortalBottleRow = {
  id: string;
  at: string;
  bottleTypeName: string;
  title: string;
  quantity: number;
  direction: 'out' | 'in';
};

export function portalBottleMovementLabel(reason: string, delta: number): { title: string; direction: 'out' | 'in' } {
  const qty = formatDozen(Math.abs(delta));
  switch (reason) {
    case 'SALE':
      return { title: `${qty} issued`, direction: 'out' };
    case 'RETURN':
      return { title: `${qty} returned`, direction: 'in' };
    case 'COMPENSATION':
      return { title: `${qty} settled by compensation`, direction: 'in' };
    case 'BROKEN_WAIVED':
      return { title: `${qty} — damaged (liability waived)`, direction: 'in' };
    case 'ADJUSTMENT':
      return {
        title: delta > 0 ? `${qty} added to your account` : `${qty} removed from your account`,
        direction: delta > 0 ? 'out' : 'in',
      };
    default:
      return { title: `${qty} updated`, direction: delta > 0 ? 'out' : 'in' };
  }
}

export function buildPortalBottleRows(history: Record<string, unknown>): PortalBottleRow[] {
  const movements = (history.bottles as Record<string, unknown>[]) || [];
  return movements.map((m) => {
    const reason = String(m.reason || '');
    const delta = n(m.delta);
    const { title, direction } = portalBottleMovementLabel(reason, delta);
    const bt = m.bottleType as Record<string, unknown> | undefined;
    return {
      id: String(m.id),
      at: String(m.createdAt),
      bottleTypeName: String(bt?.name || 'Bottle'),
      title,
      quantity: Math.abs(delta),
      direction,
    };
  });
}

export type PortalDamagedRow = {
  id: string;
  at: string;
  bottleTypeName: string;
  quantity: number;
  liabilityLabel: string;
};

export function buildPortalDamagedRows(history: Record<string, unknown>): PortalDamagedRow[] {
  const records = (history.damagedRecords as Record<string, unknown>[]) || [];
  return records.map((r) => {
    const status = String(r.liabilityStatus || 'OWED');
    let liabilityLabel = 'Bottles still counted on your return balance';
    if (status === 'WAIVED') liabilityLabel = 'Liability waived';
    else if (status === 'COMPENSATED') liabilityLabel = 'Settled by compensation charge';
    const bt = r.bottleType as Record<string, unknown> | undefined;
    return {
      id: String(r.id),
      at: String(r.createdAt),
      bottleTypeName: String(bt?.name || 'Bottle'),
      quantity: n(r.quantity),
      liabilityLabel,
    };
  });
}
