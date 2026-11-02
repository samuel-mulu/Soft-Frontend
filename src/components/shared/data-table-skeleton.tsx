'use client';

import { SkeletonTable } from '@/components/ui/skeleton';

export function DataTableSkeleton({
  rows = 6,
  cols = 5,
  columnHeaders,
}: {
  rows?: number;
  cols?: number;
  columnHeaders?: string[];
}) {
  if (!columnHeaders?.length) {
    return <SkeletonTable rows={rows} cols={cols} />;
  }
  return (
    <div className="panel table-wrap max-w-full overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columnHeaders.map((name) => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {columnHeaders.map((name) => (
                <td key={name}>
                  <div className="skeleton-bone h-4 w-full max-w-[8rem] rounded" aria-hidden />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
