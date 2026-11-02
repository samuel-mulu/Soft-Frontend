'use client';

import { money } from '@/lib/api';
import { toDisplayMoney, balanceTone } from '@/lib/customer-balance';

type MoneyBreakdown = {
  drinkOutstanding?: unknown;
  compensationOutstanding?: unknown;
  customerCredit?: unknown;
};

const n = (v: unknown) => Number(v || 0);

function humanMoneyOwed(internalOutstanding: number, portal?: boolean): string {
  const display = toDisplayMoney(internalOutstanding);
  if (Math.abs(display) < 0.001) return 'Account settled — no balance owed';
  if (display < 0) {
    const amt = money(Math.abs(display));
    return portal ? `You owe ${amt}` : `Customer owes ${amt}`;
  }
  return portal ? `Your credit ${money(display)}` : `Customer credit ${money(display)}`;
}

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
  const internal = n(moneyOutstanding);
  const display = toDisplayMoney(internal);
  const tone = balanceTone(display);
  const toneCls =
    tone === 'danger' ? 'text-[#DC2626]' : tone === 'success' ? 'text-[#15803D]' : 'text-primary';

  const drink = n(moneyBreakdown?.drinkOutstanding);
  const comp = n(moneyBreakdown?.compensationOutstanding);
  const credit = n(moneyBreakdown?.customerCredit);

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5">
      <p className="label mb-1">Money balance</p>
      <p className={`text-xl md:text-2xl font-extrabold tabular-nums ${toneCls}`}>
        {humanMoneyOwed(internal, portal)}
      </p>
      {!compact && (
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex justify-between gap-3">
            <span className="muted">Drink sales outstanding</span>
            <span className="font-bold tabular-nums">{drink > 0.001 ? money(drink) : '—'}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span className="muted">Bottle compensation outstanding</span>
            <span className="font-bold tabular-nums">{comp > 0.001 ? money(comp) : '—'}</span>
          </li>
          {credit > 0.001 && (
            <li className="flex justify-between gap-3">
              <span className="muted">Available customer credit</span>
              <span className="font-bold tabular-nums text-[#15803D]">{money(credit)}</span>
            </li>
          )}
          <li className="flex justify-between gap-3 border-t border-border pt-2">
            <span className="font-semibold">Total owed (drinks + compensation)</span>
            <span className="font-extrabold tabular-nums">{money(Math.max(0, drink + comp))}</span>
          </li>
        </ul>
      )}
    </section>
  );
}
