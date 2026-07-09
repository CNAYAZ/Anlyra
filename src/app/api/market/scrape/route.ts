import { NextResponse } from "next/server";

// DISABLED (security A2): this endpoint used to fetch an arbitrary, caller-supplied
// URL server-side (SSRF). The Market/competitor scraping feature is currently on
// hold, so the endpoint is switched off entirely rather than hardened — a disabled
// endpoint cannot be abused. It performs NO network request and always responds 410 Gone.
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "GONE" }, { status: 410 });
}
