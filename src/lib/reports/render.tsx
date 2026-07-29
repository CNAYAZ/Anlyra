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
): Promise<Buffer | null> {
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
  return Buffer.concat(chunks);
}

/** Standard PDF download response, identical for every entry point. */
export function pdfResponse(pdf: Buffer, filename: string): Response {
  // Response's BodyInit does not list Node's Buffer type, only BufferSource
  // (ArrayBuffer/typed arrays) among binary options. A Uint8Array view over the
  // SAME underlying bytes — respecting byteOffset/byteLength, since a Buffer can
  // be a slice of a larger pool — satisfies the type with zero copying.
  const bytes = new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-length': pdf.length.toString(),
      'content-disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
