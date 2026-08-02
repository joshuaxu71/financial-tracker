import { type BudgetHistoryRow, type CategoryRow } from "@/db/categories";
import { type Expense } from "@/db/expenses";

function monthKey(year: number, month: number): number {
   return year * 12 + (month - 1);
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

function subtreeIds(categories: readonly CategoryRow[], rootId: number): Set<number> {
   const ids = new Set<number>();
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
   categoryId: number,
   year: number,
   month: number,
): BudgetState {
   const cat = categories.find((c) => c.id === categoryId);
   const ids = subtreeIds(categories, categoryId);
   const targetKey = monthKey(year, month);

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
