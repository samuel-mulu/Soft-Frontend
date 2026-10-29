import './globals.css';import type {Metadata} from 'next';import {Providers} from '@/components/providers';
import {BRAND_MARK,BRAND_OWNER,BRAND_TAGLINE} from '@/lib/brand';
export const metadata:Metadata={title:`${BRAND_MARK} | ${BRAND_OWNER}`,description:BRAND_TAGLINE};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
