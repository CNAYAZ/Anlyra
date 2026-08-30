import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

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
 * — blaming the server for what is simply a request with no session, and
 * echoing an internal message back to the caller.
 *
 * Recognised by NAME rather than `instanceof`: a class identity check is
 * brittle across separately-bundled route modules.
 */
export function failFromError(e: unknown, fallbackStatus = 500) {
  const err = e as { name?: string; message?: string };
  if (err?.name === 'NotAuthenticatedError') return fail('Unauthorized', 401);
  if (err?.name === 'NoOrganizationError') return fail('NO_ORGANIZATION', 403);
  return fail(err?.message ?? 'Internal error', fallbackStatus);
}

// Legacy helpers used by some route handlers
export function apiOk<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function apiErr(error: string): ApiResponse<never> {
  return { success: false, error };
}

export function parseOrFail<T>(
  schema: ZodSchema<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? 'Invalid input' };
}
