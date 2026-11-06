'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { QuantityEntry } from '@/components/quantity-entry';
import { BottleBalance } from '@/components/balance-display';
import { post, getUser } from '@/lib/api';
import { dozenToBottles, formatDozen, projectBottleInternal } from '@/lib/pack-quantity';
import { invalidateBalanceQueries } from '@/lib/query-keys';
import { usePackSizes } from '@/hooks/use-pack-sizes';

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  bottleTypeId: string;
  bottleTypeName?: string;
  bottlesOwedInternal: number;
};

export function GoodBottleReturnDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  bottleTypeId,
  bottleTypeName,
  bottlesOwedInternal,
}: BaseProps) {
  const client = useQueryClient();
  const perDozen = usePackSizes().bottle(bottleTypeId);
  const [dozen, setDozen] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const returnQty = useMemo(() => {
    try {
      return dozenToBottles(dozen, perDozen);
    } catch {
      return 0;
    }
  }, [dozen, perDozen]);

  const projected = projectBottleInternal(bottlesOwedInternal, 0, returnQty);

  useEffect(() => {
    if (!open) {
      setDozen('');
      setNote('');
    }
  }, [open]);

  async function submit() {
    if (returnQty <= 0) {
      toast.error('Enter return quantity');
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await post('/customer-bottles/returns', {
        customerId,
        bottleTypeId,
        quantity: returnQty,
        note: note.trim() || undefined,
      });
      toast.success('Bottles returned to warehouse');
      await invalidateBalanceQueries(client, customerId);
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not record return');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Return bottles</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="muted">Customer:</span> <b>{customerName}</b>
          </p>
          <p>
            <span className="muted">Bottle type:</span> <b>{bottleTypeName}</b>
          </p>
          <div className="flex justify-between rounded-lg border border-border px-3 py-2">
            <span className="muted">Owed now (dozen)</span>
            <BottleBalance internal={bottlesOwedInternal} size="sm" perDozen={perDozen} />
          </div>
          <div>
            <Label>Quantity returned in dozen (usable empties)</Label>
            <QuantityEntry
              fieldClass="field"
              value={dozen} onChange={setDozen} perDozen={perDozen}
            />
          </div>
          {returnQty > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p>
                Returning: <b>{formatDozen(returnQty, perDozen)}</b>
              </p>
              <p className="flex justify-between font-semibold pt-1 border-t border-border">
                <span>After return</span>
                <BottleBalance internal={projected} size="sm" perDozen={perDozen} />
              </p>
            </div>
          )}
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : 'Record return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BrokenBottleReturnDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  bottleTypeId,
  bottleTypeName,
  bottlesOwedInternal,
}: BaseProps) {
  const client = useQueryClient();
  const perDozen = usePackSizes().bottle(bottleTypeId);
  const owner = getUser()?.role === 'OWNER';
  const [dozen, setDozen] = useState('');
  const [reason, setReason] = useState('');
  const [waive, setWaive] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const qty = useMemo(() => {
    try {
      return dozenToBottles(dozen, perDozen);
    } catch {
      return 0;
    }
  }, [dozen, perDozen]);

  useEffect(() => {
    if (!open) {
      setDozen('');
      setReason('');
      setWaive(false);
      idempotencyKeyRef.current = null;
    } else if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, [open]);

  async function submit() {
    if (qty <= 0) {
      toast.error('Enter quantity');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required for broken returns');
      return;
    }
    if (waive && !owner) {
      toast.error('Only the owner can waive bottle liability');
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await post('/inventory/breakage', {
        kind: 'CUSTOMER_BROKEN',
        bottleTypeId,
        customerId,
        quantity: qty,
        reason: reason.trim(),
        waiveBottleLiability: waive || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      });
      toast.success(waive ? 'Broken intake recorded; liability waived' : 'Broken bottles recorded (damaged stock)');
      await invalidateBalanceQueries(client, customerId);
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not record broken return');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Broken bottle return</DialogTitle>
        </DialogHeader>
        <p className="text-xs muted">
          Broken glass goes to <b>damaged stock</b>, not usable empties. Bottle obligation stays unless the owner
          waives it. To charge money, use <b>Bottle compensation</b> separately.
        </p>
        <div className="space-y-3 text-sm">
          <p>
            <span className="muted">Customer:</span> <b>{customerName}</b> · <b>{bottleTypeName}</b>
          </p>
          <div className="flex justify-between rounded-lg border border-border px-3 py-2">
            <span className="muted">Bottles owed (unchanged unless waived)</span>
            <BottleBalance internal={bottlesOwedInternal} size="sm" perDozen={perDozen} />
          </div>
          <div>
            <Label>Broken quantity (dozen)</Label>
            <QuantityEntry
              fieldClass="field"
              value={dozen} onChange={setDozen} perDozen={perDozen}
            />
          </div>
          <div>
            <Label>Reason (required)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Cracked on delivery"
            />
          </div>
          {owner && (
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={waive} onCheckedChange={(v) => setWaive(v === true)} className="mt-0.5" />
              <span>
                Waive bottle liability for this quantity
                <span className="block text-xs muted">Requires owner approval; does not charge replacement ETB.</span>
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : 'Record broken return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
