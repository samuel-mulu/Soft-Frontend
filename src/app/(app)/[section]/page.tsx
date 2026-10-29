'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const Workspace = dynamic(
  () => import('@/components/workspace').then((mod) => ({ default: mod.Workspace })),
  { ssr: false },
);

export default function Section() {
  const params = useParams();
  return <Workspace section={String(params.section)} />;
}
