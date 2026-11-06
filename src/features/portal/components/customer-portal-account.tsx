'use client';

import { useMemo, useState } from 'react';
import { Wallet, Wine, AlertTriangle } from 'lucide-react';
import { usePortalHistory } from '@/hooks/queries';
import { money, date } from '@/lib/api';
import { LoadError, SkeletonStatGrid } from '@/components/ui/skeleton';
import { SubtleRefreshIndicator } from '@/components/shared/subtle-refresh-indicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildBottleSummaryLines,
  buildPortalBottleRows,
  buildPortalDamagedRows,
  buildPortalPaymentRows,
  type PortalPaymentRow,
} from '@/lib/portal-account';
import { presentCustomerBalance } from '@/lib/customer-balance';
import { formatDozen } from '@/lib/pack-quantity';

type R = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

type PayFilter = 'all' | 'payments' | 'charges';

const toneCls = {
  danger: 'text-[#DC2626]',
  success: 'text-[#15803D]',
  neutral: 'text-[#192821]',
} as const;

function PortalSignedMoney({ internal, className = '' }: { internal: number; className?: string }) {
  const presented = presentCustomerBalance(internal, 'money', 'customer');
  return (
    <span className={`font-extrabold tabular-nums ${toneCls[presented.tone]} ${className}`}>
      {presented.formatted}
    </span>
  );
}

function PortalSignedBottles({ internal, className = '' }: { internal: number; className?: string }) {
  const presented = presentCustomerBalance(internal, 'bottle', 'customer');
  return (
    <span className={`font-extrabold tabular-nums ${toneCls[presented.tone]} ${className}`}>
      {presented.formatted}
    </span>
  );
}

function formatPortalDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function WalletCard({ history }: { history: R }) {
  const mb = history.moneyBreakdown as R | undefined;
  const moneyInternal = n(history.moneyOutstanding);
  const drink = n(mb?.drinkOutstanding);
  const comp = n(mb?.compensationOutstanding);
  const net = presentCustomerBalance(moneyInternal, 'money', 'customer');

  return (
    <section className="rounded-2xl border border-[#d8e3da] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Account balance (ETB)</p>
        <span className="rounded-xl bg-[#eaf5ed] p-2.5 text-[#166534]">
          <Wallet size={22} />
        </span>
      </div>
      <PortalSignedMoney internal={moneyInternal} className="text-3xl tracking-tight block" />
      <p className={`text-sm font-semibold mt-1 ${toneCls[net.tone]}`}>{net.label}</p>
      <ul className="mt-4 pt-4 border-t border-[#edf2ed] space-y-2 text-sm">
        <li className="flex justify-between gap-2 items-center">
          <span className="text-[#64748B]">Drink purchases</span>
          {drink > 0.001 ? (
            <PortalSignedMoney internal={drink} className="text-sm" />
          ) : (
            <span className="font-bold tabular-nums text-[#64748B]">0 ETB</span>
          )}
        </li>
        <li className="flex justify-between gap-2 items-center">
          <span className="text-[#64748B]">Bottle compensation</span>
          {comp > 0.001 ? (
            <PortalSignedMoney internal={comp} className="text-sm" />
          ) : (
            <span className="font-bold tabular-nums text-[#64748B]">0 ETB</span>
          )}
        </li>
      </ul>
    </section>
  );
}

