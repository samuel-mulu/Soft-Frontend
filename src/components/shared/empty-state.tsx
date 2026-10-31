export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-14 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
