'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { DataTableSkeleton } from '@/components/shared/data-table-skeleton';
import { SubtleRefreshIndicator } from '@/components/shared/subtle-refresh-indicator';
import { showInitialSkeleton } from '@/lib/table-query-state';

export function DataTable({
  columns,
  rows,
  emptyMessage = 'No records yet.',
  loading = false,
  isRefreshing = false,
}: {
  columns: { key: string; header: string; render: (row: Record<string, unknown>) => React.ReactNode }[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
  loading?: boolean;
  isRefreshing?: boolean;
}) {
  if (showInitialSkeleton(loading, rows.length ? rows : undefined)) {
    return (
      <DataTableSkeleton
        rows={6}
        cols={columns.length}
        columnHeaders={columns.map((c) => c.header)}
      />
    );
  }

  if (!rows.length) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="rounded-xl border bg-card">
      {isRefreshing ? (
        <div className="px-4 pt-3">
          <SubtleRefreshIndicator active />
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={String(row.id ?? i)}>
              {columns.map((c) => (
                <TableCell key={c.key}>{c.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
