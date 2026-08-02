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

   if (v < 2) {
      await db.withTransactionAsync(async () => {
         await db.execAsync("ALTER TABLE categories ADD COLUMN budget REAL");
         await db.execAsync("PRAGMA user_version = 2");
      });
   }

   if (v < 3) {
      await db.withTransactionAsync(async () => {
         await db.execAsync("ALTER TABLE categories ADD COLUMN budget_start TEXT");
         await db.execAsync("PRAGMA user_version = 3");
      });
   }

   if (v < 4) {
      await db.withTransactionAsync(async () => {
         await db.execAsync(`
            CREATE TABLE IF NOT EXISTS budget_history (
               category_id INTEGER NOT NULL,
               month TEXT NOT NULL,
               allocation REAL NOT NULL,
               PRIMARY KEY (category_id, month)
            )
         `);
         await db.execAsync(`
            INSERT OR IGNORE INTO budget_history (category_id, month, allocation)
            SELECT id, substr(COALESCE(budget_start, date('now')), 1, 7), budget
            FROM categories WHERE budget IS NOT NULL
         `);
         await db.execAsync("PRAGMA user_version = 4");
      });
   }

   if (v < 5) {
      await db.withTransactionAsync(async () => {
         await db.execAsync(`
            CREATE TABLE IF NOT EXISTS sources (
               id INTEGER PRIMARY KEY,
               name TEXT NOT NULL,
               currency TEXT NOT NULL,
               color TEXT,
               opening_balance REAL NOT NULL DEFAULT 0,
               sort_order INTEGER NOT NULL,
               created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS income_entries (
               id TEXT PRIMARY KEY,
               source_id INTEGER NOT NULL REFERENCES sources(id),
               amount REAL NOT NULL,
               date TEXT NOT NULL,
               created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS exchange_rates (
               currency TEXT PRIMARY KEY,
               rate REAL NOT NULL,
               updated_at TEXT NOT NULL
            );

            ALTER TABLE expenses ADD COLUMN source_id INTEGER REFERENCES sources(id);
         `);
         await db.runAsync(
            "INSERT OR IGNORE INTO sources (id, name, currency, color, opening_balance, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            1,
            "Cash",
            "JPY",
            "#8B9DC3",
            0,
            1,
            new Date().toISOString(),
         );
         await db.execAsync("UPDATE expenses SET source_id = 1 WHERE source_id IS NULL");
         await db.execAsync("PRAGMA user_version = 5");
      });
   }
}
