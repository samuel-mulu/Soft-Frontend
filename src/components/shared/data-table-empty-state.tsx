'use client';

export function DataTableEmptyState({ message }: { message: string }) {
  return (
    <div className="panel table-wrap max-w-full overflow-x-auto">
      <div className="text-center muted py-14 text-sm">{message}</div>
    </div>
  );
}
