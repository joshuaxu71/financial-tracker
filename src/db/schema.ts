import { type SQLiteDatabase } from "expo-sqlite";

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

   const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
   const v = versionRow?.user_version ?? 0;

   if (v < 1) {
      await db.withTransactionAsync(async () => {
         await db.execAsync(
            "ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id)",
         );
         await db.execAsync("ALTER TABLE categories ADD COLUMN color TEXT");
         await db.execAsync("ALTER TABLE expenses ADD COLUMN sort_order REAL");

         // Group categories
         for (const [id, slug, name, order, color] of [
            [6, "living", "Living", 1, "#FF6B6B"],
            [7, "personal", "Personal", 2, "#4ECDC4"],
            [8, "holiday", "Holiday", 3, "#45B7D1"],
         ] as const) {
            await db.runAsync(
               "INSERT OR IGNORE INTO categories (id, slug, name, display_order, color) VALUES (?, ?, ?, ?, ?)",
               id,
               slug,
               name,
               order,
               color,
            );
         }

         // Leaf categories (for fresh installs — existing installs use the UPDATE below)
         for (const [id, slug, name, order, parentId] of [
            [1, "house", "House", 1, 6],
            [2, "food", "Food", 2, 6],
            [3, "needs", "Needs", 3, 6],
            [4, "transportation", "Transportation", 4, 7],
            [5, "misc", "Miscellaneous", 5, 7],
         ] as const) {
            await db.runAsync(
               "INSERT OR IGNORE INTO categories (id, slug, name, display_order, parent_id) VALUES (?, ?, ?, ?, ?)",
               id,
               slug,
               name,
               order,
               parentId,
            );
         }

         // Patch leaves that existed before this migration (no parent_id yet)
         await db.runAsync(
            "UPDATE categories SET parent_id = 6 WHERE id IN (1, 2, 3) AND parent_id IS NULL",
         );
         await db.runAsync(
            "UPDATE categories SET parent_id = 7 WHERE id IN (4, 5) AND parent_id IS NULL",
         );

         // Seed sort_order for existing expenses using rowid as a stable ordinal
         await db.execAsync("UPDATE expenses SET sort_order = rowid WHERE sort_order IS NULL");

         await db.execAsync("PRAGMA user_version = 1");
      });
   }
}
