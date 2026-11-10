import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'CardMatch | Find your next card',description:'An invite-only community for sports card collectors.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
