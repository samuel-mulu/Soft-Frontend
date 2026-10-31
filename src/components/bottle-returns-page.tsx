'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post } from '@/lib/api';
import { QuantityEntry } from '@/components/quantity-entry';
import { BottleBalance, BottleBalanceList } from '@/components/balance-display';
import { BottleDisplayToggle } from '@/components/bottle-display-mode';
import {
  formatEachBreakdown,
  formatQtyEntryLabel,
  projectBottleInternal,
  qtyFromMode,
  type QtyEntryMode,
} from '@/lib/pack-quantity';
import { invalidateBalanceQueries } from '@/lib/query-keys';

type R = Record<string, unknown>;

const n = (v: unknown) => Number(v || 0);

function registeredCustomerOptions(rows: R[], activeOnly = false) {
  return (rows || [])
    .filter((x) => !activeOnly || x.status === 'ACTIVE')
    .map((c) => ({
      id: String(c.id),
      name: c.phone ? `${c.name} · ${c.phone}` : String(c.name),
    }));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  empty = 'Select...',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  empty?: string;
}) {
  return (
    <Field label={label}>
      <select className="field touch-target" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="panel p-5 md:p-6">
      {title && <h2 className="font-extrabold text-base mb-5">{title}</h2>}
      {children}
    </div>
  );
}

function Head({ title }: { title: string }) {
  return (
    <div className="page-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-5 md:mb-7">
      <h1 className="page-title min-w-0">{title}</h1>
    </div>
  );
}

