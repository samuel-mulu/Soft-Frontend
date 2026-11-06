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
import { QuantityEntry } from '@/components/quantity-entry';
import { money, post } from '@/lib/api';
import { dozenToBottles, formatDozen, perDozenTotal } from '@/lib/pack-quantity';
import { invalidateBalanceQueries } from '@/lib/query-keys';

type BottleType = {
  id: string;
  name?: string;
  replacementPrice?: unknown;
};

export type BottleCompensationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  bottleTypeId: string;
  bottleType?: BottleType;
  bottlesOwedInternal: number;
};

const n = (v: unknown) => Number(v || 0);

export function BottleCompensationDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  bottleTypeId,
  bottleType,
  bottlesOwedInternal,
}: BottleCompensationDialogProps) {
  const client = useQueryClient();
  const [dozen, setDozen] = useState('');
  const [payNow, setPayNow] = useState('0');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const submitLock = useRef(false);

  const owed = Math.max(0, bottlesOwedInternal);
  const unitPrice = n(bottleType?.replacementPrice);

  const quantity = useMemo(() => {
    try {
      return dozenToBottles(dozen);
    } catch {
      return 0;
    }
  }, [dozen]);

  const totalCharge = unitPrice > 0 && quantity > 0 ? perDozenTotal(unitPrice, quantity) : 0;
  const payNowNum = n(payNow);
  const remainingBottles = owed - quantity;
  const compensationOutstanding = Math.max(0, totalCharge - payNowNum);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setDozen('');
      setPayNow('0');
      setNote('');
    }
  }, [open]);

  const validationError = useMemo(() => {
    if (!unitPrice || unitPrice <= 0) return 'Set a replacement price on this bottle type first (Inventory).';
    if (quantity <= 0) return 'Enter how many dozen to compensate.';
    if (quantity > owed) return `Cannot exceed ${formatDozen(owed)} currently owed.`;
    if (payNowNum < 0) return 'Pay now cannot be negative.';
    if (payNowNum > totalCharge + 0.001) return 'Pay now cannot exceed the total charge.';
    return null;
  }, [unitPrice, quantity, owed, payNowNum, totalCharge]);

  async function onConfirm() {
    if (validationError || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        customerId,
        bottleTypeId,
        quantity,
        note: note.trim() || undefined,
      };
      if (payNowNum > 0.001) payload.payNowAmount = String(payNowNum);
      const res = await post('/customer-bottles/compensations', payload);
      setResult(res as Record<string, unknown>);
      toast.success('Bottle compensation recorded');
      await invalidateBalanceQueries(client, customerId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not post compensation');
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bottle compensation</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-primary">Compensation saved</p>
            <ul className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <li>
                Bottle obligation reduced by <b>{formatDozen(quantity)}</b> — remaining{' '}
                <b>{formatDozen(Math.max(0, remainingBottles))}</b> owed
              </li>
              <li>
                Charge: <b>{money(totalCharge)}</b>
              </li>
              <li>
                Cash received now: <b>{money(payNowNum)}</b>
              </li>
              <li>
                Compensation still owed: <b>{money(compensationOutstanding)}</b>
              </li>
              <li className="text-xs muted pt-1">No empty bottles were added to warehouse stock.</li>
            </ul>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-sm">
              <div>
                <Label>Customer</Label>
                <p className="font-semibold mt-1">{customerName || customerId}</p>
              </div>
              <div>
                <Label>Bottle type</Label>
                <p className="font-semibold mt-1">{bottleType?.name || bottleTypeId}</p>
              </div>
              <div className="flex justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="muted">Owed (dozen)</span>
                <span className="font-bold tabular-nums">{formatDozen(owed)}</span>
              </div>
              <div>
                <Label>Quantity to compensate (dozen)</Label>
                <QuantityEntry
                  fieldClass="field"
                  value={dozen} onChange={setDozen}
                />
              </div>
              <div className="flex justify-between gap-2">
                <span className="muted">Replacement price per dozen</span>
                <span className="font-bold">{unitPrice > 0 ? `${money(unitPrice)} / dz` : 'Not set'}</span>
              </div>
              <div className="flex justify-between gap-2 text-base">
                <span className="font-semibold">Total charge</span>
                <span className="font-extrabold tabular-nums">{money(totalCharge)}</span>
              </div>
              <div>
                <Label htmlFor="pay-now">Pay now (optional ETB)</Label>
                <Input
                  id="pay-now"
                  type="number"
                  min={0}
                  step="0.01"
                  value={payNow}
                  onChange={(e) => setPayNow(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="comp-note">Note (optional)</Label>
                <Input id="comp-note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              {validationError && (
                <p className="text-sm text-destructive font-medium">{validationError}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={busy || !!validationError} onClick={onConfirm}>
                {busy ? 'Posting…' : 'Confirm compensation'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
