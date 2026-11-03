'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useBottleTypes, useCustomerHistory, usePortalHistory } from '@/hooks/queries';
import { money, date } from '@/lib/api';
import { LoadError, SkeletonStatGrid, SkeletonTable } from '@/components/ui/skeleton';
import { BottleDisplayToggle } from '@/components/bottle-display-mode';
import { BottleBalance } from '@/components/balance-display';
import { presentCustomerBalance } from '@/lib/customer-balance';
import { Button } from '@/components/ui/button';
import { CustomerMoneySummary } from '@/features/customers/components/customer-money-summary';
import { BottleCompensationDialog } from '@/features/customers/components/bottle-compensation-dialog';
import {
  GoodBottleReturnDialog,
  BrokenBottleReturnDialog,
} from '@/features/customers/components/bottle-return-dialogs';

type R = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

type BottleAction = 'return' | 'compensate' | 'broken' | null;

function bottleHistoryTableRows(movements: R[]): R[] {
  const asc = [...movements].sort(
    (a, b) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime(),
  );
  const run = new Map<string, number>();
  const after = new Map<string, number>();
  for (const m of asc) {
    const bt = String(m.bottleTypeId);
    const next = (run.get(bt) || 0) + n(m.delta);
    run.set(bt, next);
    after.set(String(m.id), next);
  }
  return [...movements]
    .sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime())
    .map((m) => ({ ...m, balanceAfter: after.get(String(m.id)) ?? 0 }));
}

function movementLabel(m: R): { label: string; kind: 'bottle' | 'money' } {
  const reason = String(m.reason || '');
  const d = n(m.delta);
  const qty = Math.abs(d);
  if (reason === 'SALE') return { label: `Bottle issued (+${qty} with customer)`, kind: 'bottle' };
  if (reason === 'RETURN') return { label: `Bottle returned (−${qty}, to warehouse)`, kind: 'bottle' };
  if (reason === 'COMPENSATION')
    return { label: `Bottle compensation (−${qty} obligation)`, kind: 'bottle' };
  if (reason === 'BROKEN_WAIVED') return { label: `Bottle liability waived (−${qty})`, kind: 'bottle' };
  if (reason === 'ADJUSTMENT')
    return { label: `Bottle adjustment (${d > 0 ? '+' : ''}${d})`, kind: 'bottle' };
  return { label: `${reason} (${d > 0 ? '+' : ''}${d})`, kind: 'bottle' };
}

function buildUnifiedHistory(history: R | undefined, bottleName: (id: string) => string): R[] {
  if (!history) return [];
  const rows: R[] = [];

  for (const m of (history.bottles as R[]) || []) {
    const { label, kind } = movementLabel(m);
    rows.push({
      id: `bm-${m.id}`,
      at: m.createdAt,
      kind,
      title: label,
      detail: (m.bottleType as R)?.name || bottleName(String(m.bottleTypeId)),
      meta: m.note || '',
    });
  }

  for (const c of (history.compensations as R[]) || []) {
    rows.push({
      id: `bc-${c.id}`,
      at: c.createdAt,
      kind: 'money',
      title: `Bottle compensation charged (${c.quantity} × ${money(c.unitPrice)})`,
      detail: money(c.totalAmount),
      meta: [c.status, (c.bottleType as R)?.name, c.note].filter(Boolean).join(' · '),
    });
  }

  for (const p of (history.payments as R[]) || []) {
    const purpose = String(p.purpose || 'GENERAL');
    const allocComp = n(p.allocatedToCompensation);
    const allocSales = n(p.allocatedToSales);
    let title = 'Customer payment received';
    if (purpose === 'COMPENSATION') title = 'Compensation payment';
    else if (allocComp > 0 && allocSales > 0)
      title = `Payment (compensation ${money(allocComp)} · drinks ${money(allocSales)})`;
    else if (allocComp > 0) title = `Payment toward compensation (${money(allocComp)})`;
    else if (allocSales > 0) title = `Payment toward drink sales (${money(allocSales)})`;
    rows.push({
      id: `pay-${p.id}`,
      at: p.createdAt,
      kind: 'money',
      title,
      detail: money(p.amount),
      meta: [p.method, p.note].filter(Boolean).join(' · '),
    });
  }

  return rows.sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime());
}

