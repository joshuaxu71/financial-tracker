import { usePowerSync } from "@powersync/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { formatCurrencyAmount } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { useSettings } from "@/context/settings-context";
import { useTabNavigation } from "@/context/tab-navigation";
import { convertToBase, getRates, refreshRates } from "@/db/rates";
import { type SourceRow, getAllSources } from "@/db/sources";
import { type Transaction, getAllTransactions } from "@/db/transactions";
import { type TransferRow, getAllTransfers } from "@/db/transfers";
import { SourceDetailModal } from "@/features/finance/source-detail-modal";
import { SourcesModal } from "@/features/finance/sources-modal";
import { useTheme } from "@/hooks/use-theme";
import { formatAmount } from "@/utils/currency";

export default function FinanceScreen() {
   const db = usePowerSync();
   const theme = useTheme();
   const { activeIndex } = useTabNavigation();
   const { baseCurrency } = useSettings();

   const [sources, setSources] = useState<SourceRow[]>([]);
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [transfers, setTransfers] = useState<TransferRow[]>([]);
   const [rates, setRates] = useState<Map<string, number>>(new Map());
   const [showSources, setShowSources] = useState(false);
   const [detailSource, setDetailSource] = useState<SourceRow | null>(null);

   const load = useCallback(async () => {
      const [s, txns, t, r] = await Promise.all([
         getAllSources(db),
         getAllTransactions(db),
         getAllTransfers(db),
         getRates(db),
      ]);
      setSources(s);
      setTransactions(txns);
      setTransfers(t);
      setRates(r);
   }, [db]);

   useEffect(() => {
      load();
      refreshRates(db, baseCurrency).then(setRates);
   }, [db, load, activeIndex]);

   const balance = useMemo(() => {
      const map = new Map<string, number>();
      for (const t of transactions) {
         map.set(t.source_id, (map.get(t.source_id) ?? 0) + t.amount);
      }
      for (const t of transfers) {
         map.set(t.from_source_id, (map.get(t.from_source_id) ?? 0) - t.from_amount);
         map.set(t.to_source_id, (map.get(t.to_source_id) ?? 0) + t.to_amount);
      }
      return map;
   }, [sources, transactions, transfers]);

   const netWorth = useMemo(() => {
      let total = 0;
      for (const s of sources) {
         total += convertToBase(balance.get(s.id) ?? 0, s.currency, rates, baseCurrency);
      }
      return total;
   }, [sources, balance, rates]);

   return (
      <ThemedView style={styles.container}>
         <View style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
               <View style={styles.header}>
                  <ThemedText type="subtitle">Finance</ThemedText>
                  <TouchableOpacity
                     style={[styles.addSourceButton, { backgroundColor: theme.text }]}
                     onPress={() => setShowSources(true)}
                     accessibilityLabel="Add or manage sources"
                  >
                     <ThemedText type="smallBold" style={{ color: theme.background }}>
                        + Add source
                     </ThemedText>
                  </TouchableOpacity>
               </View>

               <ThemedView themeColor="backgroundElement" style={styles.netWorthCard}>
                  <ThemedText type="small" themeColor="textSecondary">
                     Net worth
                  </ThemedText>
                  <ThemedText type="title">{formatAmount(netWorth)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                     all sources in {baseCurrency}
                  </ThemedText>
               </ThemedView>

               {sources.length === 0 ? (
                  <TouchableOpacity onPress={() => setShowSources(true)}>
                     <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                        No sources yet. Tap to add one.
                     </ThemedText>
                  </TouchableOpacity>
               ) : (
                  sources.map((s) => {
                     const bal = balance.get(s.id) ?? 0;
                     const jpy = convertToBase(bal, s.currency, rates, baseCurrency);
                     return (
                        <TouchableOpacity
                           key={s.id}
                           activeOpacity={0.7}
                           onPress={() => setDetailSource(s)}
                        >
                           <ThemedView themeColor="backgroundElement" style={styles.sourceCard}>
                              <View style={styles.sourceHeader}>
                                 <ThemedView
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
                                    {s.currency !== baseCurrency && (
                                       <ThemedText type="small" themeColor="textSecondary">
                                          ≈ {formatAmount(jpy)}
                                       </ThemedText>
                                    )}
                                 </View>
                                 <ThemedText
                                    type="small"
                                    themeColor="textSecondary"
                                    style={styles.chevron}
                                 >
                                    ›
                                 </ThemedText>
                              </View>
                           </ThemedView>
                        </TouchableOpacity>
                     );
                  })
               )}
            </ScrollView>
         </View>

         <SourcesModal
            visible={showSources}
            onDismiss={() => setShowSources(false)}
            onChanged={load}
         />
         <SourceDetailModal
            visible={detailSource != null}
            source={detailSource}
            sources={sources}
            income={transactions.filter(
               (t) => t.category_id === null && t.source_id === detailSource?.id,
            )}
            transfers={transfers.filter(
               (t) => t.from_source_id === detailSource?.id || t.to_source_id === detailSource?.id,
            )}
            balance={detailSource ? (balance.get(detailSource.id) ?? 0) : 0}
            jpy={
               detailSource
                  ? convertToBase(
                       balance.get(detailSource.id) ?? 0,
                       detailSource.currency,
                       rates,
                       baseCurrency,
                    )
                  : 0
            }
            onDismiss={() => setDetailSource(null)}
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
      paddingBottom: Spacing.five,
      paddingHorizontal: Spacing.four,
   },
   header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
   },
   addSourceButton: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: 100,
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
   chevron: {
      fontSize: 24,
      lineHeight: 28,
   },
});
