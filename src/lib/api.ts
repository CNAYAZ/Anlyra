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
