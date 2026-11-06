import { DEFAULT_PACK_SIZE, bottlesToDozen, dozenNumber, formatSignedDozen } from './pack-quantity';

/**
 * FlowStock display convention (owner view).
 * Internal ledger: moneyOutstanding = sales - payments (>0 = customer owes).
 * Internal bottles: sum(delta) (>0 = empties with customer).
 * Display: negate once — negative RED = owes, positive GREEN = credit/surplus.
 * Bottles are always shown in dozens (internal values are single bottles).
 */

export type BalanceTone = 'danger' | 'success' | 'neutral';

export const BALANCE_COLORS = {
  danger: '#DC2626',
  success: '#15803D',
  neutral: '#64748B',
  brand: '#166534',
} as const;

export function toDisplayMoney(internal: number): number {
  if (Math.abs(internal) < 0.001) return 0;
  return -internal;
}

export function toDisplayBottle(internal: number): number {
  if (Math.abs(internal) < 0.001) return 0;
  return -internal;
}

export function balanceTone(display: number): BalanceTone {
  if (Math.abs(display) < 0.001) return 'neutral';
  return display < 0 ? 'danger' : 'success';
}

function formatSignedNumber(display: number, decimals: number): string {
  if (Math.abs(display) < 0.001) return '0';
  const abs = Math.abs(display);
  const fig =
    decimals === 0
      ? String(Math.round(abs))
      : abs.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  return display < 0 ? `−${fig}` : `+${fig}`;
}

export function formatDisplayMoney(display: number): string {
  if (Math.abs(display) < 0.001) return '0 ETB';
  return `${formatSignedNumber(display, 2)} ETB`;
}

/** Signed bottle balance in dozens, e.g. "−2.5 dz". `display` is in single bottles; `perDozen` is the dozen size. */
export function formatDisplayBottle(display: number, suffix = '', perDozen = DEFAULT_PACK_SIZE): string {
  const core = formatSignedDozen(display, perDozen);
  return suffix ? `${core} ${suffix}` : core;
}

export function moneyLabel(display: number): string {
  if (Math.abs(display) < 0.001) return 'Settled';
  return display < 0 ? 'Customer owes' : 'Customer credit';
}

export function bottleLabel(display: number): string {
  if (Math.abs(display) < 0.001) return 'Settled';
  return display < 0 ? 'Customer owes bottles' : 'Customer bottle credit';
}

export type BalanceViewer = 'staff' | 'customer';

export type PresentedBalance = {
  /** Customer-perspective amount. Negative = owes, positive = credit. */
  display: number;
  tone: BalanceTone;
  formatted: string;
  /** Wording changes by viewer; the sign does not. */
  label: string;
};

function absMoney(display: number): string {
  return formatDisplayMoney(Math.abs(display)).replace(/^[−+]/, '');
}

function absBottles(display: number, perDozen = DEFAULT_PACK_SIZE): string {
  return `${dozenNumber(display, perDozen)} dz`;
}

/**
 * Single presentation of an INTERNAL ledger value.
 * Money internal: sales + compensation − payments (>0 customer owes).
 * Bottle internal: sum of deltas (>0 bottles still with customer).
 * Converted exactly once. Viewer only changes the sentence, never the sign.
 */
export function presentCustomerBalance(
  internal: number,
  kind: 'money' | 'bottle',
  viewer: BalanceViewer = 'staff',
  /** Dozen size of the bottle type (bottle balances only). */
  perDozen = DEFAULT_PACK_SIZE,
): PresentedBalance {
  const display = kind === 'money' ? toDisplayMoney(internal) : toDisplayBottle(internal);
  const tone = balanceTone(display);
  const formatted =
    kind === 'money' ? formatDisplayMoney(display) : formatDisplayBottle(display, '', perDozen);

  if (Math.abs(display) < 0.001) {
    return { display: 0, tone, formatted, label: 'Settled' };
  }

  if (kind === 'money') {
    const amt = absMoney(display);
    if (display < 0) {
      return {
        display,
        tone,
        formatted,
        label: viewer === 'customer' ? `You need to pay ${amt}` : `Customer owes ${amt}`,
      };
    }
    return {
      display,
      tone,
      formatted,
      label: viewer === 'customer' ? `You have ${amt} credit` : `Customer has ${amt} credit`,
    };
  }

  const qty = absBottles(display, perDozen);
  if (display < 0) {
    return {
      display,
      tone,
      formatted,
      label:
        viewer === 'customer'
          ? `You need to return ${qty}`
          : `Customer owes ${qty}`,
    };
  }
  return {
    display,
    tone,
    formatted,
    label:
      viewer === 'customer'
        ? `You have ${qty} credit`
        : `Customer has ${qty} credit`,
  };
}

