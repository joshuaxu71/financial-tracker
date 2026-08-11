import type { AbstractPowerSyncDatabase } from "@powersync/react-native";

import { makeUuid } from "@/utils/id";

export type UserPreferenceRow = { id: string; base_currency: string };

export async function getUserPreference(
   db: AbstractPowerSyncDatabase,
): Promise<{ base_currency: string | null }> {
   const row = await db.getOptional<UserPreferenceRow>(
      "SELECT id, base_currency FROM user_preference LIMIT 1",
   );
   return { base_currency: row?.base_currency ?? null };
}

export async function upsertUserPreference(
   db: AbstractPowerSyncDatabase,
   input: { base_currency: string },
): Promise<void> {
   const existing = await db.getOptional<{ id: string }>("SELECT id FROM user_preference LIMIT 1");
   if (existing) {
      await db.execute("UPDATE user_preference SET base_currency = ? WHERE id = ?", [
         input.base_currency,
         existing.id,
      ]);
   } else {
      await db.execute("INSERT INTO user_preference (id, base_currency) VALUES (?, ?)", [
         makeUuid(),
         input.base_currency,
      ]);
   }
}
