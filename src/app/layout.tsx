import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { organizationSchema, websiteSchema } from '@/lib/seo/json-ld';

// Self-hosted woff2 (latin subset, SIL OFL — licenses alongside the files in ./fonts).
// Replaces next/font/google: the dev/build environment has no reliable access to
// fonts.gstatic.com and the retry timeouts were slowing every compile and request.
const inter = localFont({
  src: [
    { path: './fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL ?? 'https://anlyra.com').trim()),
  title: {
    default: 'Anlyra · Analytics AI per PMI italiane',
    template: '%s · Anlyra',
  },
  description:
    'Analytics di livello enterprise per PMI italiane. Insights AI, alert automatici, forecasting financiario. Privacy seria, sul serio.',
  keywords: [
    'analytics',
    'business intelligence',
    'PMI',
    'AI',
    'forecasting',
    'cashflow',
    'insights',
    'KPI',
    'dashboard',
    'piccole medie imprese',
  ],
  authors: [{ name: 'Anlyra' }],
  creator: 'Anlyra',
  publisher: 'Anlyra',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    alternateLocale: ['en_US'],
    url: '/',
    siteName: 'Anlyra',
    title: 'Anlyra · Analytics AI per PMI italiane',
    description:
      'Analytics di livello enterprise per PMI italiane. Privacy seria, sul serio.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Anlyra — Analytics AI per PMI italiane',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anlyra · Analytics AI per PMI italiane',
    description:
      'Analytics di livello enterprise per PMI italiane. Privacy seria, sul serio.',
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      'it-IT': '/it',
      'en-US': '/en',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
