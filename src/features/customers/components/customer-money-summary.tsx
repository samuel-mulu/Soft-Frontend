'use client';

import { presentCustomerBalance } from '@/lib/customer-balance';

type MoneyBreakdown = {
  drinkOutstanding?: unknown;
  compensationOutstanding?: unknown;
  customerCredit?: unknown;
  openingMoney?: unknown;
};

const n = (v: unknown) => Number(v || 0);

const toneCls = {
  danger: 'text-[#DC2626]',
  success: 'text-[#15803D]',
  neutral: 'text-[#64748B]',
} as const;

export function CustomerMoneySummary({
  moneyOutstanding,
  moneyBreakdown,
  compact,
  portal,
}: {
  moneyOutstanding: unknown;
  moneyBreakdown?: MoneyBreakdown;
  compact?: boolean;
  portal?: boolean;
}) {
  const viewer = portal ? 'customer' : 'staff';
  const net = presentCustomerBalance(n(moneyOutstanding), 'money', viewer);
  const drink = presentCustomerBalance(n(moneyBreakdown?.drinkOutstanding), 'money', viewer);
  const comp = presentCustomerBalance(n(moneyBreakdown?.compensationOutstanding), 'money', viewer);
  const opening = presentCustomerBalance(n(moneyBreakdown?.openingMoney), 'money', viewer);
  const creditInternal = n(moneyBreakdown?.customerCredit);
  const openingInternal = n(moneyBreakdown?.openingMoney);

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5">
      <p className="label mb-1">Money balance</p>
      <p className={`text-2xl md:text-3xl font-extrabold tabular-nums ${toneCls[net.tone]}`}>{net.formatted}</p>
      <p className={`text-sm font-semibold mt-1 ${toneCls[net.tone]}`}>{net.label}</p>
      {!compact && (
        <ul className="mt-4 space-y-2 text-sm">
          {Math.abs(openingInternal) > 0.001 && (
            <li className="flex justify-between gap-3 items-center">
              <span className="muted">Opening (manual → digital)</span>
              <span className={`font-bold tabular-nums ${toneCls[opening.tone]}`}>{opening.formatted}</span>
            </li>
          )}
          <li className="flex justify-between gap-3 items-center">
            <span className="muted">Drink purchases</span>
            <span className={`font-bold tabular-nums ${toneCls[drink.tone]}`}>{drink.formatted}</span>
          </li>
          <li className="flex justify-between gap-3 items-center">
            <span className="muted">Bottle compensation</span>
            <span className={`font-bold tabular-nums ${toneCls[comp.tone]}`}>{comp.formatted}</span>
          </li>
          {creditInternal > 0.001 && (
            <li className="flex justify-between gap-3">
              <span className="muted">Available credit</span>
              <span className="font-bold tabular-nums text-[#15803D]">
                {presentCustomerBalance(-creditInternal, 'money', viewer).formatted}
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
