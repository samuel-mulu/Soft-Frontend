import type { MetadataRoute } from 'next';
import { BRAND_MARK, BRAND_TAGLINE } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: BRAND_MARK,
    short_name: BRAND_MARK,
    description: BRAND_TAGLINE,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#177554',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
