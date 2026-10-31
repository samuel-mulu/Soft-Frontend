import './globals.css';import type {Metadata} from 'next';import {Providers} from '@/components/providers';
import {BRAND_MARK,BRAND_OWNER,BRAND_TAGLINE} from '@/lib/brand';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata:Metadata={title:`${BRAND_MARK} | ${BRAND_OWNER}`,description:BRAND_TAGLINE};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
