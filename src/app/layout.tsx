import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { organizationSchema, websiteSchema } from '@/lib/seo/json-ld';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://anlyra.it'),
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
