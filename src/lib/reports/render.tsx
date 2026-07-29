import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { ReportDocument } from './pdf/ReportDocument';
import { buildRealPayload } from './real-data';
import type { ReportConfig } from './types';

/**
 * Renders a report PDF from an organization's REAL data. Single place where the
 * document is produced, shared by the three entry points (builder download,
 * "Run now", public share download) so they can never diverge.
 *
 * Returns null when the organization has nothing real to put in the requested
 * sections — the caller answers with an explicit error instead of a PDF full of
 * invented numbers.
 *
 * NOTE: the PDF is produced on demand and streamed back. This project has no
 * file storage, so nothing is persisted (see report: this is why a scheduled
 * report is a different problem from "Run now").
 */
export async function renderReportPdf(
  organizationId: string,
  config: ReportConfig,
): Promise<Buffer<ArrayBuffer> | null> {
  const real = await buildRealPayload(organizationId, config);
  if (!real) return null;

  // Only the sections that survived the real-data check are rendered.
  const effectiveConfig: ReportConfig = { ...config, sections: real.sections };

  const stream = await renderToStream(
    <ReportDocument config={effectiveConfig} payload={real.payload} />,
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as unknown as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  // Buffer.concat's return type is the concrete Buffer<ArrayBuffer> — narrower
  // than the generic Buffer<ArrayBufferLike> the chunks array elements have —
  // which is exactly the type BodyInit (via pdfResponse) needs downstream.
  return Buffer.concat(chunks);
}

/**
 * Standard PDF download response, identical for every entry point.
 *
 * Uses NextResponse (not the global Response) specifically because it accepts a
 * Buffer body directly: this is the exact pattern the pre-existing
 * /api/reports/generate route used (see git history at b0b1475), which
 * type-checked with node_modules present. The global Response's BodyInit type in
 * this project's TS config does not include Buffer or Uint8Array, so passing
 * either to `new Response(...)` fails — NextResponse's typing is the one that
 * already worked here, so this is not a new pattern, just the old, proven one.
 *
 * The parameter is typed as the CONCRETE `Buffer<ArrayBuffer>` — the same type
 * `Buffer.concat` returns — rather than the generic `Buffer<ArrayBufferLike>`
 * (what plain `Buffer` resolves to with the current @types/node). The generic
 * form is too wide for BodyInit; narrowing it here mirrors the original working
 * route, which only ever passed it a `Buffer.concat(chunks)` result directly.
 */
export function pdfResponse(pdf: Buffer<ArrayBuffer>, filename: string): NextResponse {
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-length': pdf.length.toString(),
      'content-disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
