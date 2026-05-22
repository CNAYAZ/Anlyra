import { ErrorState } from '@/components/ui/state';
import { Link } from '@/i18n/routing';

export default function NotFound() {
  return (
    <ErrorState
      variant="fullpage"
      bigCode="404"
      title="Pagina non trovata"
      description="La pagina che stai cercando non esiste o è stata spostata."
      support={{ href: '/', label: 'Torna alla home' }}
    />
  );
}
