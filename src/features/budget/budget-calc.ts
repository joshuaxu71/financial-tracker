import { type BudgetMovementRow, type CategoryRow } from "@/db/categories";
import { type Expense } from "@/db/expenses";
import { convertToJpy } from "@/db/rates";
import { type SourceRow } from "@/db/sources";
import { fromMonthKey, monthKey } from "@/utils/date";

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

export function budgetStateForMonth(
   categories: readonly CategoryRow[],
   expenses: readonly Expense[],
   movements: readonly BudgetMovementRow[],
   categoryId: string,
   year: number,
   month: number,
): BudgetState {
   const ids = subtreeIds(categories, categoryId);
   const cat = categories.find((c) => c.id === categoryId);
   const mm = String(month).padStart(2, "0");
   const monthStart = `${year}-${mm}-01`;
   const monthEnd = `${year}-${mm}-31`;
   const since = cat?.budget_start ?? monthStart;

   const totalMoved = movements
      .filter((m) => m.category_id === categoryId && m.date >= since && m.date <= monthEnd)
      .reduce((sum, m) => sum + m.amount, 0);

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
      allocation: cat?.budget ?? 0,
      available: Math.max(totalMoved - spentBefore, 0),
      spent,
   };
}

export function budgetStateForWindow(
   categories: readonly CategoryRow[],
   expenses: readonly Expense[],
   movements: readonly BudgetMovementRow[],
   categoryId: string,
   year: number,
   month: number,
   windowMonths: number,
): BudgetState {
   const ids = subtreeIds(categories, categoryId);
   const targetKey = monthKey(year, month);
   const windowStartKey = targetKey - (windowMonths - 1);
   const windowStartYM = fromMonthKey(windowStartKey);
   const windowStart = `${windowStartYM.year}-${String(windowStartYM.month).padStart(2, "0")}-01`;
   const windowEnd = `${year}-${String(month).padStart(2, "0")}-31`;

   const allocated = movements
      .filter((m) => m.category_id === categoryId && m.date >= windowStart && m.date <= windowEnd)
      .reduce((sum, m) => sum + m.amount, 0);

   let spent = 0;
   for (const e of expenses) {
      if (ids.has(e.category_id) && e.date >= windowStart && e.date <= windowEnd) {
         spent += e.amount;
      }
   }

   return { allocation: allocated, available: allocated, spent };
}
