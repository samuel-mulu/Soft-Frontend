'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, GlassWater, PackageCheck, Plus, Users } from 'lucide-react';
import { useEmptyBottleSummary } from '@/hooks/queries';
import { SubtleRefreshIndicator } from '@/components/shared/subtle-refresh-indicator';
import { getUser, post } from '@/lib/api';
import { invalidateBalanceQueries, queryKeys } from '@/lib/query-keys';
import { presentCustomerBalance } from '@/lib/customer-balance';
import {
  DEFAULT_PACK_SIZE,
  formatDozen,
  formatDozenValue,
  isValidDozenField,
  isValidPackSize,
  packSizeOrDefault,
  safeDozenToBottles,
} from '@/lib/pack-quantity';
import { QuantityEntry } from '@/components/quantity-entry';
import { QueryRefreshButton } from '@/components/shared/query-refresh-button';
import { LoadErrorBanner } from '@/components/shared/load-error';
import { DataLoadSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showBlockingError } from '@/lib/table-query-state';

type R = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

function StatCard({
  label,
  value,
  icon: Icon,
  small,
  valueClassName = '',
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
  small?: string;
  valueClassName?: string;
}) {
  return (
    <div className="panel stat">
      <div className="flex items-center justify-between muted text-xs font-bold">
        <span>{label}</span>
        <span className="bg-[#eaf5ed] p-2 rounded-lg text-primary">
          <Icon size={18} />
        </span>
      </div>
      <strong className={valueClassName}>{value}</strong>
      {small ? <p className="muted text-xs mt-2">{small}</p> : null}
    </div>
  );
}

function withCustomersCell(obligations: number, perDozen: number) {
  const presented = presentCustomerBalance(n(obligations), 'bottle', 'staff', perDozen);
  const color =
    presented.tone === 'danger' ? 'text-[#DC2626]' : presented.tone === 'success' ? 'text-[#15803D]' : 'text-muted-foreground';
  return <span className={`font-extrabold tabular-nums ${color}`}>{presented.formatted}</span>;
}

