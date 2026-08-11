import type { AbstractPowerSyncDatabase, Transaction as DbTx } from "@powersync/react-native";

import { makeId } from "@/utils/id";

export type Transaction = {
   id: string;
   date: string;
   source_id: string;
   amount: number; // negative = expense, positive = income
   category_id: string | null;
   description: string;
   sort_order: number | null;
   created_at: string;
};

export type NewTransaction = {
   date: string;
   source_id: string;
   amount: number;
   category_id: string | null;
   description: string;
   sort_order?: number;
};

export async function insertTransactions(
   db: AbstractPowerSyncDatabase,
   transactions: NewTransaction[],
): Promise<void> {
   const now = new Date().toISOString();
   await db.writeTransaction(async (tx: DbTx) => {
      for (const [i, t] of transactions.entries()) {
         await tx.execute(
            "INSERT INTO txn (id, date, source_id, amount, category_id, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
               makeId(),
               t.date,
               t.source_id,
               t.amount,
               t.category_id ?? null,
               t.description,
               t.sort_order ?? Date.now() + i,
               now,
            ],
         );
      }
   });
}

export async function getTransactionsByMonth(
   db: AbstractPowerSyncDatabase,
   year: number,
   month: number,
): Promise<Transaction[]> {
   const mm = String(month).padStart(2, "0");
   const from = `${year}-${mm}-01`;
   const to = `${year}-${mm}-31`;
   return db.getAll<Transaction>(
      "SELECT * FROM txn WHERE category_id IS NOT NULL AND date >= ? AND date <= ? ORDER BY date DESC, COALESCE(sort_order, 0) ASC, created_at ASC",
      [from, to],
   );
}

export async function getAllTransactions(db: AbstractPowerSyncDatabase): Promise<Transaction[]> {
   return db.getAll<Transaction>("SELECT * FROM txn");
}

export async function deleteTransaction(db: AbstractPowerSyncDatabase, id: string): Promise<void> {
   await db.execute("DELETE FROM txn WHERE id = ?", [id]);
}

export async function updateTransactionSortOrder(
   db: AbstractPowerSyncDatabase,
   id: string,
   sortOrder: number,
): Promise<void> {
   await db.execute("UPDATE txn SET sort_order = ? WHERE id = ?", [sortOrder, id]);
}
