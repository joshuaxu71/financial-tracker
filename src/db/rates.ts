import { type SQLiteDatabase } from "expo-sqlite";

import { BASE_CURRENCY } from "@/constants/currencies";

export type RateRow = { currency: string; rate: number; updated_at: string };

export async function getRates(db: SQLiteDatabase): Promise<Map<string, number>> {
   const rows = await db.getAllAsync<RateRow>(
      "SELECT currency, rate, updated_at FROM exchange_rates",
   );
   return new Map(rows.map((r) => [r.currency, r.rate]));
}

async function upsertRates(db: SQLiteDatabase, rates: Record<string, number>): Promise<void> {
   const now = new Date().toISOString();
   for (const [currency, rate] of Object.entries(rates)) {
      if (!Number.isFinite(rate) || rate <= 0) continue;
      await db.runAsync(
         "INSERT INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, ?) ON CONFLICT(currency) DO UPDATE SET rate = excluded.rate, updated_at = excluded.updated_at",
         currency,
         rate,
         now,
      );
   }
}

/**
 * Fetches fresh FX rates against the base currency and stores them.
 * Falls back to cached rates (or an empty map) when offline.
 * Stored rate = how many JPY one unit of the foreign currency is worth.
 */
export async function refreshRates(db: SQLiteDatabase): Promise<Map<string, number>> {
   try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${BASE_CURRENCY}`);
      if (!res.ok) throw new Error(`rate fetch failed: ${res.status}`);
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (!data.rates) throw new Error("malformed rate response");
      const rates: Record<string, number> = {};
      for (const [currency, value] of Object.entries(data.rates)) {
         if (value > 0) rates[currency] = 1 / value;
      }
      await upsertRates(db, rates);
   } catch {
      // offline — keep whatever we had cached
   }
   return getRates(db);
}

export function convertToJpy(
   amount: number,
   currency: string,
   rates: ReadonlyMap<string, number>,
): number {
   if (currency === BASE_CURRENCY) return amount;
   const rate = rates.get(currency);
   if (rate == null || rate <= 0) return amount;
   return amount * rate;
}
