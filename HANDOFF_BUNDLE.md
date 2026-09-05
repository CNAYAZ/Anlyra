---
title: Anlyra Design System — Handoff Bundle for Claude Code
version: 1.0
created: 2026-05-17
author: Claude Design
target: Claude Code (Opus 4.7)
status: ready_for_implementation
---

> ⚠️ **Documento storico (creato 2026-05-17).** La fonte aggiornata è
> [`CLAUDE.md`](CLAUDE.md). In particolare, il punto 3 dell'elenco "Leggere prima di
> toccare il repo" qui sotto ("NextAuth NON è installato... cookie custom `pro_session`")
> e la riga "Stack target: Next.js 14" NON sono più vere: NextAuth v5 è installato e in
> uso, e la versione di Next.js reale è 16.2.12 (vedi CLAUDE.md §1, corretto il
> 2026-09-05). Il resto del documento — palette, tipografia, spacing, markup dei 14
> componenti, mappatura file→componente — resta un riferimento di design utile, non
> riverificato riga per riga in questo passaggio.

# Anlyra · Design System — Handoff Bundle per Claude Code

> **Destinatario**: Claude Code (Opus 4.7). Questo bundle è la **fonte di verità unica** per applicare il design system Anlyra al codebase. Tutte le decisioni di design sono già state prese e approvate dall'utente nelle 4 sessioni precedenti (Modulo 1 · Palette, 2 · Tipografia, 3 · Spacing/Radius/Elevation, 4 · 14 componenti). Il tuo compito è **applicare**, non re-discutere.
>
> **Stack target**: Next.js 14 (App Router, `src/` prefix) · Tailwind 3 · shadcn/ui · Radix UI · TanStack Table v8 · sonner · next-intl · Prisma.

---

## 📑 Indice

