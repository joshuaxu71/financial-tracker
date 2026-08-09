import { usePowerSync } from "@powersync/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
   Alert,
   KeyboardAvoidingView,
   Platform,
   SectionList,
   StyleSheet,
   TextInput,
   TouchableOpacity,
   View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTabNavigation } from "@/context/tab-navigation";
import { type CategoryRow, getAllCategories } from "@/db/categories";
import { convertToJpy, getRates } from "@/db/rates";
import { type SourceRow, getAllSources } from "@/db/sources";
import {
   type Transaction,
   deleteTransaction,
   getTransactionsByMonth,
   insertTransactions,
} from "@/db/transactions";
import { CategoriesModal } from "@/features/categories/categories-modal";
import { CategoryFilter } from "@/features/journal/category-filter";
import { JournalEntryRow } from "@/features/journal/journal-entry-row";
import { MonthPickerModal } from "@/features/journal/month-picker-modal";
import { SavedExpenseRow } from "@/features/journal/saved-expense-row";
import { useJournalEntries } from "@/features/journal/use-journal-entries";
import { useTheme } from "@/hooks/use-theme";
import { formatDayHeader, today } from "@/utils/date";

const _now = new Date();
const NOW_YEAR = _now.getFullYear();
const NOW_MONTH = _now.getMonth() + 1;
const TODAY = today();

type DaySection = {
   date: string;
   title: string;
   data: Transaction[];
   dailyTotal: number;
};

type RowRefs = { amount: { current: TextInput | null }; desc: { current: TextInput | null } };

