import { NextResponse } from "next/server";

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data });
}

export function fail(error: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status },
  );
}

/**
 * Turns a thrown session error into the RIGHT status instead of a blanket 500.
 *
 * Needed because getCurrentContext() now THROWS for an anonymous visitor rather
 * than silently answering with the demo organization's data. Every route that
 * calls it wraps its body in `try { … } catch (e) { return fail(msg, 500) }`, so
 * without this an unauthenticated GET would report "500 Internal Server Error"
 * — blaming the server for what is simply a request with no session.
 *
 * Recognised by NAME rather than `instanceof`: a class identity check is
 * brittle across separately-bundled route modules.
 *
 * ── L'ERRORE VERO NON ESCE VERSO IL BROWSER ──
 * La versione originale di questa funzione chiudeva con
 * `fail(err?.message ?? 'Internal error', fallbackStatus)`, cioe' rimandava al
 * chiamante il testo dell'eccezione. Nel frattempo il tronco ha tolto proprio
 * quel comportamento dalle superfici AI (chat/analyze/insights ora loggano con
 * il marcatore [ai:error] e rispondono 'AI_REQUEST_FAILED'), perche' il testo di
 * un errore interno puo' contenere dettagli sulla configurazione. Qui si applica
 * la stessa regola con un marcatore generico, [api:error], visto che questa
 * funzione e' usata anche da route non-AI: l'errore intero resta nei log del
 * server, al browser va un codice fisso.
 */
export function failFromError(e: unknown, fallbackStatus = 500) {
  const err = e as { name?: string; message?: string };
  if (err?.name === 'NotAuthenticatedError') return fail('Unauthorized', 401);
  if (err?.name === 'NoOrganizationError') return fail('NO_ORGANIZATION', 403);
  console.error('[api:error]', e);
  return fail('INTERNAL_ERROR', fallbackStatus);
}
