# Piano di Migrazione: SQLite → Supabase Postgres

**Versione:** 1.0  
**Data:** 2026-05-24  
**Schema auditato:** `prisma/schema.prisma` (642 righe)  
**Modelli totali:** 39 (25 attivi + 14 zombie — vedi §3)

---

## Sezione 1 — Stato attuale (SQLite)

### Datasource corrente

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

`DATABASE_URL` punta a `file:///home/user/Anlyra/prisma/dev.db` in locale.

### Statistiche schema

| Metrica | Valore |
|---|---|
| Righe totali schema.prisma | 642 |
| Modelli attivi | 25 |
| Modelli zombie (non rimuovere) | 14 |
| Campi `Float` | 50 |
| Campi `String` candidati a `@db.Text` | 6 |
| Campi `String` che wrappano JSON | 2 |
| Indici `@@index` / `@@unique` | 47 |
| Direttive `@db.*` presenti | 0 |

### Modelli attivi

`User`, `Organization`, `Membership`, `Transaction`, `CashflowEntry`, `BudgetEntry`, `CustomerStat`, `Subscription`, `Insight`, `ImportBatch`, `Revenue`, `Cost`, `Kpi`, `Competitor`, `MarketProfile`, `MarketTrend`, `SwotItem`, `FinancialData`, `AIConversation`, `AIMessage`, `Integration`, `SyncLog`, `FinancialRecord`, `AiAlert`, `AiAlertConfig`, `Alert`

### Modelli zombie (mantenere nelle migration, non usare in query nuove)

`User_b4`, `Organization_b4`, `OrganizationMember`, `User_b5`, `Organization_b5`, `Competitor_b5`, `User_b7`, `Organization_b7`, `KPI`, `Competitor_b7`, `Organization_b12`, `Report_b8`, `CustomDashboard_b8`, `NotificationPref_b8`

---

## Sezione 2 — Target: Supabase Postgres

### Architettura di connessione Supabase

Supabase espone due endpoint per Prisma — **entrambi obbligatori**:

```env
# .env (produzione)

# Connessione pooled via PgBouncer — usata da Prisma Client a runtime
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Connessione diretta — usata da prisma migrate / prisma db push
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> `directUrl` bypassa PgBouncer e usa una connessione TCP diretta (porta 5432).  
> Le migration Prisma **richiedono** `directUrl` — falliscono su PgBouncer in mode `transaction`.

### Tier Supabase consigliato

| Piano | RAM | Storage | Connessioni | Costo/mese |
|---|---|---|---|---|
| Free | 512 MB | 500 MB | 60 dirette | $0 |
| Pro | 1 GB | 8 GB | 60 dirette + pool | $25 |
| **Pro (raccomandato)** | 1 GB | 8 GB | 200 via pool | $25 + $0.125/GB extra |

Per un SaaS con dati finanziari e AI si raccomanda **Pro** sin dal primo deploy in produzione: il piano Free sospende il progetto dopo 1 settimana di inattività e ha backup limitati.

---

## Sezione 3 — Audit incompatibilità

### 3.1 Float → Decimal (dati monetari e finanziari)

SQLite non distingue `Float` da `Decimal` — usa IEEE 754 floating point per tutto. Postgres ha tipi separati: `FLOAT8` (double) e `NUMERIC`/`DECIMAL` (precisione esatta). Per dati monetari `Float` introduce errori di arrotondamento.

**Campi monetari ad alta priorità** — raccomandato `Decimal @db.Decimal(15, 2)`:

| Modello | Campo | Riga |
|---|---|---|
| `Transaction` | `amount` | 61 |
| `CashflowEntry` | `amount` | 77 |
| `BudgetEntry` | `planned`, `actual` | 89–90 |
| `Subscription` | `mrr` | 116 |
| `Revenue` | `amount` | 217 |
| `Cost` | `amount` | 238 |
| `FinancialData` | `revenue`, `costs`, `margin` | 440–442 |
| `FinancialRecord` | `amount` | 545 |
| `AiAlert` | `thresholdValue?`, `currentValue?` | 567–568 |
| `AiAlertConfig` | `threshold` | 581 |

**Campi score/percentuale** — opzionale, `Decimal @db.Decimal(5, 2)` o mantieni `Float`:

| Modello | Campi |
|---|---|
| `Insight` | `confidence Float? @default(0.7)` → `Decimal @db.Decimal(3,2)` |
| `MarketProfile` | `marketSharePct`, `tam`, `sam`, `som`, `growthPct`, `score*` |
| `Competitor` | `estimatedRevenue?`, `marketShare?` |
| `Kpi` / `KPI` | `value`, `target?` |
| `MarketTrend` | `marketSize`, `growthPct`, `tam`, `sam`, `som` |

> **Decisione di migrazione:** È possibile mantenere tutti i `Float` come `FLOAT8` in Postgres senza errori — la conversione a `Decimal` è un'ottimizzazione di correttezza, non un prerequisito.

### 3.2 String → @db.Text (colonne long-text)

SQLite non ha limite di lunghezza su `TEXT`. Postgres usa `VARCHAR` senza limite per `String` Prisma, che tecnicamente è equivalente a `TEXT` per la storage — ma è buona pratica dichiarare `@db.Text` esplicitamente per chiarezza e per evitare sorprese con ORM layer.

**Candidati `@db.Text`:**

| Modello | Campo | Motivazione |
|---|---|---|
| `Insight` | `content String? @default("")` | Testo AI generato, potenzialmente lungo |
| `AIMessage` | `content String` | Messaggi conversazione AI |
| `SyncLog` | `config String?` | JSON di configurazione |
| `FinancialRecord` | `notes String?` | Note libere |
| `AiAlert` | `message String` | Messaggio dell'alert |
| `Alert` | `description String` | Descrizione alert |

### 3.3 String → Json nativo

**`CustomDashboard_b8.widgets`** (riga 625): dichiarato come `String // JSON array of widget configs`.  
In Postgres è possibile usare il tipo `Json` nativo che permette query JSONB, validazione e indicizzazione.

