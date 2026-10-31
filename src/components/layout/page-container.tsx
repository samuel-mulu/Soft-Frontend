import { cn } from '@/lib/utils';

export function PageContainer({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full', wide ? 'max-w-[1600px]' : 'max-w-[1480px]', className)}>
      {children}
    </div>
  );
}
