import { fail, ok } from "@/lib/api/response";
import {
  ExchangeRateError,
  getExchangeRates,
} from "@/lib/market/exchange-rates";

export async function GET(req: Request) {
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
