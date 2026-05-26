'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useLocale } from 'next-intl';

interface Org {
  id: string;
  name: string;
  role: string;
  isCurrent: boolean;
}

export function OrgSwitcher() {
  const locale = useLocale();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/orgs/list')
      .then((r) => r.json())
      .then((d) => setOrgs(d.organizations || []))
      .catch(() => setOrgs([]));
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Nothing to switch between: hide entirely (e.g. demo or single-org users).
  if (orgs.length < 2) return null;

  const current = orgs.find((o) => o.isCurrent) ?? orgs[0];

  async function switchTo(id: string) {
    if (switching || id === current.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await fetch('/api/orgs/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: id }),
      });
      window.location.href = `/${locale}/overview`;
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm hover:bg-muted transition-colors max-w-[180px]"
      >
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{current.name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-60 rounded-lg border border-border bg-popover shadow-md overflow-hidden z-50">
          <nav className="py-1">
            {orgs.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => switchTo(o.id)}
                disabled={switching}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <span className="truncate">{o.name}</span>
                {o.isCurrent && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
