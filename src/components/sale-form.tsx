'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiRequestError,
  friendlySaleError,
  inferSaleFieldErrors,
  postSaleWithRetry,
  stockIssues,
  type SaleFieldErrors,
} from '@/lib/sale-errors';
import { toast } from 'sonner';
import { api, post, money, amount, getUser } from '@/lib/api';
import {
  printSaleReceipt,
  downloadSaleReceipt,
  resolveReceiptLogoUrl,
  type SaleReceiptData,
} from '@/lib/sale-receipt';
import { getBusinessName } from '@/lib/brand';
import { presentCustomerBalance, toDisplayBottle } from '@/lib/customer-balance';
import { formatEachBreakdown } from '@/lib/pack-quantity';
import { CustomerBalanceSummary } from '@/components/balance-display';
import { SaleItemCard } from '@/features/sales/components/sale-item-card';
import { EntityCombobox } from '@/features/sales/components/entity-combobox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FS_CONTROL, FS_LABEL, FS_LABEL_STRONG } from '@/lib/ui-classes';
import { cn } from '@/lib/utils';
import { invalidateBalanceQueries } from '@/lib/query-keys';
import {
  emptySaleLine,
  lineReturnedEach,
  lineSoldEach,
  returnedQtyLabel,
  soldQtyLabel,
  type SaleLine,
} from '@/lib/sale-line-quantity';
import { ChevronDown, Download, GlassWater, Plus, Printer, X } from 'lucide-react';
import {
  useProducts,
  useCustomers,
  useBottleTypes,
  useInventoryBalances,
  useCustomerBottles,
} from '@/hooks/queries';

type R = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

function productReturnable(p: R | undefined) {
  return !!p && (p.packagingKind ?? 'RETURNABLE') !== 'NONE';
}

function registeredCustomerOptions(rows: R[], activeOnly = false) {
  return (rows || [])
    .filter((x) => !activeOnly || x.status === 'ACTIVE')
    .map((c) => ({
      id: String(c.id),
      name: c.phone ? `${c.name} · ${c.phone}` : String(c.name),
    }));
}

const PAY_METHODS = [
  { id: 'CASH', name: 'Cash' },
  { id: 'BANK', name: 'Bank' },
  { id: 'MOBILE', name: 'Mobile' },
];
const EMPTY_SALE_FIELDS: SaleFieldErrors = { qty: [], paid: [], ret: [], payment: false, credit: false };
type PaymentMode = 'total' | 'detail';

function Field({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <Label className={strong ? FS_LABEL_STRONG : FS_LABEL}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function CustomerSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <EntityCombobox
      value={value}
      onChange={onChange}
      placeholder="Registered customer…"
      searchPlaceholder="Search customer…"
      options={[
        { id: '', label: 'Walk-in guest (no account)' },
        ...options.map((o) => ({ id: o.id, label: o.name })),
      ]}
    />
  );
}

