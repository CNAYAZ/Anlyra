import { Link } from '@/i18n/routing';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
