'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';

const TEAM_SIZES = ['1', '2-5', '6-15', '16-50', '50+'];

const COPY = {
  it: {
    brand: 'Configura la tua organizzazione',
    step: (n: number) => `Passo ${n} di 4`,
    s1Title: 'La tua azienda',
    s1Name: 'Nome organizzazione',
    s1Vat: 'Partita IVA (opzionale)',
    s2Title: 'Settore e dimensione',
    s2Industry: 'Settore',
    s2Team: 'Quante persone nel team?',
    s3Title: 'Dati',
    s3Body: 'Potrai importare i tuoi dati (CSV, Excel, integrazioni) subito dopo il setup. Per ora saltiamo questo passo.',
    s4Title: 'Invita il team',
    s4Body: 'Aggiungi colleghi via email. Puoi farlo anche più tardi.',
    addInvite: 'Aggiungi invito',
    back: 'Indietro',
    next: 'Continua',
    skip: 'Salta',
    finish: 'Completa setup',
    finishing: 'Creazione…',
    error: 'Qualcosa è andato storto. Riprova.',
    namePh: 'Es. Acme S.r.l.',
    roles: { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' },
  },
  en: {
    brand: 'Set up your organization',
    step: (n: number) => `Step ${n} of 4`,
    s1Title: 'Your company',
    s1Name: 'Organization name',
    s1Vat: 'VAT number (optional)',
    s2Title: 'Industry & size',
    s2Industry: 'Industry',
    s2Team: 'How many people on the team?',
    s3Title: 'Data',
    s3Body: 'You’ll be able to import your data (CSV, Excel, integrations) right after setup. We’ll skip this for now.',
    s4Title: 'Invite your team',
    s4Body: 'Add colleagues by email. You can also do this later.',
    addInvite: 'Add invite',
    back: 'Back',
    next: 'Continue',
    skip: 'Skip',
    finish: 'Finish setup',
    finishing: 'Creating…',
    error: 'Something went wrong. Please try again.',
    namePh: 'e.g. Acme Inc.',
    roles: { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' },
  },
} as const;

export default function OnboardingOrganizationPage() {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'it';
  const t = COPY[locale];

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [vatNumber, setVat] = useState('');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('1');
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([{ email: '', role: 'viewer' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateInvite(idx: number, patch: Partial<{ email: string; role: string }>) {
    setInvites((cur) => cur.map((inv, i) => (i === idx ? { ...inv, ...patch } : inv)));
  }

  async function finish() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          vatNumber,
          industry,
          teamSize,
          invites: invites.filter((inv) => inv.email.trim()),
        }),
      });
      if (!res.ok) {
        setError(t.error);
        return;
      }
      window.location.href = `/${locale}/overview`;
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-heading text-base font-bold text-primary">{t.brand}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
          <CardDescription className="mt-2">{t.step(step)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <CardTitle className="text-lg">{t.s1Title}</CardTitle>
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.s1Name}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat">{t.s1Vat}</Label>
                <Input id="vat" value={vatNumber} onChange={(e) => setVat(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <CardTitle className="text-lg">{t.s2Title}</CardTitle>
              <div className="space-y-1.5">
                <Label htmlFor="industry">{t.s2Industry}</Label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.s2Team}</Label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_SIZES.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={teamSize === size ? 'primary' : 'secondary'}
                      onClick={() => setTeamSize(size)}
                      className="tabular-nums"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <CardTitle className="text-lg">{t.s3Title}</CardTitle>
              <p className="text-sm text-muted-foreground">{t.s3Body}</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <CardTitle className="text-lg">{t.s4Title}</CardTitle>
              <p className="text-sm text-muted-foreground">{t.s4Body}</p>
              <div className="space-y-2">
                {invites.map((inv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="collega@azienda.it"
                      value={inv.email}
                      onChange={(e) => updateInvite(idx, { email: e.target.value })}
                    />
                    <select
                      value={inv.role}
                      onChange={(e) => updateInvite(idx, { role: e.target.value })}
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="admin">{t.roles.admin}</option>
                      <option value="editor">{t.roles.editor}</option>
                      <option value="viewer">{t.roles.viewer}</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setInvites((cur) => cur.filter((_, i) => i !== idx))}
                      aria-label="Remove invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setInvites((cur) => [...cur, { email: '', role: 'viewer' }])}>
                  <Plus className="mr-1 h-4 w-4" /> {t.addInvite}
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || loading}>
              <ArrowLeft className="mr-1 h-4 w-4" /> {t.back}
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !name.trim()}>
                {step === 3 ? t.skip : t.next} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={finish} disabled={loading || !name.trim()}>
                {loading ? t.finishing : t.finish}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