function Table({
  columns,
  rows,
  emptyMessage,
}: {
  columns: { name: string; render: (row: R) => React.ReactNode }[];
  rows: R[];
  emptyMessage?: string;
}) {
  const empty = emptyMessage || 'No records yet.';
  return (
    <div className="panel table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.name}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={String(r.id ?? i)}>
                {columns.map((c) => (
                  <td key={c.name}>{c.render(r)}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center muted py-14!">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function date(v: unknown) {
  if (!v) return '—';
  return new Date(String(v)).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BottleReturnsPage() {
  const client = useQueryClient();
  const { data: customers = [] } = useQuery({
    queryKey: ['/customers'],
    queryFn: () => api<R[]>('/customers'),
  });
  const { data: bottles = [] } = useQuery({
    queryKey: ['/bottle-types'],
    queryFn: () => api<R[]>('/bottle-types'),
  });

  const [customerId, setCustomerId] = useState('');
  const [bottleTypeId, setBottleTypeId] = useState('');
  const [returnMode, setReturnMode] = useState<QtyEntryMode>('each');
  const [returnDozen, setReturnDozen] = useState('');
  const [returnEach, setReturnEach] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: ledger } = useQuery({
    queryKey: [`/customer-bottles/${customerId}`],
    queryFn: () => api<R>(`/customer-bottles/${customerId}`),
    enabled: !!customerId,
  });

  const bottleName = (id: string): string =>
    String(bottles.find((b: R) => b.id === id)?.name || 'Bottle');

  const currentInternal = useMemo(() => {
    const row = (ledger?.totals as R[] | undefined)?.find((x) => x.bottleTypeId === bottleTypeId);
    return n(row?.outstanding);
  }, [ledger, bottleTypeId]);

  const returnEachParsed = useMemo(() => {
    try {
      return qtyFromMode(returnMode, returnDozen, returnEach);
    } catch {
      return null;
    }
  }, [returnMode, returnDozen, returnEach]);
  const qtyInvalid = returnEachParsed === null;
  const returnEachTotal = returnEachParsed ?? 0;

  const projectedInternal = useMemo(
    () => projectBottleInternal(currentInternal, 0, returnEachTotal),
    [currentInternal, returnEachTotal],
  );

  const qtyHint =
    returnEachTotal > 0
      ? `${formatQtyEntryLabel(returnMode, returnDozen, returnEach, returnEachTotal)} · ${returnEachTotal} bottles`
      : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !bottleTypeId) {
      toast.error('Select customer and bottle type');
      return;
    }
    let quantity: number;
    try {
      quantity = qtyFromMode(returnMode, returnDozen, returnEach);
      if (quantity <= 0) {
        toast.error('Enter a return quantity');
        return;
      }
    } catch {
      toast.error('Invalid quantity');
      return;
    }
    setBusy(true);
    try {
      await post('/customer-bottles/returns', {
        customerId,
        bottleTypeId,
        quantity,
        note: note.trim() || undefined,
      });
      toast.success('Bottle return saved');
      await invalidateBalanceQueries(client, customerId);
      setReturnDozen('');
      setReturnEach('');
      setNote('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save return');
    } finally {
      setBusy(false);
    }
  }

  const totals = (ledger?.totals as R[]) || [];

  return (
    <>
      <Head title="Bottle returns" />
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <BottleDisplayToggle />
      </div>
      <div className="grid lg:grid-cols-[1fr_1fr] gap-5">
        <Panel title="Receive bottles">
          <form className="space-y-4" onSubmit={onSubmit}>
            <Select
              label="Registered customer"
              value={customerId}
              onChange={setCustomerId}
              options={registeredCustomerOptions(customers, true)}
            />
            <Select label="Bottle type" value={bottleTypeId} onChange={setBottleTypeId} options={bottles as { id: string; name: string }[]} />
            <Field label="Returned quantity">
              <QuantityEntry
                mode={returnMode}
                onModeChange={setReturnMode}
                dozen={returnDozen}
                each={returnEach}
                onDozenChange={setReturnDozen}
                onEachChange={setReturnEach}
                fieldClass="field"
                invalid={qtyInvalid}
                hint={qtyHint}
              />
            </Field>
            {bottleTypeId && customerId && (
              <div className="rounded-xl bg-[#f8faf8] p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="muted">Previous balance</span>
                  <BottleBalance internal={currentInternal} />
                </div>
                <div className="flex justify-between gap-3">
                  <span className="muted">Returning</span>
                  <span className="font-bold tabular-nums">
                    {returnEachTotal > 0 ? formatEachBreakdown(returnEachTotal) : '—'}
                    {returnEachTotal > 0 && (
                      <span className="muted font-medium ml-1">({returnEachTotal} ea)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-[#e5eae5] pt-2">
                  <span className="font-bold">Projected balance</span>
                  <BottleBalance internal={projectedInternal} />
                </div>
              </div>
            )}
            <Field label="Note (optional)">
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <button disabled={busy} type="submit" className="btn btn-primary">
              {busy ? 'Saving…' : 'Record bottle return'}
            </button>
          </form>
        </Panel>
        <Panel title="Customer outstanding bottles">
          {!customerId ? (
            <p className="muted">Select a customer to see their bottle balances.</p>
          ) : totals.length ? (
            <BottleBalanceList
              rows={totals.map((x) => ({
                bottleTypeId: String(x.bottleTypeId),
                outstanding: n(x.outstanding),
              }))}
              bottleName={bottleName}
            />
          ) : (
            <p className="muted">No outstanding bottles.</p>
          )}
        </Panel>
      </div>
      {customerId && (
        <>
          <h2 className="font-extrabold my-5">Bottle movement history</h2>
          <Table
            rows={(ledger?.movements as R[]) || []}
            columns={[
              { name: 'Date', render: (r) => date(r.createdAt) },
              { name: 'Bottle type', render: (r) => String((r.bottleType as R)?.name || bottleName(String(r.bottleTypeId))) },
              {
                name: 'Movement',
                render: (r) => {
                  const d = n(r.delta);
                  const qty = Math.abs(d);
                  const text = d > 0 ? `+${qty} with customer` : d < 0 ? `−${qty} in your stock` : '—';
                  return (
                    <span className={`text-sm font-semibold ${d > 0 ? 'text-[#a8662b]' : d < 0 ? 'text-[#177554]' : ''}`}>
                      {text}
                    </span>
                  );
                },
              },
              { name: 'Reason', render: (r) => String(r.reason || '—') },
            ]}
          />
        </>
      )}
    </>
  );
}
