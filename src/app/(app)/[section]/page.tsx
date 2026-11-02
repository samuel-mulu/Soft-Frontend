import { redirect } from 'next/navigation';

const SECTIONS = new Set([
  'dashboard',
  'sell',
  'sales',
  'customers',
  'products',
  'warehouse',
  'inventory',
  'bottles',
  'payments',
  'finance',
  'reports',
  'settings',
]);

export default async function LegacySectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (SECTIONS.has(section)) {
    redirect(`/${section}`);
  }
  redirect('/sell');
}
