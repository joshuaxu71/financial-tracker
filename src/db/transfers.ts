import { type SQLiteDatabase } from "expo-sqlite";

import { makeId } from "@/utils/id";

export type TransferRow = {
   id: string;
   from_source_id: number;
   to_source_id: number;
   from_amount: number;
   to_amount: number;
   exchange_rate: number;
   date: string;
   description: string;
   created_at: string;
};

export async function getAllTransfers(db: SQLiteDatabase): Promise<TransferRow[]> {
   return db.getAllAsync<TransferRow>(
      "SELECT * FROM transfers ORDER BY date DESC, created_at DESC",
   );
}

export async function insertTransfer(
   db: SQLiteDatabase,
   input: {
      from_source_id: number;
      to_source_id: number;
      from_amount: number;
      to_amount: number;
      exchange_rate: number;
      date: string;
      description: string;
   },
): Promise<void> {
   await db.runAsync(
      `INSERT INTO transfers
         (id, from_source_id, to_source_id, from_amount, to_amount, exchange_rate, date, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeId(),
      input.from_source_id,
      input.to_source_id,
      input.from_amount,
      input.to_amount,
      input.exchange_rate,
      input.date,
      input.description,
      new Date().toISOString(),
   );
}

export async function deleteTransfer(db: SQLiteDatabase, id: string): Promise<void> {
   await db.runAsync("DELETE FROM transfers WHERE id = ?", id);
}
