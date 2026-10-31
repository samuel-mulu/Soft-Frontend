'use client';

import {
  BALANCE_COLORS,
  balanceTone,
  formatDisplayBottle,
  formatDisplayBottleDozenEach,
  formatDisplayMoney,
  toDisplayBottle,
  toDisplayMoney,
  type BalanceTone,
} from '@/lib/customer-balance';
import { BottleDisplayToggle, useBottleDisplayMode } from '@/components/bottle-display-mode';

const toneClass: Record<BalanceTone, string> = {
  danger: 'balance-danger',
  success: 'balance-success',
  neutral: 'balance-neutral',
};

function toneStyle(tone: BalanceTone): { color: string } | undefined {
  const color =
    tone === 'danger'
      ? BALANCE_COLORS.danger
      : tone === 'success'
        ? BALANCE_COLORS.success
        : BALANCE_COLORS.neutral;
  return { color };
}

type Size = 'sm' | 'md' | 'lg';

const sizeClass: Record<Size, string> = {
  sm: 'text-sm font-bold tabular-nums',
  md: 'text-base font-extrabold tabular-nums',
  lg: 'text-2xl font-extrabold tabular-nums',
};

export function BalanceDisplay({
  display,
  formatted,
  size = 'md',
  title,
}: {
  display: number;
  formatted: string;
  size?: Size;
  title?: string;
}) {
  const tone = balanceTone(display);
  return (
    <span
      className={`${sizeClass[size]} ${toneClass[tone]}`}
      style={toneStyle(tone)}
      title={title}
    >
      {formatted}
    </span>
  );
}

export function MoneyBalance({
  internal,
  size = 'md',
}: {
  internal: number;
  size?: Size;
}) {
  const display = toDisplayMoney(internal);
  return (
    <BalanceDisplay
      display={display}
      formatted={formatDisplayMoney(display)}
      size={size}
      title={display < 0 ? 'Customer owes money' : display > 0 ? 'Customer credit' : 'Settled'}
    />
  );
}

export function BottleBalance({
  internal,
  size = 'md',
  suffix,
  displayMode: displayModeProp,
}: {
  internal: number;
  size?: Size;
  suffix?: string;
  displayMode?: 'each' | 'dozenEach';
}) {
  const { mode: ctxMode } = useBottleDisplayMode();
  const mode = displayModeProp ?? ctxMode;
  const display = toDisplayBottle(internal);
  const formatted =
    mode === 'dozenEach'
      ? formatDisplayBottleDozenEach(display, suffix)
      : formatDisplayBottle(display, suffix);
  return (
    <BalanceDisplay
      display={display}
      formatted={formatted}
      size={size}
      title={
        display < 0 ? 'Bottles held by customer' : display > 0 ? 'Extra bottles returned' : 'Settled'
      }
    />
  );
}

export function BottleBalanceList({
  rows,
  bottleName,
  showToggle,
}: {
  rows: { bottleTypeId: string; outstanding: number | unknown }[];
  bottleName: (id: string) => string;
  showToggle?: boolean;
}) {
  if (!rows?.length) {
    return <span className="balance-neutral font-bold text-sm tabular-nums">0</span>;
  }
  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      {showToggle && (
        <div className="mb-0.5">
          <BottleDisplayToggle compact />
        </div>
      )}
      {rows.map((b) => (
        <div key={b.bottleTypeId} className="text-sm leading-tight flex items-baseline gap-1.5 flex-wrap">
          <BottleBalance internal={Number(b.outstanding || 0)} size="sm" />
          <span className="font-medium text-muted-foreground">{bottleName(b.bottleTypeId)}</span>
        </div>
      ))}
    </div>
  );
}

export function CustomerBalanceSummary({
  moneyInternal,
  bottleRows,
  bottleName,
  projectedMoneyInternal,
  projectedBottleRows,
}: {
  moneyInternal: number;
  bottleRows: { bottleTypeId: string; outstanding: number }[];
  bottleName: (id: string) => string;
  projectedMoneyInternal?: number;
  projectedBottleRows?: { bottleTypeId: string; outstanding: number }[];
}) {
  return (
    <div className="space-y-3">
      <div className="fs-section-surface p-4">
        <p className="fs-label mb-1.5">Payment balance</p>
        <MoneyBalance internal={moneyInternal} size="lg" />
        {projectedMoneyInternal !== undefined && (
          <p className="fs-helper mt-2">
            After sale: <MoneyBalance internal={projectedMoneyInternal} size="sm" />
          </p>
        )}
      </div>
      {(bottleRows.length > 0 || (projectedBottleRows && projectedBottleRows.length > 0)) && (
        <div className="fs-section-surface p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="fs-label mb-0">Bottle balance</p>
            <BottleDisplayToggle compact />
          </div>
          <BottleBalanceList rows={bottleRows} bottleName={bottleName} />
          {projectedBottleRows && projectedBottleRows.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="fs-label mb-1.5">After sale</p>
              <BottleBalanceList rows={projectedBottleRows} bottleName={bottleName} />
            </div>
          )}
        </div>
      )}
      <p className="fs-helper">
        − red: customer owes · + green: credit or extra bottles returned · 0: settled
      </p>
    </div>
  );
}
