import { AppShell } from '@/components/layout/app-shell';
import { BottleDisplayProvider } from '@/components/bottle-display-mode';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <BottleDisplayProvider>{children}</BottleDisplayProvider>
    </AppShell>
  );
}
