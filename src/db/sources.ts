import type { AbstractPowerSyncDatabase, Transaction } from "@powersync/react-native";

import { makeId, makeUuid } from "@/utils/id";

export type SourceRow = {
   id: string;
   name: string;
   currency: string;
   color: string | null;
   opening_balance: number;
   sort_order: number;
   created_at: string;
};

export type IncomeRow = {
   id: string;
   source_id: string;
   amount: number;
   date: string;
   created_at: string;
};

export async function getAllSources(db: AbstractPowerSyncDatabase): Promise<SourceRow[]> {
   return db.getAll<SourceRow>("SELECT * FROM sources ORDER BY sort_order, id");
}

export async function getSourceUsage(db: AbstractPowerSyncDatabase): Promise<Map<string, number>> {
   const rows = await db.getAll<{ source_id: string; count: number }>(
      "SELECT source_id, COUNT(*) AS count FROM expenses GROUP BY source_id",
   );
   return new Map(rows.map((r) => [r.source_id, r.count]));
}

export async function insertSource(
   db: AbstractPowerSyncDatabase,
   input: { name: string; currency: string; color: string | null; opening_balance: number },
): Promise<string> {
   const nextOrder = await db.getOptional<{ n: number }>(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM sources",
   );
   const id = makeUuid();
   await db.execute(
      "INSERT INTO sources (id, name, currency, color, opening_balance, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
         id,
         input.name.trim(),
         input.currency,
         input.color,
         input.opening_balance,
         nextOrder?.n ?? 1,
         new Date().toISOString(),
      ],
   );
   return id;
}

export async function updateSource(
   db: AbstractPowerSyncDatabase,
   id: string,
   input: {
      name?: string;
      currency?: string;
      color?: string | null;
      opening_balance?: number;
   },
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
   if (input.opening_balance !== undefined) {
      sets.push("opening_balance = ?");
      params.push(input.opening_balance);
   }
   if (sets.length === 0) return;
   params.push(id);
   await db.execute(`UPDATE sources SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteSource(
   db: AbstractPowerSyncDatabase,
   id: string,
   reassignToId: string | null,
): Promise<void> {
   await db.writeTransaction(async (tx: Transaction) => {
      if (reassignToId != null) {
         await tx.execute("UPDATE expenses SET source_id = ? WHERE source_id = ?", [
            reassignToId,
            id,
         ]);
      }
      await tx.execute("DELETE FROM income_entries WHERE source_id = ?", [id]);
      await tx.execute("DELETE FROM transfers WHERE from_source_id = ? OR to_source_id = ?", [
         id,
         id,
      ]);
      await tx.execute("DELETE FROM sources WHERE id = ?", [id]);
   });
}

export async function getAllIncome(db: AbstractPowerSyncDatabase): Promise<IncomeRow[]> {
   return db.getAll<IncomeRow>("SELECT * FROM income_entries ORDER BY date DESC, created_at DESC");
}

export async function insertIncome(
   db: AbstractPowerSyncDatabase,
   input: { source_id: string; amount: number; date: string },
): Promise<void> {
   await db.execute(
      "INSERT INTO income_entries (id, source_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
      [makeId(), input.source_id, input.amount, input.date, new Date().toISOString()],
   );
}

export async function deleteIncome(db: AbstractPowerSyncDatabase, id: string): Promise<void> {
   await db.execute("DELETE FROM income_entries WHERE id = ?", [id]);
}
