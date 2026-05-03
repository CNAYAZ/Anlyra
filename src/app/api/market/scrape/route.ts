import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { ScraperError, scrapeCompetitor } from "@/lib/market/scraper";

const Body = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid URL", 400);

  try {
    const result = await scrapeCompetitor(parsed.data.url);
    return ok(result);
  } catch (err) {
    const message =
      err instanceof ScraperError ? err.message : "Failed to scrape URL";
    return fail(message, 502);
  }
}