function BottleSummary({ history, lines }: { history: R; lines: ReturnType<typeof buildBottleSummaryLines> }) {
  const movements = (history.bottles as unknown[]) || [];
  const totalOwed = lines.reduce((s, l) => s + l.owed, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const hasHistory = movements.length > 0;

  return (
    <section className="rounded-2xl border border-[#d8e3da] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Wine size={18} className="text-[#166534]" />
        <h2 className="font-extrabold text-base">Returnable bottles</h2>
      </div>
      {!hasHistory ? (
        <p className="text-sm text-[#64748B]">No bottle history on your account yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-[#edf2ed] bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-[#64748B]">You return to us</p>
              <PortalSignedBottles internal={totalOwed} className="text-xl mt-0.5 block" />
            </div>
            <div className="rounded-xl border border-[#edf2ed] bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-[#64748B]">We hold for you</p>
              <PortalSignedBottles internal={-totalCredit} className="text-xl mt-0.5 block" />
            </div>
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-[#64748B]">See the Bottles tab for movement history.</p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.bottleTypeId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#edf2ed] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-bold">{line.name}</p>
                    {line.capacityLabel && (
                      <p className="text-xs text-[#64748B]">{line.capacityLabel}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <PortalSignedBottles internal={line.internal} className="text-lg" />
                    <p className="text-[10px] font-semibold text-[#64748B]">
                      {presentCustomerBalance(line.internal, 'bottle', 'customer').label}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function TransactionList({
  rows,
  empty,
  renderAmount,
}: {
  rows: { id: string; at: string; title: string; subtitle?: string; badge?: string }[];
  empty: string;
  renderAmount: (id: string) => React.ReactNode;
}) {
  if (!rows.length) {
    return <p className="text-sm text-[#64748B] py-8 text-center">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-[#edf2ed]">
      {rows.map((r) => (
        <li key={r.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug">{r.title}</p>
            <p className="text-xs text-[#64748B]">{formatPortalDate(r.at)}</p>
            {r.subtitle && <p className="text-xs text-[#64748B] mt-0.5">{r.subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:text-right">
            {r.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f4f8f5] text-[#166534]">
                {r.badge}
              </span>
            )}
            {renderAmount(r.id)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CustomerPortalAccount() {
  const { data, isLoading, error, isFetching, isSuccess } = usePortalHistory(true);
  const history = data as R | undefined;
  const [payFilter, setPayFilter] = useState<PayFilter>('all');

  const bottleTypes = useMemo(
    () => (Array.isArray(history?.bottleTypes) ? history!.bottleTypes : []) as R[],
    [history?.bottleTypes],
  );

  const summaryLines = useMemo(() => {
    const raw =
      (Array.isArray(history?.bottleSummaryLines) ? history!.bottleSummaryLines : null) ||
      (Array.isArray(history?.bottleBalances) ? history!.bottleBalances : []);
    return buildBottleSummaryLines(
      raw as { bottleTypeId: string; outstanding: number }[],
      bottleTypes as { id: string; name?: string; capacityLabel?: string }[],
    );
  }, [history, bottleTypes]);

  const paymentRows = useMemo(() => (history ? buildPortalPaymentRows(history) : []), [history]);
  const filteredPayments = useMemo(() => {
    if (payFilter === 'payments') return paymentRows.filter((r) => r.category === 'payment');
    if (payFilter === 'charges') return paymentRows.filter((r) => r.category === 'charge');
    return paymentRows;
  }, [paymentRows, payFilter]);

  const bottleRows = useMemo(() => (history ? buildPortalBottleRows(history) : []), [history]);
  const damagedRows = useMemo(() => (history ? buildPortalDamagedRows(history) : []), [history]);

  const customer = history?.customer as R | undefined;
  const paymentById = useMemo(() => new Map(paymentRows.map((r) => [r.id, r])), [paymentRows]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-[#192821]">
          {String(customer?.name || 'Your account')}
        </h1>
        {customer?.phone != null && String(customer.phone).trim() !== '' && (
          <p className="text-sm text-[#64748B] mt-0.5">{String(customer.phone)}</p>
        )}
      </header>

      <LoadError error={error} />
      <SubtleRefreshIndicator active={isFetching && !!history} />

      {isLoading && !history ? (
        <SkeletonStatGrid count={2} />
      ) : history ? (
        <>
          <WalletCard history={history} />
          <BottleSummary history={history} lines={summaryLines} />

          <Tabs defaultValue="payments" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-[#f4f8f5]">
              <TabsTrigger value="payments" className="text-xs sm:text-sm py-2.5">
                Payments
              </TabsTrigger>
              <TabsTrigger value="bottles" className="text-xs sm:text-sm py-2.5">
                Bottles
              </TabsTrigger>
              <TabsTrigger value="damaged" className="text-xs sm:text-sm py-2.5">
                Damaged
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="mt-3">
              <div className="rounded-2xl border border-[#d8e3da] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(
                    [
                      ['all', 'All'],
                      ['payments', 'Payments'],
                      ['charges', 'Charges'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        payFilter === id
                          ? 'bg-[#166534] text-white'
                          : 'bg-[#f4f8f5] text-[#64748B]'
                      }`}
                      onClick={() => setPayFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <TransactionList
                  rows={filteredPayments.map((r) => ({
                    id: r.id,
                    at: r.at,
                    title: r.title,
                    subtitle: r.method ? `Paid via ${r.method}` : undefined,
                    badge: r.status,
                  }))}
                  empty={
                    isSuccess
                      ? 'No payment activity yet.'
                      : 'Loading…'
                  }
                  renderAmount={(id) => {
                    const r = paymentById.get(id) as PortalPaymentRow | undefined;
                    if (!r) return null;
                    const isPay = r.category === 'payment';
                    return (
                      <span
                        className={`font-extrabold tabular-nums text-sm ${
                          isPay ? 'text-[#15803D]' : 'text-[#DC2626]'
                        }`}
                      >
                        {isPay ? '' : '+'}
                        {money(r.amountEtb)}
                      </span>
                    );
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="bottles" className="mt-3">
              <div className="rounded-2xl border border-[#d8e3da] bg-white p-4 shadow-sm">
                {summaryLines.some((l) => l.owed > 0 || l.credit > 0) && (
                  <div className="mb-3 pb-3 border-b border-[#edf2ed]">
                    <p className="text-xs font-bold text-[#64748B] mb-2">Current balance by type</p>
                    <div className="flex flex-wrap gap-2">
                      {summaryLines
                        .filter((l) => l.owed > 0 || l.credit > 0)
                        .map((l) => (
                          <span
                            key={l.bottleTypeId}
                            className="text-xs font-bold px-2 py-1 rounded-lg bg-[#f4f8f5] text-[#192821]"
                          >
                            {l.name}:{' '}
                            <PortalSignedBottles internal={l.internal} className="text-xs inline" />
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                <TransactionList
                  rows={bottleRows.map((r) => ({
                    id: r.id,
                    at: r.at,
                    title: r.title,
                    subtitle: r.bottleTypeName,
                    badge: r.direction === 'out' ? 'Issued' : 'Returned / settled',
                  }))}
                  empty="No bottle movements yet."
                  renderAmount={(id) => {
                    const r = bottleRows.find((x) => x.id === id);
                    if (!r) return null;
                    return (
                      <span
                        className={`font-bold tabular-nums text-sm ${
                          r.direction === 'out' ? 'text-[#a8662b]' : 'text-[#15803D]'
                        }`}
                      >
                        {formatDozen(r.quantity)}
                      </span>
                    );
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="damaged" className="mt-3">
              <div className="rounded-2xl border border-[#d8e3da] bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-sm text-[#64748B]">
                  <AlertTriangle size={16} className="text-[#a8662b]" />
                  <span>Broken bottles returned to us (not reusable empties)</span>
                </div>
                {damagedRows.length ? (
                  <ul className="divide-y divide-[#edf2ed]">
                    {damagedRows.map((r) => (
                      <li key={r.id} className="py-3">
                        <p className="font-semibold text-sm">
                          {formatDozen(r.quantity)} × {r.bottleTypeName}
                        </p>
                        <p className="text-xs text-[#64748B] mt-0.5">{date(r.at)}</p>
                        <p className="text-xs font-medium text-[#192821] mt-1">{r.liabilityLabel}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#64748B] py-6 text-center">No damaged bottle records.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
