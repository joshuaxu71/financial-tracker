import type { AbstractPowerSyncDatabase, Transaction } from "@powersync/react-native";

import { currentYearMonth, today } from "@/utils/date";
import { makeUuid } from "@/utils/id";

export type CategoryRow = {
   id: string;
   slug: string;
   name: string;
   display_order: number;
   parent_id: string | null;
   color: string | null;
   budget: number | null;
   budget_start: string | null;
};

export type BudgetHistoryRow = {
   category_id: string;
   month: string;
   allocation: number;
};

export async function getAllCategories(db: AbstractPowerSyncDatabase): Promise<CategoryRow[]> {
   return db.getAll<CategoryRow>(
      "SELECT id, slug, name, display_order, parent_id, color, budget, budget_start FROM categories ORDER BY display_order, id",
   );
}

export async function getBudgetHistory(db: AbstractPowerSyncDatabase): Promise<BudgetHistoryRow[]> {
   return db.getAll<BudgetHistoryRow>(
      "SELECT category_id, month, allocation FROM budget_history ORDER BY month",
   );
}

function currentMonth(): string {
   const { year, month } = currentYearMonth();
   return `${year}-${String(month).padStart(2, "0")}`;
}

async function upsertBudgetHistoryTx(
   db: Pick<AbstractPowerSyncDatabase, "getOptional" | "execute"> | Transaction,
   categoryId: string,
   month: string,
   allocation: number,
): Promise<void> {
   const existing = await db.getOptional<{ id: string }>(
      "SELECT id FROM budget_history WHERE category_id = ? AND month = ?",
      [categoryId, month],
   );
   if (existing) {
      await db.execute("UPDATE budget_history SET allocation = ? WHERE id = ?", [
         allocation,
         existing.id,
      ]);
   } else {
      await db.execute(
         "INSERT INTO budget_history (id, category_id, month, allocation) VALUES (?, ?, ?, ?)",
         [makeUuid(), categoryId, month, allocation],
      );
   }
}

export async function getCategoryUsage(
   db: AbstractPowerSyncDatabase,
): Promise<Map<string, number>> {
   const rows = await db.getAll<{ category_id: string; count: number }>(
      "SELECT category_id, COUNT(*) AS count FROM expenses GROUP BY category_id",
   );
   return new Map(rows.map((r) => [r.category_id, r.count]));
}

export async function getCategorySpendingByMonth(
   db: AbstractPowerSyncDatabase,
   year: number,
   month: number,
): Promise<Map<string, number>> {
   const mm = String(month).padStart(2, "0");
   const from = `${year}-${mm}-01`;
   const to = `${year}-${mm}-31`;
   const rows = await db.getAll<{ category_id: string; total: number }>(
      "SELECT category_id, SUM(amount) AS total FROM expenses WHERE date >= ? AND date <= ? GROUP BY category_id",
      [from, to],
   );
   return new Map(rows.map((r) => [r.category_id, r.total]));
}

async function slugify(db: AbstractPowerSyncDatabase, name: string): Promise<string> {
   const base = (
      name
         .trim()
         .toLowerCase()
         .replace(/[^a-z0-9]+/g, "-") || "category"
   ).replace(/^-|-$/g, "");
   let slug = base;
   let i = 2;
   while (
      (await db.getOptional<{ id: string }>("SELECT id FROM categories WHERE slug = ?", [slug])) !=
      null
   ) {
      slug = `${base}-${i++}`;
   }
   return slug;
}

export async function insertCategory(
   db: AbstractPowerSyncDatabase,
   input: {
      name: string;
      parent_id: string | null;
      color: string | null;
      budget: number | null;
   },
): Promise<string> {
   const slug = await slugify(db, input.name);
   const nextOrder = await db.getOptional<{ n: number }>(
      "SELECT COALESCE(MAX(display_order), 0) + 1 AS n FROM categories",
   );
   const budgetStart = input.budget != null ? today() : null;
   const id = makeUuid();
   await db.writeTransaction(async (tx: Transaction) => {
      await tx.execute(
         "INSERT INTO categories (id, slug, name, display_order, parent_id, color, budget, budget_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
         [
            id,
            slug,
            input.name.trim(),
            nextOrder?.n ?? 1,
            input.parent_id,
            input.color,
            input.budget,
            budgetStart,
         ],
      );
      if (input.budget != null) {
         await upsertBudgetHistoryTx(tx, id, currentMonth(), input.budget);
      }
   });
   return id;
}

export async function updateCategory(
   db: AbstractPowerSyncDatabase,
   id: string,
   input: {
      name?: string;
      parent_id?: string | null;
      color?: string | null;
      budget?: number | null;
   },
): Promise<void> {
   const current = await db.getOptional<{ budget: number | null; budget_start: string | null }>(
      "SELECT budget, budget_start FROM categories WHERE id = ?",
      [id],
   );

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

   let nextBudget = current?.budget ?? null;
   let nextBudgetStart = current?.budget_start ?? null;
   if (input.budget !== undefined) {
      if (input.budget != null) {
         if (current?.budget == null) {
            nextBudgetStart = today();
         }
         nextBudget = input.budget;
      } else {
         nextBudget = null;
         nextBudgetStart = null;
      }
      sets.push("budget = ?");
      params.push(nextBudget);
      sets.push("budget_start = ?");
      params.push(nextBudgetStart);
   }

   if (sets.length === 0) return;
   params.push(id);
   await db.execute(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, params);

   if (input.budget !== undefined) {
      if (input.budget != null) {
         await upsertBudgetHistoryTx(db, id, currentMonth(), input.budget);
      } else {
         await db.execute("DELETE FROM budget_history WHERE category_id = ?", [id]);
      }
   }
}

export async function resetBudgetAccumulation(
   db: AbstractPowerSyncDatabase,
   id: string,
): Promise<void> {
   const row = await db.getOptional<{ budget: number | null }>(
      "SELECT budget FROM categories WHERE id = ?",
      [id],
   );
   await db.execute("UPDATE categories SET budget_start = ? WHERE id = ?", [today(), id]);
   await db.execute("DELETE FROM budget_history WHERE category_id = ?", [id]);
   if (row?.budget != null) {
      await upsertBudgetHistoryTx(db, id, currentMonth(), row.budget);
   }
}

export async function deleteCategory(
   db: AbstractPowerSyncDatabase,
   id: string,
   reassignToId: string | null,
): Promise<void> {
   await db.writeTransaction(async (tx: Transaction) => {
      if (reassignToId != null) {
         await tx.execute("UPDATE expenses SET category_id = ? WHERE category_id = ?", [
            reassignToId,
            id,
         ]);
      }
      await tx.execute("DELETE FROM budget_categories WHERE category_id = ?", [id]);
      await tx.execute("DELETE FROM budget_history WHERE category_id = ?", [id]);
      const parentRow = await tx.getOptional<{ parent_id: string | null }>(
         "SELECT parent_id FROM categories WHERE id = ?",
         [id],
      );
      await tx.execute("UPDATE categories SET parent_id = ? WHERE parent_id = ?", [
         parentRow?.parent_id ?? null,
         id,
      ]);
      await tx.execute("DELETE FROM categories WHERE id = ?", [id]);
   });
}
