import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'paid' || s === 'payment') {
    return (
      <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
        {status}
      </Badge>
    );
  }
  if (s === 'partial' || s === 'inactive') {
    return (
      <Badge variant="secondary" className="bg-amber-50 text-amber-900">
        {status}
      </Badge>
    );
  }
  if (s === 'unpaid') {
    return <Badge variant="destructive">{status}</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}
