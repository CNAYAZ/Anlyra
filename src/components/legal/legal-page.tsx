'use client';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Link } from '@/i18n/navigation';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  tableHeaders?: string[];
  tableRows?: string[][];
};

export type LegalPageProps = {
  title: string;
  subtitle: string;
  lastRevised: string;
  disclaimer: string;
  disclaimerLabel: string;
  /** Optional — only the privacy page passes this (AI Act art. 50 disclosure). */
  aiModelNote?: string;
  aiModelNoteLabel?: string;
  /** Optional — second paragraph of the same box: exactly which fields are sent to the AI provider. */
  aiDataFlowNote?: string;
  tocTitle: string;
  readAlso: string;
  sections: LegalSection[];
  crossLinks: { href: string; label: string }[];
};

export function LegalPage({
  title,
  subtitle,
  lastRevised,
  disclaimer,
  disclaimerLabel,
  aiModelNote,
  aiModelNoteLabel,
  aiDataFlowNote,
  tocTitle,
  readAlso,
  sections,
  crossLinks,
}: LegalPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-20">
          {/* Disclaimer */}
          <div className="mb-8 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">{disclaimerLabel}</p>
            <p className="mt-1 text-sm text-foreground">{disclaimer}</p>
          </div>

          {/* AI Act art. 50 disclosure: provider + model, read from config at
              render time (see the privacy page.tsx) so it's never hand-typed
              in more than one place. Neutral styling — it's an info note, not
              a warning like the box above. */}
          {aiModelNote && (
            <div className="mb-8 rounded-lg border border-primary-accent/30 bg-primary-accent/5 p-4">
              {aiModelNoteLabel && (
                <p className="text-sm font-semibold text-primary-accent">{aiModelNoteLabel}</p>
              )}
              <p className="mt-1 text-sm text-foreground">{aiModelNote}</p>
              {aiDataFlowNote && (
                <p className="mt-2 text-sm text-foreground">{aiDataFlowNote}</p>
              )}
            </div>
          )}

          {/* Header */}
          <p className="text-xs font-medium uppercase tracking-wide text-primary-accent">Legal</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{lastRevised}</p>

          {/* TOC */}
          <nav className="mt-8 rounded-lg border border-border bg-card p-6" aria-label="Table of contents">
            <h2 className="font-heading text-base font-semibold text-foreground">{tocTitle}</h2>
            <ol className="mt-3 space-y-1.5 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-primary-accent hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          <article className="mt-10 space-y-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-foreground">{s.title}</h2>
                {s.paragraphs?.map((p, i) => (
                  <p key={i} className="mt-3 text-sm leading-relaxed text-foreground">
                    {p}
                  </p>
                ))}
                {s.items && (
                  <ul className="mt-3 space-y-2 text-sm text-foreground">
                    {s.items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.tableHeaders && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          {s.tableHeaders.map((h, i) => (
                            <th
                              key={i}
                              className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.tableRows?.map((row, ri) => (
                          <tr key={ri} className="border-b border-border/50 last:border-0">
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className={`px-4 py-2.5 ${ci === 0 ? 'font-mono text-foreground' : 'text-muted-foreground'}`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </article>

          {/* Cross-links */}
          {crossLinks.length > 0 && (
            <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
              <span>{readAlso}: </span>
              {crossLinks.map((l, i) => (
                <span key={l.href}>
                  {i > 0 && ' · '}
                  <Link href={l.href} className="text-primary-accent hover:underline">
                    {l.label}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
