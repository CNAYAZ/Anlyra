import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://anlyra.com';

interface PageDef {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}

const PUBLIC_PAGES: PageDef[] = [
  { path: '',                priority: 1.0, changeFrequency: 'weekly'  },
  { path: '/pricing',        priority: 0.9, changeFrequency: 'monthly' },
  { path: '/login',          priority: 0.6, changeFrequency: 'monthly' },
  { path: '/legal/privacy',  priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/legal/terms',    priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/legal/cookies',  priority: 0.4, changeFrequency: 'yearly'  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return locales.flatMap((locale) =>
    PUBLIC_PAGES.map((page) => ({
      url: `${BASE_URL}/${locale}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${BASE_URL}/${l}${page.path}`])
        ),
      },
    }))
  );
}
