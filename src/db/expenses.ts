import { type SQLiteDatabase } from 'expo-sqlite';

import { makeId } from '@/utils/id';

export type Expense = {
  id: string;
  date: string;
  category_id: number;
  amount: number;
  description: string;
  created_at: string;
};

export type NewExpense = {
  date: string;
  category_id: number;
  amount: number;
  description: string;
};

export async function insertExpenses(db: SQLiteDatabase, expenses: NewExpense[]): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const expense of expenses) {
      await db.runAsync(
        'INSERT INTO expenses (id, date, category_id, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        makeId(),
        expense.date,
        expense.category_id,
        expense.amount,
        expense.description,
        now,
      );
    }
  });
}

export async function getExpensesByMonth(
  db: SQLiteDatabase,
  year: number,
  month: number,
): Promise<Expense[]> {
  const mm = String(month).padStart(2, '0');
  const from = `${year}-${mm}-01`;
  const to = `${year}-${mm}-31`;
  return db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC',
    from,
    to,
  );
}

export async function deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}
