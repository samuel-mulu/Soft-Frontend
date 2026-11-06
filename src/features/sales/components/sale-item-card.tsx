'use client';

import { QuantityInput } from '@/components/shared/quantity-input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FS_CONTROL, FS_LABEL_STRONG } from '@/lib/ui-classes';
import type { SaleLine } from '@/lib/sale-line-quantity';
import { EntityCombobox } from '@/features/sales/components/entity-combobox';
import { X } from 'lucide-react';

export function SaleItemCard({
  line,
  index,
  products,
  productReturnable,
  showBottleReturns,
  paymentModeDetail,
  badQty,
  badPaid,
  badRet,
  lineTotalNumber,
  lineAmountLabel,
  canRemove,
  payMethods,
  onPatch,
  onRemove,
}: {
  line: SaleLine;
  index: number;
  products: { id: string; name: string; returnable: boolean }[];
  productReturnable: (id: string) => boolean;
  showBottleReturns: boolean;
  paymentModeDetail: boolean;
  badQty: boolean;
  badPaid: boolean;
  badRet: boolean;
  lineTotalNumber: number;
  lineAmountLabel: string;
  canRemove: boolean;
  payMethods: { id: string; name: string }[];
  onPatch: (patch: Partial<SaleLine>) => void;
  onRemove: () => void;
}) {
  const product = products.find((p) => p.id === line.productId);
  const lineReturnable = product ? productReturnable(line.productId) : false;

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className={FS_LABEL_STRONG}>
            Product <span className="font-normal text-muted-foreground">· line {index + 1}</span>
          </p>
          <div className="mt-2">
            <EntityCombobox
              value={line.productId}
              onChange={(id) => onPatch({ productId: id })}
              placeholder="Choose product…"
              searchPlaceholder="Search products…"
              options={products.map((p) => ({
                id: p.id,
                label: p.name,
                hint: p.returnable ? undefined : 'no returns',
              }))}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Remove line"
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-4">
        <div className={`grid gap-3 ${showBottleReturns ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="fs-section-surface p-3">
            <Label className={`${FS_LABEL_STRONG} mb-2`}>Quantity sold (dozen)</Label>
            <QuantityInput
              value={line.soldDozen}
              onChange={(v) => onPatch({ soldDozen: v })}
              fieldClass={FS_CONTROL}
              invalid={badQty}
              disabled={!product}
            />
          </div>
          {showBottleReturns && (
            <div className="fs-section-surface p-3">
              <Label className={`${FS_LABEL_STRONG} mb-2`}>Bottles returned (dozen)</Label>
              {lineReturnable ? (
                <QuantityInput
                  value={line.retDozen}
                  onChange={(v) => onPatch({ retDozen: v, retEdited: true })}
                  fieldClass={FS_CONTROL}
                  invalid={badRet}
                  disabled={!product}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-1">Not returnable</p>
              )}
            </div>
          )}
        </div>
        {paymentModeDetail && (
          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <Label className={FS_LABEL_STRONG}>Paid (ETB)</Label>
              <Input
                type="number"
                inputMode="decimal"
                className={`mt-1.5 ${badPaid ? 'border-destructive' : ''}`}
                disabled={!product}
                value={line.linePaid ?? (product ? String(lineTotalNumber) : '')}
                onChange={(e) => onPatch({ linePaid: e.target.value, linePaidEdited: true })}
              />
            </div>
            <div>
              <Label className={FS_LABEL_STRONG}>Payment method</Label>
              <Select
                disabled={!product}
                value={line.lineMethod || 'CASH'}
                onValueChange={(v) => onPatch({ lineMethod: v ?? 'CASH', linePaidEdited: true })}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {payMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">Line total</span>
        <span className="fs-amount text-lg font-bold text-foreground">
          {product ? lineAmountLabel : '—'}
        </span>
      </CardFooter>
    </Card>
  );
}
