'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  useBottleTypeSummary,
  useProducts,
  useCustomers,
  useSuppliers,
  useCustomerBottles,
} from '@/hooks/queries';
import { BottleCompensationDialog } from '@/features/customers/components/bottle-compensation-dialog';
import { SubtleRefreshIndicator } from '@/components/shared/subtle-refresh-indicator';
import { getUser, money, patch, post } from '@/lib/api';
import { LoadErrorBanner } from '@/components/shared/load-error';
import { DataLoadSkeleton } from '@/components/ui/skeleton';
import { QuantityEntry } from '@/components/quantity-entry';
import { qtyFromMode, type QtyEntryMode } from '@/lib/pack-quantity';
import { invalidateBalanceQueries } from '@/lib/query-keys';
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

type R = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

export function BottleWarehouseDetail({ bottleTypeId }: { bottleTypeId: string }) {
  const qc = useQueryClient();
  const owner = getUser()?.role === 'OWNER';
  const { data, isLoading, error, isFetching } = useBottleTypeSummary(bottleTypeId);
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers(owner);

  const [modal, setModal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qtyMode, setQtyMode] = useState<QtyEntryMode>('each');
  const [dozen, setDozen] = useState('');
  const [each, setEach] = useState('');
  const [note, setNote] = useState('');
  const [productId, setProductId] = useState('');
  const [receiveMode, setReceiveMode] = useState<
    'WITH_BOTTLES' | 'FROM_EXISTING_EMPTIES' | 'MIXED_SOURCE'
  >('WITH_BOTTLES');
  const [mixedFromDozen, setMixedFromDozen] = useState('');
  const [mixedFromEach, setMixedFromEach] = useState('');
  const [mixedSupDozen, setMixedSupDozen] = useState('');
  const [mixedSupEach, setMixedSupEach] = useState('');
  const [waiveLiability, setWaiveLiability] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [compCustomerId, setCompCustomerId] = useState('');
  const [replacementPrice, setReplacementPrice] = useState('');
  const [breakKind, setBreakKind] = useState<'EMPTY' | 'FULL' | 'CUSTOMER_BROKEN'>('EMPTY');
  const [reconcileEmpty, setReconcileEmpty] = useState('');
  const [reconcileDamaged, setReconcileDamaged] = useState('');

  const { data: compLedger } = useCustomerBottles(
    compCustomerId || undefined,
    modal === 'compensation' && !!compCustomerId,
  );
  const compOwedInternal = n(
    ((compLedger?.totals as R[]) || []).find((x) => x.bottleTypeId === bottleTypeId)?.outstanding,
  );

  const bt = data?.bottleType as R | undefined;
  const linkedProducts = (products as R[]).filter(
    (p) => p.bottleTypeId === bottleTypeId && p.packagingKind !== 'NONE',
  );

  async function submit(path: string, body: R) {
    setBusy(true);
    try {
      await post(path, body);
      toast.success('Saved');
      await invalidateBalanceQueries(qc);
      setModal(null);
      resetQty();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  function resetQty() {
    setDozen('');
    setEach('');
    setNote('');
  }

  function packBody(extra: R = {}) {
    const total = qtyFromMode(qtyMode, dozen, each);
    if (qtyMode === 'dozen') {
      return { ...extra, dozen: Math.floor(total / 12), ...(total % 12 ? { each: total % 12 } : {}) };
    }
    if (qtyMode === 'mixed') {
      return { ...extra, dozen: Math.floor(parseInt(dozen || '0', 10) || 0), each: parseInt(each || '0', 10) || 0 };
    }
    return { ...extra, quantity: total };
  }

  if (isLoading && !data) return <DataLoadSkeleton variant="table" />;
  if (error && !data) return <LoadErrorBanner error={error} />;

  const fullByProduct = (data?.fullByProduct as R[]) || [];
  const empty = n(data?.emptyWarehouse);
  const damaged = n(data?.damagedWarehouse);
  const obligations = n(data?.customerObligationsInternal);
  const credits = n(data?.customerCreditsInternal);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/inventory" className="btn btn-ghost text-sm inline-flex items-center gap-1">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="page-title">{String(bt?.name || 'Bottle type')}</h1>
        <SubtleRefreshIndicator active={isFetching && !!data} />
      </div>
      {error && data ? <LoadErrorBanner error={error} /> : null}

      <p className="muted text-xs mb-4 max-w-2xl border border-border rounded-lg bg-muted/40 px-3 py-2">
        {String(data?.ledgerDisclaimer || '')}
      </p>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-extrabold text-sm">Full drinks (by product)</h2>
          {fullByProduct.map((row) => (
            <p key={String(row.productId)} className="flex justify-between text-sm">
              <span>{String(row.name)}</span>
              <span className="font-bold text-primary tabular-nums">{n(row.quantity)}</span>
            </p>
          ))}
          {!fullByProduct.length && <p className="muted text-sm">No linked products.</p>}
        </section>
        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-extrabold text-sm">Warehouse bottles</h2>
          <p className="flex justify-between text-sm">
            <span>Empty (usable)</span>
            <span className="font-bold text-primary">{empty}</span>
          </p>
          <p className="flex justify-between text-sm">
            <span>Damaged</span>
            <span className="font-bold">{damaged}</span>
          </p>
          <p className="flex justify-between text-sm muted">
            <span>Customer obligations (ledger)</span>
            <span>{obligations} internal · display −{obligations} RED typical</span>
          </p>
          <p className="flex justify-between text-sm muted">
            <span>Customer credits (ledger)</span>
            <span>{credits} internal · display +{credits} GREEN</span>
          </p>
          <p className="text-sm">
            Replacement price:{' '}
            <b>{bt?.replacementPrice ? money(bt.replacementPrice) : 'Not set'}</b>
          </p>
        </section>
      </div>

      {owner && (
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            ['receive-empty', 'Receive empty bottles'],
            ['receive-full', 'Receive full drinks'],
            ['convert', 'Convert empties to full'],
            ['breakage', 'Record breakage'],
            ['compensation', 'Bottle compensation'],
            ['reconcile', 'Physical reconcile'],
            ['price', 'Replacement price'],
          ].map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (id === 'compensation') setCompCustomerId('');
                setModal(id);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-extrabold text-sm mb-3">Recent stock movements</h2>
        <div className="max-h-64 overflow-y-auto text-xs space-y-1">
          {((data?.recentMovements as R[]) || []).map((m) => (
            <p key={String(m.id)} className="border-b border-border/60 py-1">
              {String(m.reason)} · {n(m.delta) > 0 ? '+' : ''}
              {n(m.delta)} ·{' '}
              {String((m.product as R | undefined)?.name || (m.bottleType as R | undefined)?.name || '')}
            </p>
          ))}
        </div>
      </section>

      <Dialog open={modal === 'receive-empty'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive empty bottles</DialogTitle>
          </DialogHeader>
          <QuantityEntry fieldClass="field" mode={qtyMode} onModeChange={setQtyMode} dozen={dozen} each={each} onDozenChange={setDozen} onEachChange={setEach} />
          <Label>Note</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button disabled={busy} onClick={() => submit('/inventory/receive-empty', { bottleTypeId, note, ...packBody() })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'receive-full'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive full drinks</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <Button type="button" size="sm" variant={receiveMode === 'WITH_BOTTLES' ? 'default' : 'outline'} onClick={() => setReceiveMode('WITH_BOTTLES')}>
              With bottles (supplier)
            </Button>
            <Button type="button" size="sm" variant={receiveMode === 'FROM_EXISTING_EMPTIES' ? 'default' : 'outline'} onClick={() => setReceiveMode('FROM_EXISTING_EMPTIES')}>
              From warehouse empties
            </Button>
            <Button type="button" size="sm" variant={receiveMode === 'MIXED_SOURCE' ? 'default' : 'outline'} onClick={() => setReceiveMode('MIXED_SOURCE')}>
              Mixed
            </Button>
          </div>
          <Label>Product</Label>
          <select className="field w-full mb-2" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select product</option>
            {linkedProducts.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {String(p.name)}
              </option>
            ))}
          </select>
          {receiveMode === 'FROM_EXISTING_EMPTIES' && (
            <p className="text-xs muted mb-2">Available empty: {empty}</p>
          )}
          {(receiveMode === 'WITH_BOTTLES' || receiveMode === 'MIXED_SOURCE') && (
            <>
              <Label>Supplier {receiveMode === 'MIXED_SOURCE' ? '(for supplier-bottled portion)' : '(optional — creates purchase when set)'}</Label>
              <select className="field w-full mb-2" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">No supplier record</option>
                {(suppliers as R[]).map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {String(s.name)}
                  </option>
                ))}
              </select>
              {supplierId && (
                <Input placeholder="Unit cost ETB" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="mb-2" />
              )}
            </>
          )}
          {receiveMode === 'MIXED_SOURCE' ? (
            <div className="space-y-3">
              <p className="text-xs muted">Empty on hand: {empty}. Total full stock increases by both portions combined.</p>
              <div>
                <Label>From warehouse empties</Label>
                <div className="flex gap-2">
                  <Input placeholder="Dozen" value={mixedFromDozen} onChange={(e) => setMixedFromDozen(e.target.value)} />
                  <Input placeholder="Each" value={mixedFromEach} onChange={(e) => setMixedFromEach(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>With supplier bottles</Label>
                <div className="flex gap-2">
                  <Input placeholder="Dozen" value={mixedSupDozen} onChange={(e) => setMixedSupDozen(e.target.value)} />
                  <Input placeholder="Each" value={mixedSupEach} onChange={(e) => setMixedSupEach(e.target.value)} />
                </div>
              </div>
            </div>
          ) : (
            <QuantityEntry fieldClass="field" mode={qtyMode} onModeChange={setQtyMode} dozen={dozen} each={each} onDozenChange={setDozen} onEachChange={setEach} />
          )}
          <DialogFooter>
            <Button
              disabled={busy || !productId}
              onClick={() => {
                if (receiveMode === 'MIXED_SOURCE') {
                  submit('/inventory/receive-full', {
                    productId,
                    mode: receiveMode,
                    note,
                    ...(supplierId ? { supplierId, unitCost: unitCost || undefined } : {}),
                    fromExisting: {
                      dozen: parseInt(mixedFromDozen || '0', 10) || 0,
                      each: parseInt(mixedFromEach || '0', 10) || 0,
                    },
                    withSupplier: {
                      dozen: parseInt(mixedSupDozen || '0', 10) || 0,
                      each: parseInt(mixedSupEach || '0', 10) || 0,
                    },
                  });
                  return;
                }
                submit('/inventory/receive-full', {
                  productId,
                  mode: receiveMode,
                  note,
                  ...(supplierId ? { supplierId, unitCost: unitCost || undefined } : {}),
                  ...packBody(),
                });
              }}
            >
              Post receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'convert'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert empties to full stock</DialogTitle>
          </DialogHeader>
          <p className="text-xs muted">Empty on hand: {empty}</p>
          <Label>Product</Label>
          <select className="field w-full" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select</option>
            {linkedProducts.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {String(p.name)}
              </option>
            ))}
          </select>
          <QuantityEntry fieldClass="field" mode={qtyMode} onModeChange={setQtyMode} dozen={dozen} each={each} onDozenChange={setDozen} onEachChange={setEach} />
          <DialogFooter>
            <Button disabled={busy || !productId} onClick={() => submit('/inventory/convert-empties-to-full', { productId, note, ...packBody() })}>
              Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'breakage'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record breakage</DialogTitle>
          </DialogHeader>
          <Label>Kind</Label>
          <select className="field w-full mb-2" value={breakKind} onChange={(e) => setBreakKind(e.target.value as typeof breakKind)}>
            <option value="EMPTY">Warehouse empty</option>
            <option value="FULL">Warehouse full product</option>
            <option value="CUSTOMER_BROKEN">Customer broken return (no ledger change)</option>
          </select>
          {breakKind === 'FULL' && (
            <>
              <Label>Product</Label>
              <select className="field w-full" value={productId} onChange={(e) => setProductId(e.target.value)}>
                {linkedProducts.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {String(p.name)}
                  </option>
                ))}
              </select>
            </>
          )}
          <Label>Customer (broken return only)</Label>
          <select className="field w-full mb-2" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">—</option>
            {(customers as R[]).map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {String(c.name)}
              </option>
            ))}
          </select>
          <QuantityEntry fieldClass="field" mode={qtyMode} onModeChange={setQtyMode} dozen={dozen} each={each} onDozenChange={setDozen} onEachChange={setEach} />
          <Label>Reason (required audit note)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
          {breakKind === 'CUSTOMER_BROKEN' && owner && (
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={waiveLiability} onChange={(e) => setWaiveLiability(e.target.checked)} />
              Owner: waive bottle liability (posts ledger adjustment)
            </label>
          )}
          <DialogFooter>
            <Button
              disabled={busy}
              onClick={() =>
                submit('/inventory/breakage', {
                  kind: breakKind,
                  bottleTypeId,
                  reason: note,
                  productId: breakKind === 'FULL' ? productId : undefined,
                  customerId: breakKind === 'CUSTOMER_BROKEN' ? customerId : undefined,
                  waiveBottleLiability: breakKind === 'CUSTOMER_BROKEN' ? waiveLiability : undefined,
                  ...packBody(),
                })
              }
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'compensation' && !compCustomerId} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bottle compensation</DialogTitle>
          </DialogHeader>
          <Label>Customer</Label>
          <select
            className="field w-full mb-2"
            value={compCustomerId}
            onChange={(e) => setCompCustomerId(e.target.value)}
          >
            <option value="">Select customer…</option>
            {(customers as R[]).map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {String(c.name)}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {compCustomerId && (
        <BottleCompensationDialog
          open={modal === 'compensation'}
          onOpenChange={(o) => {
            if (!o) {
              setModal(null);
              setCompCustomerId('');
            }
          }}
          customerId={compCustomerId}
          customerName={String((customers as R[]).find((c) => c.id === compCustomerId)?.name)}
          bottleTypeId={bottleTypeId}
          bottleType={bt as { id: string; name?: string; replacementPrice?: unknown }}
          bottlesOwedInternal={compOwedInternal}
        />
      )}

      <Dialog open={modal === 'reconcile'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Physical count reconcile</DialogTitle>
          </DialogHeader>
          <p className="text-xs muted mb-2">Adjusts warehouse records only — not customer ledger.</p>
          <Label>Counted empty</Label>
          <Input value={reconcileEmpty} onChange={(e) => setReconcileEmpty(e.target.value)} />
          <Label>Counted damaged</Label>
          <Input value={reconcileDamaged} onChange={(e) => setReconcileDamaged(e.target.value)} />
          {fullByProduct.map((row) => (
            <div key={String(row.productId)}>
              <Label>{String(row.name)} full count</Label>
              <Input data-product={row.productId} defaultValue={String(row.quantity)} />
            </div>
          ))}
          <Label>Reason</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button
              disabled={busy}
              onClick={() => {
                const fullCounts = fullByProduct.map((row) => {
                  const el = document.querySelector(
                    `input[data-product="${row.productId}"]`,
                  ) as HTMLInputElement;
                  return { productId: String(row.productId), quantity: n(el?.value) };
                });
                submit('/inventory/reconcile', {
                  bottleTypeId,
                  countedEmpty: n(reconcileEmpty),
                  countedDamaged: n(reconcileDamaged),
                  fullCounts,
                  note,
                });
              }}
            >
              Apply reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'price'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replacement price</DialogTitle>
          </DialogHeader>
          <Input value={replacementPrice} onChange={(e) => setReplacementPrice(e.target.value)} placeholder="ETB per bottle" />
          <DialogFooter>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await patch(`/bottle-types/${bottleTypeId}`, {
                    replacementPrice: replacementPrice || '0',
                  });
                  toast.success('Updated');
                  await invalidateBalanceQueries(qc);
                  setModal(null);
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : 'Failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
