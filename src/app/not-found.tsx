import { ErrorState } from '@/components/ui/state';

export default function GlobalNotFound() {
  return (
    <html lang="it">
      <body>
        <ErrorState
          variant="fullpage"
          bigCode="404"
          title="Pagina non trovata"
          description="La pagina che stai cercando non esiste o è stata spostata."
          support={{ href: '/it', label: 'Torna alla home' }}
        />
      </body>
    </html>
  );
}
