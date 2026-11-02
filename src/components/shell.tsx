'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Boxes,
  Package,
  PackageCheck,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  ArrowUpRight,
  GlassWater,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, logout, saveSession } from '@/lib/api';
import { prefetchNavRoute } from '@/hooks/queries';
import { SplashScreen } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BRAND_MARK, BRAND_OWNER, getLogoPath } from '@/lib/brand';

const SIDEBAR_KEY = 'fs_sidebar_collapsed';

const nav = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['sell', 'New sale', ShoppingCart],
  ['customers', 'Customers', Users],
  ['warehouse', 'Stock warehouse', PackageCheck],
  ['inventory', 'Bottle warehouse', Boxes],
  ['products', 'Products & stock', Package],
  ['bottles', 'Bottle returns', GlassWater],
  ['payments', 'Payments', Wallet],
  ['finance', 'Expenses', ArrowUpRight],
  ['reports', 'Reports', ChartNoAxesCombined],
  ['settings', 'Staff & settings', Settings],
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        router.replace('/login');
        return;
      }
      try {
        const me = await api('/auth/me');
        if (cancelled) return;
        if (me.role === 'CUSTOMER') {
          router.replace('/portal');
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

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (!user) {
    return <SplashScreen message="Signing you in…" />;
  }

  const filtered = nav.filter((x) => user.role === 'OWNER' || !['reports', 'settings'].includes(x[0]));

  const navLinkClass = (id: string) =>
    `sidebar-nav-link flex items-center gap-3 rounded-lg px-4 py-2.5 mb-0.5 font-semibold text-[13px] transition-colors ${
      pathname === `/${id}` || pathname.startsWith(`/${id}/`)
        ? 'bg-sidebar-accent text-sidebar-primary'
        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
    }`;

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  function prefetchSection(section: string) {
    void prefetchNavRoute(queryClient, section);
  }

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <aside
        className={`desktop-sidebar w-[242px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 h-screen ${
          sidebarCollapsed ? 'desktop-sidebar--collapsed' : ''
        }`}
      >
        <div className="sidebar-brand p-6 flex items-center gap-3 text-xl font-bold min-h-[88px] text-sidebar-foreground">
          <img src={getLogoPath()} alt="" className="w-10 h-10 rounded-lg shrink-0" />
          <div className="sidebar-brand-text min-w-0 leading-tight">
            <span className="block truncate tracking-tight">{BRAND_MARK}</span>
            <span className="block truncate text-[11px] font-semibold text-muted-foreground">{BRAND_OWNER}</span>
          </div>
        </div>
        <div className="sidebar-section-label px-4 pb-3 text-[10px] tracking-[0.12em] font-semibold text-muted-foreground uppercase">
          Workspace
        </div>
        <nav className="px-3 flex-1 overflow-y-auto pb-6">
          {filtered.map(([id, label, Icon]) => (
            <Link
              key={id}
              href={`/${id}`}
              title={sidebarCollapsed ? label : undefined}
              className={navLinkClass(id)}
              onMouseEnter={() => prefetchSection(id)}
              onFocus={() => prefetchSection(id)}
            >
              <Icon size={18} className="shrink-0" />
              <span className="sidebar-link-label truncate">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 sidebar-footer-user">
          <div className="sidebar-user-meta">
            <div className="text-sm font-semibold truncate">{user.username}</div>
            <div className="muted text-xs mt-1">{user.role === 'OWNER' ? 'Owner' : 'Cashier'}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="sidebar-signout mt-4 flex items-center gap-2 text-xs font-semibold text-destructive/90 hover:text-destructive"
          >
            <LogOut size={15} /> <span className="sidebar-link-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 page-shell flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex h-[70px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-5 md:px-9 supports-[padding:max(0px)]:pt-[max(0px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="sidebar-toggle inline-flex lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              title="Menu"
            >
              <Menu size={20} />
            </button>
            <button
              type="button"
              className="sidebar-toggle hidden lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div className="flex font-bold items-center gap-2 text-primary min-w-0 lg:hidden">
              <img src={getLogoPath()} alt="" className="w-8 h-8 rounded-lg shrink-0" />
              <span className="truncate">{BRAND_MARK}</span>
            </div>
            <div className="hidden lg:block text-xs font-semibold muted truncate tracking-wide">Distribution workspace</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {user.role === 'OWNER' ? 'Owner' : 'Cashier'}
            </Badge>
            <span className="w-9 h-9 bg-secondary text-primary rounded-full flex items-center justify-center font-semibold text-sm">
              {user.username?.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main
          className={`page-enter mx-auto w-full min-w-0 max-w-[1480px] overflow-x-hidden ${
            pathname === '/sell' ? 'px-2 py-2 md:px-4 md:py-3' : 'p-3 md:p-5'
          }`}
        >
          {children}
        </main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex h-full w-[min(100vw,280px)] gap-0 p-0 border-r border-sidebar-border bg-sidebar sm:max-w-[280px]">
          <SheetHeader className="border-b border-sidebar-border px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-3 text-base font-bold text-sidebar-foreground">
              <img src={getLogoPath()} alt="" className="h-9 w-9 rounded-lg shrink-0" />
              <span className="truncate">{BRAND_MARK}</span>
            </SheetTitle>
            <p className="text-[11px] font-semibold text-muted-foreground">{BRAND_OWNER}</p>
          </SheetHeader>
          <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Workspace
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {filtered.map(([id, label, Icon]) => (
              <Link
                key={id}
                href={`/${id}`}
                onClick={closeMobileNav}
                onMouseEnter={() => prefetchSection(id)}
                onFocus={() => prefetchSection(id)}
                className={navLinkClass(id)}
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-sidebar-border p-4">
            <div className="text-sm font-semibold truncate">{user.username}</div>
            <div className="muted text-xs mt-1">{user.role === 'OWNER' ? 'Owner' : 'Cashier'}</div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                closeMobileNav();
                logout();
              }}
            >
              <LogOut size={15} className="mr-2" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
