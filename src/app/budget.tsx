import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { type DimensionValue, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { resolveCategoryColor } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { useTabNavigation } from "@/context/tab-navigation";
import {
   type BudgetHistoryRow,
   type CategoryRow,
   getAllCategories,
   getBudgetHistory,
} from "@/db/categories";
import { type Expense, getAllExpenses } from "@/db/expenses";
import { getRates } from "@/db/rates";
import { getAllSources } from "@/db/sources";
import { budgetStateForMonth, convertExpensesToJpy } from "@/features/budget/budget-calc";
import { useTheme } from "@/hooks/use-theme";
import { formatAmount } from "@/utils/currency";
import { currentYearMonth, formatMonthYear } from "@/utils/date";

type BudgetNode = {
   category: CategoryRow;
   depth: number;
   children: BudgetNode[];
};

function buildTree(categories: CategoryRow[]): BudgetNode[] {
   const byParent = new Map<number | null, CategoryRow[]>();
   for (const c of categories) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
   }
   function build(cats: CategoryRow[], depth: number): BudgetNode[] {
      return cats.map((c) => ({
         category: c,
         depth,
         children: build(byParent.get(c.id) ?? [], depth + 1),
      }));
   }
   return build(byParent.get(null) ?? [], 0);
}

export default function BudgetScreen() {
   const db = useSQLiteContext();
   const theme = useTheme();
   const { activeIndex } = useTabNavigation();
   const { year, month } = currentYearMonth();

   const [categories, setCategories] = useState<CategoryRow[]>([]);
   const [expenses, setExpenses] = useState<Expense[]>([]);
   const [history, setHistory] = useState<BudgetHistoryRow[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   const load = useCallback(async () => {
      const [c, e, h, s, r] = await Promise.all([
         getAllCategories(db),
         getAllExpenses(db),
         getBudgetHistory(db),
         getAllSources(db),
         getRates(db),
      ]);
      setCategories(c);
      setExpenses(convertExpensesToJpy(e, s, r));
      setHistory(h);
      setIsLoading(false);
   }, [db]);

   useEffect(() => {
      load();
   }, [load, activeIndex]);

   function renderNode(node: BudgetNode) {
      if (node.category.budget == null) return null;
      const state = budgetStateForMonth(
         categories,
         expenses,
         history,
         node.category.id,
         year,
         month,
      );
      const spent = state.spent;
      const available = state.available;
      const pct = available > 0 ? (spent / available) * 100 : 0;
      const isOver = available > 0 && spent > available;
      const dotColor = resolveCategoryColor(categories, node.category.id);

      return (
         <View key={node.category.id}>
            <ThemedView
               type="backgroundElement"
               style={[styles.budgetCard, { marginLeft: node.depth * Spacing.three }]}
            >
               <View style={styles.budgetCardHeader}>
                  <View style={styles.budgetTitle}>
                     <View style={[styles.dot, { backgroundColor: dotColor }]} />
                     <ThemedText type="smallBold">{node.category.name}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                     {formatAmount(spent)} / {formatAmount(available)}
                  </ThemedText>
               </View>

               <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                     style={[
                        styles.progressFill,
                        {
                           width: `${Math.min(pct, 100).toFixed(1)}%` as DimensionValue,
                           backgroundColor: isOver ? "#ef4444" : dotColor,
                        },
                     ]}
                  />
               </View>

               <ThemedText type="small" themeColor={isOver ? "text" : "textSecondary"}>
                  {Math.round(pct)}%{isOver ? " — over budget" : ""}
               </ThemedText>
            </ThemedView>
            {node.children.map((child) => renderNode(child))}
         </View>
      );
   }

   const monthLabel = formatMonthYear(year, month);
   const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
   const tree = buildTree(categories);
   const hasBudgets = categories.some((c) => c.budget != null);

   return (
      <ThemedView style={styles.container}>
         <View style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
               <ThemedView type="backgroundElement" style={styles.summaryCard}>
                  <ThemedText type="small" themeColor="textSecondary">
                     {monthLabel}
                  </ThemedText>
                  <ThemedText type="subtitle">{formatAmount(totalSpend)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                     total spent
                  </ThemedText>
               </ThemedView>

               {isLoading ? (
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                     Loading…
                  </ThemedText>
               ) : !hasBudgets ? (
                  <View style={styles.emptyBlock}>
                     <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                        No budgets set yet.
                     </ThemedText>
                     <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
                        Open the gear in Track and add a monthly budget to a category.
                     </ThemedText>
                  </View>
               ) : (
                  tree.map((node) => renderNode(node))
               )}
            </ScrollView>
         </View>
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1 },
   safeArea: { flex: 1 },
   scrollContent: {
      gap: Spacing.three,
      paddingTop: Spacing.three,
      paddingBottom: Spacing.five,
      paddingHorizontal: Spacing.four,
   },
   summaryCard: {
      alignItems: "center",
      gap: Spacing.one,
      padding: Spacing.four,
      borderRadius: Spacing.three,
   },
   emptyText: {
      paddingTop: Spacing.six,
      textAlign: "center",
   },
   emptyBlock: {
      alignItems: "center",
      paddingHorizontal: Spacing.three,
   },
   emptyHint: {
      marginTop: Spacing.two,
      textAlign: "center",
   },
   budgetCard: {
      gap: Spacing.two,
      padding: Spacing.three,
      borderRadius: Spacing.three,
   },
   budgetCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: Spacing.two,
   },
   budgetTitle: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      gap: Spacing.two,
   },
   dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
   },
   progressTrack: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
   },
   progressFill: {
      height: "100%",
      borderRadius: 3,
   },
});
