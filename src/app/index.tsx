import { useSQLiteContext } from "expo-sqlite";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getCategoryById } from "@/constants/categories";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { type Expense, deleteExpense, getExpensesByMonth, insertExpenses } from "@/db/expenses";
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
   data: Expense[];
   dailyTotal: number;
};

type RowRefs = { amount: { current: TextInput | null }; desc: { current: TextInput | null } };

export default function TrackScreen() {
   const db = useSQLiteContext();
   const theme = useTheme();

   const [viewYear, setViewYear] = useState(NOW_YEAR);
   const [viewMonth, setViewMonth] = useState(NOW_MONTH);
   const [expenses, setExpenses] = useState<Expense[]>([]);
   const [filterGroupId, setFilterGroupId] = useState<number | null>(null);
   const [showMonthPicker, setShowMonthPicker] = useState(false);
   const [isSaving, setIsSaving] = useState(false);

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
   } = useJournalEntries();

   const isCurrentMonth = viewYear === NOW_YEAR && viewMonth === NOW_MONTH;

   const rowRefsMap = useRef(new Map<string, RowRefs>());

   function getRowRefs(rowId: string): RowRefs {
      if (!rowRefsMap.current.has(rowId)) {
         rowRefsMap.current.set(rowId, { amount: { current: null }, desc: { current: null } });
      }
      return rowRefsMap.current.get(rowId)!;
   }

   const loadExpenses = useCallback(async () => {
      const data = await getExpensesByMonth(db, viewYear, viewMonth);
      setExpenses(data);
   }, [db, viewYear, viewMonth]);

   useEffect(() => {
      loadExpenses();
   }, [loadExpenses]);

   useEffect(() => {
      if (isCurrentMonth) ensureDayRows(TODAY);
   }, [isCurrentMonth, ensureDayRows]);

   useEffect(() => {
      if (!activeCell) return;
      const refs = rowRefsMap.current.get(activeCell.rowId);
      if (!refs) return;
      (activeCell.field === "amount" ? refs.amount : refs.desc).current?.focus();
   }, [activeCell]);

   const sections = useMemo<DaySection[]>(() => {
      const filtered = filterGroupId
         ? expenses.filter((e) => getCategoryById(e.category_id)?.parent_id === filterGroupId)
         : expenses;

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
               dailyTotal: data.reduce((sum, e) => sum + e.amount, 0),
            };
         });
   }, [expenses, filterGroupId, rowsByDate, isCurrentMonth, viewYear, viewMonth]);

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
         await insertExpenses(
            db,
            entries.map((e, i) => ({
               date: e.date,
               category_id: e.row.category_id,
               amount: parseFloat(e.row.amount),
               description: e.row.description.trim(),
               sort_order: base + i,
            })),
         );
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
         <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
         >
            <SafeAreaView style={styles.flex} edges={["top"]}>
               <View style={styles.stickyHeader}>
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
               <CategoryFilter selectedGroupId={filterGroupId} onChange={setFilterGroupId} />
               <SectionList<Expense, DaySection>
                  sections={sections}
                  keyExtractor={(item) => item.id}
                  renderSectionHeader={({ section }) => (
                     <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                        <ThemedText type="smallBold">{section.title}</ThemedText>
                        {section.dailyTotal > 0 && (
                           <ThemedText themeColor="textSecondary">
                              {section.dailyTotal.toLocaleString("en-US", {
                                 minimumFractionDigits: 2,
                                 maximumFractionDigits: 2,
                              })}
                           </ThemedText>
                        )}
                     </View>
                  )}
                  renderItem={({ item }) => (
                     <SavedExpenseRow
                        expense={item}
                        onDelete={async () => {
                           await deleteExpense(db, item.id);
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
                     paddingBottom: BottomTabInset + Spacing.five + Spacing.three,
                  }}
               />
               {hasAnyPending && (
                  <View
                     style={[styles.saveArea, { paddingBottom: BottomTabInset + Spacing.three }]}
                  >
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
            </SafeAreaView>
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
