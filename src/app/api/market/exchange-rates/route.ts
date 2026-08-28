import { fail, ok } from "@/lib/api/response";
import {
  ExchangeRateError,
  getExchangeRates,
} from "@/lib/market/exchange-rates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/api/rate-limit-response";

export async function GET(req: Request) {
  // Public, unauthenticated, and it proxies a third-party API. There IS a cache,
  // but it lives in module memory, so on serverless it is per-instance and a
  // burst still fans out to the upstream provider.
  // FAIL-OPEN: nothing here costs us money or touches an account, so a limiter
  // outage must not break currency display. The limit is only a burst guard.
  const rl = await checkRateLimit("exchange-rates-ip", getClientIp(req));
  if (!rl.success) return rateLimitResponse(rl);

  const url = new URL(req.url);
  const base = url.searchParams.get("base") ?? "EUR";
  try {
    const rates = await getExchangeRates(base);
    return ok(rates);
  } catch (err) {
    const message =
      err instanceof ExchangeRateError
        ? err.message
        : "Failed to fetch exchange rates";
    return fail(message, 502);
  }
}
