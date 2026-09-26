import type { MetadataRoute } from 'next';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://anlyra.com').trim();

// Public pages: landing, pricing, legal, login, and the plain-text fact sheet
// for AI assistants (/llms.txt, src/app/llms.txt/route.ts). Shared between the
// generic '*' rule and the named AI-crawler rule below so the two can never
// drift apart — same pages open to a browser and to an AI reading on a
// visitor's behalf.
const PUBLIC_PATHS = [
  '/',
  '/it',
  '/en',
  '/it/pricing',
  '/en/pricing',
  '/it/legal',
  '/en/legal',
  '/it/login',
  '/en/login',
  '/llms.txt',
];

// Everything that needs a signed-in session, or is otherwise not meant for a
// crawler: dashboard pages, API routes, build assets. Unchanged from before —
// the founder's decision only widens who may read PUBLIC_PATHS, never what
// stays closed.
const PRIVATE_PATHS = [
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
  '/it/scadenzario',
  '/en/scadenzario',
  '/it/situazione',
  '/en/situazione',
  '/it/spese-ricorrenti',
  '/en/spese-ricorrenti',
  '/it/share',
  '/en/share',
  '/it/onboarding',
  '/en/onboarding',
  '/_next/',
  '/static/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: PUBLIC_PATHS,
        disallow: PRIVATE_PATHS,
      },
      {
        // Founder's decision: the AI crawlers named below may read the same
        // public pages as anyone else — both the ones that collect content
        // for model training and the ones a user's own AI session triggers
        // to fetch a page live (e.g. the "Ask an AI" buttons on the landing
        // page, which point at anlyra.com and anlyra.com/llms.txt). Dashboard
        // and API routes stay closed to them exactly as to everyone else.
        //
        // Names verified 2026-09-26 against each provider's own documented
        // crawlers (via web search — the documentation domains themselves
        // were unreachable from this container's network egress proxy; the
        // search results quote and cite those official pages, from multiple
        // independent sources agreeing on each name):
        //   OpenAI     — GPTBot (training), OAI-SearchBot (ChatGPT search),
        //                ChatGPT-User (fetch triggered by a user's request).
        //   Anthropic  — ClaudeBot (training), Claude-SearchBot (search),
        //                Claude-User (fetch triggered by a user's request).
        //                Replaces the old 'anthropic-ai' entry: current
        //                documentation no longer lists that name.
        //   Perplexity — PerplexityBot (indexing), Perplexity-User (fetch
        //                triggered by a user's request).
        //   Google     — Google-Extended: controls use for Gemini training
        //                and grounding only. No separate real-time,
        //                user-triggered fetcher name was found documented —
        //                not invented here; see the session report.
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
          'Perplexity-User',
          'Google-Extended',
        ],
        allow: PUBLIC_PATHS,
        disallow: PRIVATE_PATHS,
      },
      {
        // Common Crawl: not one of the four providers in the founder's
        // decision (OpenAI, Anthropic, Perplexity, Google) — left blocked
        // everywhere, unchanged.
        userAgent: 'CCBot',
        disallow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
