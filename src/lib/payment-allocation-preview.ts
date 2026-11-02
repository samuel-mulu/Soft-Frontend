export type OpenCompensation = {
  id: string;
  remaining: number;
  createdAt?: string;
};

export type PaymentAllocationMode = 'AUTO' | 'COMPENSATION' | 'SALES';

export type PaymentAllocationPreview = {
  toCompensation: number;
  toSales: number;
  compensationLines: { bottleCompensationId: string; amount: number }[];
  drinkDebtAfter: number;
  compensationDebtAfter: number;
  totalOwedAfter: number;
  customerCreditAfter: number;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Mirrors backend FIFO: oldest open compensation first, then drink debt. */
export function previewPaymentAllocation(input: {
  paymentAmount: number;
  mode: PaymentAllocationMode;
  drinkOutstanding: number;
  compensationOutstanding: number;
  openCompensations: OpenCompensation[];
  selectedCompensationId?: string;
  moneyOutstanding: number;
}): PaymentAllocationPreview | null {
  const pay = n(input.paymentAmount);
  if (pay <= 0) return null;

  const drinkBefore = Math.max(0, n(input.drinkOutstanding));
  const compBefore = Math.max(0, n(input.compensationOutstanding));
  const moneyBefore = n(input.moneyOutstanding);

  if (input.mode === 'SALES') {
    const drinkAfter = Math.max(0, drinkBefore - pay);
    const compAfter = compBefore;
    const moneyAfter = moneyBefore - pay;
    return {
      toCompensation: 0,
      toSales: pay,
      compensationLines: [],
      drinkDebtAfter: drinkAfter,
      compensationDebtAfter: compAfter,
      totalOwedAfter: Math.max(0, drinkAfter + compAfter),
      customerCreditAfter: moneyAfter < -0.001 ? -moneyAfter : 0,
    };
  }

  if (input.mode === 'COMPENSATION') {
    const compId = input.selectedCompensationId;
    if (!compId) return null;
    const row = input.openCompensations.find((c) => c.id === compId);
    if (!row) return null;
    const rem = Math.max(0, n(row.remaining));
    if (pay > rem + 0.001) return null;
    const compAfter = compBefore - pay;
    const drinkAfter = drinkBefore;
    const moneyAfter = moneyBefore - pay;
    return {
      toCompensation: pay,
      toSales: 0,
      compensationLines: [{ bottleCompensationId: compId, amount: pay }],
      drinkDebtAfter: drinkAfter,
      compensationDebtAfter: Math.max(0, compAfter),
      totalOwedAfter: Math.max(0, drinkAfter + Math.max(0, compAfter)),
      customerCreditAfter: moneyAfter < -0.001 ? -moneyAfter : 0,
    };
  }

  let remaining = pay;
  const lines: { bottleCompensationId: string; amount: number }[] = [];
  const sorted = [...input.openCompensations].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
  );
  for (const comp of sorted) {
    if (remaining <= 0.001) break;
    const rem = Math.max(0, n(comp.remaining));
    if (rem <= 0.001) continue;
    const apply = Math.min(remaining, rem);
    lines.push({ bottleCompensationId: comp.id, amount: apply });
    remaining -= apply;
  }
  const toComp = pay - remaining;
  const toSales = remaining;
  const compAfter = Math.max(0, compBefore - toComp);
  const drinkAfter = Math.max(0, drinkBefore - toSales);
  const moneyAfter = moneyBefore - pay;

  return {
    toCompensation: toComp,
    toSales,
    compensationLines: lines,
    drinkDebtAfter: drinkAfter,
    compensationDebtAfter: compAfter,
    totalOwedAfter: Math.max(0, drinkAfter + compAfter),
    customerCreditAfter: moneyAfter < -0.001 ? -moneyAfter : 0,
  };
}
