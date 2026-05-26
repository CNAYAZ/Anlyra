'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ShieldCheck, KeyRound, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TwoFactorPanel from './TwoFactorPanel';

export default function SettingsSecurityPage() {
  const t = useTranslations('settings');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [toast, setToast] = useState<'ok' | 'err' | null>(null);

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8 || newPwd !== confirmPwd) {
      setToast('err');
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setOldPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setToast('ok');
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('securityTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('securitySubtitle')}</p>
      </div>

      {toast === 'ok' && (
        <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {t('securityPasswordChanged')}
        </div>
      )}
      {toast === 'err' && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <X className="h-4 w-4" /> {t('securityPasswordError')}
        </div>
      )}

      <form onSubmit={changePassword} className="card space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary-accent" />
          <h2 className="font-heading text-lg font-semibold">{t('securityChangePassword')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="old-pwd">{t('securityOldPassword')}</Label>
            <Input id="old-pwd" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-pwd">{t('securityNewPassword')}</Label>
            <Input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-pwd">{t('securityConfirmPassword')}</Label>
            <Input id="confirm-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('securityPasswordHint')}</p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t('securityUpdatePassword')}
        </button>
      </form>

      <TwoFactorPanel />

      <div className="card flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-success" />
        <p className="text-sm text-muted-foreground">{t('securityAuditNote')}</p>
      </div>
    </div>
  );
}