export default function TrackScreen() {
   const db = usePowerSync();
   const theme = useTheme();
   const { activeIndex } = useTabNavigation();

   const [viewYear, setViewYear] = useState(NOW_YEAR);
   const [viewMonth, setViewMonth] = useState(NOW_MONTH);
   const [expenses, setExpenses] = useState<Transaction[]>([]);
   const [categories, setCategories] = useState<CategoryRow[]>([]);
   const [sources, setSources] = useState<SourceRow[]>([]);
   const [rates, setRates] = useState<Map<string, number>>(new Map());
   const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
   const [showMonthPicker, setShowMonthPicker] = useState(false);
   const [showCategories, setShowCategories] = useState(false);
   const [isSaving, setIsSaving] = useState(false);

   const defaultCategoryId = useMemo(
      () => categories.find((c) => c.slug === "food")?.id ?? categories[0]?.id ?? "",
      [categories],
   );
   const defaultSourceId = useMemo(
      () => sources.find((s) => s.name === "Cash")?.id ?? sources[0]?.id ?? "",
      [sources],
   );

   const {
      rowsByDate,
      activeCell,
      hasAnyPending,
      ensureDayRows,
      updateRow,
      removeRow,
      advance,
      focusCell,
      clearAll,
      getCommittedEntries,
      setLastSourceId,
   } = useJournalEntries(defaultCategoryId, defaultSourceId);

   const isCurrentMonth = viewYear === NOW_YEAR && viewMonth === NOW_MONTH;

   const isUnderGroup = useCallback(
      (categoryId: string, groupId: string): boolean => {
         const byId = new Map(categories.map((c) => [c.id, c]));
         let current = byId.get(categoryId);
         const seen = new Set<string>();
         while (current && !seen.has(current.id)) {
            seen.add(current.id);
            if (current.parent_id === groupId) return true;
            current = current.parent_id == null ? undefined : byId.get(current.parent_id);
         }
         return false;
      },
      [categories],
   );

   const rowRefsMap = useRef(new Map<string, RowRefs>());

   function getRowRefs(rowId: string): RowRefs {
      if (!rowRefsMap.current.has(rowId)) {
         rowRefsMap.current.set(rowId, { amount: { current: null }, desc: { current: null } });
      }
      return rowRefsMap.current.get(rowId)!;
   }

   const loadExpenses = useCallback(async () => {
      const data = await getTransactionsByMonth(db, viewYear, viewMonth);
      setExpenses(data);
   }, [db, viewYear, viewMonth]);

   const loadCategories = useCallback(async () => {
      setCategories(await getAllCategories(db));
   }, [db]);

   const loadSources = useCallback(async () => {
      setSources(await getAllSources(db));
      setRates(await getRates(db));
   }, [db]);

   useEffect(() => {
      loadExpenses();
   }, [loadExpenses, activeIndex]);

   useEffect(() => {
      loadCategories();
   }, [loadCategories, activeIndex]);

   useEffect(() => {
      loadSources();
   }, [loadSources, activeIndex]);

   useEffect(() => {
      if (isCurrentMonth && categories.length > 0 && sources.length > 0) {
         ensureDayRows(TODAY);
      }
   }, [isCurrentMonth, categories.length, sources.length, ensureDayRows]);

   useEffect(() => {
      if (!activeCell) return;
      const refs = rowRefsMap.current.get(activeCell.rowId);
      if (!refs) return;
      (activeCell.field === "amount" ? refs.amount : refs.desc).current?.focus();
   }, [activeCell]);

   const sections = useMemo<DaySection[]>(() => {
      const filtered = filterGroupId
         ? expenses.filter((e) => e.category_id && isUnderGroup(e.category_id, filterGroupId))
         : expenses;

      const sourceCurrency = new Map(sources.map((s) => [s.id, s.currency]));
      const jpy = (e: Transaction) =>
         convertToJpy(-e.amount, sourceCurrency.get(e.source_id) ?? "JPY", rates);

      const daySet = new Set<string>();
      if (isCurrentMonth) daySet.add(TODAY);
      for (const e of filtered) daySet.add(e.date);
      for (const date of Object.keys(rowsByDate)) {
         const [y, m] = date.split("-").map(Number);
         if (y === viewYear && m === viewMonth) daySet.add(date);
      }

      return [...daySet]
         .sort()
         .reverse()
         .map((date) => {
            const data = filtered.filter((e) => e.date === date);
            return {
               date,
               title: formatDayHeader(date),
               data,
               dailyTotal: data.reduce((sum, e) => sum + jpy(e), 0),
            };
         });
   }, [
      expenses,
      filterGroupId,
      rowsByDate,
      isCurrentMonth,
      viewYear,
      viewMonth,
      isUnderGroup,
      sources,
      rates,
   ]);

   async function handleSave() {
      const entries = getCommittedEntries();
      if (entries.length === 0) return;

      const hasInvalid = entries.some((e) => {
         const n = parseFloat(e.row.amount);
         return isNaN(n) || n <= 0;
      });
      if (hasInvalid) {
         Alert.alert("Invalid amount", "All amounts must be positive numbers.");
         return;
      }

      setIsSaving(true);
      try {
         const base = Date.now();
         await insertTransactions(
            db,
            entries.map((e, i) => ({
               date: e.date,
               category_id: e.row.category_id,
               source_id: e.row.source_id,
               amount: -parseFloat(e.row.amount),
               description: e.row.description.trim(),
               sort_order: base + i,
            })),
         );
         const lastCommitted = entries[entries.length - 1].row;
         setLastSourceId(lastCommitted.source_id);
         clearAll();
         if (isCurrentMonth) ensureDayRows(TODAY);
         await loadExpenses();
      } catch {
         Alert.alert("Save failed", "Could not save expenses. Please try again.");
      } finally {
         setIsSaving(false);
      }
   }

   const monthLabel = new Date(viewYear, viewMonth - 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
   });

   return (
      <ThemedView style={styles.container}>
         <MonthPickerModal
            visible={showMonthPicker}
            year={viewYear}
            month={viewMonth}
            maxYear={NOW_YEAR}
            maxMonth={NOW_MONTH}
            onSelect={(y, m) => {
               setViewYear(y);
               setViewMonth(m);
               setShowMonthPicker(false);
            }}
            onDismiss={() => setShowMonthPicker(false)}
         />
         <CategoriesModal
            visible={showCategories}
            year={viewYear}
            month={viewMonth}
            onDismiss={() => setShowCategories(false)}
            onChanged={loadCategories}
         />
         <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
         >
            <View style={styles.flex}>
               <View style={styles.stickyHeader}>
                  <View style={styles.headerLeft}>
                     <TouchableOpacity onPress={() => setShowMonthPicker(true)}>
                        <ThemedText type="subtitle">{monthLabel} ▾</ThemedText>
                     </TouchableOpacity>
                     {!isCurrentMonth && (
                        <TouchableOpacity
                           style={[styles.todayPill, { backgroundColor: theme.backgroundElement }]}
                           onPress={() => {
                              setViewYear(NOW_YEAR);
                              setViewMonth(NOW_MONTH);
                           }}
                        >
                           <ThemedText type="smallBold">Today</ThemedText>
                        </TouchableOpacity>
                     )}
                  </View>
                  <TouchableOpacity
                     style={[styles.gearButton, { backgroundColor: theme.backgroundElement }]}
                     onPress={() => setShowCategories(true)}
                     accessibilityLabel="Manage categories"
                  >
                     <ThemedText type="smallBold">⚙</ThemedText>
                  </TouchableOpacity>
               </View>
               <CategoryFilter
                  categories={categories}
                  selectedGroupId={filterGroupId}
                  onChange={setFilterGroupId}
               />
               <SectionList<Transaction, DaySection>
                  sections={sections}
                  keyExtractor={(item) => item.id}
                  renderSectionHeader={({ section }) => (
                     <ThemedView themeColor="background" style={styles.sectionHeader}>
                        <ThemedText type="smallBold">{section.title}</ThemedText>
                        {section.dailyTotal > 0 && (
                           <ThemedText themeColor="textSecondary">
                              {section.dailyTotal.toLocaleString("en-US", {
                                 minimumFractionDigits: 2,
                                 maximumFractionDigits: 2,
                              })}
                           </ThemedText>
                        )}
                     </ThemedView>
                  )}
                  renderItem={({ item }) => (
                     <SavedExpenseRow
                        expense={item}
                        categories={categories}
                        sources={sources}
                        onDelete={async () => {
                           await deleteTransaction(db, item.id);
                           await loadExpenses();
                        }}
                     />
                  )}
                  renderSectionFooter={({ section }) => {
                     const rows = rowsByDate[section.date];
                     if (!rows || rows.length === 0) return null;
                     return (
                        <View>
                           {rows.map((row) => {
                              const refs = getRowRefs(row.id);
                              return (
                                 <JournalEntryRow
                                    key={row.id}
                                    row={row}
                                    categories={categories}
                                    sources={sources}
                                    amountInputRef={
                                       refs.amount as React.RefObject<TextInput | null>
                                    }
                                    descInputRef={refs.desc as React.RefObject<TextInput | null>}
                                    onAmountChange={(v) =>
                                       updateRow(section.date, row.id, "amount", v)
                                    }
                                    onDescriptionChange={(v) =>
                                       updateRow(section.date, row.id, "description", v)
                                    }
                                    onCategoryChange={(id) =>
                                       updateRow(section.date, row.id, "category_id", id)
                                    }
                                    onSourceChange={(id) =>
                                       updateRow(section.date, row.id, "source_id", id)
                                    }
                                    onAmountSubmit={() => advance(section.date, row.id, "amount")}
                                    onDescriptionSubmit={() =>
                                       advance(section.date, row.id, "description")
                                    }
                                    onDeleteRow={() => removeRow(section.date, row.id)}
                                    onAmountFocus={() => focusCell(section.date, row.id, "amount")}
                                    onDescriptionFocus={() =>
                                       focusCell(section.date, row.id, "description")
                                    }
                                 />
                              );
                           })}
                        </View>
                     );
                  }}
                  stickySectionHeadersEnabled
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                     paddingBottom: Spacing.five,
                  }}
               />
               {hasAnyPending && (
                  <View style={[styles.saveArea, { paddingBottom: Spacing.three }]}>
                     <TouchableOpacity
                        onPress={handleSave}
                        disabled={isSaving}
                        activeOpacity={0.8}
                        style={[styles.saveButton, { backgroundColor: theme.text }]}
                     >
                        <ThemedText type="smallBold" style={{ color: theme.background }}>
                           {isSaving ? "Saving…" : "Save"}
                        </ThemedText>
                     </TouchableOpacity>
                  </View>
               )}
            </View>
         </KeyboardAvoidingView>
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   flex: { flex: 1 },
   container: { flex: 1 },
   stickyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
   },
   headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.three,
   },
   gearButton: {
      justifyContent: "center",
      alignItems: "center",
      width: 32,
      height: 32,
      borderRadius: 16,
   },
   todayPill: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: 100,
   },
   sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
   },
   saveArea: {
      paddingTop: Spacing.two,
      paddingHorizontal: Spacing.four,
   },
   saveButton: {
      alignItems: "center",
      paddingVertical: Spacing.three,
      borderRadius: Spacing.three,
   },
});
