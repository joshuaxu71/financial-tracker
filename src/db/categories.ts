import { type SQLiteDatabase } from "expo-sqlite";

export type CategoryRow = {
   id: number;
   slug: string;
   name: string;
   display_order: number;
   parent_id: number | null;
   color: string | null;
   budget: number | null;
};

export async function getAllCategories(db: SQLiteDatabase): Promise<CategoryRow[]> {
   return db.getAllAsync<CategoryRow>(
      "SELECT id, slug, name, display_order, parent_id, color, budget FROM categories ORDER BY display_order, id",
   );
}

export async function getCategoryUsage(db: SQLiteDatabase): Promise<Map<number, number>> {
   const rows = await db.getAllAsync<{ category_id: number; count: number }>(
      "SELECT category_id, COUNT(*) AS count FROM expenses GROUP BY category_id",
   );
   return new Map(rows.map((r) => [r.category_id, r.count]));
}

export async function getCategorySpendingByMonth(
   db: SQLiteDatabase,
   year: number,
   month: number,
): Promise<Map<number, number>> {
   const mm = String(month).padStart(2, "0");
   const from = `${year}-${mm}-01`;
   const to = `${year}-${mm}-31`;
   const rows = await db.getAllAsync<{ category_id: number; total: number }>(
      "SELECT category_id, SUM(amount) AS total FROM expenses WHERE date >= ? AND date <= ? GROUP BY category_id",
      from,
      to,
   );
   return new Map(rows.map((r) => [r.category_id, r.total]));
}

async function slugify(db: SQLiteDatabase, name: string): Promise<string> {
   const base = (
      name
         .trim()
         .toLowerCase()
         .replace(/[^a-z0-9]+/g, "-") || "category"
   ).replace(/^-|-$/g, "");
   let slug = base;
   let i = 2;
   while (
      (await db.getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE slug = ?", slug)) !=
      null
   ) {
      slug = `${base}-${i++}`;
   }
   return slug;
}

export async function insertCategory(
   db: SQLiteDatabase,
   input: { name: string; parent_id: number | null; color: string | null; budget: number | null },
): Promise<number> {
   const slug = await slugify(db, input.name);
   const nextOrder = await db.getFirstAsync<{ n: number }>(
      "SELECT COALESCE(MAX(display_order), 0) + 1 AS n FROM categories",
   );
   const result = await db.runAsync(
      "INSERT INTO categories (slug, name, display_order, parent_id, color, budget) VALUES (?, ?, ?, ?, ?, ?)",
      slug,
      input.name.trim(),
      nextOrder?.n ?? 1,
      input.parent_id,
      input.color,
      input.budget,
   );
   return result.lastInsertRowId;
}

export async function updateCategory(
   db: SQLiteDatabase,
   id: number,
   input: {
      name?: string;
      parent_id?: number | null;
      color?: string | null;
      budget?: number | null;
   },
): Promise<void> {
   const sets: string[] = [];
   const params: (string | number | null)[] = [];
   if (input.name !== undefined) {
      sets.push("name = ?");
      params.push(input.name.trim());
   }
   if (input.parent_id !== undefined) {
      sets.push("parent_id = ?");
      params.push(input.parent_id);
   }
   if (input.color !== undefined) {
      sets.push("color = ?");
      params.push(input.color);
   }
   if (input.budget !== undefined) {
      sets.push("budget = ?");
      params.push(input.budget);
   }
   if (sets.length === 0) return;
   params.push(id);
   await db.runAsync(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, ...params);
}

export async function deleteCategory(
   db: SQLiteDatabase,
   id: number,
   reassignToId: number | null,
): Promise<void> {
   await db.withTransactionAsync(async () => {
      if (reassignToId != null) {
         await db.runAsync(
            "UPDATE expenses SET category_id = ? WHERE category_id = ?",
            reassignToId,
            id,
         );
      }
      await db.runAsync("DELETE FROM budget_categories WHERE category_id = ?", id);
      const parentRow = await db.getFirstAsync<{ parent_id: number | null }>(
         "SELECT parent_id FROM categories WHERE id = ?",
         id,
      );
      await db.runAsync(
         "UPDATE categories SET parent_id = ? WHERE parent_id = ?",
         parentRow?.parent_id ?? null,
         id,
      );
      await db.runAsync("DELETE FROM categories WHERE id = ?", id);
   });
}
