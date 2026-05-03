import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pro.example.com';
const PATHS = ['', '/legal/privacy', '/legal/terms', '/legal/cookies'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return locales.flatMap((locale) =>
    PATHS.map((path) => ({
      url: `${SITE}/${locale}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.6,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${SITE}/${l}${path}`]))
      }
    }))
  );
}
