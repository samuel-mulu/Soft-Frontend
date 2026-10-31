'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';

export function DataTable({
  columns,
  rows,
  emptyMessage = 'No records yet.',
}: {
  columns: { key: string; header: string; render: (row: Record<string, unknown>) => React.ReactNode }[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <div className="rounded-xl border bg-card">
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
