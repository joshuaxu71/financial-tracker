import { usePowerSync } from "@powersync/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type DimensionValue, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

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
import { budgetStateForWindow, convertExpensesToJpy } from "@/features/budget/budget-calc";
import { CategoryFilter } from "@/features/journal/category-filter";
import { MonthPickerModal } from "@/features/journal/month-picker-modal";
import { useTheme } from "@/hooks/use-theme";
import { formatAmount } from "@/utils/currency";
import { currentYearMonth, formatMonthShort, formatMonthYear, shiftMonth } from "@/utils/date";

type DashboardNode = {
   category: CategoryRow;
   depth: number;
   children: DashboardNode[];
};

function buildTree(categories: CategoryRow[]): DashboardNode[] {
   const byParent = new Map<string | null, CategoryRow[]>();
   for (const c of categories) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
   }
   function build(cats: CategoryRow[], depth: number): DashboardNode[] {
      return cats.map((c) => ({
         category: c,
         depth,
         children: build(byParent.get(c.id) ?? [], depth + 1),
      }));
   }
   return build(byParent.get(null) ?? [], 0);
}

const WINDOW_OPTIONS = [1, 3, 6, 12] as const;

export default function DashboardScreen() {
   const db = usePowerSync();
   const theme = useTheme();
   const { activeIndex } = useTabNavigation();
   const { year: initYear, month: initMonth } = currentYearMonth();

   const [year, setYear] = useState(initYear);
   const [month, setMonth] = useState(initMonth);
   const [windowMonths, setWindowMonths] = useState<(typeof WINDOW_OPTIONS)[number]>(1);
   const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
   const [categories, setCategories] = useState<CategoryRow[]>([]);
   const [expenses, setExpenses] = useState<Expense[]>([]);
   const [history, setHistory] = useState<BudgetHistoryRow[]>([]);
   const [expanded, setExpanded] = useState<Set<string>>(new Set());
   const [showMonthPicker, setShowMonthPicker] = useState(false);
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
      setExpanded(new Set(c.filter((cat) => cat.parent_id === null).map((cat) => cat.id)));
      setIsLoading(false);
   }, [db]);

   useEffect(() => {
      load();
   }, [load, activeIndex]);

   const isCurrentMonth = year === initYear && month === initMonth;

   const windowStart = shiftMonth(year, month, -(windowMonths - 1));
   const windowStartDate = `${windowStart.year}-${String(windowStart.month).padStart(2, "0")}-01`;
   const windowEndDate = `${year}-${String(month).padStart(2, "0")}-31`;

   const windowLabel =
      windowMonths === 1
         ? formatMonthYear(year, month)
         : `${formatMonthShort(windowStart.year, windowStart.month)} – ${formatMonthYear(year, month)}`;

   const totalSpend = useMemo(() => {
      let total = 0;
      for (const e of expenses) {
         if (e.date >= windowStartDate && e.date <= windowEndDate) total += e.amount;
      }
      return total;
   }, [expenses, windowStartDate, windowEndDate]);

   const tree = useMemo(() => {
      const roots = buildTree(categories);
      return filterGroupId == null
         ? roots
         : roots.filter((node) => node.category.id === filterGroupId);
   }, [categories, filterGroupId]);

   function navigatePrev() {
      const prev = shiftMonth(year, month, -1);
      setYear(prev.year);
      setMonth(prev.month);
   }

   function navigateNext() {
      if (isCurrentMonth) return;
      const next = shiftMonth(year, month, 1);
      setYear(next.year);
      setMonth(next.month);
   }

   function handleSelectMonth(y: number, m: number) {
      setYear(y);
      setMonth(m);
      setShowMonthPicker(false);
   }

   function toggleExpand(id: string) {
      setExpanded((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   }

   function renderNode(node: DashboardNode) {
      const state = budgetStateForWindow(
         categories,
         expenses,
         history,
         node.category.id,
         year,
         month,
         windowMonths,
      );
      const spent = state.spent;
      const available = state.available;
      const hasBudget = node.category.budget != null;
      const pct = hasBudget && available > 0 ? (spent / available) * 100 : 0;
      const isOver = hasBudget && available > 0 && spent > available;
      const dotColor = resolveCategoryColor(categories, node.category.id);
      const hasChildren = node.children.length > 0;
      const isOpen = expanded.has(node.category.id);

      return (
         <View key={node.category.id}>
            <TouchableOpacity
               activeOpacity={0.7}
               onPress={() => hasChildren && toggleExpand(node.category.id)}
               style={[styles.nodeRow, { paddingLeft: node.depth * Spacing.four }]}
            >
               <ThemedText type="small" themeColor="textSecondary" style={styles.chevron}>
                  {hasChildren ? (isOpen ? "▾" : "▸") : " "}
               </ThemedText>
               <View style={[styles.dot, { backgroundColor: dotColor }]} />
               <ThemedText type="smallBold" numberOfLines={1} style={styles.nodeName}>
                  {node.category.name}
               </ThemedText>
               <ThemedText type="smallBold">{formatAmount(spent)}</ThemedText>
            </TouchableOpacity>

            {hasBudget && (
               <View style={[styles.budgetRow, { paddingLeft: node.depth * Spacing.four }]}>
                  <View
                     style={[
                        styles.progressTrack,
                        { marginLeft: Spacing.four, backgroundColor: theme.backgroundSelected },
                     ]}
                  >
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
                     {formatAmount(spent)} / {formatAmount(available)}
                  </ThemedText>
               </View>
            )}

            {hasChildren &&
               isOpen &&
               node.children.map((child) => (
                  <View key={child.category.id}>{renderNode(child)}</View>
               ))}
         </View>
      );
   }

   return (
      <ThemedView style={styles.container}>
         <View style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
               <View style={styles.header}>
                  <ThemedText type="subtitle">Dashboard</ThemedText>
               </View>

               <View style={styles.monthNav}>
                  <TouchableOpacity onPress={navigatePrev} style={styles.arrowButton}>
                     <ThemedText themeColor="textSecondary">←</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowMonthPicker(true)}>
                     <ThemedText type="smallBold">{formatMonthYear(year, month)} ▾</ThemedText>
                  </TouchableOpacity>

                  {!isCurrentMonth ? (
                     <TouchableOpacity
                        onPress={() => {
                           setYear(initYear);
                           setMonth(initMonth);
                        }}
                        style={styles.todayPill}
                     >
                        <ThemedText type="small" themeColor="textSecondary">
                           Today
                        </ThemedText>
                     </TouchableOpacity>
                  ) : (
                     <TouchableOpacity onPress={navigateNext} style={styles.arrowButton}>
                        <ThemedText
                           themeColor={isCurrentMonth ? "backgroundElement" : "textSecondary"}
                        >
                           →
                        </ThemedText>
                     </TouchableOpacity>
                  )}
               </View>

               <View style={styles.rangeToggle}>
                  {WINDOW_OPTIONS.map((n) => {
                     const selected = n === windowMonths;
                     return (
                        <TouchableOpacity
                           key={n}
                           style={[
                              styles.rangeChip,
                              { backgroundColor: selected ? theme.text : theme.backgroundElement },
                           ]}
                           onPress={() => setWindowMonths(n)}
                        >
                           <ThemedText
                              type="smallBold"
                              style={{ color: selected ? theme.background : theme.text }}
                           >
                              {n}m
                           </ThemedText>
                        </TouchableOpacity>
                     );
                  })}
               </View>

               <CategoryFilter
                  categories={categories}
                  selectedGroupId={filterGroupId}
                  onChange={setFilterGroupId}
               />

               <ThemedView type="backgroundElement" style={styles.summaryCard}>
                  <ThemedText type="small" themeColor="textSecondary">
                     {windowLabel}
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
               ) : (
                  tree.map((node) => renderNode(node))
               )}
            </ScrollView>
         </View>

         <MonthPickerModal
            visible={showMonthPicker}
            year={year}
            month={month}
            maxYear={initYear}
            maxMonth={initMonth}
            onSelect={handleSelectMonth}
            onDismiss={() => setShowMonthPicker(false)}
         />
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
   header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
   },
   monthNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
   },
   arrowButton: {
      padding: Spacing.two,
   },
   todayPill: {
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.half,
      borderWidth: 1,
      borderRadius: 100,
      borderColor: "#2E3135",
   },
   rangeToggle: {
      flexDirection: "row",
      gap: Spacing.two,
   },
   rangeChip: {
      alignItems: "center",
      flex: 1,
      paddingVertical: Spacing.one,
      borderRadius: 100,
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
   nodeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingVertical: Spacing.two,
   },
   chevron: {
      width: Spacing.three,
      textAlign: "center",
   },
   dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
   },
   nodeName: {
      flex: 1,
   },
   budgetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingBottom: Spacing.two,
   },
   progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
   },
   progressFill: {
      height: "100%",
      borderRadius: 3,
   },
});
