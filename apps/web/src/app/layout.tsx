import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { brand } from '@gdf/shared';
import './globals.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.poweredBy}`,
  description: brand.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
