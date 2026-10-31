'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { api, getToken, getUser, logout, saveSession } from '@/lib/api';
import { SplashScreen } from '@/components/ui/skeleton';
import { BRAND_MARK, getLogoPath } from '@/lib/brand';

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        router.replace('/login');
        return;
      }
      const cached = getUser();
      if (cached?.role && cached.role !== 'CUSTOMER') {
        router.replace('/sales');
        return;
      }
      try {
        const me = await api('/auth/me');
        if (cancelled) return;
        if (me.role !== 'CUSTOMER') {
          router.replace('/sales');
          return;
        }
        saveSession(getToken(), me);
        setUser(me);
      } catch {
        if (!cancelled) logout();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!user) {
    return <SplashScreen message="Loading your account…" />;
  }

  const displayName = user.name || user.phone || 'Customer';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="portal-header sticky top-0 z-20 bg-white border-b border-[#e5eae5] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={getLogoPath()} alt="" className="w-9 h-9 rounded-xl shrink-0" width={36} height={36} />
          <div className="min-w-0">
            <p className="text-sm font-extrabold truncate">{BRAND_MARK}</p>
            <p className="muted text-xs truncate">{displayName}{user.phone ? ` · ${user.phone}` : ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="btn btn-ghost shrink-0 text-xs py-2 px-3 min-h-[40px]"
          aria-label="Sign out"
        >
          <LogOut size={16} />
          <span className="hidden xs:inline">Sign out</span>
        </button>
      </header>
      <main className="flex-1 page-shell px-4 py-5 md:px-6 md:py-7 max-w-3xl mx-auto w-full page-enter">{children}</main>
    </div>
  );
}
