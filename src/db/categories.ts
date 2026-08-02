import { type SQLiteDatabase } from "expo-sqlite";

export type CategoryRow = {
   id: number;
   slug: string;
   name: string;
   display_order: number;
   parent_id: number | null;
   color: string | null;
};

export async function getAllCategories(db: SQLiteDatabase): Promise<CategoryRow[]> {
   return db.getAllAsync<CategoryRow>(
      "SELECT id, slug, name, display_order, parent_id, color FROM categories ORDER BY display_order, id",
   );
}

export async function getCategoryUsage(db: SQLiteDatabase): Promise<Map<number, number>> {
   const rows = await db.getAllAsync<{ category_id: number; count: number }>(
      "SELECT category_id, COUNT(*) AS count FROM expenses GROUP BY category_id",
   );
   return new Map(rows.map((r) => [r.category_id, r.count]));
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
   input: { name: string; parent_id: number | null; color: string | null },
): Promise<number> {
   const slug = await slugify(db, input.name);
   const nextOrder = await db.getFirstAsync<{ n: number }>(
      "SELECT COALESCE(MAX(display_order), 0) + 1 AS n FROM categories",
   );
   const result = await db.runAsync(
      "INSERT INTO categories (slug, name, display_order, parent_id, color) VALUES (?, ?, ?, ?, ?)",
      slug,
      input.name.trim(),
      nextOrder?.n ?? 1,
      input.parent_id,
      input.color,
   );
   return result.lastInsertRowId;
}

export async function updateCategory(
   db: SQLiteDatabase,
   id: number,
   input: { name?: string; parent_id?: number | null; color?: string | null },
): Promise<void> {
   await db.runAsync(
      "UPDATE categories SET name = COALESCE(?, name), parent_id = ?, color = ? WHERE id = ?",
      input.name?.trim() ?? null,
      input.parent_id === undefined ? null : input.parent_id,
      input.color === undefined ? null : input.color,
      id,
   );
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
