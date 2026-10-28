import './globals.css';import type {Metadata} from 'next';import {Providers} from '@/components/providers';
export const metadata:Metadata={title:'FlowStock | Distribution',description:'Soft drink distribution and bottle ledger'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
