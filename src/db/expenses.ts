import { type SQLiteDatabase } from "expo-sqlite";

import { makeId } from "@/utils/id";

export type Expense = {
   id: string;
   date: string;
   category_id: number;
   amount: number;
   description: string;
   created_at: string;
   sort_order: number;
};

export type NewExpense = {
   date: string;
   category_id: number;
   amount: number;
   description: string;
   sort_order?: number;
};

export async function insertExpenses(db: SQLiteDatabase, expenses: NewExpense[]): Promise<void> {
   const now = new Date().toISOString();
   await db.withTransactionAsync(async () => {
      for (const [i, expense] of expenses.entries()) {
         await db.runAsync(
            "INSERT INTO expenses (id, date, category_id, amount, description, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
            makeId(),
            expense.date,
            expense.category_id,
            expense.amount,
            expense.description,
            now,
            expense.sort_order ?? Date.now() + i,
         );
      }
   });
}

export async function getExpensesByMonth(
   db: SQLiteDatabase,
   year: number,
   month: number,
): Promise<Expense[]> {
   const mm = String(month).padStart(2, "0");
   const from = `${year}-${mm}-01`;
   const to = `${year}-${mm}-31`;
   return db.getAllAsync<Expense>(
      "SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC, COALESCE(sort_order, 0) ASC, created_at ASC",
      from,
      to,
   );
}

export async function deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
   await db.runAsync("DELETE FROM expenses WHERE id = ?", id);
}

export async function updateExpenseSortOrder(
   db: SQLiteDatabase,
   id: string,
   sortOrder: number,
): Promise<void> {
   await db.runAsync("UPDATE expenses SET sort_order = ? WHERE id = ?", sortOrder, id);
}
