'use client';

import { useEffect } from 'react';
import { useCreditsStore } from '@/stores/credits-store';

export function CreditsHydrator({ credits, max }: { credits: number; max: number }) {
  const setCredits = useCreditsStore((s) => s.setCredits);
  const setMax = useCreditsStore((s) => s.setMax);

  useEffect(() => {
    setCredits(credits);
    setMax(max);
  }, [credits, max, setCredits, setMax]);

  return null;
}