export function CustomerHistoryPage({
  customerId,
  portal,
}: {
  customerId?: string;
  portal?: boolean;
}) {
  const customerHistoryQuery = useCustomerHistory(customerId, !portal && !!customerId);
  const portalHistoryQuery = usePortalHistory(!!portal);
  const { data: history, isLoading, error } = portal ? portalHistoryQuery : customerHistoryQuery;
  const { data: bottlesFromApi = [] } = useBottleTypes(!portal);

  const historyR = history as R | undefined;
  const bottles = useMemo((): R[] => {
    if (portal) {
      const fromHistory = historyR?.bottleTypes;
      return Array.isArray(fromHistory) ? fromHistory : [];
    }
    return Array.isArray(bottlesFromApi) ? bottlesFromApi : [];
  }, [portal, historyR?.bottleTypes, bottlesFromApi]);
  const bottleName = (id: string) => String(bottles.find((b) => b.id === id)?.name || 'Bottle');
  const customer = historyR?.customer as R | undefined;

  const bottleTotals = (
    Array.isArray(historyR?.bottleBalances) ? historyR.bottleBalances : []
  ) as { bottleTypeId: string; outstanding: number }[];

  const [action, setAction] = useState<BottleAction>(null);
  const [activeBottleTypeId, setActiveBottleTypeId] = useState('');

  const activeInternal = useMemo(() => {
    const row = bottleTotals.find((b) => b.bottleTypeId === activeBottleTypeId);
    return n(row?.outstanding);
  }, [bottleTotals, activeBottleTypeId]);

  const activeBottleType = activeBottleTypeId
    ? bottles.find((b) => String(b.id) === activeBottleTypeId)
    : undefined;
  const unifiedHistory = useMemo(
    () => buildUnifiedHistory(historyR, bottleName),
    [historyR, bottles],
  );

  const title = portal ? 'Your account' : String(customer?.name || 'Customer');
  const staff = !portal;

  function openBottleAction(type: BottleAction, bottleTypeId: string) {
    setActiveBottleTypeId(bottleTypeId);
    setAction(type);
  }

  return (
    <>
      {!portal && (
        <div className="page-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-3 md:mb-5">
          <h1 className="page-title min-w-0">{title}</h1>
          <Link href="/customers" className="btn btn-ghost shrink-0">
            <ArrowLeft size={16} /> All customers
          </Link>
        </div>
      )}
      {portal && (
        <div className="page-head mb-3">
          <h1 className="page-title">{title}</h1>
        </div>
      )}

      <LoadError error={error} />
      {isLoading && !historyR ? (
        <>
          <SkeletonStatGrid count={2} />
          <SkeletonTable rows={6} cols={5} />
        </>
      ) : (
        <div className="space-y-6">
          {!portal && customer?.phone != null && String(customer.phone).trim() !== '' && (
            <p className="muted text-sm -mt-2">{String(customer.phone)}</p>
          )}

          <CustomerMoneySummary
            moneyOutstanding={historyR?.moneyOutstanding}
            moneyBreakdown={historyR?.moneyBreakdown as R}
            portal={portal}
          />

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-extrabold text-base">Bottle balances</h2>
              <BottleDisplayToggle compact />
            </div>
            {!bottleTotals.length ? (
              <p className="muted text-sm panel p-4">No bottle activity for this customer yet.</p>
            ) : (
              <div className="panel table-wrap overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bottle type</th>
                      <th>Balance</th>
                      <th>Replacement</th>
                      <th>Est. value</th>
                      {staff && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bottleTotals.map((row) => {
                      const bt = bottles.find((b) => String(b.id) === row.bottleTypeId);
                      const owed = Math.max(0, n(row.outstanding));
                      const price = n(bt?.replacementPrice);
                      const est = owed > 0 && price > 0 ? owed * price : 0;
                      return (
                        <tr key={row.bottleTypeId}>
                          <td>
                            <b>{String(bt?.name || bottleName(row.bottleTypeId))}</b>
                            {bt?.capacityLabel ? (
                              <span className="muted text-xs block">{String(bt.capacityLabel)}</span>
                            ) : null}
                          </td>
                          <td>
                            <BottleBalance internal={n(row.outstanding)} size="sm" />
                            <span className="block text-[10px] font-semibold text-muted-foreground">
                              {presentCustomerBalance(n(row.outstanding), 'bottle', 'staff').label}
                            </span>
                          </td>
                          <td className="tabular-nums">{price > 0 ? money(price) : '—'}</td>
                          <td className="tabular-nums">{est > 0 ? money(est) : '—'}</td>
                          {staff && (
                            <td>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openBottleAction('return', row.bottleTypeId)}
                                >
                                  Return
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={owed <= 0}
                                  onClick={() => openBottleAction('compensate', row.bottleTypeId)}
                                >
                                  Compensate
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => openBottleAction('broken', row.bottleTypeId)}
                                >
                                  Broken
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="font-extrabold text-base mb-3">Activity history</h2>
            <div className="panel table-wrap overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount / detail</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {unifiedHistory.length ? (
                    unifiedHistory.map((r) => (
                      <tr key={String(r.id)}>
                        <td className="whitespace-nowrap text-sm">{date(r.at)}</td>
                        <td>
                          <span
                            className={`tag text-[10px] ${r.kind === 'money' ? 'bg-[#fff4e8] text-[#a8662b]' : 'bg-[#eaf5ed] text-[#126a4c]'}`}
                          >
                            {r.kind === 'money' ? 'Money' : 'Bottles'}
                          </span>
                        </td>
                        <td className="text-sm font-medium max-w-[220px]">{String(r.title)}</td>
                        <td className="text-sm tabular-nums">{String(r.detail)}</td>
                        <td className="text-xs muted max-w-[160px] truncate">{String(r.meta || '—')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center muted py-10">
                        No activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <details className="panel p-4">
            <summary className="font-bold cursor-pointer text-sm">Bottle ledger (movements)</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Change</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {bottleHistoryTableRows((historyR?.bottles as R[]) || []).map((m: R) => {
                    const { label } = movementLabel(m);
                    return (
                      <tr key={String(m.id)}>
                        <td>{date(m.createdAt)}</td>
                        <td>{String((m.bottleType as R)?.name || bottleName(String(m.bottleTypeId)))}</td>
                        <td>{label}</td>
                        <td>
                          <BottleBalance internal={n(m.balanceAfter)} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {staff && customerId && activeBottleTypeId && (
        <>
          <GoodBottleReturnDialog
            open={action === 'return'}
            onOpenChange={(o) => !o && setAction(null)}
            customerId={customerId}
            customerName={String(customer?.name)}
            bottleTypeId={activeBottleTypeId}
            bottleTypeName={String(activeBottleType?.name)}
            bottlesOwedInternal={activeInternal}
          />
          <BottleCompensationDialog
            open={action === 'compensate'}
            onOpenChange={(o) => !o && setAction(null)}
            customerId={customerId}
            customerName={String(customer?.name)}
            bottleTypeId={activeBottleTypeId}
            bottleType={activeBottleType as { id: string; name?: string; replacementPrice?: unknown }}
            bottlesOwedInternal={activeInternal}
          />
          <BrokenBottleReturnDialog
            open={action === 'broken'}
            onOpenChange={(o) => !o && setAction(null)}
            customerId={customerId}
            customerName={String(customer?.name)}
            bottleTypeId={activeBottleTypeId}
            bottleTypeName={String(activeBottleType?.name)}
            bottlesOwedInternal={activeInternal}
          />
        </>
      )}
    </>
  );
}
