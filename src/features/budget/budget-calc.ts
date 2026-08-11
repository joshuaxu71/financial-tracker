import { type BudgetHistoryRow, type CategoryRow } from "@/db/categories";
import { type Expense } from "@/db/expenses";
import { convertToJpy } from "@/db/rates";
import { type SourceRow } from "@/db/sources";
import { fromMonthKey, monthKey } from "@/utils/date";

/**
 * Returns expenses with their amounts converted to JPY using each one's
 * source currency and the given rates. Foreign-currency sources fall back
 * to a 1:1 rate when no rate is cached.
 */
export function convertExpensesToJpy(
   expenses: readonly Expense[],
   sources: readonly SourceRow[],
   rates: ReadonlyMap<string, number>,
): Expense[] {
   const currency = new Map(sources.map((s) => [s.id, s.currency]));
   return expenses.map((e) => ({
      ...e,
      amount: convertToJpy(e.amount, currency.get(e.source_id) ?? "JPY", rates),
   }));
}

function monthKeyOf(date: string | null, fallback: number): number {
   if (!date) return fallback;
   const d = new Date(date + "T00:00:00");
   if (isNaN(d.getTime())) return fallback;
   return monthKey(d.getFullYear(), d.getMonth() + 1);
}

function historyMonthKey(month: string): number {
   const parts = month.split("-");
   return monthKey(Number(parts[0]), Number(parts[1]));
}

function subtreeIds(categories: readonly CategoryRow[], rootId: string): Set<string> {
   const ids = new Set<string>();
   const stack = [rootId];
   while (stack.length > 0) {
      const id = stack.pop()!;
      if (ids.has(id)) continue;
      ids.add(id);
      for (const c of categories) {
         if (c.parent_id === id) stack.push(c.id);
      }
   }
   return ids;
}

export type BudgetState = {
   allocation: number;
   available: number;
   spent: number;
};

type Allocator = {
   cat: CategoryRow | undefined;
   startKey: number;
   allocationAt: (key: number) => number;
};

function makeAllocator(
   categories: readonly CategoryRow[],
   history: readonly BudgetHistoryRow[],
   categoryId: string,
   targetKey: number,
): Allocator {
   const cat = categories.find((c) => c.id === categoryId);

   const rows = history
      .filter((h) => h.category_id === categoryId)
      .map((h) => ({ key: historyMonthKey(h.month), allocation: h.allocation }))
      .sort((a, b) => a.key - b.key);

   const budgetStart = cat?.budget_start ?? null;
   const startKey =
      monthKeyOf(budgetStart, targetKey) < (rows[0]?.key ?? Number.MAX_SAFE_INTEGER)
         ? monthKeyOf(budgetStart, targetKey)
         : (rows[0]?.key ?? targetKey);

   function allocationAt(key: number): number {
      let result = cat?.budget ?? 0;
      for (const row of rows) {
         if (row.key <= key) result = row.allocation;
      }
      return result;
   }

   return { cat, startKey, allocationAt };
}

/**
 * Monthly budget for a category as of a given month.
 *
 * available = sum of per-month allocations from start through the target
 * month, minus spending before this month (the carried-over bank). This keeps
 * earlier months at their historical allocation even after the amount changes.
 */
export function budgetStateForMonth(
   categories: readonly CategoryRow[],
   expenses: readonly Expense[],
   history: readonly BudgetHistoryRow[],
   categoryId: string,
   year: number,
   month: number,
): BudgetState {
   const ids = subtreeIds(categories, categoryId);
   const targetKey = monthKey(year, month);
   const { cat, startKey, allocationAt } = makeAllocator(
      categories,
      history,
      categoryId,
      targetKey,
   );

   let totalAllocated = 0;
   for (let key = startKey; key <= targetKey; key++) {
      totalAllocated += allocationAt(key);
   }

   const mm = String(month).padStart(2, "0");
   const monthStart = `${year}-${mm}-01`;
   const monthEnd = `${year}-${mm}-31`;
   const since = cat?.budget_start ?? monthStart;

   let spent = 0;
   let spentBefore = 0;
   for (const e of expenses) {
      if (!ids.has(e.category_id)) continue;
      if (e.date >= monthStart && e.date <= monthEnd) {
         spent += e.amount;
      } else if (e.date < monthStart && e.date >= since) {
         spentBefore += e.amount;
      }
   }

   return {
      allocation: allocationAt(targetKey),
      available: Math.max(totalAllocated - spentBefore, 0),
      spent,
   };
}

/**
 * Budget for a rolling window ending at a given month.
 *
 * Covers `windowMonths` consecutive months (the target month and the ones
 * before it). allocated = sum of per-month allocations across the window
 * (clamped to the budget start), spent = sum of expenses in the window's
 * date range. available excludes the carried-over bank so a multi-month
 * window is self-contained.
 */
export function budgetStateForWindow(
   categories: readonly CategoryRow[],
   expenses: readonly Expense[],
   history: readonly BudgetHistoryRow[],
   categoryId: string,
   year: number,
   month: number,
   windowMonths: number,
): BudgetState {
   const ids = subtreeIds(categories, categoryId);
   const targetKey = monthKey(year, month);
   const windowStartKey = targetKey - (windowMonths - 1);
   const { startKey, allocationAt } = makeAllocator(categories, history, categoryId, targetKey);

   let allocated = 0;
   for (let key = Math.max(startKey, windowStartKey); key <= targetKey; key++) {
      allocated += allocationAt(key);
   }

   const windowStartYM = fromMonthKey(windowStartKey);
   const windowStart = `${windowStartYM.year}-${String(windowStartYM.month).padStart(2, "0")}-01`;
   const windowEnd = `${year}-${String(month).padStart(2, "0")}-31`;

   let spent = 0;
   for (const e of expenses) {
      if (ids.has(e.category_id) && e.date >= windowStart && e.date <= windowEnd) {
         spent += e.amount;
      }
   }

   return { allocation: allocated, available: allocated, spent };
}
