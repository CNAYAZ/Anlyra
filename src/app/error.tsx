'use client';

import { ErrorState } from '@/components/ui/state';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body>
        <ErrorState
          variant="fullpage"
          bigCode="500"
          title="Si è verificato un errore"
          description="Qualcosa è andato storto. Riprova tra qualche istante."
          retry={{ onClick: reset, label: 'Riprova' }}
        />
      </body>
    </html>
  );
}
