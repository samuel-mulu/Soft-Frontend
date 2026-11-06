'use client';

import { useWarehouseSummary } from '@/hooks/queries';
import { LoadErrorBanner } from '@/components/shared/load-error';
import { SubtleRefreshIndicator } from '@/components/shared/subtle-refresh-indicator';
import { DataLoadSkeleton } from '@/components/ui/skeleton';
import { showBlockingError, showErrorBanner } from '@/lib/table-query-state';
import { QueryRefreshButton } from '@/components/shared/query-refresh-button';
import { queryKeys } from '@/lib/query-keys';
import { formatDozen, formatDozenValue, packSizeOrDefault } from '@/lib/pack-quantity';

type R = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

export function WarehouseStockSummary() {
  const { data, isLoading, error, isFetching } = useWarehouseSummary();
  const rows = (data?.rows as R[]) || [];
  const fullProducts = (data?.fullProducts as R[]) || [];
  const nonReturnable = (data?.nonReturnableFull as R[]) || [];
  const totals = (data?.totals as R) || {};

  return (
    <>
      <div className="page-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 md:mb-7">
        <h1 className="page-title">Stock warehouse</h1>
        <QueryRefreshButton queryKey={queryKeys.inventory.warehouseSummary()} />
      </div>

      {showBlockingError(!!error, data) ? <LoadErrorBanner error={error} /> : null}
      {showErrorBanner(!!error, data) ? <LoadErrorBanner error={error} /> : null}
      <SubtleRefreshIndicator active={isFetching && !!data} />

      {isLoading && !data ? (
        <DataLoadSkeleton variant="stats-table" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="label mb-1">Empty bottles</p>
              <p className="text-2xl font-extrabold text-primary tabular-nums">{formatDozenValue(n(totals.emptyDozen))}</p>
              <p className="text-xs muted mt-1">Warehouse empties ready to fill</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="label mb-1">Full drinks</p>
              <p className="text-2xl font-extrabold tabular-nums">{formatDozenValue(n(totals.fullDrinksDozen))}</p>
              <p className="text-xs muted mt-1">Sellable product on hand</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="label mb-1">Damaged</p>
              <p className="text-2xl font-extrabold tabular-nums">{formatDozenValue(n(totals.damagedDozen))}</p>
              <p className="text-xs muted mt-1">Broken / write-off stock</p>
            </div>
          </div>

          <div className="panel table-wrap mb-6">
            <h2 className="font-extrabold text-sm mb-3 px-1">By bottle type</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bottle type</th>
                  <th>Empty</th>
                  <th>Full drinks</th>
                  <th>Damaged</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted text-center py-8">
                      No bottle types yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={String(r.bottleTypeId)}>
                      <td>
                        <b>{String(r.name)}</b>
                        {r.capacityLabel ? (
                          <span className="text-xs muted ml-1">{String(r.capacityLabel)}</span>
                        ) : null}
                      </td>
                      <td className="font-extrabold text-primary tabular-nums">{formatDozen(n(r.empty), packSizeOrDefault(r.bottlesPerDozen))}</td>
                      <td className="font-semibold tabular-nums">{formatDozen(n(r.fullDrinks), packSizeOrDefault(r.bottlesPerDozen))}</td>
                      <td className="tabular-nums">{formatDozen(n(r.damaged), packSizeOrDefault(r.bottlesPerDozen))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="panel table-wrap mb-6">
            <h2 className="font-extrabold text-sm mb-3 px-1">Full drinks by product</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>In stock (dz)</th>
                </tr>
              </thead>
              <tbody>
                {fullProducts.length === 0 && nonReturnable.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted text-center py-8">
                      No full drink stock recorded.
                    </td>
                  </tr>
                ) : (
                  <>
                    {fullProducts.map((p) => (
                      <tr key={String(p.productId)}>
                        <td>{String(p.name)}</td>
                        <td className="font-extrabold text-primary tabular-nums">{formatDozen(n(p.quantity), packSizeOrDefault(p.bottlesPerDozen))}</td>
                      </tr>
                    ))}
                    {nonReturnable.map((p) => (
                      <tr key={`nr-${String(p.productId)}`}>
                        <td>
                          {String(p.name)}{' '}
                          <span className="text-xs muted">(non-returnable)</span>
                        </td>
                        <td className="font-extrabold tabular-nums">{formatDozen(n(p.quantity), packSizeOrDefault(p.bottlesPerDozen))}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {data?.disclaimer ? (
            <p className="text-xs muted max-w-2xl">{String(data.disclaimer)}</p>
          ) : null}
        </>
      )}
    </>
  );
}
