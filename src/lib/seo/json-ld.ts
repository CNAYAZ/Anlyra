/**
 * Utility per Schema.org JSON-LD structured data.
 * Genera oggetti schema da serializzare in <script type="application/ld+json">
 * dentro Server Components.
 */

import { COMPANY } from '@/lib/company';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://anlyra.com').trim();

// ─── ORGANIZATION ───────────────────────────────────────
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Anlyra',
    legalName: 'Anlyra S.r.l.', // placeholder — aggiornare con ragione sociale reale
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/opengraph-image.png`,
      width: 1200,
      height: 630,
    },
    description:
      'Analytics di livello enterprise per PMI italiane. Insights AI, alert automatici, forecasting. Privacy seria, sul serio.',
    foundingDate: '2026', // placeholder
    founders: [
      {
        '@type': 'Person',
        name: 'Anlyra Team',
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: COMPANY.countryCode,
      // Was hardcoded to 'Bologna' with a "// placeholder" comment — i.e. the
      // structured data published to search engines named the wrong town. Now
      // it reads the real registered address, like every other surface.
      addressLocality: COMPANY.city,
      addressRegion: COMPANY.region,
      postalCode: COMPANY.postalCode,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: COMPANY.contactEmail,
      availableLanguage: ['Italian', 'English'],
      areaServed: 'EU',
    },
    sameAs: [
      // placeholder per social profiles — aggiungere quando attivati
      // 'https://twitter.com/anlyra_it',
      // 'https://linkedin.com/company/anlyra',
    ],
  };
}

// ─── WEBSITE ────────────────────────────────────────────
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'Anlyra',
    description: 'Analytics AI per PMI italiane',
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    inLanguage: ['it-IT', 'en-US'],
  };
}

// ─── SOFTWARE APPLICATION (SaaS prodotto) ───────────────
export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${BASE_URL}/#software`,
    name: 'Anlyra',
    operatingSystem: 'Web (browser-based)',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Analytics',
    url: BASE_URL,
    description:
      'Piattaforma analytics AI per PMI: insights automatici, alert, forecast.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '49',
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          billingDuration: 'P1M',
          unitText: 'mese',
        },
      },
      {
        '@type': 'Offer',
        name: 'Avanzato',
        price: '149',
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          billingDuration: 'P1M',
          unitText: 'mese',
        },
      },
    ],
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
  };
}

// ─── PRODUCT (singolo piano per pricing page) ───────────
interface PlanProductParams {
  name: string; // "Pro", "Avanzato"
  description: string;
  priceMonthly: number;
  priceYearly: number;
  isPopular?: boolean;
}

export function productSchema(params: PlanProductParams) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Anlyra ${params.name}`,
    description: params.description,
    brand: {
      '@type': 'Brand',
      name: 'Anlyra',
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Mensile',
        price: params.priceMonthly.toString(),
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          billingDuration: 'P1M',
        },
        availability: 'https://schema.org/InStock',
        seller: { '@id': `${BASE_URL}/#organization` },
      },
      {
        '@type': 'Offer',
        name: 'Annuale',
        price: params.priceYearly.toString(),
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          billingDuration: 'P1Y',
        },
        availability: 'https://schema.org/InStock',
        seller: { '@id': `${BASE_URL}/#organization` },
      },
    ],
  };
}

// ─── BREADCRUMB ─────────────────────────────────────────
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── FAQ (per pricing page se ha sezione FAQ) ───────────
interface FAQItem {
  question: string;
  answer: string;
}

export function faqSchema(items: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
