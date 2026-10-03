'use client';

import { useEffect } from 'react';
import { useDemoQuestionsStore } from '@/stores/demo-questions-store';

export function DemoQuestionsHydrator({ left }: { left: number | null }) {
  const setLeft = useDemoQuestionsStore((s) => s.setLeft);

  useEffect(() => {
    setLeft(left);
  }, [left, setLeft]);

  return null;
}
