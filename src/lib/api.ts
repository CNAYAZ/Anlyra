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
