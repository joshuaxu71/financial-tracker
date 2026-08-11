import type { AbstractPowerSyncDatabase, Transaction as DbTx } from "@powersync/react-native";

import { makeUuid } from "@/utils/id";

export type SourceRow = {
   id: string;
   name: string;
   currency: string;
   color: string | null;
   sort_order: number;
   created_at: string;
};

export async function getAllSources(db: AbstractPowerSyncDatabase): Promise<SourceRow[]> {
   return db.getAll<SourceRow>("SELECT * FROM source ORDER BY sort_order, id");
}

export async function getSourceUsage(db: AbstractPowerSyncDatabase): Promise<Map<string, number>> {
   const rows = await db.getAll<{ source_id: string; count: number }>(
      "SELECT source_id, COUNT(*) AS count FROM transaction WHERE category_id IS NOT NULL GROUP BY source_id",
   );
   return new Map(rows.map((r) => [r.source_id, r.count]));
}

export async function insertSource(
   db: AbstractPowerSyncDatabase,
   input: { name: string; currency: string; color: string | null },
): Promise<string> {
   const nextOrder = await db.getOptional<{ n: number }>(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM source",
   );
   const id = makeUuid();
   await db.execute(
      "INSERT INTO source (id, name, currency, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
         id,
         input.name.trim(),
         input.currency,
         input.color,
         nextOrder?.n ?? 1,
         new Date().toISOString(),
      ],
   );
   return id;
}

export async function updateSource(
   db: AbstractPowerSyncDatabase,
   id: string,
   input: { name?: string; currency?: string; color?: string | null },
): Promise<void> {
   const sets: string[] = [];
   const params: (string | number | null)[] = [];
   if (input.name !== undefined) {
      sets.push("name = ?");
      params.push(input.name.trim());
   }
   if (input.currency !== undefined) {
      sets.push("currency = ?");
      params.push(input.currency);
   }
   if (input.color !== undefined) {
      sets.push("color = ?");
      params.push(input.color);
   }
   if (sets.length === 0) return;
   params.push(id);
   await db.execute(`UPDATE source SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteSource(
   db: AbstractPowerSyncDatabase,
   id: string,
   reassignToId: string | null,
): Promise<void> {
   await db.writeTransaction(async (tx: DbTx) => {
      if (reassignToId != null) {
         await tx.execute(
            "UPDATE transaction SET source_id = ? WHERE source_id = ? AND category_id IS NOT NULL",
            [reassignToId, id],
         );
      }
      await tx.execute("DELETE FROM transaction WHERE source_id = ? AND category_id IS NULL", [id]);
      await tx.execute("DELETE FROM transfer WHERE from_source_id = ? OR to_source_id = ?", [
         id,
         id,
      ]);
      await tx.execute("DELETE FROM source WHERE id = ?", [id]);
   });
}