- [⚠️ Leggere prima di toccare il repo](#avvertenze-critiche)
- [Parte 1 — Sintesi design system (Moduli 1-4)](#parte-1)
- [Parte 2 — Mappatura File → Componente](#parte-2)
- [Parte 3 — Ordine di applicazione (5 fasi)](#parte-3)
- [Parte 4 — Avvertenze specifiche Anlyra](#parte-4)
- [Parte 5 — Test di verifica visiva](#parte-5)
- [Parte 6 — Decisioni rimandate](#parte-6)

---

<a id="avvertenze-critiche"></a>
## ⚠️ LEGGERE PRIMA DI TOCCARE IL REPO

1. **Branch principale**: `claude/merge-repos-nextjs-rOZU3`. **Conferma il branch** prima di iniziare e prima di concludere ogni intervento (lesson learned dal merge sbagliato precedente).
2. **Tutte le modifiche su feature branch + merge no-ff** verso il branch principale. Mai commit diretti sul principale.
3. **NextAuth NON è installato**. L'app usa cookie custom `pro_session`. Non importare `next-auth`/`@auth/*`. Non usare `signOut`.
4. **Logout** sempre via reload assoluto:
   ```ts
   window.location.href = `/api/auth/logout?locale=${locale}`
   ```
   Mai `router.push`/`router.replace` per il logout — lo state stale dell'app rovina la pulizia del cookie.
5. **Modelli Prisma zombie** (`User_b4`, `Organization_b7`, ecc): **NON usare** in query nuove, **NON rimuovere** dalle migration. Esistono per retrocompatibilità di dati legacy.
6. **3 versioni duplicate della Topbar**. La VERA è `src/components/dashboard/Topbar.tsx`. Le altre 2 vanno **eliminate** durante il consolidamento (Fase 4).
7. **2 versioni duplicate** di Button / Card / Badge / Skeleton (PascalCase vs lowercase). Mantenere SEMPRE la versione **shadcn lowercase** (`button.tsx`, `card.tsx`, ecc), eliminare le PascalCase (`Button.tsx`, `Card.tsx`).
8. **i18n via next-intl**: tutte le stringhe via `useTranslations('namespace')`. Mai stringhe hardcoded nei componenti. `it.json` ed `en.json` devono restare allineate (stesso set di chiavi).
9. **Redirect API**: SOLO path relativi (`NextResponse.redirect('/it/overview')`), MAI URL assolute. È necessario per la compatibilità Codespace / Vercel preview / reverse proxy.
10. **Tabular nums obbligatori** su ogni numero (KPI, table, currency, percent, date). Tailwind: `tabular-nums`. Non opzionale.
11. **No emoji** nella UI di prodotto. Solo `lucide-react` icons.
12. **Italian-first**. L'app è IT-only per i clienti reali in arrivo; tutta la microcopy va in IT. EN segue dopo.

---

<a id="parte-1"></a>
## PARTE 1 — Sintesi del Design System (Moduli 1-4)

### 1.1 · Modulo 1 — Palette (CSS variables, HSL space-separated, alpha-ready)

Copiare integralmente in `src/app/globals.css` dentro un `@layer base`:

```css
@layer base {
  :root {
    /* — base panna (warm cream) — */
    --bg:              36 47% 96%;
    --card:            36 50% 97%;
    --muted:           36 30% 92%;
    --border:          36 28% 86%;
    --border-strong:   36 22% 78%;
    --fg:              30 12% 15%;
    --fg-2:            30 8% 40%;
    --fg-3:            30 7% 55%;
    --input-bg:        36 47% 96%;

    /* — sage brand (9 step) — */
    --sage-50:   98 22% 90%;
    --sage-100:  96 20% 80%;
    --sage-200:  96 18% 65%;
    --sage-300:  96 25% 78%;
    --sage-400:  95 22% 60%;
    --sage-500:  98 17% 41%;
    --sage-600: 100 18% 32%;
    --sage-700: 102 20% 24%;
    --sage-800: 102 22% 18%;

    /* — semantici (success oliva · warning ocra · danger terracotta · info blu sereno) — */
    --success-50:   72 35% 90%;
    --success-500:  72 35% 35%;
    --success-700:  75 35% 25%;
    --warning-50:   35 60% 90%;
    --warning-500:  35 60% 38%;
    --warning-700:  35 60% 26%;
    --danger-50:    12 50% 92%;
    --danger-500:   12 45% 42%;
    --danger-700:   12 45% 30%;
    --info-50:     210 35% 92%;
    --info-500:    210 35% 45%;
    --info-700:    210 35% 32%;

    /* — sidebar (panna leggermente più scuro · NIENTE navy/blu) — */
    --sidebar:                    36 35% 93%;
    --sidebar-foreground:         30 12% 18%;
    --sidebar-hover:              36 30% 89%;
    --sidebar-active:             98 22% 90%;
    --sidebar-active-foreground: 102 20% 24%;
    --sidebar-border:             36 22% 82%;

    /* — shadow (warm, NON nero puro) — */
    --shadow-color: 30 25% 15%;

    /* — radius (6 step) — */
    --radius-xs:    4px;
    --radius-sm:    6px;
    --radius-md:    8px;
    --radius-lg:   12px;
    --radius-xl:   16px;
    /* --radius-full: 9999px → usare Tailwind rounded-full diretto */
  }

  .dark {
    --bg:             30 6% 10%;
    --card:           30 8% 13%;
    --muted:          30 7% 16%;
    --border:         35 9% 22%;
    --border-strong:  35 9% 30%;
    --fg:             36 26% 90%;
    --fg-2:           36 12% 60%;
    --fg-3:           36 10% 45%;
    --input-bg:       30 7% 14%;

    --sidebar:                     30 7% 12%;
    --sidebar-foreground:          36 22% 84%;
    --sidebar-hover:               30 7% 16%;
    --sidebar-active:             100 14% 20%;
    --sidebar-active-foreground:   96 25% 78%;
    --sidebar-border:              35 9% 22%;
  }
}
```

### 1.2 · Modulo 2 — Tipografia

**Font stack**:
- Sans (UI + body): **Inter** (Google Font) · weights 400 / 500 / 600 · features `'cv11', 'ss03'`.
- Mono (codici, eyebrows, timestamp, valori tecnici): **JetBrains Mono** · weights 400 / 500.
- Fallback nativo: `system-ui, -apple-system, sans-serif`.

```tsx
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-sans' })
const mono  = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500'], variable: '--font-mono' })

<html lang="it" className={`${inter.variable} ${mono.variable}`}>
```

**Scala tipografica** (semantica, usare nei componenti):

| Token | Size | Line | Tracking | Weight | Uso |
|---|---|---|---|---|---|
| `display` | 60px | 1.05 | -0.030em | 600 | Solo splash/marketing, mai in app |
| `h1` (PageHeader) | 36px | 1.10 | -0.025em | 600 | Titolo pagina |
| `h1-dense` (PageHeader dense) | 22px | 1.20 | -0.015em | 600 | Pagine dati |
| `h2` | 30px | 1.15 | -0.020em | 600 | Section heading grande |
| `h3` | 24px | 1.25 | -0.015em | 600 | Sub-section / dialog title big |
| `h4` | 20px | 1.30 | -0.010em | 600 | Card title / dialog title |
| `bodyL` | 17px | 1.55 | 0 | 400 | Subtitle PageHeader |
| `body` | 15px | 1.55 | 0 | 400 | Body default |
| `bodyS` | 13px | 1.50 | 0 | 400 | Helper, secondary |
| `tiny` (eyebrow) | 11px | 1.40 | +0.080em UPPER | 500 | KPI label, sidebar section-label |
| `micro` (mono) | 10.5px | 1.40 | +0.080em UPPER | 500 mono | Timestamp, code chip |

**Numeri**: SEMPRE `tabular-nums` (`.num` o utility Tailwind). Valori KPI: `font-feature-settings: 'tnum' 1, 'ss01' 1; letter-spacing: -0.022em`.

**Wrapping IT**:
- Titoli (`h1`, `h2`, dialog-title): `text-wrap: balance` + `word-break: keep-all` + `overflow-wrap: break-word`. Parole lunghe italiane (es. "ottimizzazione") non spezzate a metà.
- Body lungo: `text-wrap: pretty` + `hyphens: auto` con `lang="it"` sull'`<html>`.

### 1.3 · Modulo 3 — Spacing / Radius / Elevation

**Spacing**: Tailwind standard (4px base, no rinomine). Regole semantiche:
- **Stretto** (gap-1 / gap-1.5 / gap-2 = 4 / 6 / 8px): elementi inline (icon + testo, badge + counter).
- **Medio** (gap-3 / gap-4 = 12 / 16px): tra elementi correlati (label sopra input).
- **Largo** (gap-6 / gap-8 = 24 / 32px): tra sezioni di una pagina.
- **Pagina** (py-10 / py-14 / py-20 = 40 / 56 / 80px): top-level page padding.

**Radius scale** (6 step, mappa per uso):
| Token | px | Uso |
|---|---|---|
| `rounded-xs` | 4 | Skeleton primitive, chip mini, table sort-ico |
| `rounded-sm` | 6 | Search clear button, switch knob shadow, menu item |
| `rounded-md` | 8 | Button (default), input, badge, KPI dense card |
| `rounded-lg` | 12 | Card, toast, dropdown menu, KPI card |
| `rounded-xl` | 16 | Dialog, sheet, hero card |
| `rounded-full` | 9999 | Avatar, pill badge, switch track, confidence-bar |

**Elevation** (5 livelli: 0 + 4 elev tokens). Composti, warm shadow, in dark mode si trasformano in border + inset highlight:

```css
:root {
  --shadow-color: 30 25% 15%;
  --elev-1: 0 1px 1px 0 hsl(var(--shadow-color) / 0.03), 0 1px 2px 0 hsl(var(--shadow-color) / 0.04);
  --elev-2: 0 1px 2px 0 hsl(var(--shadow-color) / 0.04), 0 4px 10px -2px hsl(var(--shadow-color) / 0.06);
  --elev-3: 0 2px 4px 0 hsl(var(--shadow-color) / 0.05), 0 12px 28px -6px hsl(var(--shadow-color) / 0.10);
  --elev-4: 0 4px 8px 0 hsl(var(--shadow-color) / 0.06), 0 20px 40px -8px hsl(var(--shadow-color) / 0.14);
}
.dark {
  --elev-1: inset 0 1px 0 0 hsl(36 26% 100% / 0.02), 0 1px 2px 0 hsl(0 0% 0% / 0.30);
  --elev-2: inset 0 1px 0 0 hsl(36 26% 100% / 0.03), 0 4px 10px -2px hsl(0 0% 0% / 0.40);
  --elev-3: inset 0 1px 0 0 hsl(36 26% 100% / 0.04), 0 12px 28px -6px hsl(0 0% 0% / 0.55);
  --elev-4: inset 0 1px 0 0 hsl(36 26% 100% / 0.05), 0 20px 40px -8px hsl(0 0% 0% / 0.70);
}
```

**Mappa elevation → componente**:

| Token | Componenti |
|---|---|
| `elev-0` (border only) | Table row, list-item idle |
| `elev-1` | Card default, KPI Card, IA Card, sidebar nav-item active |
| `elev-2` | Card hover, dropdown trigger, popover row |
| `elev-3` | Popover, dropdown menu, tooltip, calendar pop, toast (light) |
| `elev-4` | Dialog / modal, sheet, command palette |

### 1.4 · Modulo 4 — I 14 componenti (sintesi)

**1 · Sidebar** · 240px / 64px collapsed · `bg-sidebar` · item attivo `bg-sidebar-active` + 3px `bg-sage-500` indicator a sinistra · badge contatori warning-500 · brand glifo sage + wordmark · footer user-mini (avatar sage-200 + nome + plan).

**2 · Topbar** · h-14 sticky · `bg-card` border-b · Breadcrumb · spacer · CreditsCounter (sage-50 pill / warning-50 in warn) · LangSwitcher (segmented IT/EN) · NotificationsBell (icon + dot rosso danger-500 + popover 340px elev-3) · ThemeToggle · Avatar 32px sage-200 (menu 240px elev-3). **Nessuna search globale**.

**3 · PageHeader** · h1 36px (22px dense) · subtitle 17px fg-2 · slot `actions` flex-end · badge inline next-to-title (Beta / Draft / Success / Warning / Default / Danger) · meta-inline mono fg-3. Tabs strip e Filter strip sono blocchi separati sotto.

**4 · KPI Card** · eyebrow tiny upper · value 34px (24 dense) tabular · delta badge sentiment · subtitle 12px · sparkline 36px SVG sage-500. Stati: loading skel · empty · error. Variante `benchmark` con quartile-bar.

**5 · Insight / Alert Card** · border-left 3px sentiment + icon-wrap tonale + body (badges + title + desc 2-line) + meta (timestamp + status-check) + foot (1-3 ia-actions + ia-detail "Apri →"). Card cliccabile, footer `stopPropagation`. Status `done` opacity 0.9. Variante `spotlight` senza foot.

**6 · Button** · 6 variants (primary sage-500 · secondary outline · ghost · destructive **terracotta** · link · icon) × 3 sizes (sm h-8 / md h-9 / lg h-11) · loading `replace` o `inline` · counter badge integrato · focus ring `sage-500` offset-2 · `asChild` via Radix Slot.

**7 · Form Fields** · wrapper `<Field>` clona children con `id` + `aria-*` · Input / Email / Password (icon-affix toggle) / Number (stepper) / Percent (suffix %) / Currency (prefix €) / Select / Textarea / DatePicker / Checkbox / Radio / Switch / FileDrop / SearchInput · stati default / focus (ring 3px sage 20%) / error (ring danger 20% + AlertCircle) / success (Check) / disabled / readonly. Required = asterisco danger-500 + `aria-required`.

**8 · Tabs** · 3 varianti: **underline** (border-bottom 2px sage-500 attivo) · **pill** (bg muted, attivo sage-50+sage-700) · **vertical** (sidebar-style). Badge counter integrato. Keyboard ←/→ ↑/↓ Home/End. Built su `@radix-ui/react-tabs`.

**9 · Dialog** · overlay `bg-[hsl(30_25%_8%/0.55)]` + blur-sm · card `bg-card rounded-xl shadow-elev-4` max-w-md (lg=640) · 5 use-case: default · conferma (`alertdialog` warn-icon) · distruttivo (text-input "elimina") · full (scrollable, footer sticky) · **Sheet** (slide-in destra 360px).

**10 · Toast** · top-right desktop, top-center mobile · 5 varianti (success / warning / error / info / loading) · border-left 3px sentiment · auto-dismiss 5s (pause on hover) · loading **no auto-dismiss**, sostituire via `toast(id)` · max 4 in stack · built su **sonner**.

**11 · Dense Table** · TanStack v8 wrapper · header sticky + `aria-sort` · righe zebra `even:bg-muted/40` hover `bg-muted/70` selected `bg-sage-50` · checkbox multi-select (header indeterminate) · numeric cols `meta.align="right"` + tabular · row-actions kebab · toolbar con filter-chips sage-50 (× rimuovibile) · pagination footer · empty/loading inside-table.

**12 · Empty State** · centered max-w-md py-14 · cerchio 64px sage-50 + icon sage-700 (toni: sage / muted / warn) · h3 17px + p 13.5px fg-2 · CTA primaria opzionale + secondaryLink sage-700. 4 contesti: data / filter / search / list-iniziale. `role="status"` (non alert).

**13 · Loading Skeleton** · primitive `<Skeleton>` animate-pulse (opacity 1 → 0.55, no shimmer) bg `color-mix(muted 80%, card)` · composti: KpiCardSkeleton / IACardSkeleton / DataTableSkeleton / ChartSkeleton · **stesso ingombro del componente popolato** (zero layout shift) · container `aria-busy="true"` + sr-only `role="status"`.

**14 · Error State** · stesso schema di Empty in danger · cerchio danger-50 + AlertCircle danger-700 · code mono fg-3 · CTA "Riprova" + icona RotateCcw + `aria-label` esplicito · link "Contatta supporto →" (mailto pre-popolato). Full-page variant (`bigCode` 88px) per `app/error.tsx` (500) e `app/not-found.tsx` (404). `role="alert"`.


### 1.5 · Modulo 4 — Markup React/Tailwind per i 14 componenti

Snippet di riferimento per ognuno dei 14 componenti. Stile shadcn-ish: `React.forwardRef`, CVA per le varianti, `cn()` helper per il classname merge. I path Tailwind usano i token aggiunti in Fase 1 (`sage-*`, `fg-2`, `shadow-elev-*`, `bg`, `card`, `muted`, `border-strong`, ecc).

#### 1 · Sidebar

```tsx
// src/components/layout/sidebar.tsx
"use client"
import { LayoutGrid, TrendingUp, Sparkles, Settings, ... } from "lucide-react"
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Sidebar() {
  const { collapsed } = useSidebarCollapsed()
  const pathname = usePathname()

  return (
    <aside aria-label="Navigazione principale"
      className={cn("flex flex-col gap-3 bg-sidebar text-sidebar-foreground border-r border-sidebar-border px-3 py-4 h-screen",
                    collapsed ? "w-16" : "w-60")}>
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-5">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-sm bg-sage-500 text-white shrink-0">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
        {!collapsed && <span className="text-[17px] font-bold tracking-tight text-sage-700 dark:text-sage-300">Anlyra</span>}
      </Link>

      <SidebarSection label="Panoramica">
        <SidebarItem href="/it/overview"     icon={LayoutGrid}  label="Dashboard"  />
        <SidebarItem href="/it/finance"      icon={TrendingUp}  label="Finanza"    />
        <SidebarItem href="/it/ai/insights"  icon={Sparkles}    label="AI Insights" badge={3} />
      </SidebarSection>

      <div className="flex-1" />

      <SidebarUserMini />
    </aside>
  )
}

function SidebarItem({ href, icon: Icon, label, badge }: ItemProps) {
  const pathname = usePathname()
  const active = pathname.startsWith(href)
  return (
    <Link href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-normal transition-colors",
        "hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500",
        active && "bg-sidebar-active text-sidebar-active-foreground font-medium",
        active && "before:absolute before:left-[-12px] before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-sm before:bg-sage-500 dark:before:bg-sage-300",
      )}>
      <Icon className="h-4 w-4 shrink-0 opacity-75" />
      <span className="truncate">{label}</span>
      {badge && <span className="ml-auto rounded-full bg-warning-500 px-1.5 py-0.5 text-[10.5px] font-medium text-white tabular-nums min-w-[18px] text-center">{badge}</span>}
    </Link>
  )
}
```

#### 2 · Topbar

```tsx
// src/components/dashboard/Topbar.tsx — canonical version, dopo consolidamento
"use client"
import { useLocale, useTranslations } from "next-intl"

export function Topbar() {
  const locale = useLocale()
  const t = useTranslations("topbar")

  const handleLogout = () => {
    window.location.href = `/api/auth/logout?locale=${locale}`
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-6 border-b border-border bg-card px-6">
      <Breadcrumb />
      <div className="flex-1 min-w-0" />
      <div className="flex items-center gap-3 shrink-0">
        <CreditsCounter />
        <LangSwitcher />
        <NotificationsBell />
        <ThemeToggle />
        <UserMenu onLogout={handleLogout} />
      </div>
    </header>
  )
}

// CreditsCounter
function CreditsCounter() {
  const { credits } = useCredits()
  const low = credits < 10
  return (
    <Link href="/billing" className={cn(
      "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium tabular-nums transition-colors",
      low ? "bg-warning-50 text-warning-700" : "bg-sage-50 text-sage-700 dark:bg-sage-700/30 dark:text-sage-300",
    )}>
      <ZapIcon className="h-3.5 w-3.5" />
      <span>{credits} crediti</span>
    </Link>
  )
}
```

#### 3 · PageHeader

```tsx
// src/components/ui/page-header.tsx
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  badges?: ReactNode
  meta?: string
  actions?: ReactNode
  density?: "default" | "dense"
}

export function PageHeader({ title, subtitle, badges, meta, actions, density = "default" }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex items-start gap-7",
      density === "default" ? "px-8 pt-10 pb-8" : "px-7 pt-5 pb-4 border-b border-border",
    )}>
      <div className="min-w-0 flex-1">
        <div className={cn("flex flex-wrap items-center gap-3", density === "default" ? "mb-2" : "mb-1")}>
          <h1 className={cn(
            "font-semibold text-foreground tracking-tight text-balance break-keep",
            density === "default" ? "text-[36px] leading-[1.1] tracking-[-0.025em]" : "text-[22px] leading-[1.2] tracking-[-0.015em]",
          )}>{title}</h1>
          {badges}
          {meta && <span className="font-mono text-xs text-fg-3 inline-flex items-center gap-1.5 before:content-['·'] before:opacity-50">{meta}</span>}
        </div>
        {subtitle && (
          <p className={cn("text-fg-2 max-w-prose text-pretty",
            density === "default" ? "text-[17px] leading-relaxed" : "text-[13.5px] leading-snug")}>{subtitle}</p>
        )}
      </div>
      {actions && <div className={cn("flex items-center shrink-0", density === "default" ? "gap-2" : "gap-1.5")}>{actions}</div>}
    </div>
  )
}
```

#### 4 · KPI Card

```tsx
// src/components/ui/kpi-card.tsx
import { TrendingUp, TrendingDown, MoreHorizontal } from "lucide-react"
import { Sparkline } from "./sparkline"

interface KpiCardProps {
  label: string
  value: string | number
  unit?: { prefix?: string; suffix?: string }
  delta?: { value: string; tone: "positive" | "negative" | "warning" | "neutral" }
  subtitle?: string
  sparkline?: number[]
  density?: "default" | "dense"
  iconSlot?: ReactNode
}

export function KpiCard({ label, value, unit, delta, subtitle, sparkline, density = "default", iconSlot }: KpiCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border shadow-elev-1 flex flex-col",
      density === "default" ? "rounded-lg p-5" : "rounded-md p-3.5",
    )}>
      <div className={cn("flex items-start justify-between gap-2.5", density === "default" ? "mb-2.5" : "mb-1.5")}>
        <p className="text-[10.5px] font-medium uppercase tracking-wider text-fg-3 break-keep leading-tight">{label}</p>
        {iconSlot && <span className="grid h-6 w-6 place-items-center text-fg-3 hover:bg-muted rounded-sm">{iconSlot}</span>}
      </div>
      <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1 mb-1">
        <span className={cn(
          "font-semibold text-foreground tabular-nums leading-[1.05] [font-feature-settings:'tnum'_1,'ss01'_1] tracking-[-0.022em]",
          density === "default" ? "text-[34px]" : "text-2xl tracking-[-0.015em]",
        )}>
          {unit?.prefix && <span className="text-fg-2 font-medium text-[0.78em] tracking-[-0.01em] mr-1">{unit.prefix}</span>}
          {value}
          {unit?.suffix && <span className="text-fg-2 font-medium text-[0.78em] tracking-[-0.01em] ml-1">{unit.suffix}</span>}
        </span>
        {delta && <DeltaBadge {...delta} />}
      </div>
      {subtitle && <p className={cn("text-fg-3 leading-snug mt-1", density === "default" ? "text-xs" : "text-[11.5px]")}>{subtitle}</p>}
      {sparkline && <Sparkline data={sparkline} className={cn("mt-3.5 w-full", density === "default" ? "h-9" : "h-7")} />}
    </div>
  )
}
```

#### 5 · Insight / Alert Card

```tsx
// src/components/ui/insight-card.tsx
import { cva } from "class-variance-authority"

const priorityBorderL = {
  high: "border-l-danger-500", critical: "border-l-danger-500",
  medium: "border-l-warning-500", warning: "border-l-warning-500",
  low: "border-l-info-500", info: "border-l-info-500",
  opportunity: "border-l-success-500",
} as const

const priorityIconBg = {
  high: "bg-danger-50 text-danger-700", critical: "bg-danger-50 text-danger-700",
  medium: "bg-warning-50 text-warning-700", warning: "bg-warning-50 text-warning-700",
  low: "bg-info-50 text-info-700", info: "bg-info-50 text-info-700",
  opportunity: "bg-success-50 text-success-700",
} as const

export function InsightCard({ kind, priority, title, description, source, confidence, timestamp, status, actions, onOpen }: InsightCardProps) {
  return (
    <button onClick={onOpen} className={cn(
      "w-full text-left grid gap-x-3.5 bg-card border border-border border-l-[3px] rounded-lg shadow-elev-1 p-5 pl-[22px]",
      "grid-cols-[34px_1fr_auto] grid-rows-[auto_auto_auto]",
      "hover:shadow-elev-2 hover:-translate-y-px transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2",
      priorityBorderL[priority],
      status === "done" && "opacity-90",
    )}>
      <span className={cn("grid h-[34px] w-[34px] place-items-center rounded-md row-span-2", priorityIconBg[priority])}>
        <PriorityIcon kind={kind} />
      </span>
      <div className="min-w-0 col-start-2 row-start-1 row-span-2">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <PriorityPill priority={priority} />
          <TypePill type={kind} />
        </div>
        <h3 className="text-[15.5px] font-semibold leading-snug tracking-tight mb-1 text-pretty">{title}</h3>
        <p className="text-[13.5px] text-fg-2 leading-relaxed line-clamp-2 text-pretty">{description}</p>
        {source && <p className="font-mono text-[10.5px] text-fg-3 mt-2 inline-flex items-center gap-1.5">· {source}</p>}
        {confidence !== undefined && (
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-fg-3">
            <span className="uppercase tracking-wider font-medium">Confidence</span>
            <div className="relative h-1 flex-1 max-w-[140px] bg-muted rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-sage-500 dark:bg-sage-300" style={{ width: `${confidence * 100}%` }} />
            </div>
            <span className="tabular-nums font-medium text-fg-2">{Math.round(confidence * 100)}%</span>
          </div>
        )}
      </div>
      <div className="col-start-3 row-start-1 row-span-2 flex flex-col items-end gap-1.5 pt-0.5 shrink-0">
        <time className="font-mono text-[10.5px] text-fg-3 whitespace-nowrap">{timestamp}</time>
        {status === "done" && <CheckBadge />}
      </div>
      {actions.length > 0 && (
        <div className="col-span-3 flex items-center gap-1 pt-3.5 mt-3.5 border-t border-border">
          {actions.map(a => <InsightAction key={a.label} {...a} onClick={(e) => { e.stopPropagation(); a.onClick() }} />)}
          <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-fg-2">Apri →</span>
        </div>
      )}
    </button>
  )
}
```

#### 6 · Button

```tsx
// src/components/ui/button.tsx
import { Slot } from "@radix-ui/react-slot"
import { cva, VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:     "bg-sage-500 text-white hover:bg-sage-600 active:bg-sage-700 dark:bg-sage-400 dark:text-[hsl(30_6%_10%)] dark:hover:bg-sage-300",
        secondary:   "bg-card text-sage-700 border border-border-strong hover:bg-muted hover:border-sage-500 dark:text-sage-300",
        ghost:       "text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-700/30",
        destructive: "bg-danger-500 text-white hover:bg-danger-700",
        link:        "text-sage-700 underline-offset-4 hover:underline h-auto px-0 dark:text-sage-300",
      },
      size: {
        sm:   "h-8 px-3 text-xs gap-1.5",
        md:   "h-9 px-3.5",
        lg:   "h-11 px-5 text-[15px] gap-2",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingMode?: "replace" | "inline"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, loadingMode = "replace", children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref}
            disabled={props.disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading && loadingMode === "inline" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {loading && loadingMode === "replace" ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </Comp>
    )
  }
)
Button.displayName = "Button"
```

#### 7 · Form Fields (wrapper Field)

```tsx
// src/components/ui/field.tsx
import { AlertCircle, Check } from "lucide-react"

interface FieldProps {
  id: string
  label: string
  required?: boolean
  help?: string
  error?: string
  success?: string
  children: React.ReactElement
}

export function Field({ id, label, required, help, error, success, children }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined
  const errId  = error ? `${id}-err` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground tracking-tight">
        {label}
        {required && <span aria-hidden className="text-danger-500 font-semibold">*</span>}
      </label>
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
        "aria-describedby": [errId, helpId].filter(Boolean).join(" ") || undefined,
        "data-invalid": error ? "true" : undefined,
      })}
      {error
        ? <p id={errId} role="alert" className="text-[11.5px] text-danger-700 flex items-center gap-1.5"><AlertCircle className="h-3 w-3 shrink-0" />{error}</p>
        : success
        ? <p className="text-[11.5px] text-success-700 flex items-center gap-1.5"><Check className="h-3 w-3 shrink-0" />{success}</p>
        : help && <p id={helpId} className="text-[11.5px] text-fg-3 leading-snug">{help}</p>}
    </div>
  )
}

// src/components/ui/input.tsx (restyle)
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} {...props}
      className={cn(
        "w-full h-9 px-3 bg-input-bg text-foreground border border-border-strong rounded-md text-[13.5px]",
        "transition-colors placeholder:text-fg-3",
        "hover:border-sage-500/50",
        "focus:border-sage-500 focus:ring-[3px] focus:ring-sage-500/20 focus:outline-none",
        "disabled:bg-muted disabled:text-fg-3 disabled:cursor-not-allowed",
        "data-[invalid=true]:border-danger-500 data-[invalid=true]:focus:ring-danger-500/20",
        "read-only:bg-muted read-only:border-border",
        className,
      )} />
  )
)

// CurrencyInput / PercentInput / NumberInput
// Stesso pattern: wrapper flex con affix sinistro (€) o destro (%) + Input bare-bone
// Tutti con inputMode="decimal" + tabular-nums
```

#### 8 · Tabs

```tsx
// src/components/ui/tabs.tsx
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva } from "class-variance-authority"

const tabsListVariants = cva("", {
  variants: {
    variant: {
      underline: "flex gap-5 border-b border-border",
      pill:      "inline-flex gap-1 p-1 bg-muted rounded-md",
      vertical:  "flex flex-col gap-0.5 border-r border-border pr-2",
    },
  },
  defaultVariants: { variant: "underline" },
})

const tabsTriggerVariants = cva(
  "inline-flex items-center gap-1.5 font-medium text-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 disabled:opacity-45",
  {
    variants: {
      variant: {
        underline: "py-2.5 border-b-2 border-transparent -mb-px text-[13.5px] hover:text-foreground data-[state=active]:text-sage-700 data-[state=active]:border-sage-500 dark:data-[state=active]:text-sage-300 dark:data-[state=active]:border-sage-300",
        pill:      "py-1.5 px-3 rounded-sm text-[12.5px] data-[state=active]:bg-sage-50 data-[state=active]:text-sage-700",
        vertical:  "px-2.5 py-2 rounded-sm text-[13px] text-left hover:bg-muted data-[state=active]:bg-sage-50 data-[state=active]:text-sage-700",
      },
    },
    defaultVariants: { variant: "underline" },
  }
)

export const Tabs = TabsPrimitive.Root
export const TabsList = ({ variant, className, ...props }: any) =>
  <TabsPrimitive.List className={cn(tabsListVariants({ variant }), className)} {...props} />
export const TabsTrigger = ({ variant, className, ...props }: any) =>
  <TabsPrimitive.Trigger className={cn(tabsTriggerVariants({ variant }), className)} {...props} />
export const TabsContent = TabsPrimitive.Content
```

#### 9 · Dialog + Sheet

```tsx
// src/components/ui/dialog.tsx
import * as DialogPrimitive from "@radix-ui/react-dialog"

const dialogContentVariants = cva(
  "fixed left-1/2 top-1/2 z-50 grid -translate-x-1/2 -translate-y-1/2 w-full bg-card border border-border rounded-xl shadow-elev-4 max-h-[calc(100vh-40px)] overflow-hidden",
  { variants: { size: { md: "max-w-[440px]", lg: "max-w-[640px]" } }, defaultVariants: { size: "md" } }
)

export const DialogContent = React.forwardRef<HTMLDivElement, any>(({ size, className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[hsl(30_25%_8%/0.55)] backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content ref={ref} className={cn(dialogContentVariants({ size }), className)} {...props}>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))

export const DialogHeader = ({ children }: { children: ReactNode }) =>
  <div className="px-6 pt-5 pb-1.5 flex items-start gap-3.5">{children}</div>

export const DialogTitle = DialogPrimitive.Title // styled: text-[17px] font-semibold tracking-tight mb-1 text-balance
export const DialogDescription = DialogPrimitive.Description // styled: text-[13.5px] text-fg-2 leading-relaxed text-pretty

export const DialogFooter = ({ children }: { children: ReactNode }) =>
  <div className="px-5 py-3.5 border-t border-border bg-bg flex items-center justify-end gap-2">{children}</div>

// Sheet: stesso pattern ma con SheetPrimitive (Radix Dialog wrapped come slide)
// width 360px sm:480px, slide-in da destra
```

#### 10 · Toast (sonner)

```tsx
// src/components/ui/sonner.tsx
"use client"
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      mobileBreakpoint={640}
      duration={5000}
      closeButton
      toastOptions={{
        classNames: {
          toast:       "group bg-card border border-border shadow-elev-3 rounded-lg !border-l-[3px] grid grid-cols-[30px_1fr_auto] gap-3 p-3 pl-3.5 items-start",
          title:       "text-[13px] font-semibold text-foreground tracking-tight",
          description: "text-[12.5px] text-fg-2 leading-snug mt-0.5",
          actionButton: "text-[12px] font-medium text-sage-700 hover:underline",
          cancelButton: "text-[12px] font-medium text-fg-3 hover:underline",
          closeButton:  "text-fg-3 hover:bg-muted",
          success: "!border-l-success-500 [&_[data-icon]]:bg-success-50 [&_[data-icon]]:text-success-700",
          warning: "!border-l-warning-500 [&_[data-icon]]:bg-warning-50 [&_[data-icon]]:text-warning-700",
          error:   "!border-l-danger-500  [&_[data-icon]]:bg-danger-50  [&_[data-icon]]:text-danger-700",
          info:    "!border-l-info-500    [&_[data-icon]]:bg-info-50    [&_[data-icon]]:text-info-700",
          loading: "!border-l-sage-500    [&_[data-icon]]:bg-sage-50    [&_[data-icon]]:text-sage-700",
        }
      }}
    />
  )
}

// src/lib/toast.ts — helper wrapper se necessario
export { toast } from "sonner"
// Uso: toast.success("Report generato", { description: "Disponibile in /reports.", action: { label: "Vedi", onClick: () => router.push("/reports/123") } })
// Loading flow: const id = toast.loading("Genero…"); ... toast.success("Pronto", { id })
```

#### 11 · Dense Table

```tsx
// src/components/ui/data-table.tsx
import { flexRender, getCoreRowModel, useReactTable, ColumnDef } from "@tanstack/react-table"

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  state?: "idle" | "loading" | "empty"
  emptyMessage?: { title: string; sub: string }
}

export function DataTable<T>({ columns, data, state = "idle", emptyMessage }: DataTableProps<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), /* ... pagination/sorting/selection from props */ })

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden" aria-busy={state === "loading"}>
      <table className="w-full border-collapse text-[13px]" role="grid">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => {
                const meta = h.column.columnDef.meta as { align?: "right" } | undefined
                const sort = h.column.getIsSorted()
                return (
                  <th key={h.id}
                      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none"}
                      className={cn(
                        "sticky top-0 bg-bg text-[10.5px] font-semibold uppercase tracking-wider text-fg-3 px-3.5 py-2.5 border-b border-border whitespace-nowrap",
                        meta?.align === "right" ? "text-right" : "text-left",
                      )}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getCanSort() && <SortIndicator dir={sort} />}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {state === "loading"
            ? <SkeletonRows columns={columns.length} count={5} />
            : data.length === 0
            ? <tr><td colSpan={columns.length} className="text-center py-9 text-fg-2">
                <p>{emptyMessage?.title ?? "Nessun risultato"}</p>
                <p className="text-[11.5px] text-fg-3 mt-0.5">{emptyMessage?.sub}</p>
              </td></tr>
            : table.getRowModel().rows.map(row => (
                <tr key={row.id} data-state={row.getIsSelected() && "selected"}
                    className="even:bg-muted/40 hover:bg-muted/70 data-[state=selected]:bg-sage-50 dark:data-[state=selected]:bg-sage-700/30">
                  {row.getVisibleCells().map(cell => {
                    const meta = cell.column.columnDef.meta as { align?: "right"; tabular?: boolean } | undefined
                    return (
                      <td key={cell.id} className={cn(
                        "px-3.5 py-2.5 border-b border-border last:border-b-0 whitespace-nowrap",
                        meta?.align === "right" && "text-right",
                        meta?.tabular && "tabular-nums [font-feature-settings:'tnum'_1] tracking-[-0.005em]",
                      )}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
```

#### 12/13/14 · State (Empty + Loading + Error, consolidato)

```tsx
// src/components/ui/state.tsx
import { LucideIcon, RotateCcw, AlertCircle } from "lucide-react"
import { Button } from "./button"
import { Skeleton } from "./skeleton"

// === Empty State ===
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  tone?: "sage" | "muted" | "warn"
  action?: { label: string; onClick: () => void; icon?: LucideIcon; disabled?: boolean }
  secondaryLink?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, title, description, tone = "sage", action, secondaryLink }: EmptyStateProps) {
  const toneClass = {
    sage:  "bg-sage-50 text-sage-700 dark:bg-sage-700/30 dark:text-sage-300",
    muted: "bg-muted text-fg-2",
    warn:  "bg-warning-50 text-warning-700",
  }[tone]
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-14 px-7 max-w-md mx-auto">
      <div aria-hidden className={cn("h-16 w-16 rounded-full grid place-items-center mb-5", toneClass)}><Icon className="h-7 w-7" /></div>
      <h3 className="text-[17px] font-semibold tracking-tight mb-1.5">{title}</h3>
      {description && <p className="text-[13.5px] text-fg-2 leading-snug mb-4 max-w-sm text-pretty">{description}</p>}
      {action && (
        <Button onClick={action.onClick} disabled={action.disabled}>
          {action.icon && <action.icon className="h-4 w-4" />}{action.label}
        </Button>
      )}
      {secondaryLink && <a href={secondaryLink.href} className="text-[12.5px] text-sage-700 dark:text-sage-300 mt-3 hover:underline">{secondaryLink.label} →</a>}
    </div>
  )
}

// === Loading skeletons ===
export function KpiCardSkeleton() {
  return (
    <div aria-busy="true" className="bg-card border rounded-lg p-5 flex flex-col gap-2.5">
      <div className="flex justify-between"><Skeleton className="h-2.5 w-3/5" /><Skeleton className="h-6 w-6 rounded-md" /></div>
      <Skeleton className="h-7 w-3/5 mt-2" />
      <Skeleton className="h-2.5 w-2/5" />
      <Skeleton className="h-9 w-full mt-3 rounded-md" />
      <span className="sr-only" role="status">Caricamento KPI</span>
    </div>
  )
}

export function IACardSkeleton() {
  return (
    <div aria-busy="true" className="bg-card border rounded-lg p-5 flex gap-3">
      <Skeleton className="h-[34px] w-[34px] rounded-md shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-2.5 w-1/4" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-2.5 w-12 shrink-0 self-start" />
    </div>
  )
}

// === Error State ===
interface ErrorStateProps {
  variant?: "inline" | "fullpage"
  code?: string
  bigCode?: string
  title: string
  description?: string
  retry?: { onClick: () => void; label?: string; ariaLabel?: string }
  support?: { href: string; label?: string }
}

export function ErrorState({ variant = "inline", code, bigCode, title, description, retry, support }: ErrorStateProps) {
  return (
    <div role="alert" className={cn(
      "flex flex-col items-center text-center px-7 mx-auto",
      variant === "fullpage" ? "py-20 max-w-lg" : "py-14 max-w-md",
    )}>
      {variant === "fullpage" && bigCode && (
        <div className="font-semibold text-[88px] leading-none tracking-[-0.04em] tabular-nums text-fg-3/60 mb-4">{bigCode}</div>
      )}
      {variant === "inline" && (
        <div aria-hidden className="h-16 w-16 rounded-full grid place-items-center mb-5 bg-danger-50 text-danger-700">
          <AlertCircle className="h-7 w-7" />
        </div>
      )}
      {code && <p className="font-mono text-[10.5px] uppercase tracking-wider text-fg-3 mb-3">{code}</p>}
      <h3 className={cn("font-semibold tracking-tight mb-1.5 text-balance", variant === "fullpage" ? "text-[22px]" : "text-[17px]")}>{title}</h3>
      {description && <p className="text-[13.5px] text-fg-2 leading-relaxed mb-5 max-w-prose text-pretty">{description}</p>}
      <div className="flex flex-col items-center gap-3">
        {retry && (
          <Button onClick={retry.onClick} aria-label={retry.ariaLabel}>
            <RotateCcw className="h-4 w-4" />{retry.label ?? "Riprova"}
          </Button>
        )}
        {support && <a href={support.href} className="text-[12.5px] text-fg-2 hover:text-foreground hover:underline">{support.label ?? "Contatta supporto"} →</a>}
      </div>
    </div>
  )
}
```

```tsx
// src/app/error.tsx — global error boundary
"use client"
import { ErrorState } from "@/components/ui/state"

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <ErrorState variant="fullpage" bigCode="500"
      title="Qualcosa è andato storto"
      description="Stiamo già lavorando per risolvere. Riprova tra qualche minuto."
      code={error.digest ? `trace · ${error.digest}` : undefined}
      retry={{ onClick: reset, ariaLabel: "Riprova caricamento pagina" }}
      support={{ href: `mailto:supporto@anlyra.it?subject=Errore%20${error.digest ?? ""}`, label: "Contatta supporto con questo codice" }}
    />
  )
}

// src/app/[locale]/not-found.tsx
import { ErrorState } from "@/components/ui/state"
export default function NotFound() {
  return (
    <ErrorState variant="fullpage" bigCode="404"
      title="Questa pagina non esiste"
      description="Il link che hai seguito potrebbe essere scaduto."
      retry={{ onClick: () => window.location.href = "/", label: "Torna alla dashboard", ariaLabel: "Vai alla dashboard" }}
      support={{ href: "/feedback", label: "Segnala link rotto" }}
    />
  )
}
```

---

<a id="parte-2"></a>
## PARTE 2 — Mappatura File → Componente

Tabella esplicita: per ogni elemento del design system, **file del repo Anlyra** da modificare o creare, azione, e dipendenze interne.

### 2.1 · Foundation (Moduli 1-3)

| Modulo | File | Azione |
|---|---|---|
| Palette + radius + shadow tokens | `src/app/globals.css` | **Modifica** — aggiungi i token in `@layer base { :root }` + `.dark` |
| Tailwind extension (color tokens, fontFamily, boxShadow, borderRadius) | `tailwind.config.ts` | **Modifica** — `theme.extend` SOLO (non sostituire) |
| Font loading (Inter + JetBrains Mono) | `src/app/layout.tsx` | **Modifica** — `next/font/google` con CSS variables `--font-sans`, `--font-mono` |
| Body base (font-family, antialiased, font-feature) | `src/app/globals.css` | **Modifica** — sezione `@layer base body` |

### 2.2 · Componenti UI (Modulo 4)

| # | Componente | File principale | Stato | File correlati |
|---|---|---|---|---|
| 1 | Sidebar | `src/components/layout/sidebar.tsx` | **Modifica esistente** (rotta — usa colore navy) | `src/components/layout/app-shell.tsx`, `src/hooks/use-sidebar-collapsed.ts` |
| 2 | Topbar | `src/components/dashboard/Topbar.tsx` | **Consolida** (3 versioni duplicate → 1) | `src/components/dashboard/CreditsCounter.tsx`, `NotificationsPopover.tsx`, `LangSwitcher.tsx`, `UserMenu.tsx`. **Elimina** le altre 2 Topbar duplicate dopo lo switch dei call-site. |
| 3 | PageHeader | `src/components/ui/page-header.tsx` | **Crea se assente**, altrimenti aggiorna | Usato in `src/app/[locale]/(app)/**/page.tsx` |
| 4 | KPI Card | `src/components/ui/kpi-card.tsx` | **Crea / aggiorna** | `src/components/ui/sparkline.tsx`, `src/components/ui/delta-badge.tsx` |
| 5 | Insight / Alert Card | `src/components/ui/insight-card.tsx` | **Crea / aggiorna** (un solo componente `InsightCard` con prop `kind: 'insight' \| 'alert'`) | `src/components/ui/confidence-bar.tsx` |
| 6 | Button | `src/components/ui/button.tsx` (shadcn lowercase) | **Modifica varianti** | **Elimina** `src/components/ui/Button.tsx` (PascalCase duplicato) |
| 7 | Form Fields | `src/components/ui/field.tsx` (nuovo wrapper) | **Crea** | `src/components/ui/input.tsx`, `select.tsx`, `textarea.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `date-picker.tsx` (nuovo, react-day-picker), `file-drop.tsx` (nuovo), `search-input.tsx` (nuovo), `number-input.tsx` (nuovo), `currency-input.tsx` (nuovo), `percent-input.tsx` (nuovo) |
| 8 | Tabs | `src/components/ui/tabs.tsx` | **Modifica** — aggiungi prop `variant: 'underline' \| 'pill' \| 'vertical'` via CVA |
| 9 | Dialog + Sheet | `src/components/ui/dialog.tsx` + `src/components/ui/sheet.tsx` | **Modifica** (restyle overlay + radius + shadow) | — |
| 10 | Toast (Sonner) | `src/components/ui/sonner.tsx` | **Modifica config** (theme classNames per 5 varianti) | `src/lib/toast.ts` (helper wrapper), `<Toaster>` in `src/app/layout.tsx` |
| 11 | Dense Table | `src/components/ui/data-table.tsx` | **Crea nuovo** (TanStack v8) | `src/components/ui/data-table-toolbar.tsx`, `data-table-pagination.tsx`, `data-table-row-actions.tsx`, `data-table-sort.tsx`, `status-pill.tsx`. Install: `@tanstack/react-table`. |
| 12/13/14 | Empty + Loading + Error states | `src/components/ui/state.tsx` | **Crea consolidato** — esporta `EmptyState`, `LoadingState`, `ErrorState` (+ skeleton composti) | `src/app/error.tsx` (global), `src/app/global-error.tsx` (root), `src/app/[locale]/not-found.tsx` |

### 2.3 · Duplicati da eliminare durante il consolidamento

**Dopo aver switched i call-site** alla versione canonica:

| Da eliminare | Mantenere | Motivo |
|---|---|---|
| `src/components/ui/Button.tsx` | `src/components/ui/button.tsx` | Duplicato PascalCase pre-shadcn |
| `src/components/ui/Card.tsx` | `src/components/ui/card.tsx` | Duplicato PascalCase pre-shadcn |
| `src/components/ui/Badge.tsx` | `src/components/ui/badge.tsx` | Duplicato PascalCase pre-shadcn |
| `src/components/ui/Skeleton.tsx` | `src/components/ui/skeleton.tsx` | Duplicato PascalCase pre-shadcn |
| Topbar duplicate (2 di 3) | `src/components/dashboard/Topbar.tsx` | Tre versioni divergenti — questa è quella in uso |

**Procedura sicura** per ogni duplicato:
1. Trovare tutti i call-site: `grep -r "from .*ui/Button" src/` (case-sensitive).
2. Switchare gli import alla versione lowercase.
3. Verificare typecheck `pnpm tsc --noEmit` clean.
4. Eliminare il file PascalCase.
5. Commit separato per ogni duplicato: `refactor: dedupe Button (PascalCase → lowercase)`.

---

<a id="parte-3"></a>
## PARTE 3 — Ordine di applicazione (5 fasi)

> **Regola d'oro**: dopo OGNI fase, `pnpm build` + `pnpm tsc --noEmit` devono passare. Niente "fix dopo". Se rompi, sistemi PRIMA di procedere.

### Fase 1 — Foundation (tokens + font)

**File**: `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`

**Cosa fare**:
1. Aggiungere i CSS variables (Modulo 1) in `@layer base { :root }` + `.dark` di `globals.css`. Non rimuovere i token shadcn esistenti.
2. `tailwind.config.ts` → `theme.extend.colors`: aggiungere `sage`, `success`, `warning`, `danger`, `info`, `sidebar.*`, `bg`, `card`, `muted`, `border`, `border-strong`, `foreground`, `fg-2`, `fg-3`, `input-bg`. Aggiungere `theme.extend.boxShadow.elev-{1..4}`, `theme.extend.borderRadius.{xs,sm,md,lg,xl}`, `theme.extend.fontFamily.sans/mono`.
3. `src/app/layout.tsx`: caricare `Inter` + `JetBrains_Mono` via `next/font/google` con variabili CSS. Aggiungere `lang="it"` sull'`<html>`.
4. `globals.css` body: `font-family: var(--font-sans)`, `-webkit-font-smoothing: antialiased`, `font-feature-settings: 'cv11', 'ss03'`.

**Rischi**:
- Mai sovrascrivere `--primary`, `--background`, `--foreground` esistenti (shadcn). I nostri `--bg`, `--fg`, `--sage-*` vivono **accanto**, non al posto.
- Il body `font-family` deve preservare il fallback `system-ui, sans-serif`.

**Test**: load qualunque pagina; ispezionare `document.body` in DevTools — `font-family` deve risolvere a Inter; `--sage-500`, `--bg`, `--elev-3` devono apparire fra le custom properties.

### Fase 2 — Atomic components (Button, Form fields, Badge)

**File**: `src/components/ui/button.tsx`, `badge.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `field.tsx` (nuovo), + nuovi `number-input.tsx`, `percent-input.tsx`, `currency-input.tsx`, `search-input.tsx`, `file-drop.tsx`, `date-picker.tsx`.

**Cosa fare**:
1. **Button**: estendi `buttonVariants` CVA con `variant: primary | secondary | ghost | destructive | link | icon` + `size: sm | md | lg | icon`. Implementa `loading` + `loadingMode`. `primary = bg-sage-500 text-white hover:bg-sage-600`. `destructive = bg-danger-500` (terracotta, NON sage).
2. **Field wrapper**: nuovo file `field.tsx`. Usa `React.cloneElement` per iniettare `id`, `aria-invalid`, `aria-required`, `aria-describedby`. Slot `label`, `help`, `error` (error sostituisce help).
3. **Input / Select / Textarea**: restyle bordo `border-border-strong`, focus `ring-2 ring-sage-500/20` + `border-sage-500`. Error variant via classe `data-[invalid=true]`.
4. **Switch**: track `bg-border-strong`, on = `bg-sage-500`, knob bianco con `shadow-elev-1`.
5. **Number/Percent/Currency**: nuovi. Pattern: `<div class="flex">` + `<button stepper>` + `<input numeric>` con `inputMode="decimal"` + `tabular-nums`.
6. **FileDrop**: zone con `border-dashed border-border-strong`, on-hover `border-sage-500 bg-sage-50`. Il button "Sfoglia" wrappa un vero `<input type="file">` visually-hidden (drag&drop è add-on).
7. **DatePicker**: usa **react-day-picker v9** con styling sage; popover via Radix Popover.

**Rischi**:
- **Eliminare** `src/components/ui/Button.tsx` (PascalCase) **solo dopo** aver switched tutti gli import. Stessa cosa per `Badge`, `Card`, `Skeleton`.
- Form fields hanno molti call-site esistenti che potrebbero rompersi. Mantenere la stessa API `<Input className…>` come prima — solo i token cambiano.

**Test**: build clean + visivamente, una form di test renderizza correttamente con focus ring sage (NON blu browser default).

### Fase 3 — Composite components (Card, KPI Card, Insight Card)

**File**: `src/components/ui/card.tsx` (restyle), `kpi-card.tsx` (nuovo), `insight-card.tsx` (nuovo), `sparkline.tsx` (nuovo), `delta-badge.tsx` (nuovo), `confidence-bar.tsx` (nuovo).

**Cosa fare**:
1. **Card** (shadcn esistente): aggiornare `bg-card border-border rounded-lg shadow-elev-1`. Aggiungere variant `bordered`/`elevated`/`flat`.
2. **Sparkline**: SVG funzionale che prende `data: number[]` e `width`/`height` e renderizza path line + area. Stroke `var(--sage-500)` 1.6px. Area fill 12% opacity. Last-dot `fill-sage-500 stroke-card stroke-2`.
3. **KpiCard**: prop `label`, `value`, `unit`, `delta`, `subtitle`, `sparkline?`, `density?: 'default' | 'dense'`, `state?: 'idle' | 'loading' | 'empty' | 'error'`, `iconSlot?`. Layout: `<div class="rounded-lg border bg-card p-5 shadow-elev-1">`.
4. **InsightCard**: prop `kind: 'insight' | 'alert'`, `priority: 'high' | 'medium' | 'low' | 'opportunity' | 'critical' | 'warning' | 'info'`, `title`, `description`, `source?`, `confidence?: 0..1`, `timestamp`, `status?: 'new' | 'reviewed' | 'done' | 'ignored'`, `actions: ActionItem[]`, `onOpen: () => void`. Border-left 3px che switcha sui token sentiment.

**Rischi**:
- Le insight card sono cliccabili nel loro insieme MA le action button devono fare `e.stopPropagation()` o usare `pointer-events: auto` su un `<div role="button" onClick>` esterno + `<button>` interni con propagation stoppata.
- Sparkline: in dark mode lo stroke deve passare a `var(--sage-300)`, l'area a `var(--sage-300)` 12%.

**Test**: pagina `/ai/insights` mostra le card con border-left colorato per priority; clicking sulla card apre il detail dialog; clicking sui footer button NON apre il dialog.

### Fase 4 — Layout (Sidebar, Topbar, PageHeader)

**File**: `src/components/layout/sidebar.tsx`, `src/components/dashboard/Topbar.tsx` (canonica), `src/components/ui/page-header.tsx`.

**Cosa fare**:
1. **Sidebar** (priorità #1): sostituire `bg-navy` / `bg-white` con `bg-sidebar`. Item attivo: `bg-sidebar-active text-sidebar-active-foreground` + `::before` 3px `bg-sage-500` 2px-right-radius left-0. Collapsed: 64px, item-label `hidden`, indicator bottom invece di left. Footer user-mini con avatar sage-200.
2. **Topbar**: **prima** del restyle, fare il consolidamento — `grep -r "from .*Topbar" src/` per trovare i 3 file. Mantenere `src/components/dashboard/Topbar.tsx`, switchare imports degli altri 2 a questo, eliminare i 2 duplicati. **Poi** restyle: h-14, bg-card, CreditsCounter pill sage-50, lang switcher segmented, notif bell con dot rosso, avatar 32px sage-200 con menu 240px elev-3. **Logout call**: `window.location.href = `/api/auth/logout?locale=${locale}`` (vedi Parte 4).
3. **PageHeader**: nuovo (o restyle se esiste). Prop `title`, `subtitle?`, `badges?: BadgeProps[]`, `meta?: string`, `actions: ReactNode`, `density?: 'default' | 'dense'`. Render: h1 36px (dense 22) tracking-tight, sub 17px fg-2 max-w-prose, action slot flex-end. Non includere breadcrumb (la Topbar lo fa già).

**Rischi**:
- Il consolidamento Topbar è il momento più rischioso del progetto. Dopo lo switch, **fare un commit dedicato** e verificare in 3 pagine diverse (overview, ai/insights, settings) che la Topbar renderizzi.
- Sidebar collapsed: il badge counter deve riposizionarsi top-right invece di margin-left:auto.

**Test**: vedere Parte 5.

### Fase 5 — System states + overlay (Empty, Loading, Error, Dialog, Toast, Tabs, Table)

**File**: `src/components/ui/state.tsx` (consolidato), `tabs.tsx` (restyle), `dialog.tsx` (restyle), `sheet.tsx` (restyle), `sonner.tsx` (restyle), `data-table.tsx` (nuovo).

**Cosa fare**:
1. **state.tsx**: esportare `EmptyState`, `LoadingState` (wrapper con skeleton composti), `ErrorState` (inline + fullpage variant). Tutti con stesso scheletro: cerchio 64px + h3 + p + actions.
2. **Tabs**: aggiungere `variant` prop con CVA. Underline (default) / pill / vertical.
3. **Dialog**: overlay `bg-[hsl(30_25%_8%/0.55)] backdrop-blur-sm`. Content `rounded-xl shadow-elev-4 max-w-md` (lg=640). Esporta sub-components `DialogHeader`, `DialogFooter` styled.
4. **Sheet**: width 360px (sm:480px), slide-in da destra, stesso shadow-elev-4.
5. **sonner.tsx**: configurazione `<Toaster>` con `classNames` per ogni variant (vedi Parte 1.4). Helper `src/lib/toast.ts` wrapper.
6. **data-table.tsx**: wrapper sopra TanStack Table v8. Esporta `<DataTable columns rows>` + helpers `<DataTableToolbar>`, `<DataTablePagination>`, `<DataTableRowActions>`.
7. **app/error.tsx** + **app/[locale]/not-found.tsx** + **app/global-error.tsx**: tutti usano `<ErrorState variant="fullpage" bigCode>`.

**Rischi**:
- Sonner è già installato e in uso — il restyle deve mantenere la compatibilità con le chiamate esistenti `toast.success(...)`. Solo aggiungere `classNames` al `<Toaster>`.
- TanStack Table v8 va installato (`pnpm add @tanstack/react-table`). Verificare che non confligga con altre table libs (es. non c'è già un'altra table lib in uso).

**Test**: vedere Parte 5.

---

<a id="parte-4"></a>
## PARTE 4 — Avvertenze specifiche Anlyra

### 4.1 · Auth — pro_session cookie custom

- **NextAuth NON è installato**. Non importare `next-auth`, `@auth/core`, `@auth/prisma-adapter`. Il sistema auth è custom basato su cookie `pro_session`.
- **Login**: la pagina `/login` POSTa a `/api/auth/login` che imposta il cookie `pro_session` (httpOnly, secure in prod).
- **Logout**:
  ```ts
  // SEMPRE così, in qualunque punto dell'app:
  const locale = useLocale() // o leggi da params
  window.location.href = `/api/auth/logout?locale=${locale}`
  ```
  **Mai** `router.push('/login')` o `signOut()` (signOut non esiste qui).
  La forzatura di un full reload è obbligatoria per pulire client-state stale.
- **Middleware** `src/middleware.ts` verifica `pro_session` su rotte `/[locale]/(app)/**` e fa `NextResponse.redirect('/it/login')` (path relativo) se assente.

### 4.2 · Prisma — Modelli zombie

Nel `prisma/schema.prisma` esistono tabelle "zombie":
- `User_b4`
- `Organization_b7`
- (potenzialmente altri suffissi `_bN`)

**Regole**:
- **NON usarle** in query nuove.
- **NON eseguire `prisma migrate reset`** o rimuoverle dalla schema. Contengono dati legacy importanti per la retrocompatibilità.
- Usa SOLO i modelli senza suffisso (`User`, `Organization`).

### 4.3 · Duplicati nel codebase

- **3 versioni di Topbar**: la canonica è `src/components/dashboard/Topbar.tsx`. Le altre 2 (probabilmente `src/components/Topbar.tsx`, `src/components/layout/Topbar.tsx` o simili) vanno eliminate. Verificare con `find src -iname "Topbar*"`.
- **PascalCase vs lowercase**: `Button.tsx` / `button.tsx` ecc. Mantenere SEMPRE la lowercase (shadcn convention). Vedi Parte 2.3 per la procedura sicura.
- **Bug noto**: prima di iniziare ogni intervento, `grep -r "from .*ui/Button\"" src/` (con B maiuscola) — non dovrebbero esserci più dopo Fase 2. Stessa cosa per `Card`, `Badge`, `Skeleton`.

### 4.4 · Branch & merge protocol

- **Branch principale**: `claude/merge-repos-nextjs-rOZU3`.
- **All'inizio** di ogni intervento: `git branch --show-current` per confermare di essere sul branch giusto.
- **Feature branch**: `git checkout -b ds/<sezione>` (es. `ds/sidebar-restyle`, `ds/button-variants`).
- **Merge**: `git checkout claude/merge-repos-nextjs-rOZU3 && git merge --no-ff ds/<sezione>`. Mai fast-forward.
- **Alla fine** di ogni intervento: `git branch --show-current` di nuovo, conferma che sei tornato sul principale prima di chiudere.

### 4.5 · i18n — next-intl

- Tutte le stringhe UI in IT (default) ed EN (parallel). File: `messages/it.json` + `messages/en.json`. **Stesso set di chiavi** in entrambi.
- Nei componenti, **mai stringhe hardcoded**:
  ```tsx
  // ❌ NO
  <button>Salva</button>
  
  // ✅ SI
  const t = useTranslations('forms')
  <button>{t('save')}</button>
  ```
- Per i toast: usare il messaggio già tradotto nel call-site, non passare chiavi i18n a `toast()`.
- Date / numeri: usare `useFormatter()` di next-intl o `Intl.NumberFormat('it-IT')` per currency/percent.

### 4.6 · Redirects — solo path relativi

```ts
// ❌ NO (rompe Codespace + Vercel preview)
return NextResponse.redirect(new URL('/it/overview', request.url))
return NextResponse.redirect('https://anlyra.it/it/overview')

// ✅ SI (path relativo)
return NextResponse.redirect('/it/overview')
```

Vale per: `middleware.ts`, route handlers, server actions. Il proxy reverse / Codespace forward gestisce il host correttamente solo se il path è relativo.

### 4.7 · Convenzioni di nomenclatura

- **Componenti UI primitivi** (Modulo 4): `src/components/ui/<kebab>.tsx` · export default `PascalCase`.
- **Componenti di dominio**: `src/components/<dominio>/<kebab>.tsx` (es. `src/components/insights/insight-list.tsx`).
- **Skeleton di un componente**: stesso file del componente, named export (es. `KpiCardSkeleton`).
- **Types pubblici**: esportati dallo stesso file (es. `export type ButtonProps`).
- **Test**: `<componente>.test.tsx` co-located (se Vitest è già configurato).
- **NO Storybook**: il design system vive in `04-components.html` + questo bundle. Non installare Storybook.

---

<a id="parte-5"></a>
## PARTE 5 — Test di verifica visiva (10 punti)

Dopo aver completato tutte le 5 fasi, apri l'app nel browser e verifica nell'ordine:

1. **Sidebar usa sage-50 active + indicatore sage-500** — Naviga su `/it/overview`. L'item "Dashboard" deve essere highlighted con `bg-sage-50` (panna verdolino) e una barretta verticale `bg-sage-500` (verde sage scuro) di 3px a sinistra. **Niente più navy / blu / bianco.** Stesso check in dark mode (sage-300 invece di sage-500).

2. **Topbar consolidata in una sola versione** — `find src -iname "Topbar*"` deve restituire UN solo file (`src/components/dashboard/Topbar.tsx`). Su `/it/overview`, `/it/ai/insights` e `/it/settings` la topbar deve apparire identica.

3. **KPI Card usa tabular nums per allineamento verticale** — Naviga su `/it/overview`. I valori KPI (es. "€ 1.250.430") devono essere perfettamente allineati a destra verticalmente — apri DevTools, ispeziona un valore, conferma `font-variant-numeric: tabular-nums` nei computed styles.

4. **Insight Card ha border-left colorato per priorità** — Naviga su `/it/ai/insights`. Le card devono avere una barretta verticale 3px a sinistra del colore della priorità: rosso terracotta (critical/high), ocra (warning/medium), blu (info/low), oliva (opportunity).

5. **Button destructive è terracotta, non sage** — Apri un dialog distruttivo (es. "Elimina cliente"). Il bottone "Elimina definitivamente" deve essere terracotta (`hsl(12 45% 42%)`), NON sage. Il bottone "Annulla" deve essere ghost (no background).

6. **Form fields hanno focus ring sage, non blu browser** — Naviga su `/it/settings/profile`. Click su un input. Il bordo deve diventare sage (`hsl(98 17% 41%)`) con un alone 3px sempre sage 20% opacity. **Nessun bordo blu browser-default.**

7. **Dialog ha overlay scuro + shadow elev-4** — Apri qualunque dialog. L'overlay deve essere warm-black 55% (`hsl(30 25% 8% / 0.55)`) con leggero blur. Il card dialog ha bordi arrotondati 16px e shadow profonda (elev-4: 20px 40px shadow).

8. **Toast position top-right desktop, top-center mobile** — Triggera un toast (es. salvataggio profilo). Su viewport desktop (≥640px) appare in alto a destra. Su viewport mobile (<640px, resize finestra o DevTools mobile mode) appare in alto al centro. Border-left 3px del colore del sentiment.

9. **Dense Table ha header sticky + righe alternate** — Naviga su `/it/clients` (o pagina con table). Scroll giù: l'header rimane fisso in cima alla viewport del table. Le righe pari hanno bg leggermente muted, hover più scuro, selected sage-50.

10. **Empty / Loading / Error states funzionanti in /ai/insights con filtri** — Su `/it/ai/insights`:
   - **Empty**: account nuovo o filtri tali da ottenere 0 risultati → mostra empty-state con cerchio sage-50, icon Sparkles, CTA "Genera primo insight".
   - **Loading**: refresh hard della pagina, durante il fetch lo skeleton ha la STESSA altezza delle card popolate (zero layout shift).
   - **Error**: simula errore (blocca il fetch da DevTools → Network → block url) → appare error-state con icon AlertCircle rossa, h3 "Errore di caricamento", button "Riprova".

### Checklist a11y rapida

- [ ] Tab keyboard naviga in ordine logico, focus visible sage-500 sempre
- [ ] Icon-only button (kebab, close, theme-toggle) ha `aria-label`
- [ ] Form fields error state: aria-invalid="true" + aria-describedby al messaggio
- [ ] Dialog ha `role="dialog"` + `aria-labelledby` al titolo, Esc chiude
- [ ] Toast error: `role="alert"` + `aria-live="assertive"` (interrompe SR)
- [ ] Table header `aria-sort` riflette lo stato della colonna
- [ ] Empty: `role="status"` (non alert) · Error: `role="alert"` · Skeleton: `aria-busy="true"` + sr-only "Caricamento"

---

<a id="parte-6"></a>
## PARTE 6 — Decisioni rimandate / approvate con caveat

Le 7 decisioni discutibili che ho sollevato a fine Modulo 4 — TUTTE approvate dall'utente. Tracciate qui per memoria storica e caveat futuri.

| # | Decisione | Stato | Caveat |
|---|---|---|---|
| 1 | **Button destructive = terracotta**, non sage scuro | ✅ Approvato | Convenzione: la categoria "elimina" esce dalla famiglia brand per leggibilità sentimentale. Nessuna azione richiesta. |
| 2 | **Field wrapper usa `React.cloneElement`** | ✅ Approvato | Mantenere finché non emerge un caso problematico (es. children è array, o componente che non accetta ref). Se serve, migrare a `children(props)` render-prop. |
| 3 | **Toast loading senza auto-dismiss** + sostituzione via `toast(id)` | ✅ Approvato | Pattern sonner-standard. Disciplina nei callsite: ogni `toast.loading` deve avere il suo `toast.success(..., { id })` o `toast.error(..., { id })` corrispondente. Aggiungere ESLint rule custom se possibile. |
| 4 | **TanStack Table v8** (non shadcn data-table puro) | ✅ Approvato | Standard industria. Verificare che `@tanstack/react-table` non sia già in versione precedente nel `package.json` → installare/aggiornare se necessario. |
| 5 | **Skeleton opacity-pulse**, non shimmer | ✅ Approvato | Shimmer su panna è troppo aggressivo. Se in futuro emerge la necessità (es. su un componente specifico), aggiungere `<Skeleton shimmer />` come prop opzionale. |
| 6 | **ErrorState mostra `error.digest`** in fullpage 500 | ⚠️ Approvato con caveat | Il `digest` di Next 14 è anonimo by-design (hash). **Quando integreremo Sentry vero**, verificare che i messaggi esposti agli utenti (`error.message`) NON contengano info PII (email, nomi, P.IVA, codici fiscali). Configurare Sentry `beforeSend` filtering. |
| 7 | **404 e 500 stesso componente `ErrorState`** con `variant` prop | ✅ Approvato | Riduce duplicazione tra `app/error.tsx` e `app/not-found.tsx`. Se in futuro 404 e 500 divergono significativamente, splittare in `ErrorStateInline` + `ErrorPageFull`. |

---

## Promemoria finale per Claude Code

1. **Conferma il branch** all'inizio: `git branch --show-current` → atteso `claude/merge-repos-nextjs-rOZU3`.
2. **Una fase alla volta**: build + typecheck clean dopo ogni fase prima di procedere alla successiva.
3. **Eliminare i duplicati prima** di applicare il restyle al canonico (per evitare di restyle-are una versione che poi cancellerai).
4. **Conferma il branch** alla fine: stessa cosa, prima di chiudere.
5. **Commit messages** in IT prefissati: `ds(fase-1): aggiungi token palette sage in globals.css`, `ds(fase-4): consolida 3 Topbar in dashboard/Topbar.tsx`, ecc.

Buon lavoro.
