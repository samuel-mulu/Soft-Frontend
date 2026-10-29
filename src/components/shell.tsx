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
  Wallet,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  ArrowUpRight,
  Receipt,
  GlassWater,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { api, getToken, logout, saveSession } from '@/lib/api';
import { SplashScreen } from '@/components/ui/skeleton';

const SIDEBAR_KEY = 'fs_sidebar_collapsed';

const nav = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['sell', 'New sale', ShoppingCart],
  ['sales', 'Sales & invoices', Receipt],
  ['customers', 'Customers', Users],
  ['inventory', 'Empty bottles', Boxes],
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
  const [user, setUser] = useState<any>(null);
  const [mobileMore, setMobileMore] = useState(false);
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

  return (
    <div className="min-h-screen flex">
      <aside
        className={`desktop-sidebar w-[242px] shrink-0 bg-white border-r border-[#e5eae5] flex flex-col sticky top-0 h-screen ${
          sidebarCollapsed ? 'desktop-sidebar--collapsed' : ''
        }`}
      >
        <div className="sidebar-brand p-6 flex items-center gap-3 text-xl font-extrabold min-h-[88px]">
          <img src="/logo.svg" alt="" className="w-10 h-10 rounded-xl shrink-0" />
          <span className="sidebar-brand-text truncate">FlowStock</span>
        </div>
        <div className="sidebar-section-label px-4 pb-3 text-[10px] tracking-[.15em] font-bold text-[#94a49a]">
          WORKSPACE
        </div>
        <nav className="px-3 flex-1 overflow-y-auto pb-6">
          {filtered.map(([id, label, Icon]) => (
            <Link
              key={id}
              href={`/${id}`}
              title={sidebarCollapsed ? label : undefined}
              className={`sidebar-nav-link flex items-center gap-3 rounded-xl px-4 py-3 mb-1 font-semibold text-[13px] ${
                pathname === `/${id}` || pathname.startsWith(`/${id}/`)
                  ? 'bg-[#e7f4ed] text-[#126a4c]'
                  : 'text-[#68776e] hover:bg-[#f6f8f6]'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="sidebar-link-label truncate">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#e5eae5] p-4 sidebar-footer-user">
          <div className="sidebar-user-meta">
            <div className="text-sm font-bold truncate">{user.username}</div>
            <div className="muted text-xs mt-1">{user.role === 'OWNER' ? 'Owner' : 'Cashier'}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="sidebar-signout mt-4 flex items-center gap-2 text-xs font-bold text-[#a45c50]"
          >
            <LogOut size={15} /> <span className="sidebar-link-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 page-shell">
        <header className="bg-white border-b border-[#e5eae5] h-[70px] flex items-center justify-between px-5 md:px-9 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="sidebar-toggle hidden lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div className="lg:hidden font-extrabold flex items-center gap-2 text-[#177554] min-w-0">
              <img src="/logo.svg" alt="" className="w-8 h-8 rounded-lg shrink-0" /> FlowStock
            </div>
            <div className="hidden lg:block text-xs font-bold muted truncate">DISTRIBUTION WORKSPACE</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="tag hidden sm:inline">{user.role === 'OWNER' ? 'Owner' : 'Cashier'}</span>
            <span className="w-9 h-9 bg-[#e7f4ed] text-[#177554] rounded-full flex items-center justify-center font-bold">
              {user.username?.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main
          className={`max-w-[1480px] mx-auto page-enter ${
            pathname === '/sell' ? 'px-2 py-2 md:px-4 md:py-3' : 'p-3 md:p-5'
          }`}
        >
          {children}
        </main>
      </div>

      <nav className="mobile-nav fixed bottom-0 inset-x-0 bg-white border-t border-[#e5eae5] z-30 justify-around px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {(
          [
            ['dashboard', 'Home', LayoutDashboard],
            ['sell', 'Sell', ShoppingCart],
            ['customers', 'Customers', Users],
            ['inventory', 'Stock', Boxes],
            ['more', 'More', Menu],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => (id === 'more' ? setMobileMore(true) : router.push('/' + id))}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold min-w-[55px] ${
              pathname === '/' + id || pathname.startsWith('/' + id + '/') ? 'text-[#177554]' : 'text-[#85938a]'
            }`}
          >
            <Icon size={21} />
            {label}
          </button>
        ))}
      </nav>

      {mobileMore && (
        <div className="fixed inset-0 z-50 bg-[#102b22]/50" onClick={() => setMobileMore(false)}>
          <div
            className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-white p-5 max-h-[75vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4 font-bold">
              All pages
              <button type="button" onClick={() => setMobileMore(false)}>
                <X />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filtered.map(([id, label, Icon]) => (
                <Link
                  onClick={() => setMobileMore(false)}
                  key={id}
                  href={'/' + id}
                  className="border border-[#e5eae5] rounded-xl p-3 flex gap-2 items-center text-xs font-semibold"
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </div>
            <button type="button" className="btn btn-ghost w-full mt-4" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
