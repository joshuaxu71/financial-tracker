import type { AbstractPowerSyncDatabase } from "@powersync/react-native";

import { makeId } from "@/utils/id";

export type TransferRow = {
   id: string;
   from_source_id: string;
   to_source_id: string;
   from_amount: number;
   to_amount: number;
   exchange_rate: number;
   date: string;
   description: string;
   created_at: string;
};

export type TransferInput = {
   from_source_id: string;
   to_source_id: string;
   from_amount: number;
   to_amount: number;
   exchange_rate: number;
   date: string;
   description: string;
};

export async function getAllTransfers(db: AbstractPowerSyncDatabase): Promise<TransferRow[]> {
   return db.getAll<TransferRow>("SELECT * FROM transfers ORDER BY date DESC, created_at DESC");
}

export async function insertTransfer(
   db: AbstractPowerSyncDatabase,
   input: TransferInput,
): Promise<void> {
   await db.execute(
      `INSERT INTO transfers
         (id, from_source_id, to_source_id, from_amount, to_amount, exchange_rate, date, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
         makeId(),
         input.from_source_id,
         input.to_source_id,
         input.from_amount,
         input.to_amount,
         input.exchange_rate,
         input.date,
         input.description,
         new Date().toISOString(),
      ],
   );
}

export async function updateTransfer(
   db: AbstractPowerSyncDatabase,
   id: string,
   input: TransferInput,
): Promise<void> {
   await db.execute(
      `UPDATE transfers SET
         from_source_id = ?, to_source_id = ?, from_amount = ?, to_amount = ?, exchange_rate = ?, date = ?, description = ?
       WHERE id = ?`,
      [
         input.from_source_id,
         input.to_source_id,
         input.from_amount,
         input.to_amount,
         input.exchange_rate,
         input.date,
         input.description,
         id,
      ],
   );
}

export async function deleteTransfer(db: AbstractPowerSyncDatabase, id: string): Promise<void> {
   await db.execute("DELETE FROM transfers WHERE id = ?", [id]);
}
