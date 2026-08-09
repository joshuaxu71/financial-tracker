import type { AbstractPowerSyncDatabase } from "@powersync/react-native";

import { BASE_CURRENCY } from "@/constants/currencies";
import { makeUuid } from "@/utils/id";

export type RateRow = { id: string; currency: string; rate: number; updated_at: string };

export async function getRates(db: AbstractPowerSyncDatabase): Promise<Map<string, number>> {
   const rows = await db.getAll<RateRow>(
      "SELECT id, currency, rate, updated_at FROM exchange_rate",
   );
   return new Map(rows.map((r) => [r.currency, r.rate]));
}

async function upsertRates(
   db: AbstractPowerSyncDatabase,
   rates: Record<string, number>,
): Promise<void> {
   const now = new Date().toISOString();
   for (const [currency, rate] of Object.entries(rates)) {
      if (!Number.isFinite(rate) || rate <= 0) continue;
      const existing = await db.getOptional<{ id: string }>(
         "SELECT id FROM exchange_rate WHERE currency = ?",
         [currency],
      );
      await db.execute(
         "INSERT INTO exchange_rate (id, currency, rate, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET rate = excluded.rate, updated_at = excluded.updated_at",
         [existing?.id ?? makeUuid(), currency, rate, now],
      );
   }
}

/**
 * Fetches fresh FX rates against the base currency and stores them.
 * Falls back to cached rates (or an empty map) when offline.
 * Stored rate = how many JPY one unit of the foreign currency is worth.
 */
export async function refreshRates(db: AbstractPowerSyncDatabase): Promise<Map<string, number>> {
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
