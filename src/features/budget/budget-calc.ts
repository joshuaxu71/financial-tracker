import { type BudgetMovementRow, type CategoryRow } from "@/db/categories";
import { convertToBase } from "@/db/rates";
import { type SourceRow } from "@/db/sources";
import { type Transaction } from "@/db/transactions";
import { fromMonthKey, monthKey } from "@/utils/date";

export function convertTransactionsToBase(
   transactions: readonly Transaction[],
   sources: readonly SourceRow[],
   rates: ReadonlyMap<string, number>,
   baseCurrency: string,
): Transaction[] {
   const currency = new Map(sources.map((s) => [s.id, s.currency]));
   return transactions.map((t) => ({
      ...t,
      amount: convertToBase(
         t.amount,
         currency.get(t.source_id) ?? baseCurrency,
         rates,
         baseCurrency,
      ),
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
   transactions: readonly Transaction[],
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
   for (const t of transactions) {
      if (t.category_id == null || !ids.has(t.category_id)) continue;
      if (t.date >= monthStart && t.date <= monthEnd) {
         spent += -t.amount;
      } else if (t.date < monthStart && t.date >= since) {
         spentBefore += -t.amount;
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
   transactions: readonly Transaction[],
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
   for (const t of transactions) {
      if (t.category_id == null || !ids.has(t.category_id)) continue;
      if (t.date >= windowStart && t.date <= windowEnd) {
         spent += -t.amount;
      }
   }

   return { allocation: allocated, available: allocated, spent };
}
