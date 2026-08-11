import { usePowerSync } from "@powersync/react";
import { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { formatCurrencyAmount } from "@/constants/currencies";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { type IncomeRow, type SourceRow, deleteIncome } from "@/db/sources";
import { type TransferRow, deleteTransfer } from "@/db/transfers";
import { IncomeModal } from "@/features/finance/income-modal";
import { TransferModal } from "@/features/finance/transfer-modal";
import { useTheme } from "@/hooks/use-theme";
import { formatAmount } from "@/utils/currency";
import { formatDisplayDate } from "@/utils/date";

type Props = {
   visible: boolean;
   source: SourceRow | null;
   sources: SourceRow[];
   income: IncomeRow[];
   transfers: TransferRow[];
   balance: number;
   jpy: number;
   onDismiss: () => void;
   onChanged: () => void;
};

export function SourceDetailModal({
   visible,
   source,
   sources,
   income,
   transfers,
   balance,
   jpy,
   onDismiss,
   onChanged,
}: Props) {
   const db = usePowerSync();
   const theme = useTheme();
   const [showIncome, setShowIncome] = useState(false);
   const [showTransfer, setShowTransfer] = useState(false);
   const [editingTransfer, setEditingTransfer] = useState<TransferRow | null>(null);

   if (!source) return null;
   const active = source;

   async function handleDeleteIncome(id: string) {
      await deleteIncome(db, id);
      onChanged();
   }

   function confirmDeleteIncome(entry: IncomeRow) {
      Alert.alert(
         "Delete entry",
         `Delete income of ${formatCurrencyAmount(entry.amount, active.currency)}?`,
         [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => handleDeleteIncome(entry.id) },
         ],
      );
   }

   async function handleDeleteTransfer(id: string) {
      await deleteTransfer(db, id);
      onChanged();
   }

   function confirmDeleteTransfer(t: TransferRow) {
      const fromSource = sources.find((s) => s.id === t.from_source_id);
      const toSource = sources.find((s) => s.id === t.to_source_id);
      Alert.alert(
         "Delete transfer",
         `Delete transfer of ${formatCurrencyAmount(t.from_amount, fromSource?.currency ?? "")} → ${formatCurrencyAmount(t.to_amount, toSource?.currency ?? "")}?`,
         [
            { text: "Cancel", style: "cancel" },
            {
               text: "Delete",
               style: "destructive",
               onPress: () => handleDeleteTransfer(t.id),
            },
         ],
      );
   }

   return (
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
         <SafeAreaProvider>
            <SafeAreaView style={styles.flex} edges={["top"]}>
               <View style={styles.header}>
                  <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
                     {active.name}
                  </ThemedText>
                  <View style={styles.headerActions}>
                     {sources.length >= 2 && (
                        <TouchableOpacity
                           onPress={() => {
                              setEditingTransfer(null);
                              setShowTransfer(true);
                           }}
                           style={[styles.addButton, { backgroundColor: theme.text }]}
                        >
                           <ThemedText type="smallBold" style={{ color: theme.background }}>
                              → Transfer
                           </ThemedText>
                        </TouchableOpacity>
                     )}
                     <TouchableOpacity
                        onPress={() => setShowIncome(true)}
                        style={[styles.addButton, { backgroundColor: theme.text }]}
                     >
                        <ThemedText type="smallBold" style={{ color: theme.background }}>
                           + Add money
                        </ThemedText>
                     </TouchableOpacity>
                     <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                        <ThemedText themeColor="textSecondary">Done</ThemedText>
                     </TouchableOpacity>
                  </View>
               </View>

               <ThemedView themeColor="backgroundElement" style={styles.balanceCard}>
                  <ThemedText type="small" themeColor="textSecondary">
                     {active.currency}
                  </ThemedText>
                  <ThemedText type="title">
                     {formatCurrencyAmount(balance, active.currency)}
                  </ThemedText>
                  {active.currency !== "JPY" && (
                     <ThemedText type="small" themeColor="textSecondary">
                        ≈ {formatAmount(jpy)} JPY
                     </ThemedText>
                  )}
               </ThemedView>

               <ScrollView contentContainerStyle={styles.listContent}>
                  {income.length === 0 && transfers.length === 0 ? (
                     <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                        No activity yet.
                     </ThemedText>
                  ) : (
                     <>
                        {income.map((entry) => (
                           <TouchableOpacity
                              key={entry.id}
                              style={styles.row}
                              onLongPress={() => confirmDeleteIncome(entry)}
                           >
                              <ThemedText type="small" themeColor="textSecondary">
                                 {formatDisplayDate(entry.date)}
                              </ThemedText>
                              <ThemedText type="small" style={styles.amount}>
                                 + {formatCurrencyAmount(entry.amount, active.currency)}
                              </ThemedText>
                           </TouchableOpacity>
                        ))}
                        {transfers.map((t) => {
                           const isOut = t.from_source_id === active.id;
                           const counterpart = sources.find(
                              (x) => x.id === (isOut ? t.to_source_id : t.from_source_id),
                           );
                           const amount = isOut ? t.from_amount : t.to_amount;
                           function openTransferActions(t: TransferRow) {
                              Alert.alert("Transfer", undefined, [
                                 { text: "Cancel", style: "cancel" },
                                 {
                                    text: "Edit",
                                    onPress: () => {
                                       setEditingTransfer(t);
                                       setShowTransfer(true);
                                    },
                                 },
                                 {
                                    text: "Delete",
                                    style: "destructive",
                                    onPress: () => confirmDeleteTransfer(t),
                                 },
                              ]);
                           }

                           return (
                              <TouchableOpacity
                                 key={t.id}
                                 style={styles.row}
                                 onLongPress={() => openTransferActions(t)}
                              >
                                 <View style={styles.transferLeft}>
                                    <ThemedText type="small" themeColor="textSecondary">
                                       {formatDisplayDate(t.date)}
                                    </ThemedText>
                                    <ThemedText type="small" themeColor="textSecondary">
                                       {isOut
                                          ? `→ ${counterpart?.name ?? "?"}`
                                          : `← ${counterpart?.name ?? "?"}`}
                                    </ThemedText>
                                 </View>
                                 <ThemedText
                                    type="small"
                                    style={[
                                       styles.amount,
                                       { color: isOut ? theme.textSecondary : undefined },
                                    ]}
                                 >
                                    {isOut ? "- " : "+ "}
                                    {formatCurrencyAmount(amount, active.currency)}
                                 </ThemedText>
                              </TouchableOpacity>
                           );
                        })}
                     </>
                  )}
               </ScrollView>
            </SafeAreaView>

            <IncomeModal
               visible={showIncome}
               source={active}
               onDismiss={() => setShowIncome(false)}
               onChanged={onChanged}
            />
            <TransferModal
               visible={showTransfer}
               fromSource={
                  editingTransfer
                     ? (sources.find((s) => s.id === editingTransfer.from_source_id) ?? active)
                     : active
               }
               sources={sources}
               transfer={editingTransfer}
               onDismiss={() => {
                  setShowTransfer(false);
                  setEditingTransfer(null);
               }}
               onChanged={onChanged}
            />
         </SafeAreaProvider>
      </Modal>
   );
}

const styles = StyleSheet.create({
   flex: { flex: 1 },
   header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
   },
   headerTitle: { flexShrink: 1, fontSize: 32 },
   headerActions: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
   addButton: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: 100,
   },
   closeButton: {
      paddingHorizontal: Spacing.one,
      paddingVertical: Spacing.one,
   },
   balanceCard: {
      alignItems: "center",
      gap: Spacing.one,
      marginHorizontal: Spacing.four,
      padding: Spacing.four,
      borderRadius: Spacing.three,
   },
   listContent: {
      gap: Spacing.one,
      paddingTop: Spacing.two,
      paddingBottom: BottomTabInset + Spacing.five,
      paddingHorizontal: Spacing.four,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#2E3135",
   },
   emptyText: {
      paddingTop: Spacing.two,
      textAlign: "center",
   },
   row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: Spacing.two,
      paddingVertical: Spacing.half,
   },
   transferLeft: {
      gap: Spacing.half,
   },
   amount: {
      fontVariant: ["tabular-nums"],
   },
});
