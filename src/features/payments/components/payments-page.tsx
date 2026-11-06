'use client';

import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCustomers, useCustomerHistory, usePayments } from '@/hooks/queries';
import { money, date, post } from '@/lib/api';
import { formatDozen, packSizeOrDefault } from '@/lib/pack-quantity';
import { QueryRefreshButton } from '@/components/shared/query-refresh-button';
import { SubtleRefreshIndicator } from '@/components/shared/subtle-refresh-indicator';
import { LoadErrorBanner } from '@/components/shared/load-error';
import { SkeletonTable } from '@/components/ui/skeleton';
import { showBlockingError, showErrorBanner, showInitialSkeleton } from '@/lib/table-query-state';
import { invalidateAfterPayment, queryKeys } from '@/lib/query-keys';
import {
  previewPaymentAllocation,
  type PaymentAllocationMode,
} from '@/lib/payment-allocation-preview';
import { CustomerMoneySummary } from '@/features/customers/components/customer-money-summary';

type R = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

function registeredCustomerOptions(rows: R[]) {
  return (rows || [])
    .filter((x) => x.status === 'ACTIVE')
    .map((c) => ({
      id: String(c.id),
      name: c.phone ? `${c.name} · ${c.phone}` : String(c.name),
    }));
}

export function PaymentsPage() {
  const client = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { data: payments, isLoading, isSuccess, error, isFetching } = usePayments();
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [allocationMode, setAllocationMode] = useState<PaymentAllocationMode>('AUTO');
  const [selectedCompId, setSelectedCompId] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const { data: history, isLoading: historyLoading } = useCustomerHistory(
    customerId || undefined,
    !!customerId,
  );
  const historyR = history as R | undefined;
  const mb = historyR?.moneyBreakdown as R | undefined;
  const drinkDebt = n(mb?.drinkOutstanding);
  const compDebt = n(mb?.compensationOutstanding);
  const totalOwed = drinkDebt + compDebt;

  const openComps = ((historyR?.openCompensations as R[]) || []).map((c) => ({
    id: String(c.id),
    remaining: n(c.remaining),
    createdAt: String(c.createdAt),
    label: `${(c.bottleType as R)?.name || 'Bottles'} · ${formatDozen(Number(c.quantity || 0), packSizeOrDefault((c.bottleType as R | undefined)?.bottlesPerDozen))} · ${money(c.remaining)} left`,
  }));

  const preview = useMemo(() => {
    if (!customerId || n(amount) <= 0) return null;
    return previewPaymentAllocation({
      paymentAmount: n(amount),
      mode: allocationMode,
      drinkOutstanding: drinkDebt,
      compensationOutstanding: compDebt,
      openCompensations: openComps,
      selectedCompensationId: allocationMode === 'COMPENSATION' ? selectedCompId : undefined,
      moneyOutstanding: n(historyR?.moneyOutstanding),
    });
  }, [
    customerId,
    amount,
    allocationMode,
    drinkDebt,
    compDebt,
    openComps,
    selectedCompId,
    historyR?.moneyOutstanding,
  ]);

  const previewError = useMemo(() => {
    if (allocationMode === 'COMPENSATION' && !selectedCompId) return 'Select an outstanding compensation.';
    if (allocationMode === 'COMPENSATION' && n(amount) > 0) {
      const row = openComps.find((c) => c.id === selectedCompId);
      if (row && n(amount) > row.remaining + 0.001) return 'Payment exceeds selected compensation balance.';
    }
    if (n(amount) > 0 && !preview) return 'Enter a valid payment amount.';
    return null;
  }, [allocationMode, selectedCompId, amount, openComps, preview]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || n(amount) <= 0) {
      toast.error('Choose customer and amount');
      return;
    }
    if (previewError) {
      toast.error(previewError);
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        customerId,
        amount: String(amount),
        method,
        note: note.trim() || undefined,
        allocationMode,
      };
      if (allocationMode === 'COMPENSATION') payload.bottleCompensationId = selectedCompId;
      await post('/payments', payload);
      toast.success('Payment recorded');
      await invalidateAfterPayment(client, customerId);
      setAmount('');
      setNote('');
      setSelectedCompId('');
      setAllocationMode('AUTO');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <>
      <div className="page-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-5 md:mb-7">
        <h1 className="page-title">Customer payments</h1>
        <QueryRefreshButton queryKey={queryKeys.payments.all()} />
      </div>

      <div className="panel p-5 md:p-6 mb-6">
        <h2 className="font-extrabold text-base mb-4">Record payment</h2>
        <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
          <div>
            <label className="label">Customer</label>
            <select
              className="field w-full"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setAmount('');
                setSelectedCompId('');
                setAllocationMode('AUTO');
              }}
            >
              <option value="">Select customer…</option>
              {registeredCustomerOptions(customers).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {customerId && (
            <>
              {historyLoading && !historyR ? (
                <p className="muted text-sm">Loading balance…</p>
              ) : (
                <CustomerMoneySummary
                  moneyOutstanding={historyR?.moneyOutstanding}
                  moneyBreakdown={mb}
                  compact
                />
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (ETB)</label>
                  <input
                    className="field w-full"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {totalOwed > 0.001 && (
                    <button
                      type="button"
                      className="text-xs text-primary font-bold mt-1"
                      onClick={() => setAmount(String(totalOwed.toFixed(2)))}
                    >
                      Use total owed ({money(totalOwed)})
                    </button>
                  )}
                </div>
                <div>
                  <label className="label">Method</label>
                  <select className="field w-full" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="MOBILE">Mobile</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Allocation</label>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ['AUTO', 'Automatic — compensation first, then drink sales'],
                      ['COMPENSATION', 'Specific compensation'],
                      ['SALES', 'Drink sales only'],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="alloc"
                        checked={allocationMode === id}
                        onChange={() => {
                          setAllocationMode(id);
                          if (id !== 'COMPENSATION') setSelectedCompId('');
                        }}
                        className="mt-1"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {allocationMode === 'COMPENSATION' && (
                <div>
                  <label className="label">Outstanding compensation</label>
                  <select
                    className="field w-full"
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {openComps.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {!openComps.length && (
                    <p className="text-xs muted mt-1">No open compensation for this customer.</p>
                  )}
                </div>
              )}

              <div>
                <label className="label">Note (optional)</label>
                <input className="field w-full" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              {n(amount) > 0 && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm space-y-2 ${previewError ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/40'}`}
                >
                  <p className="font-bold">Allocation preview</p>
                  {previewError ? (
                    <p className="text-destructive">{previewError}</p>
                  ) : preview ? (
                    <>
                      <p>
                        To compensation: <b>{money(preview.toCompensation)}</b> · To drink sales:{' '}
                        <b>{money(preview.toSales)}</b>
                      </p>
                      <p className="muted text-xs">After payment:</p>
                      <ul className="text-xs space-y-0.5">
                        <li>Compensation remaining: {money(preview.compensationDebtAfter)}</li>
                        <li>Drink debt remaining: {money(preview.drinkDebtAfter)}</li>
                        <li>Total remaining: {money(preview.totalOwedAfter)}</li>
                        {preview.customerCreditAfter > 0.001 && (
                          <li className="text-[#15803D]">
                            Customer credit: {money(preview.customerCreditAfter)}
                          </li>
                        )}
                      </ul>
                    </>
                  ) : null}
                </div>
              )}

              <div className="flex justify-end">
                <button disabled={busy || !!previewError} type="submit" className="btn btn-primary">
                  {busy ? 'Saving…' : 'Record payment'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <h2 className="font-extrabold my-5">Payment history</h2>
      {showErrorBanner(!!error, payments) ? <LoadErrorBanner error={error} /> : null}
      <SubtleRefreshIndicator active={isFetching && !!payments} />
      {showInitialSkeleton(isLoading, payments) ? (
        <SkeletonTable rows={6} cols={5} />
      ) : showBlockingError(!!error, payments) ? null : (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(payments || []).length ? (
                (payments as R[]).map((r) => (
                  <tr key={String(r.id)}>
                    <td>{date(r.createdAt)}</td>
                    <td>{String(customers.find((x: R) => x.id === r.customerId)?.name || 'Guest')}</td>
                    <td>
                      <b>{money(r.amount)}</b>
                    </td>
                    <td>{String(r.method)}</td>
                    <td>{String(r.note || '—')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center muted py-14">
                    {isSuccess ? 'No payments recorded yet.' : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