```prisma
// Prima
widgets String // JSON array of widget configs

// Dopo (opzionale, solo se CustomDashboard_b8 smette di essere zombie)
widgets Json @db.JsonB
```

> **Attenzione:** `CustomDashboard_b8` è un modello zombie. Non modificare finché non è confermato attivo.

**`SyncLog.config String?`** — potrebbe diventare `Json?` se il contenuto è sempre JSON strutturato.

### 3.4 Indici e vincoli

- Tutti i `@@index` e `@@unique` esistenti (47 totali) sono compatibili con Postgres senza modifiche.
- `@id @default(cuid())` — CUID è supportato nativo da Prisma su Postgres.
- Nessuna funzione SQLite-specifica (es. `substr`, `strftime`) è usata nello schema — solo nei raw SQL query se presenti nel codice applicativo.

### 3.5 Direttive @db.* mancanti

Attualmente **zero** direttive `@db.*` nel schema (SQLite non le supporta). In Postgres, Prisma genera tipi sensati di default:

| Tipo Prisma | Tipo Postgres generato | Note |
|---|---|---|
| `String` | `TEXT` | OK |
| `Int` | `INTEGER` | OK |
| `Float` | `DOUBLE PRECISION` | Vedi §3.1 per dati monetari |
| `Boolean` | `BOOLEAN` | OK |
| `DateTime` | `TIMESTAMP(3)` | OK |
| `Bytes` | `BYTEA` | OK |
| `Json` | `JSONB` | Non usato al momento |

---

## Sezione 4 — Strategia di migrazione

### Step 1 — Setup Supabase

