import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { formatCurrencyAmount } from "@/constants/currencies";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { type Expense, getAllExpenses } from "@/db/expenses";
import { convertToJpy, getRates, refreshRates } from "@/db/rates";
import {
   type IncomeRow,
   type SourceRow,
   deleteIncome,
   getAllIncome,
   getAllSources,
} from "@/db/sources";
import { IncomeModal } from "@/features/finance/income-modal";
import { SourcesModal } from "@/features/finance/sources-modal";
import { useTheme } from "@/hooks/use-theme";
import { formatAmount } from "@/utils/currency";
import { formatDisplayDate } from "@/utils/date";

export default function FinanceScreen() {
   const db = useSQLiteContext();
   const theme = useTheme();

   const [sources, setSources] = useState<SourceRow[]>([]);
   const [income, setIncome] = useState<IncomeRow[]>([]);
   const [expenses, setExpenses] = useState<Expense[]>([]);
   const [rates, setRates] = useState<Map<string, number>>(new Map());
   const [showSources, setShowSources] = useState(false);
   const [incomeSource, setIncomeSource] = useState<SourceRow | null>(null);

   const load = useCallback(async () => {
      const [s, i, e, r] = await Promise.all([
         getAllSources(db),
         getAllIncome(db),
         getAllExpenses(db),
         getRates(db),
      ]);
      setSources(s);
      setIncome(i);
      setExpenses(e);
      setRates(r);
   }, [db]);

   useEffect(() => {
      load();
      refreshRates(db).then(setRates);
   }, [db, load]);

   const balance = useMemo(() => {
      const map = new Map<number, number>();
      for (const s of sources) map.set(s.id, s.opening_balance);
      for (const inc of income) map.set(inc.source_id, (map.get(inc.source_id) ?? 0) + inc.amount);
      for (const e of expenses) map.set(e.source_id, (map.get(e.source_id) ?? 0) - e.amount);
      return map;
   }, [sources, income, expenses]);

   const netWorth = useMemo(() => {
      let total = 0;
      for (const s of sources) {
         total += convertToJpy(balance.get(s.id) ?? 0, s.currency, rates);
      }
      return total;
   }, [sources, balance, rates]);

   async function handleDeleteIncome(id: string) {
      await deleteIncome(db, id);
      await load();
   }

   function confirmDeleteIncome(entry: IncomeRow) {
      Alert.alert(
         "Delete entry",
         `Delete income of ${formatCurrencyAmount(entry.amount, "JPY")}?`,
         [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => handleDeleteIncome(entry.id) },
         ],
      );
   }

   return (
      <ThemedView style={styles.container}>
         <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
               <View style={styles.header}>
                  <ThemedText type="subtitle">Finance</ThemedText>
                  <View style={styles.headerActions}>
                     <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                        onPress={async () => setRates(await refreshRates(db))}
                        accessibilityLabel="Refresh exchange rates"
                     >
                        <ThemedText type="smallBold">↻</ThemedText>
                     </TouchableOpacity>
                     <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                        onPress={() => setShowSources(true)}
                        accessibilityLabel="Manage sources"
                     >
                        <ThemedText type="smallBold">⚙</ThemedText>
                     </TouchableOpacity>
                  </View>
               </View>

               <ThemedView type="backgroundElement" style={styles.netWorthCard}>
                  <ThemedText type="small" themeColor="textSecondary">
                     Net worth
                  </ThemedText>
                  <ThemedText type="title">{formatAmount(netWorth)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                     all sources in {`JPY`}
                  </ThemedText>
               </ThemedView>

               {sources.length === 0 ? (
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                     No sources yet. Add one to start tracking balances.
                  </ThemedText>
               ) : (
                  sources.map((s) => {
                     const bal = balance.get(s.id) ?? 0;
                     const jpy = convertToJpy(bal, s.currency, rates);
                     const entries = income.filter((i) => i.source_id === s.id);
                     return (
                        <ThemedView key={s.id} type="backgroundElement" style={styles.sourceCard}>
                           <View style={styles.sourceHeader}>
                              <View
                                 style={[styles.dot, { backgroundColor: s.color ?? "#888888" }]}
                              />
                              <View style={styles.sourceTitle}>
                                 <ThemedText type="smallBold" numberOfLines={1}>
                                    {s.name}
                                 </ThemedText>
                                 <ThemedText type="small" themeColor="textSecondary">
                                    {s.currency}
                                 </ThemedText>
                              </View>
                              <View style={styles.balanceBlock}>
                                 <ThemedText style={styles.balance}>
                                    {formatCurrencyAmount(bal, s.currency)}
                                 </ThemedText>
                                 {s.currency !== "JPY" && (
                                    <ThemedText type="small" themeColor="textSecondary">
                                       ≈ {formatAmount(jpy)}
                                    </ThemedText>
                                 )}
                              </View>
                           </View>

                           {entries.length > 0 && (
                              <View style={styles.incomeList}>
                                 {entries.map((entry) => (
                                    <TouchableOpacity
                                       key={entry.id}
                                       style={styles.incomeRow}
                                       onLongPress={() => confirmDeleteIncome(entry)}
                                    >
                                       <ThemedText type="small" themeColor="textSecondary">
                                          {formatDisplayDate(entry.date)}
                                       </ThemedText>
                                       <ThemedText type="small" style={styles.incomeAmount}>
                                          + {formatCurrencyAmount(entry.amount, s.currency)}
                                       </ThemedText>
                                    </TouchableOpacity>
                                 ))}
                              </View>
                           )}

                           <TouchableOpacity
                              style={styles.addMoney}
                              onPress={() => setIncomeSource(s)}
                           >
                              <ThemedText type="smallBold">+ Add money</ThemedText>
                           </TouchableOpacity>
                        </ThemedView>
                     );
                  })
               )}
            </ScrollView>
         </SafeAreaView>

         <SourcesModal
            visible={showSources}
            onDismiss={() => setShowSources(false)}
            onChanged={load}
         />
         <IncomeModal
            visible={incomeSource != null}
            source={incomeSource}
            onDismiss={() => setIncomeSource(null)}
            onChanged={load}
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
      paddingBottom: BottomTabInset + Spacing.four,
      paddingHorizontal: Spacing.four,
   },
   header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
   },
   headerActions: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
   iconButton: {
      justifyContent: "center",
      alignItems: "center",
      width: 32,
      height: 32,
      borderRadius: 16,
   },
   netWorthCard: {
      alignItems: "center",
      gap: Spacing.one,
      padding: Spacing.four,
      borderRadius: Spacing.three,
   },
   emptyText: {
      paddingTop: Spacing.six,
      textAlign: "center",
   },
   sourceCard: {
      gap: Spacing.three,
      padding: Spacing.four,
      borderRadius: Spacing.three,
   },
   sourceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
   },
   dot: {
      flexShrink: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
   },
   sourceTitle: {
      flex: 1,
      gap: Spacing.half,
      minWidth: 0,
   },
   balanceBlock: {
      alignItems: "flex-end",
      gap: Spacing.half,
   },
   balance: {
      fontSize: 17,
      fontVariant: ["tabular-nums"],
   },
   incomeList: {
      gap: Spacing.one,
      paddingTop: Spacing.two,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#2E3135",
   },
   incomeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: Spacing.half,
   },
   incomeAmount: {
      fontVariant: ["tabular-nums"],
   },
   addMoney: {
      alignSelf: "flex-start",
      paddingVertical: Spacing.one,
   },
});
