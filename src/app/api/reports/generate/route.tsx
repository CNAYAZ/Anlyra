import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { reportConfigSchema } from '@/lib/reports/types';
import { buildSamplePayload } from '@/lib/reports/sample-data';
import { ReportDocument } from '@/lib/reports/pdf/ReportDocument';
import { checkRateLimit, getClientIp, retryAfterSeconds } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Public endpoint (used by the token-share page and the builder preview), so it
  // stays unauthenticated — but PDF generation is CPU-heavy, so rate-limit per IP
  // to blunt a DoS. No real org data is exposed (sample payload).
  const rl = await checkRateLimit('report-generate-ip', getClientIp(req));
  if (!rl.success) {
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rl.reset)) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = reportConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join('; '),
      },
      { status: 400 }
    );
  }

  const config = parsed.data;
  const payload = buildSamplePayload(config);

  try {
    const stream = await renderToStream(
      <ReportDocument config={config} payload={payload} />
    );

    const chunks: Buffer[] = [];
    for await (const chunk of stream as unknown as AsyncIterable<Buffer | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdf = Buffer.concat(chunks);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': pdf.length.toString(),
        'content-disposition': `attachment; filename="${encodeURIComponent(
          config.title
        )}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : 'PDF generation failed',
      },
      { status: 500 }
    );
  }
}
