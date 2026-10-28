import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#f0f4f1]">
      <div className="panel p-10 max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#177554] mb-2">404</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Page not found</h1>
        <p className="muted mt-3 mb-6">This link does not exist in your workspace.</p>
        <Link href="/dashboard" className="btn btn-primary inline-flex">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
