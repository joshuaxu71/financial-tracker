import type { AbstractPowerSyncDatabase } from "@powersync/react-native";

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
 * Stored rate = how many base-currency units one unit of the foreign currency is worth.
 * Only fetches if cached rates are older than 24 hours, unless force = true.
 */
export async function refreshRates(
   db: AbstractPowerSyncDatabase,
   baseCurrency: string,
   force = false,
): Promise<Map<string, number>> {
   try {
      if (!force) {
         const newest = await db.getOptional<{ updated_at: string }>(
            "SELECT updated_at FROM exchange_rate ORDER BY updated_at DESC LIMIT 1",
         );
         if (newest?.updated_at) {
            const ageMs = Date.now() - new Date(newest.updated_at).getTime();
            if (ageMs < 24 * 60 * 60 * 1000) return getRates(db);
         }
      }
      const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
      if (!res.ok) throw new Error(`rate fetch failed: ${res.status}`);
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (!data.rates) throw new Error("malformed rate response");
      const rates: Record<string, number> = {};
      for (const [currency, value] of Object.entries(data.rates)) {
         if (value > 0) rates[currency] = 1 / value;
      }
      await upsertRates(db, rates);
   } catch {
      // offline or stale — keep whatever we had cached
   }
   return getRates(db);
}

export function convertToBase(
   amount: number,
   currency: string,
   rates: ReadonlyMap<string, number>,
   baseCurrency: string,
): number {
   if (currency === baseCurrency) return amount;
   const rate = rates.get(currency);
   if (rate == null || rate <= 0) return amount;
   return amount * rate;
}
