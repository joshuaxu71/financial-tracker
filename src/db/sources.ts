import { type SQLiteDatabase } from "expo-sqlite";

import { makeId } from "@/utils/id";

export type SourceRow = {
   id: number;
   name: string;
   currency: string;
   color: string | null;
   opening_balance: number;
   sort_order: number;
   created_at: string;
};

export type IncomeRow = {
   id: string;
   source_id: number;
   amount: number;
   date: string;
   created_at: string;
};

export async function getAllSources(db: SQLiteDatabase): Promise<SourceRow[]> {
   return db.getAllAsync<SourceRow>("SELECT * FROM sources ORDER BY sort_order, id");
}

export async function getSourceUsage(db: SQLiteDatabase): Promise<Map<number, number>> {
   const rows = await db.getAllAsync<{ source_id: number; count: number }>(
      "SELECT source_id, COUNT(*) AS count FROM expenses GROUP BY source_id",
   );
   return new Map(rows.map((r) => [r.source_id, r.count]));
}

export async function insertSource(
   db: SQLiteDatabase,
   input: { name: string; currency: string; color: string | null; opening_balance: number },
): Promise<number> {
   const nextOrder = await db.getFirstAsync<{ n: number }>(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM sources",
   );
   const result = await db.runAsync(
      "INSERT INTO sources (name, currency, color, opening_balance, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      input.name.trim(),
      input.currency,
      input.color,
      input.opening_balance,
      nextOrder?.n ?? 1,
      new Date().toISOString(),
   );
   return result.lastInsertRowId;
}

export async function updateSource(
   db: SQLiteDatabase,
   id: number,
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
   await db.runAsync(`UPDATE sources SET ${sets.join(", ")} WHERE id = ?`, ...params);
}

export async function deleteSource(
   db: SQLiteDatabase,
   id: number,
   reassignToId: number | null,
): Promise<void> {
   await db.withTransactionAsync(async () => {
      if (reassignToId != null) {
         await db.runAsync(
            "UPDATE expenses SET source_id = ? WHERE source_id = ?",
            reassignToId,
            id,
         );
      }
      await db.runAsync("DELETE FROM income_entries WHERE source_id = ?", id);
      await db.runAsync(
         "DELETE FROM transfers WHERE from_source_id = ? OR to_source_id = ?",
         id,
         id,
      );
      await db.runAsync("DELETE FROM sources WHERE id = ?", id);
   });
}

export async function getAllIncome(db: SQLiteDatabase): Promise<IncomeRow[]> {
   return db.getAllAsync<IncomeRow>(
      "SELECT * FROM income_entries ORDER BY date DESC, created_at DESC",
   );
}

export async function insertIncome(
   db: SQLiteDatabase,
   input: { source_id: number; amount: number; date: string },
): Promise<void> {
   await db.runAsync(
      "INSERT INTO income_entries (id, source_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
      makeId(),
      input.source_id,
      input.amount,
      input.date,
      new Date().toISOString(),
   );
}

export async function deleteIncome(db: SQLiteDatabase, id: string): Promise<void> {
   await db.runAsync("DELETE FROM income_entries WHERE id = ?", id);
}
