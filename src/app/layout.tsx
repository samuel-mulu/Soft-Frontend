import './globals.css';import type {Metadata,Viewport} from 'next';import {Providers} from '@/components/providers';
import {BRAND_MARK,BRAND_OWNER,BRAND_TAGLINE} from '@/lib/brand';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata:Metadata={
  title:`${BRAND_MARK} | ${BRAND_OWNER}`,
  description:BRAND_TAGLINE,
  applicationName:BRAND_MARK,
  appleWebApp:{capable:true,title:BRAND_MARK,statusBarStyle:'default'},
  icons:{
    icon:[
      {url:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},
      {url:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},
    ],
    apple:[{url:'/icons/apple-touch-icon.png',sizes:'180x180',type:'image/png'}],
  },
};
export const viewport:Viewport={themeColor:'#177554'};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
