import { z } from "zod";

export const ScrapeUrlSchema = z
  .string()
  .url()
  .refine((url) => /^https?:/i.test(url), {
    message: "Only http(s) URLs are allowed",
  });

export interface ScrapeResult {
  url: string;
  title: string | null;
  description: string | null;
  fetchedAt: Date;
}

export class ScraperError extends Error {}

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024;

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTitle(html: string): string | null {
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  if (ogMatch?.[1]) return decodeEntities(ogMatch[1].trim());
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) return decodeEntities(titleMatch[1].trim());
  return null;
}

function extractDescription(html: string): string | null {
  const og = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );
  if (og?.[1]) return decodeEntities(og[1].trim());
  const meta = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  if (meta?.[1]) return decodeEntities(meta[1].trim());
  return null;
}

export async function scrapeCompetitor(rawUrl: string): Promise<ScrapeResult> {
  const url = ScrapeUrlSchema.parse(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "ProBot/1.0 (+https://pro.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw new ScraperError(`Upstream responded with ${res.status}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new ScraperError(`Unsupported content-type: ${contentType}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new ScraperError("Empty response body");

    const decoder = new TextDecoder();
    let received = 0;
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        controller.abort();
        break;
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();

    return {
      url,
      title: extractTitle(html),
      description: extractDescription(html),
      fetchedAt: new Date(),
    };
  } catch (err) {
    if (err instanceof ScraperError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ScraperError("Request timed out");
    }
    throw new ScraperError(
      err instanceof Error ? err.message : "Unknown scraper error",
    );
  } finally {
    clearTimeout(timer);
  }
}