export function SaleForm() {
  const client = useQueryClient();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: bottles = [] } = useBottleTypes();
  const { data: balances = [] } = useInventoryBalances();

  const [saving, setSaving] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SaleFieldErrors>(EMPTY_SALE_FIELDS);
  const [customerId, setCustomerId] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const { data: customerLedger } = useCustomerBottles(customerId || undefined, !!customerId);
  const [guestName, setGuestName] = useState('');
  const [items, setItems] = useState<SaleLine[]>([emptySaleLine()]);
  const [discount, setDiscount] = useState('0');
  const [payment, setPayment] = useState('');
  const [method, setMethod] = useState('CASH');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('detail');
  const [note, setNote] = useState('');
  const [last, setLast] = useState<R | null>(null);
  const [lastReceipt, setLastReceipt] = useState<SaleReceiptData | null>(null);
  const saleIdempotencyKey = useRef<string | null>(null);

  const active = products.filter((p: R) => p.active);
  const lineTotal = (line: SaleLine) => {
    const p = active.find((pr: R) => pr.id === line.productId);
    return n(p?.sellingPrice) * lineSoldEach(line);
  };
  const linePaidAmt = (line: SaleLine) =>
    paymentMode === 'detail' ? n(line.linePaid ?? lineTotal(line)) : 0;
  const cartLines = items
    .map((line, i) => {
      const p = active.find((pr: R) => pr.id === line.productId);
      const lineAmt = lineTotal(line);
      const each = lineSoldEach(line);
      return {
        i,
        productId: line.productId,
        name: String(p?.name || 'Product'),
        quantity: each,
        qtyLabel: soldQtyLabel(line),
        line: lineAmt,
        paid: linePaidAmt(line),
        method: line.lineMethod || 'CASH',
      };
    })
    .filter((x) => x.productId && x.quantity > 0);
  const subtotal = cartLines.reduce((s, x) => s + x.line, 0);
  const total = Math.max(0, subtotal - n(discount));
  const paymentReceived = paymentMode === 'detail' ? cartLines.reduce((s, x) => s + x.paid, 0) : n(payment);
  const saleCredit = Math.max(0, paymentReceived - total);
  const remaining = Math.max(0, total - paymentReceived);
  const returnEachOnLine = (line: SaleLine) => (customerId ? lineReturnedEach(line) : 0);
  const selectedCustomer = customerId ? customers.find((c: R) => c.id === customerId) : null;
  const customerBottleHeld = () => {
    const map = new Map<string, number>();
    for (const t of (customerLedger as R)?.totals as R[] || [])
      map.set(String(t.bottleTypeId), n(t.outstanding));
    if (!map.size)
      for (const b of (selectedCustomer as R)?.bottleBalances as R[] || [])
        map.set(String(b.bottleTypeId), n(b.outstanding));
    return map;
  };
  const projectedBottleBalances = () => {
    if (!customerId) return [];
    const map = new Map(customerBottleHeld());
    for (const line of items.filter((x) => x.productId)) {
      const p = active.find((pr: R) => pr.id === line.productId);
      if (!productReturnable(p)) continue;
      const bt = p?.bottleTypeId as string | undefined;
      if (!bt) continue;
      const each = lineSoldEach(line);
      map.set(bt, (map.get(bt) || 0) + each - returnEachOnLine(line));
    }
    return [...map.entries()].map(([bottleTypeId, outstanding]) => ({ bottleTypeId, outstanding }));
  };
  const projectedMoneyInternal = () => {
    if (!customerId) return null;
    const before = n((selectedCustomer as R)?.moneyOutstanding);
    return before + total - paymentReceived;
  };
  const allBottleRowsForSummary = () =>
    [...customerBottleHeld()].map(([bottleTypeId, outstanding]) => ({ bottleTypeId, outstanding }));
  const cartHasReturnable = items.some((line) => {
    const p = active.find((pr: R) => pr.id === line.productId);
    return productReturnable(p);
  });
  const showBottleReturns = !!customerId && cartHasReturnable;
  const showBottleAccount = !!customerId && (cartHasReturnable || customerBottleHeld().size > 0);
  const customerMoneyOwed = () => n((selectedCustomer as R)?.moneyOutstanding);
  const accountPanelSummary = () => {
    if (!customerId) return 'Full payment required';
    const bits: string[] = [];
    bits.push(presentCustomerBalance(customerMoneyOwed(), 'money', 'staff').label);
    const held = [...customerBottleHeld()].filter(([, q]) => q !== 0);
    if (held.length) bits.push(`${held.length} bottle type${held.length === 1 ? '' : 's'} out`);
    return bits.join(' · ');
  };

  function syncDetailPaid(a: SaleLine[]) {
    return a.map((x) => {
      if (!x.productId) return x;
      const t = lineTotal(x);
      return { ...x, linePaidEdited: false, linePaid: String(t), lineMethod: x.lineMethod || 'CASH' };
    });
  }
  function saleQtyTouched(patch: Partial<SaleLine>) {
    return (
      patch.productId !== undefined ||
      patch.qtyMode !== undefined ||
      patch.soldDozen !== undefined ||
      patch.soldEach !== undefined
    );
  }
  function applyLinePatch(line: SaleLine, patch: Partial<SaleLine>): SaleLine {
    let next = { ...line, ...patch };
    if (patch.qtyMode !== undefined && !next.retEdited) next.retMode = patch.qtyMode;
    if (customerId && saleQtyTouched(patch) && !next.retEdited) next = { ...next, retDozen: '', retEach: '' };
    if (patch.productId !== undefined && !next.retEdited)
      next = { ...next, retDozen: '', retEach: '', retMode: next.qtyMode };
    if (paymentMode === 'detail') {
      if (saleQtyTouched(patch) && !next.linePaidEdited) next.linePaid = String(lineTotal(next));
      if (patch.productId !== undefined && !next.linePaidEdited) {
        next.linePaidEdited = false;
        next.lineMethod = next.lineMethod || 'CASH';
      }
    }
    return next;
  }
  function clearSaleErrors() {
    setSaleError(null);
    setFieldErrors(EMPTY_SALE_FIELDS);
  }
  function patchLine(i: number, patch: Partial<SaleLine>) {
    clearSaleErrors();
    setItems((a) => {
      const pid = patch.productId;
      if (pid) {
        const top = a.findIndex((x, j) => x.productId === pid && j !== i);
        if (top !== -1) {
          const trimmed = a.filter((_, j) => j !== i);
          return trimmed.length ? trimmed : [emptySaleLine()];
        }
      }
      return a.map((x, j) => (j === i ? applyLinePatch(x, patch) : x));
    });
  }
  function aggregateBottleReturns() {
    const agg = new Map<string, number>();
    for (const line of items) {
      if (!line.productId || !customerId) continue;
      const p = active.find((pr: R) => pr.id === line.productId);
      if (!productReturnable(p)) continue;
      const bt = p?.bottleTypeId as string | undefined;
      if (!bt) continue;
      const ret = returnEachOnLine(line);
      if (ret < 0) return { error: 'Return quantity cannot be negative' };
      if (ret > 0) agg.set(bt, (agg.get(bt) || 0) + ret);
    }
    return { bottles: [...agg.entries()].map(([bottleTypeId, quantity]) => ({ bottleTypeId, quantity })) };
  }
  function buildReceiptSnapshot(invoiceNo: string, createdAt?: string): SaleReceiptData {
    const businessName = getBusinessName();
    const cust = customerId ? customers.find((c: R) => c.id === customerId) : null;
    const customerLabel = String(cust?.name || guestName?.trim() || 'Walk-in guest');
    const payName = (id: string) => PAY_METHODS.find((m) => m.id === id)?.name || id;
    const moneyLines = items
      .filter((x) => x.productId)
      .map((line) => {
        const p = active.find((pr: R) => pr.id === line.productId)!;
        const lt = lineTotal(line);
        const paid = linePaidAmt(line);
        const each = lineSoldEach(line);
        return {
          name: String(p.name),
          qty: each,
          qtyLabel: soldQtyLabel(line),
          unitPrice: money(p.sellingPrice),
          lineTotal: money(lt),
          ...(paymentMode === 'detail'
            ? {
                paid: money(paid),
                method: payName(line.lineMethod || 'CASH'),
                credit: money(Math.max(0, lt - paid)),
              }
            : {}),
        };
      });
    const bottleLinesRaw = customerId
      ? items
          .filter((x) => x.productId)
          .flatMap((line) => {
            const p = active.find((pr: R) => pr.id === line.productId);
            if (!productReturnable(p)) return [];
            const each = lineSoldEach(line);
            const ret = returnEachOnLine(line);
            return [
              {
                product: String(p!.name),
                sold: each,
                soldLabel: soldQtyLabel(line),
                returned: ret,
                returnedLabel: returnedQtyLabel(line),
                withCustomer: each - ret,
              },
            ];
          })
      : [];
    const bottleLines = bottleLinesRaw.length ? bottleLinesRaw : undefined;
    const bottleBalMap = new Map<string, number>();
    const touched = new Set<string>();
    if (customerId) {
      for (const [id, qty] of customerBottleHeld()) bottleBalMap.set(id, qty);
      for (const line of items.filter((x) => x.productId)) {
        const p = active.find((pr: R) => pr.id === line.productId);
        if (!productReturnable(p)) continue;
        const bt = p?.bottleTypeId as string | undefined;
        if (!bt) continue;
        touched.add(bt);
        bottleBalMap.set(bt, (bottleBalMap.get(bt) || 0) + lineSoldEach(line) - returnEachOnLine(line));
      }
    }
    const bottleBalances = customerId
      ? [...bottleBalMap.entries()]
          .filter(([id, balance]) => balance !== 0 || touched.has(id))
          .map(([id, balance]) => ({
            name: String(bottles.find((b: R) => b.id === id)?.name || 'Bottle'),
            balance: toDisplayBottle(balance),
          }))
      : undefined;
    const dateLabel = createdAt
      ? new Date(createdAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
    return {
      businessName,
      logoUrl: resolveReceiptLogoUrl(),
      dateLabel,
      customerLabel,
      customerPhone: cust?.phone ? String(cust.phone).trim() : undefined,
      paymentMode,
      paymentMethodLabel: paymentMode === 'total' ? payName(method) : undefined,
      moneyLines,
      subtotal: money(subtotal),
      discount: money(n(discount)),
      total: money(total),
      received: money(paymentReceived),
      remaining: saleCredit > 0 ? `Credit ${money(saleCredit)}` : money(remaining),
      bottleLines,
      bottleBalances: bottleBalances?.length ? bottleBalances : undefined,
      note: note.trim() || undefined,
      receiptRef: `Ref ${invoiceNo.slice(0, 24)}`,
    };
  }

  async function finalize(printAfter: boolean) {
    clearSaleErrors();
    if (
      items.some((x) => !x.productId || lineSoldEach(x) < 1) ||
      new Set(items.map((x) => x.productId)).size !== items.length
    ) {
      const msg = 'Add at least one product with quantity.';
      setSaleError(msg);
      toast.error(msg);
      return;
    }
    if (paymentMode === 'detail') {
      for (const line of items) {
        if (!line.productId) continue;
        if (!customerId && linePaidAmt(line) > lineTotal(line)) {
          const msg = 'Walk-in: paid amount cannot exceed the line total.';
          setSaleError(msg);
          setFieldErrors({
            ...EMPTY_SALE_FIELDS,
            paid: items.map((x, j) => (x.productId ? j : -1)).filter((j) => j >= 0),
            payment: true,
          });
          toast.error(msg);
          return;
        }
      }
    }
    if (!customerId && paymentReceived > total) {
      const msg = 'Walk-in: payment cannot exceed the sale total.';
      setSaleError(msg);
      setFieldErrors({ ...EMPTY_SALE_FIELDS, payment: true, credit: true });
      toast.error(msg);
      return;
    }
    const bottleAgg = aggregateBottleReturns();
    if (bottleAgg.error) {
      setSaleError(bottleAgg.error);
      setFieldErrors({ ...EMPTY_SALE_FIELDS, ret: items.map((_, j) => j) });
      toast.error(bottleAgg.error);
      return;
    }
    if (!customerId && (paymentReceived < total || (bottleAgg.bottles?.length ?? 0) > 0)) {
      const msg = 'Walk-in guest must pay in full. Pick a customer for credit or bottle returns.';
      setSaleError(msg);
      setFieldErrors({ ...EMPTY_SALE_FIELDS, credit: true, payment: true });
      toast.error(msg);
      return;
    }
    const stockLines = items.map((line) => ({
      productId: line.productId,
      quantity: line.productId ? lineSoldEach(line) : 0,
    }));
    const stockProblems = stockIssues(
      stockLines,
      balances as { kind?: string; productId?: string; quantity?: unknown }[],
      active as { id: string; name: string }[],
    );
    if (stockProblems.length) {
      const msg = stockProblems.map((s) => `${s.name}: only ${s.have} in stock (need ${s.need})`).join(' · ');
      setSaleError(msg);
      setFieldErrors({ ...EMPTY_SALE_FIELDS, qty: stockProblems.map((s) => s.index) });
      toast.error(msg);
      return;
    }
    if (!saleIdempotencyKey.current) saleIdempotencyKey.current = crypto.randomUUID();
    const payload: R = {
      items: items
        .filter((x) => x.productId)
        .map((line) => ({ productId: line.productId, quantity: lineSoldEach(line) })),
      discount: String(n(discount)),
      payment: String(paymentReceived),
      idempotencyKey: saleIdempotencyKey.current,
    };
    if (paymentMode === 'total') payload.paymentMethod = method;
    else
      payload.paymentParts = items
        .filter((x) => x.productId)
        .map((x) => ({ amount: String(linePaidAmt(x)), method: x.lineMethod || 'CASH' }))
        .filter((x) => n(x.amount) > 0);
    if (customerId) payload.customerId = customerId;
    else if (guestName) payload.guestName = guestName;
    if (note) payload.note = note;
    if (bottleAgg.bottles?.length) payload.bottlesReturned = bottleAgg.bottles;
    setSaving(true);
    try {
      const result = (await postSaleWithRetry(
        () => post('/sales', payload),
        (n) => toast.message(`Saving… (try ${n}/3)`),
      )) as R;
      toast.success('Sale saved');
      await invalidateBalanceQueries(client, customerId || undefined);
      clearSaleErrors();
      const receipt = buildReceiptSnapshot(String(result.invoiceNo), result.createdAt as string);
      setLastReceipt(receipt);
      setLast(result);
      saleIdempotencyKey.current = null;
      setItems([emptySaleLine()]);
      setPayment('');
      setDiscount('0');
      setPaymentMode('detail');
      setCustomerId('');
      setGuestName('');
      setNote('');
      if (printAfter) printSaleReceipt(receipt, { autoPrint: true });
    } catch (e: unknown) {
      const err = e instanceof ApiRequestError ? e : new ApiRequestError(e instanceof Error ? e.message : 'Sale failed', 0);
      const msg = friendlySaleError(err.message, err.status);
      setSaleError(msg);
      setFieldErrors(
        inferSaleFieldErrors(
          err.message,
          items.map((line) => ({ productId: line.productId, quantity: line.productId ? lineSoldEach(line) : 0 })),
          balances as R[],
        ),
      );
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const pending = saving;
  const bottleName = (id: string) => String(bottles.find((b: R) => b.id === id)?.name || 'Bottle');

  return (
    <div className="-mt-2 md:-mt-3">
      {saleError && (
        <div className="sale-error-banner" role="alert">
          {saleError}
        </div>
      )}
      {last && lastReceipt && (
        <div className="panel p-4 mb-3 border-green-300! bg-green-50! flex flex-wrap items-center justify-between gap-2">
          <div>
            <b>Sale completed</b>
            <p className="text-sm muted mt-0.5">
              {lastReceipt.receiptRef || String(last.invoiceNo ?? '')} · {money(last.total)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => printSaleReceipt(lastReceipt, { autoPrint: true })}>
              <Printer size={16} /> Print
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                downloadSaleReceipt(lastReceipt);
                toast.message('Receipt downloaded');
              }}
            >
              <Download size={16} /> Download
            </button>
          </div>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void finalize(false);
        }}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]"
      >
        <Card className="shadow-sm">
          <CardContent className="space-y-5 p-4 md:p-6">
          <div className="mb-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 min-w-0">
                <Label className={FS_LABEL}>Customer</Label>
                <div className="mt-1.5">
                <CustomerSelect
                  value={customerId}
                  onChange={(v) => {
                    setCustomerId(v);
                    setPayment('');
                    setAccountOpen(false);
                    setItems((a) =>
                      a.map((x) => ({ ...x, retDozen: '', retEach: '', retEdited: false, retMode: x.qtyMode })),
                    );
                  }}
                  options={registeredCustomerOptions(customers, true)}
                />
                </div>
              </div>
              {!customerId && (
                <div className="flex-1 min-w-0">
                  <Field label="Walk-in name">
                    <Input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Optional name for receipt"
                    />
                  </Field>
                </div>
              )}
              {customerId && (
                <div className="flex-1 min-w-0 flex flex-col">
                  <Label className={`${FS_LABEL} max-sm:sr-only`}>Customer account</Label>
                  <button
                    type="button"
                    className="fs-account-surface flex h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:brightness-[0.99]"
                    onClick={() => setAccountOpen((o) => !o)}
                    aria-expanded={accountOpen}
                  >
                    <span className="shrink-0 rounded-md bg-secondary p-1.5 text-primary">
                      <GlassWater size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">Customer account</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{accountPanelSummary()}</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn('shrink-0 text-muted-foreground transition-transform', accountOpen && 'rotate-180')}
                    />
                  </button>
                </div>
              )}
            </div>
            {customerId && accountOpen && (
              <div className="fs-panel mt-2 space-y-4 p-4">
                <CustomerBalanceSummary
                  moneyInternal={customerMoneyOwed()}
                  bottleRows={allBottleRowsForSummary()}
                  bottleName={bottleName}
                  projectedMoneyInternal={projectedMoneyInternal() ?? undefined}
                  projectedBottleRows={showBottleReturns ? projectedBottleBalances() : undefined}
                />
                {showBottleReturns && (
                  <p className="text-xs muted">Return column: returnable products only. Over-return is allowed.</p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {items.map((line, i) => {
              const product = active.find((p: R) => p.id === line.productId);
              const lt = lineTotal(line);
              const badQty = fieldErrors.qty.includes(i);
              const badPaid = fieldErrors.paid.includes(i) || fieldErrors.payment;
              const badRet = fieldErrors.ret.includes(i);
              return (
                <SaleItemCard
                  key={i}
                  line={line}
                  index={i}
                  products={active.map((p: R) => ({
                    id: String(p.id),
                    name: String(p.name),
                    returnable: productReturnable(p),
                  }))}
                  productReturnable={(id) => productReturnable(active.find((p: R) => p.id === id))}
                  showBottleReturns={showBottleReturns}
                  paymentModeDetail={paymentMode === 'detail'}
                  badQty={badQty}
                  badPaid={badPaid}
                  badRet={badRet}
                  lineAmountLabel={product ? amount(lt) : '—'}
                  lineTotalNumber={lt}
                  canRemove={items.length > 1}
                  payMethods={PAY_METHODS}
                  onPatch={(patch) => patchLine(i, patch)}
                  onRemove={() => setItems((a) => a.filter((_, j) => j !== i))}
                />
              );
            })}
          </div>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setItems((a) => [...a, emptySaleLine()])}>
            <Plus size={16} /> Add product
          </Button>
          </CardContent>
        </Card>
        <div className="sale-checkout-sticky lg:top-4">
          <Card className="shadow-sm">
            <CardHeader className="border-b border-border bg-muted/30 pb-3">
              <CardTitle className="text-base font-semibold tracking-tight">Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
            <div className="fs-section-surface divide-y divide-border overflow-hidden">
              {cartLines.length ? (
                cartLines.map((x) => (
                  <div key={`${x.productId}-${x.i}`} className="flex justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-semibold">
                      {x.name}{' '}
                      <span className="font-normal muted">
                        {x.qtyLabel} ({x.quantity} units)
                      </span>
                    </span>
                    <span className="fs-amount shrink-0 font-semibold">{money(x.line)}</span>
                  </div>
                ))
              ) : (
                <p className="muted text-sm px-3 py-4 text-center">Add a product to begin</p>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="fs-amount font-semibold">{money(subtotal)}</span>
            </div>
            <Field label="Discount (ETB)">
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <div
              className={cn(
                'fs-checkout-highlight grid grid-cols-2 gap-3 p-4',
                (fieldErrors.credit || fieldErrors.payment) && 'border-destructive/40 bg-destructive/5',
              )}
            >
              <div>
                <p className="fs-label mb-1">Total due</p>
                <p className="fs-amount text-2xl font-bold tracking-tight text-foreground">{money(total)}</p>
              </div>
              <div className="text-right">
                <p className="fs-label mb-1">
                  {saleCredit > 0 && customerId ? 'Credit this sale' : customerId ? 'Remaining (credit)' : 'To receive'}
                </p>
                <p className="fs-amount text-xl font-bold text-primary">
                  {!customerId ? money(total) : saleCredit > 0 ? `−${money(saleCredit)}` : money(remaining)}
                </p>
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <p className={FS_LABEL_STRONG}>Payment</p>
              {!customerId && <p className="fs-helper">Walk-in must pay the full amount.</p>}
              <div className="fs-payment-toggle">
                <button
                  type="button"
                  data-active={paymentMode === 'total'}
                  className="fs-payment-toggle-btn"
                  onClick={() => setPaymentMode('total')}
                >
                  Pay total
                </button>
                <button
                  type="button"
                  data-active={paymentMode === 'detail'}
                  className="fs-payment-toggle-btn"
                  onClick={() => {
                    setPaymentMode('detail');
                    setItems((a) => syncDetailPaid(a));
                  }}
                >
                  Pay per line
                </button>
              </div>
              {paymentMode === 'total' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Received" strong>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className={fieldErrors.payment ? 'border-destructive' : undefined}
                      value={payment}
                      onChange={(e) => {
                        clearSaleErrors();
                        setPayment(e.target.value);
                      }}
                      placeholder={customerId ? 'Less = credit · more = prepay' : 'Must match total'}
                    />
                  </Field>
                  <Field label="Method" strong>
                    <select
                      className={`${FS_CONTROL} touch-target`}
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      {PAY_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              {paymentMode === 'detail' && (
                <>
                  <p className="fs-helper">
                    Paid amount on each product row{customerId ? ' (can exceed line for prepay)' : ''}.
                  </p>
                  <div
                    className={cn(
                      'fs-section-surface flex items-center justify-between px-4 py-3',
                      fieldErrors.payment && 'border-destructive/40 bg-destructive/5',
                    )}
                  >
                    <span className="text-sm text-muted-foreground">Received (sum)</span>
                    <span className="fs-amount text-lg font-semibold">{money(paymentReceived)}</span>
                  </div>
                </>
              )}
            </div>
            {customerId && !accountOpen && (
              <button
                type="button"
                className="w-full text-left text-xs font-semibold text-primary hover:underline"
                onClick={() => setAccountOpen(true)}
              >
                Open customer account →
              </button>
            )}
            <Field label="Note">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </Field>
            <div className="sale-form-actions grid gap-3 pt-1">
              <Button disabled={pending || !items[0]?.productId} type="submit" className="min-h-11">
                {pending ? 'Processing…' : 'Complete sale'}
              </Button>
              <Button
                disabled={pending || !items[0]?.productId}
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void finalize(true)}
              >
                <Printer size={17} /> Complete & print
              </Button>
            </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
