import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_ORG_ID = 'demo-org';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

type SeedReceivable = {
  customerName: string;
  customerEmail: string;
  amount: number;
  invoiceNumber: string;
  issuedDate: Date;
  dueDate: Date;
  status: 'OPEN' | 'PAID';
  paidAt?: Date;
  notes?: string;
};

async function main() {
  console.log(`📋 Seed crediti demo per org: ${DEMO_ORG_ID}`);

  // Idempotenza: rimuove i crediti demo precedentemente inseriti da questo script
  // prima di reinserirli, per non accumulare duplicati a ogni esecuzione.
  const deleted = await prisma.receivable.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
  console.log(`🗑️  Rimossi ${deleted.count} crediti precedenti.`);

  const receivables: SeedReceivable[] = [
    // ── 3 SCADUTI (status OPEN, dueDate nel passato → OVERDUE derivato a runtime) ──
    {
      customerName: 'Forno Aurora',
      customerEmail: 'amministrazione@fornoaurora.it',
      amount: 1850,
      invoiceNumber: '2026/0142',
      issuedDate: daysAgo(120),
      dueDate: daysAgo(90),
      status: 'OPEN',
      notes: 'Fornitura farine e lievitati — luglio',
    },
    {
      customerName: 'Ittica Marè SRL',
      customerEmail: 'fatture@itticamare.it',
      amount: 3200,
      invoiceNumber: '2026/0144',
      issuedDate: daysAgo(75),
      dueDate: daysAgo(45),
      status: 'OPEN',
      notes: 'Fornitura pescato fresco — agosto',
    },
    {
      customerName: 'Caseificio San Giorgio',
      customerEmail: 'ufficioacquisti@caseificiosangiorgio.it',
      amount: 980,
      invoiceNumber: '2026/0146',
      issuedDate: daysAgo(45),
      dueDate: daysAgo(15),
      status: 'OPEN',
      notes: 'Fornitura latticini freschi',
    },
    // ── 2 ANCORA NEI TERMINI (status OPEN, dueDate nel futuro) ──
    {
      customerName: 'Cantina Bellavia',
      customerEmail: 'amministrazione@cantinabellavia.it',
      amount: 2400,
      invoiceNumber: '2026/0147',
      issuedDate: daysAgo(5),
      dueDate: daysFromNow(10),
      status: 'OPEN',
      notes: 'Fornitura vini e bevande — settembre',
    },
    {
      customerName: 'Ortofrutta Da Nino',
      customerEmail: 'ordini@ortofruttadanino.it',
      amount: 650,
      invoiceNumber: '2026/0148',
      issuedDate: daysAgo(2),
      dueDate: daysFromNow(25),
      status: 'OPEN',
      notes: 'Fornitura frutta e verdura settimanale',
    },
    // ── 2 GIÀ PAGATI ──
    {
      customerName: 'Distribuzione Beverage Sud',
      customerEmail: 'contabilita@beveragesud.it',
      amount: 4100,
      invoiceNumber: '2026/0143',
      issuedDate: daysAgo(65),
      dueDate: daysAgo(35),
      status: 'PAID',
      paidAt: daysAgo(20),
      notes: 'Fornitura bevande e birre — luglio',
    },
    {
      customerName: 'Pasticceria Cinque Lune',
      customerEmail: 'amministrazione@cinquelune.it',
      amount: 1320,
      invoiceNumber: '2026/0145',
      issuedDate: daysAgo(90),
      dueDate: daysAgo(60),
      status: 'PAID',
      paidAt: daysAgo(50),
      notes: 'Fornitura semilavorati pasticceria',
    },
  ];

  for (const r of receivables) {
    await prisma.receivable.create({
      data: {
        organizationId: DEMO_ORG_ID,
        customerName: r.customerName,
        customerEmail: r.customerEmail,
        amount: r.amount,
        currency: 'EUR',
        invoiceNumber: r.invoiceNumber,
        issuedDate: r.issuedDate,
        dueDate: r.dueDate,
        status: r.status,
        notes: r.notes,
        paidAt: r.paidAt,
      },
    });
  }

  const overdueCount = receivables.filter((r) => r.status === 'OPEN' && r.dueDate < new Date()).length;
  const openCount = receivables.filter((r) => r.status === 'OPEN' && r.dueDate >= new Date()).length;
  const paidCount = receivables.filter((r) => r.status === 'PAID').length;
  const total = receivables.reduce((sum, r) => sum + r.amount, 0);

  console.log(`✅ Creati ${receivables.length} crediti demo per org ${DEMO_ORG_ID}:`);
  console.log(`   - ${overdueCount} scaduti`);
  console.log(`   - ${openCount} nei termini`);
  console.log(`   - ${paidCount} pagati`);
  console.log(`   - Totale: €${total.toLocaleString('it-IT')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
