import { usePowerSync } from "@powersync/react";
import { useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { type SourceRow } from "@/db/sources";
import { type TransferRow, insertTransfer, updateTransfer } from "@/db/transfers";
import { useTheme } from "@/hooks/use-theme";
import { today } from "@/utils/date";

type Props = {
   visible: boolean;
   fromSource: SourceRow | null;
   sources: SourceRow[];
   transfer?: TransferRow | null;
   onDismiss: () => void;
   onChanged: () => void;
};

export function TransferModal({
   visible,
   fromSource,
   sources,
   transfer = null,
   onDismiss,
   onChanged,
}: Props) {
   const db = usePowerSync();
   const theme = useTheme();
   const [toSourceId, setToSourceId] = useState<string | null>(null);
   const [fromAmount, setFromAmount] = useState("");
   const [toAmount, setToAmount] = useState("");
   const [date, setDate] = useState(today());

   useEffect(() => {
      if (transfer && fromSource) {
         setToSourceId(transfer.to_source_id);
         setFromAmount(String(transfer.from_amount));
         setToAmount(String(transfer.to_amount));
         setDate(transfer.date);
      } else {
         setToSourceId(null);
         setFromAmount("");
         setToAmount("");
         setDate(today());
      }
   }, [transfer, fromSource]);

   if (!fromSource) return null;
   const active = fromSource;

   const toSources = sources.filter((s) => s.id !== active.id);
   const effectiveToId = toSourceId ?? toSources[0]?.id ?? null;
   const toSource = toSources.find((s) => s.id === effectiveToId) ?? null;
   const sameCurrency = toSource?.currency === active.currency;

   function close() {
      setToSourceId(null);
      setFromAmount("");
      setToAmount("");
      setDate(today());
      onDismiss();
   }

   async function save() {
      const from = parseFloat(fromAmount);
      if (isNaN(from) || from <= 0) {
         Alert.alert("Invalid amount", "Enter a positive number.");
         return;
      }
      if (!toSource) {
         Alert.alert("No destination", "Select a destination source.");
         return;
      }
      const to = sameCurrency ? from : parseFloat(toAmount);
      if (!sameCurrency && (isNaN(to) || to <= 0)) {
         Alert.alert("Invalid amount", "Enter the received amount.");
         return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
         Alert.alert("Invalid date", "Use YYYY-MM-DD format.");
         return;
      }
      try {
         const input = {
            from_source_id: active.id,
            to_source_id: toSource.id,
            from_amount: from,
            to_amount: to,
            exchange_rate: to / from,
            date,
            description: "",
         };
         if (transfer) {
            await updateTransfer(db, transfer.id, input);
         } else {
            await insertTransfer(db, input);
         }
         close();
         onChanged();
      } catch {
         Alert.alert("Save failed", "Could not record the transfer.");
      }
   }

   return (
      <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
         <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
            <View
               style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
               onStartShouldSetResponder={() => true}
            >
               <ThemedText type="smallBold" style={styles.title}>
                  {transfer ? `Edit transfer · ${active.name}` : `Transfer · ${active.name}`}
               </ThemedText>

               <ThemedText themeColor="textSecondary" style={styles.label}>
                  To
               </ThemedText>
               <View style={styles.chipRow}>
                  {toSources.map((s) => {
                     const selected = effectiveToId === s.id;
                     return (
                        <TouchableOpacity
                           key={s.id}
                           style={[
                              styles.chip,
                              {
                                 backgroundColor: selected ? theme.text : theme.backgroundSelected,
                              },
                           ]}
                           onPress={() => setToSourceId(s.id)}
                        >
                           <ThemedText
                              type="small"
                              style={{ color: selected ? theme.background : theme.text }}
                           >
                              {s.name}
                           </ThemedText>
                        </TouchableOpacity>
                     );
                  })}
               </View>

               <ThemedText themeColor="textSecondary" style={styles.label}>
                  Amount ({active.currency})
               </ThemedText>
               <TextInput
                  value={fromAmount}
                  onChangeText={setFromAmount}
                  placeholder="e.g. 10000"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  style={[
                     styles.input,
                     { color: theme.text, backgroundColor: theme.backgroundSelected },
                  ]}
                  autoFocus
               />

               {!sameCurrency && toSource != null && (
                  <>
                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Received ({toSource.currency})
                     </ThemedText>
                     <TextInput
                        value={toAmount}
                        onChangeText={setToAmount}
                        placeholder="e.g. 65"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                        style={[
                           styles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                     />
                  </>
               )}

               <ThemedText themeColor="textSecondary" style={styles.label}>
                  Date
               </ThemedText>
               <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                     styles.input,
                     { color: theme.text, backgroundColor: theme.backgroundSelected },
                  ]}
               />

               <View style={styles.actions}>
                  <TouchableOpacity onPress={close} style={styles.cancelButton}>
                     <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                     onPress={save}
                     style={[styles.saveButton, { backgroundColor: theme.text }]}
                  >
                     <ThemedText type="smallBold" style={{ color: theme.background }}>
                        Transfer
                     </ThemedText>
                  </TouchableOpacity>
               </View>
            </View>
         </TouchableOpacity>
      </Modal>
   );
}

const styles = StyleSheet.create({
   overlay: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
   },
   sheet: {
      gap: Spacing.two,
      width: 320,
      padding: Spacing.four,
      borderRadius: Spacing.three,
   },
   title: { marginBottom: Spacing.one },
   label: {
      marginTop: Spacing.two,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
   },
   input: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.two,
      fontSize: 15,
   },
   chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.two,
   },
   chip: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: Spacing.two,
   },
   actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: Spacing.three,
      marginTop: Spacing.four,
   },
   cancelButton: {
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
   },
   saveButton: {
      alignItems: "center",
      paddingHorizontal: Spacing.five,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.three,
   },
});
