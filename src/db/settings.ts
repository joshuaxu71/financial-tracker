import type { AbstractPowerSyncDatabase } from "@powersync/react-native";

import { makeUuid } from "@/utils/id";

export type SettingsRow = { id: string; base_currency: string };

export async function getSettings(
   db: AbstractPowerSyncDatabase,
): Promise<{ base_currency: string | null }> {
   const row = await db.getOptional<SettingsRow>("SELECT id, base_currency FROM settings LIMIT 1");
   return { base_currency: row?.base_currency ?? null };
}

export async function upsertSettings(
   db: AbstractPowerSyncDatabase,
   input: { base_currency: string },
): Promise<void> {
   const existing = await db.getOptional<{ id: string }>("SELECT id FROM settings LIMIT 1");
   if (existing) {
      await db.execute("UPDATE settings SET base_currency = ? WHERE id = ?", [
         input.base_currency,
         existing.id,
      ]);
   } else {
      await db.execute("INSERT INTO settings (id, base_currency) VALUES (?, ?)", [
         makeUuid(),
         input.base_currency,
      ]);
   }
}
