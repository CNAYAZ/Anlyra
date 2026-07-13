import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://anlyra.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/it',
          '/en',
          '/it/pricing',
          '/en/pricing',
          '/it/legal',
          '/en/legal',
          '/it/login',
          '/en/login',
        ],
        disallow: [
          '/api/',
          '/it/overview',
          '/en/overview',
          '/it/ai',
          '/en/ai',
          '/it/finance',
          '/en/finance',
          '/it/operations',
          '/en/operations',
          '/it/market',
          '/en/market',
          '/it/settings',
          '/en/settings',
          '/it/custom-dashboards',
          '/en/custom-dashboards',
          '/it/integrations',
          '/en/integrations',
          '/it/reports',
          '/en/reports',
          '/it/data',
          '/en/data',
          '/it/share',
          '/en/share',
          '/it/onboarding',
          '/en/onboarding',
          '/_next/',
          '/static/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        disallow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
