import { type SQLiteDatabase } from 'expo-sqlite';

import { makeId } from '@/utils/id';

export type Budget = {
  id: string;
  name: string;
  amount: number;
  period: 'monthly';
  created_at: string;
  category_ids: number[]; // empty = applies to all categories
};

export type NewBudget = Omit<Budget, 'id' | 'created_at'>;

type BudgetRow = {
  id: string;
  name: string;
  amount: number;
  period: string;
  created_at: string;
  category_ids_csv: string | null;
};

export async function getBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  const rows = await db.getAllAsync<BudgetRow>(`
    SELECT b.*, GROUP_CONCAT(bc.category_id) AS category_ids_csv
    FROM budgets b
    LEFT JOIN budget_categories bc ON bc.budget_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at ASC
  `);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
    period: row.period as 'monthly',
    created_at: row.created_at,
    category_ids: row.category_ids_csv ? row.category_ids_csv.split(',').map(Number) : [],
  }));
}

export async function insertBudget(db: SQLiteDatabase, budget: NewBudget): Promise<Budget> {
  const id = makeId();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO budgets (id, name, amount, period, created_at) VALUES (?, ?, ?, ?, ?)',
      id,
      budget.name,
      budget.amount,
      budget.period,
      now,
    );
    for (const categoryId of budget.category_ids) {
      await db.runAsync(
        'INSERT INTO budget_categories (budget_id, category_id) VALUES (?, ?)',
        id,
        categoryId,
      );
    }
  });
  return { ...budget, id, created_at: now };
}

export async function updateBudget(
  db: SQLiteDatabase,
  id: string,
  budget: NewBudget,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE budgets SET name = ?, amount = ?, period = ? WHERE id = ?',
      budget.name,
      budget.amount,
      budget.period,
      id,
    );
    await db.runAsync('DELETE FROM budget_categories WHERE budget_id = ?', id);
    for (const categoryId of budget.category_ids) {
      await db.runAsync(
        'INSERT INTO budget_categories (budget_id, category_id) VALUES (?, ?)',
        id,
        categoryId,
      );
    }
  });
}

export async function deleteBudget(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
}
