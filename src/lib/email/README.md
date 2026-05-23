# Email transazionale — Anlyra

Infrastruttura email basata su [Resend](https://resend.com) con template HTML inline.

## Struttura

```
src/lib/email/
├── client.ts          — Istanza Resend SDK (lazy: null se RESEND_API_KEY mancante)
├── send.ts            — sendEmail() wrapper con error handling e logging
├── index.ts           — Barrel export
├── README.md          — Questa documentazione
└── templates/
    ├── _layout.ts     — Layout HTML base condiviso (palette panna+sage)
    ├── welcome.ts     — Benvenuto post-registrazione
    ├── verify-email.ts — Verifica indirizzo email
    ├── password-reset.ts — Reset password con security note
    ├── payment-confirmed.ts — Conferma pagamento (attivo via Stripe webhook)
    └── team-invite.ts — Invito membro del team
```

## Setup

1. Aggiungi le variabili d'ambiente al tuo `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM="Anlyra <noreply@tuodominio.it>"
   ```

2. Verifica il dominio mittente nel [pannello Resend](https://resend.com/domains) (DNS records).

3. Senza `RESEND_API_KEY` l'app funziona comunque — `sendEmail()` logga un warning e ritorna `{ success: false, error: 'EMAIL_DISABLED' }`.

## Uso

```typescript
import { sendEmail } from '@/lib/email';
import { welcomeTemplate } from '@/lib/email/templates/welcome';

await sendEmail({
  to: user.email,
  subject: 'Benvenuto su Anlyra!',
  html: welcomeTemplate({
    userName: user.name,
    userEmail: user.email,
    loginUrl: `${process.env.NEXTAUTH_URL}/it/overview`,
  }),
});
```

## Aggiungere un template

1. Crea `src/lib/email/templates/nome-template.ts`
2. Importa `baseLayout` da `./_layout`
3. Definisci un'interfaccia params tipizzata
4. Chiama `baseLayout({ title, preheader, content, ctaButton?, userEmail? })`
5. Esporta da `index.ts`

## Template attivi per trigger

| Template | Trigger | Stato |
|---|---|---|
| `payment-confirmed` | `invoice.paid` (Stripe webhook) | Attivo |
| `welcome` | Post-signup | In attesa FASE D auth |
| `verify-email` | Post-signup (email non verificata) | In attesa FASE D auth |
| `password-reset` | Richiesta reset password | In attesa FASE D auth |
| `team-invite` | `POST /api/settings/team` (invito membro) | In attesa integrazione |

## Test

- Usa la modalità **test** di Stripe Dashboard per triggerare `invoice.paid`
- In sviluppo: setta `RESEND_API_KEY` con una chiave test Resend
- Resend invia a indirizzi verificati anche in test mode
- Per QA visivo del HTML: copia l'output di un template e incollalo in [htmlemail.io](https://htmlemail.io/inline/)
