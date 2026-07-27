import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { brand } from '@gdf/shared';
import { publicConfig } from '@/lib/server/config';
import { SmoothScroll } from '@/components/smooth-scroll';
import './globals.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.poweredBy}`,
  description: brand.tagline,
};

// Server-resolved (accepts any supported env-var naming); handed to the
// browser client at runtime so nothing depends on build-time NEXT_PUBLIC_ inlining.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = publicConfig();
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__GDF__=${JSON.stringify({ url: cfg.url, anonKey: cfg.anonKey })}`,
          }}
        />
        <SmoothScroll />
        <div className="gdf-backdrop" aria-hidden />
        {children}
      </body>
    </html>
  );
}
