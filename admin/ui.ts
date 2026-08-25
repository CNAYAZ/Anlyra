/**
 * The admin panel's single HTML page.
 *
 * Plain HTML + vanilla JS on purpose: no build step, no framework, nothing that
 * could accidentally share code with the customer-facing bundle. Deliberately
 * plain-looking — the goal is that the operator reads what a button does before
 * pressing it, not that the page is pretty.
 *
 * `csrfToken` is generated fresh at every start and embedded here. Mutating
 * requests must echo it in the x-admin-token header. That stops a malicious
 * page open in the same browser from POSTing to localhost:3001: it cannot read
 * this page (same-origin policy), so it cannot learn the token.
 */
export function renderPage(params: { csrfToken: string; cronAvailable: boolean }): string {
  const { csrfToken, cronAvailable } = params;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anlyra — Pannello admin (locale)</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background:#14120f; color:#e8e2d8; font-size:13px; }
  header { background:#7a2318; padding:12px 20px; border-bottom:2px solid #a33; }
  header h1 { margin:0 0 4px; font-size:15px; }
  header p { margin:0; font-size:12px; color:#f0d6d0; }
  nav { display:flex; gap:2px; background:#1e1a16; padding:0 12px; flex-wrap:wrap; }
  nav button { background:none; border:none; color:#9a938a; padding:11px 14px; cursor:pointer; font:inherit; border-bottom:2px solid transparent; }
  nav button:hover { color:#e8e2d8; }
  nav button.active { color:#8fbf6f; border-bottom-color:#8fbf6f; }
  main { padding:20px; }
  section { display:none; }
  section.active { display:block; }
  h2 { font-size:14px; margin:0 0 12px; color:#8fbf6f; }
  h3 { font-size:13px; margin:22px 0 8px; color:#c9c1b6; }
  table { border-collapse:collapse; width:100%; margin-bottom:16px; }
  th, td { border:1px solid #332d26; padding:5px 8px; text-align:left; vertical-align:top; }
  th { background:#1e1a16; color:#9a938a; font-weight:600; }
  td.num { text-align:right; }
  .card { background:#1a1712; border:1px solid #332d26; border-radius:6px; padding:14px; margin-bottom:16px; }
  .danger { border-color:#7a2318; }
  .danger h3 { color:#e08a7a; margin-top:0; }
  label { display:block; margin:8px 0 3px; color:#9a938a; }
  input, select { background:#0f0d0b; color:#e8e2d8; border:1px solid #443c33; border-radius:4px; padding:6px 8px; font:inherit; min-width:220px; }
  button.act { background:#2f4a24; color:#dff0d0; border:1px solid #4a6b3a; border-radius:4px; padding:7px 14px; cursor:pointer; font:inherit; margin-top:12px; }
  button.act:hover { background:#3b5c2d; }
  button.act.red { background:#5c211a; border-color:#8a3427; color:#f0d0c8; }
  button.act.red:hover { background:#73291f; }
  button.act:disabled { opacity:.5; cursor:not-allowed; }
  .out { background:#0f0d0b; border:1px solid #332d26; border-radius:4px; padding:10px; margin-top:12px; white-space:pre-wrap; word-break:break-word; max-height:340px; overflow:auto; }
  .out.err { border-color:#8a3427; color:#f0b0a4; }
  .out.ok { border-color:#4a6b3a; color:#cfe8bd; }
  .note { color:#9a938a; font-size:12px; line-height:1.55; margin:6px 0; }
  .warn { background:#2a1a12; border:1px solid #6b4a24; border-radius:4px; padding:9px 11px; color:#e8c9a0; margin:10px 0; line-height:1.55; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:10px; }
  .stat { background:#1a1712; border:1px solid #332d26; border-radius:6px; padding:11px 13px; }
  .stat b { display:block; font-size:20px; color:#8fbf6f; margin-bottom:2px; }
  .stat span { color:#9a938a; font-size:12px; }
  code { background:#0f0d0b; padding:1px 5px; border-radius:3px; color:#c9b98a; }
  .row { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end; }
</style>
</head>
<body>
<header>
  <h1>Anlyra — Pannello admin</h1>
  <p>Collegato al database di PRODUZIONE (utenti reali). Ogni modifica è immediata e viene registrata nell'audit log.</p>
</header>

<nav>
  <button data-tab="overview" class="active">Panoramica</button>
  <button data-tab="orgs">Organizzazioni</button>
  <button data-tab="users">Utenti</button>
  <button data-tab="audit">Audit log</button>
  <button data-tab="cleanup">Pulizia</button>
  <button data-tab="cron">Cron</button>
</nav>

<main>
  <section id="overview" class="active">
    <h2>Conteggi generali</h2>
    <div class="grid" id="counts">Caricamento...</div>
    <button class="act" onclick="loadCounts()">Aggiorna</button>
  </section>

  <section id="orgs">
    <h2>Organizzazioni</h2>
    <div class="warn">
      <b>Due colonne "piano" che possono divergere.</b><br>
      <code>Organization.plan</code> è LEGACY (default "STARTER"): oggi incide solo sul nome e prezzo del piano
      scritti nelle email di fine prova.<br>
      <code>BillingSubscription.plan</code> è quello VERO: decide funzionalità, limiti e quanti crediti dà il
      rinnovo mensile.<br>
      Quando imposti il piano qui sotto, il pannello scrive <b>entrambi</b> per non lasciarli disallineati.
    </div>
    <div id="orgsTable">Caricamento...</div>
    <button class="act" onclick="loadOrgs()">Aggiorna</button>

    <div class="card">
      <h3>Imposta crediti AI</h3>
      <p class="note">Imposta un valore assoluto (non somma). Copia l'id dalla tabella qui sopra.</p>
      <div class="row">
        <div><label>ID organizzazione</label><input id="credOrg" placeholder="cl..."></div>
        <div><label>Crediti</label><input id="credVal" type="number" min="0" step="1" value="200"></div>
      </div>
      <button class="act" onclick="doSetCredits()">Imposta crediti</button>
      <div id="credOut"></div>
    </div>

    <div class="card">
      <h3>Imposta piano</h3>
      <p class="note">Aggiorna <code>Organization.plan</code> E <code>BillingSubscription.plan</code>. Se l'organizzazione non ha ancora un abbonamento, la riga viene creata.</p>
      <div class="row">
        <div><label>ID organizzazione</label><input id="planOrg" placeholder="cl..."></div>
        <div><label>Piano</label><select id="planVal"><option>PRO</option><option>ADVANCED</option><option>ENTERPRISE</option></select></div>
      </div>
      <button class="act" onclick="doSetPlan()">Imposta piano</button>
      <div id="planOut"></div>
    </div>
  </section>

  <section id="users">
    <h2>Utenti</h2>
    <div id="usersTable">Caricamento...</div>
    <button class="act" onclick="loadUsers()">Aggiorna</button>

    <div class="card">
      <h3>Cambia ruolo di un membro</h3>
      <div class="row">
        <div><label>ID utente</label><input id="roleUser" placeholder="cl..."></div>
        <div><label>ID organizzazione</label><input id="roleOrg" placeholder="cl..."></div>
        <div><label>Ruolo</label><select id="roleVal"><option>owner</option><option>admin</option><option>editor</option><option>viewer</option></select></div>
      </div>
      <button class="act" onclick="doSetRole()">Cambia ruolo</button>
      <div id="roleOut"></div>
    </div>

    <div class="card">
      <h3>Sblocca un account</h3>
      <p class="note">
        Azzera la richiesta di cancellazione GDPR (utente + sue organizzazioni), così il cron di purge smette
        il conto alla rovescia. E/o riporta il ruolo a <code>owner</code> — serve se ci si è auto-bloccati
        mettendosi <code>viewer</code>.
      </p>
      <div class="row">
        <div><label>ID utente</label><input id="unbUser" placeholder="cl..."></div>
        <div><label>ID organizzazione (solo per "torna owner")</label><input id="unbOrg" placeholder="cl..."></div>
      </div>
      <label><input type="checkbox" id="unbDel" style="min-width:auto"> Azzera richiesta di cancellazione</label>
      <label><input type="checkbox" id="unbOwner" style="min-width:auto"> Riporta ruolo a owner</label>
      <button class="act" onclick="doUnblock()">Sblocca</button>
      <div id="unbOut"></div>
    </div>
  </section>

  <section id="audit">
    <h2>Audit log (ultime 100 righe)</h2>
    <div class="row">
      <div><label>Azione</label><select id="audAction"><option value="">tutte</option></select></div>
      <div><label>ID organizzazione</label><input id="audOrg" placeholder="vuoto = tutte"></div>
    </div>
    <button class="act" onclick="loadAudit()">Filtra</button>
    <div id="auditTable" style="margin-top:14px">Caricamento...</div>
  </section>

  <section id="cleanup">
    <h2>Pulizia dati</h2>

    <div class="card danger">
      <h3>Cancella insight</h3>
      <p class="note">Serve <b>almeno un filtro</b>: senza, il pannello rifiuta (cancellerebbe gli insight di tutte le organizzazioni).</p>
      <div class="row">
        <div><label>ID organizzazione</label><input id="insOrg" placeholder="vuoto = tutte"></div>
        <div><label>Stato</label><select id="insStatus"><option value="">tutti</option><option>NEW</option><option>REVIEWED</option><option>IMPLEMENTED</option><option>IGNORED</option></select></div>
        <div><label>Più vecchi di (giorni)</label><input id="insDays" type="number" min="0" step="1" value="0"></div>
      </div>
      <button class="act" onclick="previewInsights()">Conta quanti ne cancellerebbe</button>
      <button class="act red" onclick="doDeleteInsights()">Cancella</button>
      <div id="insOut"></div>
    </div>

    <div class="card danger">
      <h3>Cancella una singola riga per id</h3>
      <p class="note">Per righe di prova inserite a mano. Una riga alla volta, individuata dal suo id.</p>
      <div class="row">
        <div><label>Tabella</label><select id="rowTable"><option value="receivable">Crediti / scadenzario</option><option value="recurringExpense">Spese ricorrenti</option><option value="financialRecord">Movimenti finanziari</option></select></div>
        <div><label>ID riga</label><input id="rowId" placeholder="cl..."></div>
      </div>
      <button class="act red" onclick="doDeleteRow()">Cancella riga</button>
      <div id="rowOut"></div>
    </div>
  </section>

  <section id="cron">
    <h2>Lancia i cron a mano</h2>
    ${
      cronAvailable
        ? `<p class="note">Chiama gli endpoint reali dell'app con il segreto letto dall'ambiente (mai mostrato qui né nei log).
             Serve che il server dell'app sia avviato sulla porta 3000.</p>`
        : `<div class="warn"><b>CRON_SECRET non configurata</b> in <code>.env</code> / <code>.env.local</code>: i pulsanti sono disattivati.</div>`
    }
    <div class="card">
      <h3>trial-check</h3>
      <p class="note">Include: avvisi di fine prova, <b>rinnovo mensile dei crediti</b> e invio dei <b>report pianificati</b>.</p>
      <button class="act" onclick="doCron('trial-check')" ${cronAvailable ? '' : 'disabled'}>Lancia trial-check</button>
    </div>
    <div class="card danger">
      <h3>gdpr-purge</h3>
      <p class="note">Cancella DEFINITIVAMENTE gli account che hanno superato i 30 giorni di grazia dopo la richiesta di cancellazione.</p>
      <button class="act red" onclick="doCron('gdpr-purge')" ${cronAvailable ? '' : 'disabled'}>Lancia gdpr-purge</button>
    </div>
    <div id="cronOut"></div>
  </section>
</main>

<script>
const TOKEN = ${JSON.stringify(csrfToken)};

document.querySelectorAll('nav button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('section').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById(b.dataset.tab).classList.add('active');
  };
});

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function show(id, text, kind) {
  document.getElementById(id).innerHTML = '<div class="out ' + (kind || '') + '">' + esc(text) + '</div>';
}
async function get(path) {
  const r = await fetch(path);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Errore');
  return j.data;
}
async function post(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': TOKEN },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Errore');
  return j.data;
}
function fmt(d) { return d ? new Date(d).toLocaleString('it-IT') : '—'; }

async function loadCounts() {
  const c = await get('/api/counts');
  const labels = {
    organizations:'Organizzazioni', users:'Utenti', financialRecords:'Movimenti finanziari',
    receivables:'Crediti / scadenzario', recurringExpenses:'Spese ricorrenti', insights:'Insight',
    reports:'Report', aiConversations:'Conversazioni AI', auditLogRows:'Righe audit log',
  };
  document.getElementById('counts').innerHTML = Object.entries(labels)
    .map(([k,l]) => '<div class="stat"><b>' + c[k] + '</b><span>' + l + '</span></div>').join('');
}

async function loadOrgs() {
  const rows = await get('/api/organizations');
  document.getElementById('orgsTable').innerHTML =
    '<table><tr><th>ID</th><th>Nome</th><th>Organization.plan<br><small>(legacy)</small></th>' +
    '<th>BillingSubscription.plan<br><small>(quello vero)</small></th><th>Stato abb.</th>' +
    '<th class="num">Crediti</th><th class="num">Membri</th><th>Creata</th></tr>' +
    rows.map(o => {
      const diverge = o.subscriptionPlan && o.organizationPlan !== o.subscriptionPlan;
      return '<tr><td><code>' + esc(o.id) + '</code></td><td>' + esc(o.name) + '</td>' +
        '<td' + (diverge ? ' style="color:#e8c9a0"' : '') + '>' + esc(o.organizationPlan) + '</td>' +
        '<td' + (diverge ? ' style="color:#e8c9a0"' : '') + '>' + esc(o.subscriptionPlan ?? '— nessun abbonamento —') + '</td>' +
        '<td>' + esc(o.subscriptionStatus ?? '—') + '</td>' +
        '<td class="num">' + o.aiCredits + '</td><td class="num">' + o.memberCount + '</td>' +
        '<td>' + fmt(o.createdAt) + '</td></tr>';
    }).join('') + '</table>';
}

async function loadUsers() {
  const rows = await get('/api/users');
  document.getElementById('usersTable').innerHTML =
    '<table><tr><th>ID</th><th>Email</th><th>Nome</th><th>Verificato</th><th>Ultimo accesso</th>' +
    '<th>Cancellazione richiesta</th><th>Organizzazioni (ruolo)</th></tr>' +
    rows.map(u =>
      '<tr><td><code>' + esc(u.id) + '</code></td><td>' + esc(u.email) + '</td><td>' + esc(u.name ?? '—') + '</td>' +
      '<td>' + (u.verified ? 'sì' : 'NO') + '</td><td>' + fmt(u.lastLoginAt) + '</td>' +
      '<td' + (u.deletionRequestedAt ? ' style="color:#e08a7a"' : '') + '>' + fmt(u.deletionRequestedAt) + '</td>' +
      '<td>' + u.memberships.map(m => esc(m.organizationName) + ' (' + esc(m.role) + ')<br><code>' + esc(m.organizationId) + '</code>').join('<br>') + '</td></tr>'
    ).join('') + '</table>';
}

async function loadAudit() {
  const action = document.getElementById('audAction').value;
  const org = document.getElementById('audOrg').value.trim();
  const q = new URLSearchParams();
  if (action) q.set('action', action);
  if (org) q.set('organizationId', org);
  const rows = await get('/api/audit?' + q.toString());
  document.getElementById('auditTable').innerHTML =
    '<table><tr><th>Quando</th><th>Azione</th><th>Esito</th><th>Org</th><th>Utente</th><th>Target</th><th>Dettagli</th></tr>' +
    rows.map(r =>
      '<tr><td>' + fmt(r.createdAt) + '</td>' +
      '<td' + (r.action.startsWith('admin.') ? ' style="color:#e8c9a0"' : '') + '>' + esc(r.action) + '</td>' +
      '<td>' + esc(r.outcome) + '</td><td><code>' + esc(r.organizationId ?? '—') + '</code></td>' +
      '<td><code>' + esc(r.userId ?? '—') + '</code></td>' +
      '<td>' + esc(r.targetType ?? '—') + ' ' + esc(r.targetId ?? '') + '</td>' +
      '<td>' + esc(r.metadata ?? '') + '</td></tr>'
    ).join('') + '</table>';
}

async function loadAuditActions() {
  const actions = await get('/api/audit/actions');
  const sel = document.getElementById('audAction');
  actions.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o); });
}

async function doSetCredits() {
  const org = document.getElementById('credOrg').value.trim();
  const credits = parseInt(document.getElementById('credVal').value, 10);
  if (!org) return show('credOut', 'Indica l\\'id organizzazione.', 'err');
  if (!Number.isInteger(credits) || credits < 0) return show('credOut', 'Crediti non validi.', 'err');
  if (!confirm('IMPOSTARE I CREDITI\\n\\nOrganizzazione: ' + org + '\\nNuovo valore: ' + credits +
      '\\n\\nSostituisce il saldo attuale (non lo somma). Database di PRODUZIONE. Procedere?')) return;
  try {
    const r = await post('/api/organizations/credits', { organizationId: org, credits });
    show('credOut', 'Fatto — ' + r.organizationName + ': ' + r.from + ' -> ' + r.to + ' crediti.', 'ok');
    loadOrgs();
  } catch (e) { show('credOut', e.message, 'err'); }
}

async function doSetPlan() {
  const org = document.getElementById('planOrg').value.trim();
  const plan = document.getElementById('planVal').value;
  if (!org) return show('planOut', 'Indica l\\'id organizzazione.', 'err');
  if (!confirm('IMPOSTARE IL PIANO\\n\\nOrganizzazione: ' + org + '\\nNuovo piano: ' + plan +
      '\\n\\nVerranno aggiornati ENTRAMBI:\\n- Organization.plan (legacy, testo email)\\n' +
      '- BillingSubscription.plan (funzionalita, limiti, crediti del rinnovo)\\n\\nDatabase di PRODUZIONE. Procedere?')) return;
  try {
    const r = await post('/api/organizations/plan', { organizationId: org, plan });
    show('planOut',
      'Fatto — ' + r.organizationName + '\\n' +
      'Organization.plan: ' + r.organizationPlanFrom + ' -> ' + r.to + '\\n' +
      'BillingSubscription.plan: ' + (r.subscriptionPlanFrom ?? '(nessuna riga)') + ' -> ' + r.to +
      (r.subscriptionRowCreated ? '\\n(riga abbonamento creata ora)' : ''), 'ok');
    loadOrgs();
  } catch (e) { show('planOut', e.message, 'err'); }
}

async function doSetRole() {
  const userId = document.getElementById('roleUser').value.trim();
  const organizationId = document.getElementById('roleOrg').value.trim();
  const role = document.getElementById('roleVal').value;
  if (!userId || !organizationId) return show('roleOut', 'Servono id utente e id organizzazione.', 'err');
  let extra = '';
  if (role === 'viewer') extra = '\\n\\nATTENZIONE: "viewer" non puo cancellare dati ne cambiare impostazioni. E il ruolo con cui ci si auto-blocca.';
  if (!confirm('CAMBIARE RUOLO\\n\\nUtente: ' + userId + '\\nOrganizzazione: ' + organizationId +
      '\\nNuovo ruolo: ' + role + extra + '\\n\\nDatabase di PRODUZIONE. Procedere?')) return;
  try {
    const r = await post('/api/users/role', { userId, organizationId, role });
    show('roleOut', 'Fatto — ' + r.email + ' in ' + r.organizationName + ': ' + r.from + ' -> ' + r.to, 'ok');
    loadUsers();
  } catch (e) { show('roleOut', e.message, 'err'); }
}

async function doUnblock() {
  const userId = document.getElementById('unbUser').value.trim();
  const organizationId = document.getElementById('unbOrg').value.trim();
  const clearDeletion = document.getElementById('unbDel').checked;
  const restoreOwner = document.getElementById('unbOwner').checked;
  if (!userId) return show('unbOut', 'Indica l\\'id utente.', 'err');
  if (!clearDeletion && !restoreOwner) return show('unbOut', 'Seleziona almeno una operazione.', 'err');
  if (!confirm('SBLOCCARE ACCOUNT\\n\\nUtente: ' + userId +
      (clearDeletion ? '\\n- azzera richiesta di cancellazione (utente + sue organizzazioni)' : '') +
      (restoreOwner ? '\\n- riporta a owner in ' + (organizationId || '(MANCA ORG!)') : '') +
      '\\n\\nDatabase di PRODUZIONE. Procedere?')) return;
  try {
    const r = await post('/api/users/unblock', { userId, organizationId: organizationId || undefined, clearDeletion, restoreOwner });
    show('unbOut', 'Fatto — ' + r.email + '\\n' + r.done.map(d => '- ' + d).join('\\n'), 'ok');
    loadUsers();
  } catch (e) { show('unbOut', e.message, 'err'); }
}

function insightFilters() {
  const days = parseInt(document.getElementById('insDays').value, 10);
  return {
    organizationId: document.getElementById('insOrg').value.trim() || undefined,
    status: document.getElementById('insStatus').value || undefined,
    olderThanDays: Number.isInteger(days) && days > 0 ? days : undefined,
  };
}

async function previewInsights() {
  try {
    const f = insightFilters();
    const r = await post('/api/insights/count', f);
    show('insOut', 'Con questi filtri verrebbero cancellati ' + r.count + ' insight.', 'ok');
  } catch (e) { show('insOut', e.message, 'err'); }
}

async function doDeleteInsights() {
  const f = insightFilters();
  if (!f.organizationId && !f.status && !f.olderThanDays) {
    return show('insOut', 'Nessun filtro: rifiutato. Indica almeno organizzazione, stato o giorni.', 'err');
  }
  let count;
  try { count = (await post('/api/insights/count', f)).count; }
  catch (e) { return show('insOut', e.message, 'err'); }
  if (count === 0) return show('insOut', 'Nessun insight corrisponde a questi filtri: niente da cancellare.', 'ok');
  if (!confirm('CANCELLARE INSIGHT\\n\\nFiltri:\\n- organizzazione: ' + (f.organizationId || 'TUTTE') +
      '\\n- stato: ' + (f.status || 'tutti') + '\\n- piu vecchi di: ' + (f.olderThanDays || 0) + ' giorni' +
      '\\n\\nRighe che verranno cancellate: ' + count + '\\n\\nIRREVERSIBILE. Database di PRODUZIONE. Procedere?')) return;
  try {
    const r = await post('/api/insights/delete', f);
    show('insOut', 'Cancellati ' + r.deleted + ' insight.', 'ok');
    loadCounts();
  } catch (e) { show('insOut', e.message, 'err'); }
}

async function doDeleteRow() {
  const table = document.getElementById('rowTable').value;
  const id = document.getElementById('rowId').value.trim();
  if (!id) return show('rowOut', 'Indica l\\'id della riga.', 'err');
  if (!confirm('CANCELLARE UNA RIGA\\n\\nTabella: ' + table + '\\nID: ' + id +
      '\\n\\nIRREVERSIBILE. Database di PRODUZIONE. Procedere?')) return;
  try {
    const r = await post('/api/rows/delete', { table, id });
    show('rowOut', 'Cancellata da ' + r.table + ': ' + r.describe + '\\n(org ' + r.organizationId + ')', 'ok');
    loadCounts();
  } catch (e) { show('rowOut', e.message, 'err'); }
}

async function doCron(job) {
  const warn = job === 'gdpr-purge'
    ? '\\n\\nATTENZIONE: gdpr-purge CANCELLA DEFINITIVAMENTE gli account oltre i 30 giorni di grazia.'
    : '\\n\\nInclude rinnovo crediti e invio dei report pianificati (invia email vere).';
  if (!confirm('LANCIARE IL CRON "' + job + '"' + warn + '\\n\\nDatabase di PRODUZIONE. Procedere?')) return;
  show('cronOut', 'In corso...', '');
  try {
    const r = await post('/api/cron/run', { job });
    show('cronOut', 'HTTP ' + r.status + '\\n\\n' + r.body, r.status < 300 ? 'ok' : 'err');
  } catch (e) { show('cronOut', e.message, 'err'); }
}

loadCounts().catch(e => show('counts', e.message, 'err'));
loadOrgs().catch(() => {});
loadUsers().catch(() => {});
loadAuditActions().catch(() => {});
loadAudit().catch(() => {});
</script>
</body>
</html>`;
}