/** Project account money after a sale (internal before + saleTotal - payment). */
export function projectDisplayMoney(
  internalMoneyBefore: number,
  saleTotal: number,
  paymentReceived: number,
): number {
  return -(internalMoneyBefore + saleTotal - paymentReceived);
}

/** Project bottle balance for one type after issue/return counts (single bottles). */
export function projectDisplayBottle(
  internalBefore: number,
  issued: number,
  returned: number,
): number {
  return -(internalBefore + issued - returned);
}

export type BottleBalanceRow = { bottleTypeId: string; internal: number; display: number };

export function mapBottleRows(
  rows: { bottleTypeId: string; outstanding: number }[],
): BottleBalanceRow[] {
  return rows.map((r) => ({
    bottleTypeId: r.bottleTypeId,
    internal: r.outstanding,
    display: toDisplayBottle(r.outstanding),
  }));
}

/** Ledger buckets from internal bottle outstanding (see file header). */
export type BottleLedgerTotals = {
  /** Empties still with customers (internal positive). Single bottles. */
  withCustomer: number;
  /** Same buckets in dozens (each bottle type counted with its own dozen size). */
  withCustomerDozen: number;
  fromCustomerDozen: number;
  netDozen: number;
  /** Extra returns / surplus from customers (internal negative, as positive magnitude). */
  fromCustomer: number;
  /** Net internal sum (withCustomer − fromCustomer). */
  netInternal: number;
};

type SizeOf = (bottleTypeId: string) => number;

export function bottleLedgerTotals(
  rows: { outstanding: number; bottleTypeId?: string }[],
  sizeOf: SizeOf = () => DEFAULT_PACK_SIZE,
): BottleLedgerTotals {
  let withCustomer = 0;
  let fromCustomer = 0;
  let withCustomerDozen = 0;
  let fromCustomerDozen = 0;
  for (const row of rows) {
    const internal = Number(row.outstanding || 0);
    const size = sizeOf(String(row.bottleTypeId ?? ''));
    if (internal > 0.001) {
      withCustomer += internal;
      withCustomerDozen += bottlesToDozen(internal, size);
    } else if (internal < -0.001) {
      fromCustomer += -internal;
      fromCustomerDozen += bottlesToDozen(-internal, size);
    }
  }
  return {
    withCustomer,
    fromCustomer,
    netInternal: withCustomer - fromCustomer,
    withCustomerDozen,
    fromCustomerDozen,
    netDozen: withCustomerDozen - fromCustomerDozen,
  };
}

export function aggregateCustomersBottleBalances(
  customers: { bottleBalances?: { outstanding: number; bottleTypeId?: string }[] }[],
  sizeOf: SizeOf = () => DEFAULT_PACK_SIZE,
): BottleLedgerTotals {
  let withCustomer = 0;
  let fromCustomer = 0;
  let withCustomerDozen = 0;
  let fromCustomerDozen = 0;
  for (const c of customers) {
    const part = bottleLedgerTotals(c.bottleBalances || [], sizeOf);
    withCustomer += part.withCustomer;
    fromCustomer += part.fromCustomer;
    withCustomerDozen += part.withCustomerDozen;
    fromCustomerDozen += part.fromCustomerDozen;
  }
  return {
    withCustomer,
    fromCustomer,
    netInternal: withCustomer - fromCustomer,
    withCustomerDozen,
    fromCustomerDozen,
    netDozen: withCustomerDozen - fromCustomerDozen,
  };
}
