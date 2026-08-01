import { type SQLiteDatabase } from 'expo-sqlite';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      amount REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      PRIMARY KEY (budget_id, category_id)
    );
  `);

  const seeds = [
    [1, 'house', 'House', 1],
    [2, 'food', 'Food', 2],
    [3, 'needs', 'Needs', 3],
    [4, 'transportation', 'Transportation', 4],
    [5, 'misc', 'Miscellaneous', 5],
  ] as const;

  for (const [id, slug, name, order] of seeds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, slug, name, display_order) VALUES (?, ?, ?, ?)',
      id,
      slug,
      name,
      order,
    );
  }
}
