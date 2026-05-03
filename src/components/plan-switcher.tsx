'use client';

import { useSession } from '@/lib/session-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Plan } from '@/lib/plans';

const plans: Plan[] = ['FREEMIUM', 'STARTER', 'PRO', 'ENTERPRISE'];

export function PlanSwitcher() {
  const plan = useSession((s) => s.plan);
  const setPlan = useSession((s) => s.setPlan);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>Plan</span>
      <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
        <SelectTrigger className="h-8 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {plans.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
