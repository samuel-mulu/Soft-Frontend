'use client';

import { ChevronRight } from 'lucide-react';

export type ListColumn<T> = {
  name: string;
  render: (row: T) => React.ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  primary?: boolean;
};

type ResponsiveListProps<T extends { id?: string }> = {
  rows: T[];
  columns: ListColumn<T>[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T, index: number) => string;
};

export function ResponsiveList<T extends { id?: string }>({
  rows,
  columns,
  emptyMessage = 'No records yet.',
  onRowClick,
  rowKey,
}: ResponsiveListProps<T>) {
  const visibleMobile = columns.filter((c) => !c.hideOnMobile && c.name);
  const primaryCol = columns.find((c) => c.primary) || columns[0];

  if (!rows.length) {
    return (
      <div className="panel p-10 text-center muted text-sm md:hidden">{emptyMessage}</div>
    );
  }

  return (
    <ul className="md:hidden space-y-3 list-none m-0 p-0">
      {rows.map((row, i) => {
        const key = rowKey?.(row, i) || row.id || String(i);
        const clickable = !!onRowClick;
        return (
          <li key={key}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onRowClick?.(row)}
              className={`mobile-record-card w-full text-left ${clickable ? 'mobile-record-card--clickable' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 font-bold text-[15px] leading-snug">
                  {primaryCol?.render(row)}
                </div>
                {clickable && <ChevronRight className="shrink-0 text-[#94a49a] mt-0.5" size={18} />}
              </div>
              <dl className="mobile-record-meta">
                {visibleMobile
                  .filter((c) => c !== primaryCol)
                  .map((c) => (
                    <div key={c.name} className="mobile-record-meta-row">
                      <dt>{c.mobileLabel || c.name}</dt>
                      <dd>{c.render(row)}</dd>
                    </div>
                  ))}
              </dl>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DesktopTable<T extends { id?: string }>({
  columns,
  rows,
  emptyMessage = 'No records yet. Create your first entry to get started.',
}: {
  columns: ListColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  return (
    <div className="hidden md:block panel table-wrap">
      <table className="data-table data-table--desktop">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.name || 'action'}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={r.id || i}>
                {columns.map((c) => (
                  <td key={c.name || 'action'}>{c.render(r)}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center muted py-14!">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
