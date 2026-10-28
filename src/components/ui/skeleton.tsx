'use client';

type BoneProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function Bone({ className = '', style }: BoneProps) {
  return <div className={`skeleton-bone ${className}`} style={style} aria-hidden />;
}

export function ShellAuthSkeleton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="app-shell-skeleton">
      <aside
        className={`desktop-sidebar shrink-0 bg-white border-r border-[#e5eae5] p-4 space-y-3 ${
          collapsed ? 'desktop-sidebar--collapsed w-[76px]' : 'w-[242px]'
        }`}
      >
        <Bone className="h-10 w-10 rounded-xl mx-auto" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone key={i} className={`h-10 rounded-xl ${collapsed ? 'w-10 mx-auto' : 'w-full'}`} />
        ))}
      </aside>
      <div className="flex-1 p-5 md:p-8">
        <Bone className="h-[70px] w-full rounded-2xl mb-6" />
        <PageRouteSkeleton />
      </div>
    </div>
  );
}

export function SplashScreen({ message = 'Loading workspace…' }: { message?: string }) {
  return (
    <div className="app-splash" role="status" aria-live="polite" aria-busy="true">
      <div className="app-splash-card">
        <div className="app-splash-logo-wrap">
          <img src="/logo.svg" alt="" className="app-splash-logo" />
          <span className="app-splash-ring" aria-hidden />
        </div>
        <p className="app-splash-brand">FlowStock</p>
        <p className="app-splash-tag">Distribution workspace</p>
        <div className="app-splash-bar">
          <span className="app-splash-bar-fill" />
        </div>
        <p className="app-splash-msg">{message}</p>
      </div>
    </div>
  );
}

export function SkeletonPageHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
      <Bone className="h-8 w-48 max-w-[70vw] rounded-xl" />
      {action && <Bone className="h-[42px] w-36 rounded-xl" />}
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 mb-7">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel stat">
          <div className="flex items-center justify-between mb-3">
            <Bone className="h-3 w-20 rounded" />
            <Bone className="h-9 w-9 rounded-lg" />
          </div>
          <Bone className="h-7 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="panel table-wrap p-0 overflow-hidden">
      <div className="flex gap-4 px-4 py-3 border-b border-[#edf1ed] bg-[#fbfcfb]">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-3 flex-1 min-w-[60px] rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-4 border-t border-[#edf1ed]">
          {Array.from({ length: cols }).map((_, c) => (
            <Bone
              key={c}
              className={`h-4 flex-1 min-w-[50px] rounded ${c === 0 ? 'max-w-[140px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonSearchRow() {
  return (
    <div className="flex items-center gap-3 my-5">
      <Bone className="h-[43px] w-full max-w-sm rounded-[11px]" />
      <Bone className="h-3 w-16 rounded hidden sm:block" />
    </div>
  );
}

/** Default skeleton when switching app sections (Next.js loading.tsx). */
export function PageRouteSkeleton() {
  return (
    <div className="page-enter">
      <SkeletonPageHeader action />
      <SkeletonStatGrid count={4} />
      <SkeletonTable rows={7} cols={5} />
    </div>
  );
}

export function DataLoadSkeleton({ variant = 'table' }: { variant?: 'table' | 'stats' | 'stats-table' }) {
  if (variant === 'stats') return <SkeletonStatGrid />;
  if (variant === 'stats-table')
    return (
      <>
        <SkeletonStatGrid />
        <SkeletonTable />
      </>
    );
  return <SkeletonTable />;
}

export function LoadError({ error }: { error: { message?: string } | null }) {
  if (!error) return null;
  return (
    <div className="panel p-6 text-red-700 mb-5 border border-[#e8b4ab] bg-[#fff8f7]">
      {error.message || 'Something went wrong loading data.'}
    </div>
  );
}
