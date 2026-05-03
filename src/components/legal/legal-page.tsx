import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export function LegalPage({
  title,
  lastUpdated,
  children
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <div className="container max-w-3xl py-12 md:py-20">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-accent">Legal</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900 md:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{lastUpdated}</p>

          <article className="prose prose-slate mt-8 max-w-none text-slate-700 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h3]:mt-6 [&_h3]:font-semibold [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
            {children}
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