export function BottleWarehouseList() {
  const qc = useQueryClient();
  const owner = getUser()?.role === 'OWNER';
  const { data: summary, isLoading, error, isFetching } = useEmptyBottleSummary();
  const summaryR = summary as R | undefined;
  const rows = (summaryR?.rows as R[]) || [];
  const totals = (summaryR?.totals as R) || {};
  const sizeOfRow = (r: R) => packSizeOrDefault(r.bottlesPerDozen);
  /** Mixed dozen sizes: normalise to 12-per-dozen so the total reads in dozens. */
  const withCustomersTotal = rows.reduce(
    (s, r) => s + (n(r.customerObligationsInternal) * DEFAULT_PACK_SIZE) / sizeOfRow(r),
    0,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [capacityLabel, setCapacityLabel] = useState('');
  const [replacementPrice, setReplacementPrice] = useState('');
  const [initialQty, setInitialQty] = useState('');
  const [bottlesPerDozen, setBottlesPerDozen] = useState('12');
  const [note, setNote] = useState('');

  async function createBottle() {
    setBusy(true);
    try {
      const size = Number(bottlesPerDozen);
      if (!isValidPackSize(size)) {
        toast.error('Bottles per dozen must be an even whole number (e.g. 12 or 24)');
        return;
      }
      if (!isValidDozenField(initialQty)) {
        toast.error('Use whole or half dozens (e.g. 1, 1.5, 2)');
        return;
      }
      const qty = safeDozenToBottles(initialQty, size);
      await post('/bottle-types', {
        name: name.trim(),
        capacityLabel: capacityLabel.trim() || undefined,
        replacementPrice: replacementPrice.trim() || undefined,
        bottlesPerDozen: size,
        ...(qty > 0 ? { initialWarehouseQuantity: qty, note: note.trim() } : {}),
      });
      toast.success('Bottle type created');
      setCreateOpen(false);
      setName('');
      setCapacityLabel('');
      setReplacementPrice('');
      setInitialQty('');
      setBottlesPerDozen('12');
      setNote('');
      await invalidateBalanceQueries(qc);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-5 md:mb-7">
        <h1 className="page-title min-w-0">Empty bottles</h1>
        <div className="page-head-action flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <QueryRefreshButton queryKey={queryKeys.inventory.emptySummary()} />
          {owner && (
            <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Add empty bottle
            </button>
          )}
        </div>
      </div>

      {showBlockingError(!!error, summary) ? <LoadErrorBanner error={error} /> : null}
      <SubtleRefreshIndicator active={isFetching && !!summary} />

      {isLoading && !summaryR ? (
        <DataLoadSkeleton variant="stats-table" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-7">
            <StatCard
              label="In warehouse"
              value={formatDozenValue(n(totals.warehouseDozen))}
              icon={GlassWater}
              small="Physical empties you hold"
              valueClassName="text-primary"
            />
            <StatCard
              label="With customers"
              value={presentCustomerBalance(withCustomersTotal, 'bottle', 'staff').formatted}
              icon={Users}
              small="Customer bottle balance (net)"
              valueClassName={
                presentCustomerBalance(withCustomersTotal, 'bottle', 'staff').tone === 'danger'
                  ? 'text-[#DC2626]'
                  : presentCustomerBalance(withCustomersTotal, 'bottle', 'staff').tone === 'success'
                    ? 'text-[#15803D]'
                    : undefined
              }
            />
            <StatCard
              label="Damaged"
              value={formatDozenValue(n(totals.damagedDozen))}
              icon={AlertTriangle}
              small="Write-off / broken stock"
            />
            <StatCard label="Bottle types" value={String(rows.length)} icon={PackageCheck} />
          </div>

          <p className="muted text-xs mb-4 max-w-2xl">
            {String(
              summaryR?.disclaimer ||
                'Customer ledger figures are obligations — not verified physical counts at customers.',
            )}
          </p>

          <div className="panel table-wrap max-w-full overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bottle type</th>
                  <th>In warehouse</th>
                  <th>Damaged</th>
                  <th>With customers</th>
                  {owner ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={owner ? 5 : 4} className="text-center muted py-14!">
                      No bottle types yet. {owner ? 'Add an empty bottle type to get started.' : ''}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={String(r.bottleTypeId)}>
                      <td>
                        <b>{String(r.name)}</b>
                        <span className="block text-xs muted">1 dz = {sizeOfRow(r)} bottles</span>
                      </td>
                      <td>
                        <span className="font-extrabold text-primary tabular-nums">{formatDozen(n(r.warehouse), sizeOfRow(r))}</span>
                      </td>
                      <td>
                        <span className="font-extrabold tabular-nums">{formatDozen(n(r.damaged), sizeOfRow(r))}</span>
                      </td>
                      <td>{withCustomersCell(n(r.customerObligationsInternal), sizeOfRow(r))}</td>
                      {owner ? (
                        <td className="whitespace-nowrap">
                          <Link
                            href={`/inventory/${r.bottleTypeId}`}
                            className="text-primary font-bold text-xs"
                          >
                            Edit stock
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add empty bottle type</DialogTitle>
          </DialogHeader>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Label>Capacity label (optional)</Label>
          <Input
            value={capacityLabel}
            onChange={(e) => setCapacityLabel(e.target.value)}
            placeholder="e.g. 300ml"
          />
          <Label>Bottles per dozen (crate size)</Label>
          <Input
            type="number"
            min={2}
            step={2}
            value={bottlesPerDozen}
            onChange={(e) => setBottlesPerDozen(e.target.value)}
            placeholder="12"
          />
          <p className="text-xs muted">How many bottles make one dozen for this bottle, e.g. 12 or 24.</p>
          <Label>Replacement price ETB per dozen (optional)</Label>
          <Input value={replacementPrice} onChange={(e) => setReplacementPrice(e.target.value)} />
          <Label>Initial empty warehouse quantity in dozen (optional)</Label>
          <QuantityEntry
            fieldClass="field"
            value={initialQty}
            onChange={setInitialQty}
            perDozen={packSizeOrDefault(Number(bottlesPerDozen))}
          />
          {safeDozenToBottles(initialQty) > 0 && (
            <>
              <Label>Reason for initial stock</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </>
          )}
          <DialogFooter>
            <Button disabled={busy || !name.trim()} onClick={createBottle}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
