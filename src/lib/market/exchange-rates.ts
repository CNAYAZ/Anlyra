import { z } from "zod";

const ExchangeApiSchema = z.object({
  result: z.string(),
  base_code: z.string(),
  conversion_rates: z.record(z.string(), z.number()),
  time_last_update_unix: z.number().optional(),
});

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: Date;
}

export class ExchangeRateError extends Error {}

const cache = new Map<string, { value: ExchangeRates; expiresAt: number }>();
const TTL_MS = 1000 * 60 * 60;

export async function getExchangeRates(
  base: string = "EUR",
): Promise<ExchangeRates> {
  const key = base.toUpperCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  const url = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${key}`
    : `https://open.er-api.com/v6/latest/${key}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new ExchangeRateError(
      `Exchange rate API responded with ${res.status}`,
    );
  }

  const json = await res.json();
  const normalized = apiKey
    ? json
    : {
        result: json.result,
        base_code: json.base_code,
        conversion_rates: json.rates,
        time_last_update_unix: json.time_last_update_unix,
      };

  const parsed = ExchangeApiSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new ExchangeRateError("Invalid exchange rate response shape");
  }
  if (parsed.data.result !== "success") {
    throw new ExchangeRateError(`API result: ${parsed.data.result}`);
  }

  const value: ExchangeRates = {
    base: parsed.data.base_code,
    rates: parsed.data.conversion_rates,
    fetchedAt: new Date(),
  };
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

export function convert(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates,
): number {
  if (rates.base !== from.toUpperCase()) {
    throw new ExchangeRateError(
      `Rates base ${rates.base} does not match source ${from}`,
    );
  }
  const rate = rates.rates[to.toUpperCase()];
  if (rate == null) throw new ExchangeRateError(`Missing rate for ${to}`);
  return amount * rate;
}
