import { loadEnvFiles } from './env';

/**
 * Side-effect module: reads .env / .env.local into process.env. server.ts
 * imports it FIRST, as a bare `import './load-env'`, and that is the only way
 * to make it run before the other imports.
 *
 * WHY NOT a loadEnvFiles() call at the top of server.ts: every `import` in a
 * file runs before any statement of that file's body, whatever the order in
 * the source. Such a call ran AFTER ./actions had already loaded
 * @/lib/email/client, which reads RESEND_API_KEY once, when it loads — so
 * every email the panel sends itself (company-deletion confirm/reject, see
 * src/lib/gdpr/org-deletion.ts) was silently skipped as "email disabled".
 * Found while testing those emails; nothing the panel did before sent email
 * from this process, which is why it never showed.
 */
loadEnvFiles();
