import { usePowerSync } from "@powersync/react";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { Overlay } from "@/components/overlay";
import { ThemedText } from "@/components/themed-text";
import { sheetStyles } from "@/constants/sheet-styles";
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
      <Overlay visible={visible} onRequestClose={close}>
         <View style={[sheetStyles.sheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={sheetStyles.title}>
               {transfer ? `Edit transfer · ${active.name}` : `Transfer · ${active.name}`}
            </ThemedText>

            <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
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

            <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
               Amount ({active.currency})
            </ThemedText>
            <TextInput
               value={fromAmount}
               onChangeText={setFromAmount}
               placeholder="e.g. 10000"
               placeholderTextColor={theme.textSecondary}
               keyboardType="decimal-pad"
               style={[
                  sheetStyles.input,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
               ]}
               autoFocus
            />

            {!sameCurrency && toSource != null && (
               <>
                  <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                     Received ({toSource.currency})
                  </ThemedText>
                  <TextInput
                     value={toAmount}
                     onChangeText={setToAmount}
                     placeholder="e.g. 65"
                     placeholderTextColor={theme.textSecondary}
                     keyboardType="decimal-pad"
                     style={[
                        sheetStyles.input,
                        { color: theme.text, backgroundColor: theme.backgroundSelected },
                     ]}
                  />
               </>
            )}

            <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
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
                  sheetStyles.input,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
               ]}
            />

            <View style={sheetStyles.actions}>
               <TouchableOpacity onPress={close} style={sheetStyles.cancelButton}>
                  <ThemedText themeColor="textSecondary">Cancel</ThemedText>
               </TouchableOpacity>
               <TouchableOpacity
                  onPress={save}
                  style={[sheetStyles.saveButton, { backgroundColor: theme.text }]}
               >
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                     Transfer
                  </ThemedText>
               </TouchableOpacity>
            </View>
         </View>
      </Overlay>
   );
}

const styles = StyleSheet.create({
   chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
   },
   chip: {
      paddingHorizontal: 16,
      paddingVertical: Spacing.one,
      borderRadius: Spacing.two,
   },
});