1. Creare progetto su [supabase.com](https://supabase.com) (region: `eu-central-1` per GDPR)
2. In **Project Settings → Database**, copiare:
   - Connection string (porta 6543, mode `Transaction`) → `DATABASE_URL`
   - Direct URL (porta 5432) → `DIRECT_URL`
3. Aggiungere entrambe le variabili in `.env` locale e nelle **Environment Variables** del deploy (Vercel/Fly.io)

### Step 2 — Modificare prisma/schema.prisma

```diff
 datasource db {
-  provider = "sqlite"
-  url      = env("DATABASE_URL")
+  provider  = "postgresql"
+  url       = env("DATABASE_URL")
+  directUrl = env("DIRECT_URL")
 }
```

Applicare anche (opzionale ma raccomandato) le conversioni `Float → Decimal` sui campi monetari elencati in §3.1.

### Step 3 — Reset delle migration Prisma

Le migration esistenti sono scritte in SQL SQLite (`CREATE TABLE`, tipi SQLite). Non sono compatibili con Postgres.

```bash
# Rimuovere tutte le migration esistenti
rm -rf prisma/migrations

# Creare la migration iniziale per Postgres
# (usa DIRECT_URL per la connessione diretta)
npx prisma migrate dev --name init_postgres
```

> **Importante:** questo rimuove la storia delle migration. Il DB Supabase sarà comunque creato correttamente dallo schema corrente. La storia migration non è necessaria per un deploy greenfield su un nuovo DB.

### Step 4 — Export dei dati da SQLite

Eseguire prima di qualsiasi modifica al DB di produzione:

```bash
# Installare sqlite3 CLI se non presente
# sudo apt-get install sqlite3

# Export completo in SQL
sqlite3 prisma/dev.db .dump > backup/sqlite_dump_$(date +%Y%m%d_%H%M%S).sql

# Export per tabella in CSV (utile per verifica)
sqlite3 -csv -header prisma/dev.db "SELECT * FROM User" > backup/users.csv
sqlite3 -csv -header prisma/dev.db "SELECT * FROM Transaction" > backup/transactions.csv
# ... ripetere per ogni tabella attiva
```

Alternativa con Prisma (più sicura — rispetta i tipi):

```typescript
// scripts/export-sqlite.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const data = {
    users: await prisma.user.findMany(),
    organizations: await prisma.organization.findMany(),
    transactions: await prisma.transaction.findMany(),
    // ... tutti i modelli attivi
  };
  fs.writeFileSync('backup/data.json', JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

### Step 5 — Import dei dati in Postgres

Con il file JSON di Step 4:

```typescript
// scripts/import-postgres.ts
// Configurare DATABASE_URL → Supabase
import { PrismaClient } from '@prisma/client';
import data from '../backup/data.json';

const prisma = new PrismaClient();

async function main() {
  // Disabilitare FK constraints durante import
  await prisma.$executeRaw`SET session_replication_role = replica`;

  // Importare nell'ordine corretto (rispettare FK: prima User/Org, poi dipendenti)
  for (const user of data.users) {
    await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
  }
  for (const org of data.organizations) {
    await prisma.organization.upsert({ where: { id: org.id }, create: org, update: org });
  }
  // ... ripetere per tutti i modelli in ordine topologico

  await prisma.$executeRaw`SET session_replication_role = DEFAULT`;
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

> Per dataset grandi (>10k righe per tabella) usare `createMany` in batch da 500 record.

### Step 6 — Verifica integrità

```bash
# Conteggi
npx ts-node scripts/verify-counts.ts

# Check FK consistency
SELECT COUNT(*) FROM "Transaction" t
WHERE NOT EXISTS (SELECT 1 FROM "Organization" o WHERE o.id = t."organizationId");

# Spot-check valori monetari
SELECT MIN(amount), MAX(amount), AVG(amount) FROM "Transaction";
```

Confrontare i conteggi con quelli del DB SQLite originale prima di switchare il traffico.

---

## Sezione 5 — Rollback plan

### Rollback rapido (<1 ora)

**Condizione:** problema rilevato nei primi minuti/ore dopo il deploy.

1. Ripristinare `DATABASE_URL` all'URL SQLite (o a un DB Postgres di staging con i vecchi dati)
2. Ripristinare `schema.prisma` al provider SQLite (`git revert`)
3. Re-deploy dell'applicazione
4. Nessun dato perso — il SQLite originale è invariato

### Rollback completo (<24 ore)

**Condizione:** il DB Postgres contiene dati nuovi (transazioni post-deploy) che vanno preservati.

1. Export dei nuovi dati dal DB Postgres (solo righe con `createdAt > [deploy_time]`)
2. Import nel DB SQLite di backup
3. Switch DATABASE_URL a SQLite
4. Re-deploy

```bash
# Export dati post-deploy da Postgres
psql $DATABASE_URL -c "COPY (SELECT * FROM \"Transaction\" WHERE \"createdAt\" > '2026-05-24 12:00:00') TO STDOUT CSV HEADER" > new_transactions.csv
```

### Strategia dual-write (opzionale, zero downtime)

Per un rollback ancora più sicuro: durante la finestra di migrazione, scrivere sia su SQLite che su Postgres per ~24h. Richiede un middleware a livello di Prisma (`$extends`) o wrapper nelle server action.

Non raccomandato per la prima migrazione — aumenta la complessità senza beneficio reale se il team è piccolo e la finestra di manutenzione è accettabile.

---

## Sezione 6 — Checklist pre-deploy

### Ambiente e infrastruttura

- [ ] Progetto Supabase creato in region EU (GDPR compliance)
- [ ] `DATABASE_URL` (porta 6543, pooler) configurata in produzione
- [ ] `DIRECT_URL` (porta 5432, diretto) configurata in produzione
- [ ] Backup SQLite completo archiviato in storage sicuro (non solo locale)
- [ ] Vercel/Fly.io ENV vars aggiornate (non commitare nel repo)

### Schema e migration

- [ ] `prisma/schema.prisma` aggiornato con `provider = "postgresql"` e `directUrl`
- [ ] Migration SQLite precedenti rimosse (`rm -rf prisma/migrations`)
- [ ] `npx prisma migrate dev --name init_postgres` eseguito con successo
- [ ] `npx prisma generate` eseguito — client aggiornato
- [ ] Zero errori TypeScript dopo `npx tsc --noEmit`

### Dati

- [ ] Export SQLite completato e verificato (conteggi per ogni tabella)
- [ ] Import Postgres completato
- [ ] Conteggi coincidono tra SQLite e Postgres (±0)
- [ ] Spot-check valori monetari su almeno 10 righe casuali
- [ ] Constraint FK verificati (zero orfani)

### Applicazione

- [ ] Login/logout funzionante (cookie `pro_session`)
- [ ] Dashboard principale carica dati reali
- [ ] Stripe webhook riceve eventi senza errori DB
- [ ] Email di conferma pagamento inviata correttamente
- [ ] Import dati (batch) completa senza errori

---

## Sezione 7 — Considerazioni avanzate

### 7.1 Connection Pooling

Supabase Pro include PgBouncer in mode `transaction`. Configurazione ottimale per Next.js su Vercel (serverless):

```env
DATABASE_URL="...?pgbouncer=true&connection_limit=1"
```

`connection_limit=1` è necessario su ambienti serverless — ogni Lambda apre la propria connessione pooled.

Per un server tradizionale (Fly.io, Railway) senza serverless, usare la connessione diretta (porta 5432) senza PgBouncer.

### 7.2 Backup automatici

Supabase Pro offre backup giornalieri con retention 7 giorni. Aggiungere backup aggiuntivi via pg_dump per i dati finanziari:

```bash
# Cron giornaliero
pg_dump $DIRECT_URL --no-owner --no-acl -Fc > backups/anlyra_$(date +%Y%m%d).dump
```

### 7.3 Performance: indici GIN per JSON

Se `CustomDashboard_b8.widgets` viene convertito a `Json`/`JsonB`, aggiungere:

```sql
CREATE INDEX CONCURRENTLY idx_dashboard_widgets ON "CustomDashboard_b8" USING GIN (widgets);
```

Questo permette query come `widgets @> '[{"type":"chart"}]'`.

### 7.4 Row Level Security (RLS)

Supabase supporta Postgres RLS. Non è obbligatorio per Anlyra dato che l'accesso al DB avviene esclusivamente attraverso il Prisma Client lato server (non via Supabase JS client direttamente dal browser). Abilitare RLS sarebbe un layer di sicurezza in più ma richiederebbe policy per ogni tabella.

**Raccomandazione:** lasciare RLS disabilitato inizialmente. Abilitare solo se si introduce accesso diretto al DB dal frontend (es. Supabase Realtime).

### 7.5 Estensioni Postgres utili

```sql
-- Già disponibili su Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID v4 (alternativa a CUID)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Full-text search trigram
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- Ricerca senza accenti (italiano)
```

### 7.6 Modelli zombie e Postgres

I 14 modelli zombie (`User_b4`, `Organization_b7`, ecc.) **devono rimanere nello schema** — generano tabelle vuote ma non causano problemi su Postgres. Le tabelle verranno create da `prisma migrate` normalmente. Non rimuovere.

---

## Sezione 8 — Decision points

### Quando migrare?

| Condizione | Azione |
|---|---|
| Utenti attivi <100, dati <50 MB | Migrare ora — rischio basso, benefici immediati |
| Utenti attivi 100–1000, dati 50–500 MB | Schedulare finestra manutenzione (es. sabato notte) |
| Utenti attivi >1000 o SLA uptime | Piano dual-write + blue-green deploy |

### Downtime stimato

| Fase | Durata stimata |
|---|---|
| Setup Supabase + configurazione ENV | 30 min |
| Modifica schema + reset migration | 15 min |
| Export SQLite | 5–30 min (dipende da size) |
| Import in Postgres | 10–60 min (dipende da righe) |
| Verifica integrità | 15 min |
| Deploy applicazione + smoke test | 15 min |
| **Totale finestra manutenzione** | **~2 ore** |

Il downtime effettivo per gli utenti è solo durante il deploy (Vercel: ~30 secondi). Il resto della preparazione può avvenire prima, con il vecchio DB ancora attivo.

### Motivi per non migrare subito

- L'app funziona correttamente su SQLite in ambiente di sviluppo/staging
- La migrazione non sblocca nessuna feature attualmente bloccata
- Il costo aggiuntivo di Supabase Pro ($25/mese) va valutato rispetto al volume utenti

### Motivi per migrare

- Postgres è il DB di produzione standard per SaaS — scalabilità, backup, replica
- SQLite non supporta connessioni concorrenti multiple (un problema con deploy multi-instance)
- Supabase aggiunge Realtime, Auth, Storage opzionali senza infrastruttura extra
- I dati finanziari beneficiano di `NUMERIC`/`DECIMAL` per precisione monetaria

---

*Documento generato il 2026-05-24 — da aggiornare prima dell'esecuzione con le versioni esatte di Prisma, Node.js e Supabase CLI.*
