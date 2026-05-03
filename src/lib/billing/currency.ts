export type Currency = "EUR" | "USD" | "GBP";

const RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
};

export function detectCurrencyFromLocale(locale: string | undefined): Currency {
  if (!locale) return "EUR";
  const lc = locale.toLowerCase();
  if (lc.startsWith("en-us") || lc.startsWith("es-us")) return "USD";
  if (lc.startsWith("en-gb") || lc.startsWith("cy-gb")) return "GBP";
  return "EUR";
}

export function convertFromEuroCents(cents: number, target: Currency): number {
  return Math.round(cents * RATES[target]);
}
