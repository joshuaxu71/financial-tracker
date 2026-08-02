import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert, Modal, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { type SourceRow, insertIncome } from "@/db/sources";
import { useTheme } from "@/hooks/use-theme";
import { today } from "@/utils/date";

type Props = {
   visible: boolean;
   source: SourceRow | null;
   onDismiss: () => void;
   onChanged: () => void;
};

export function IncomeModal({ visible, source, onDismiss, onChanged }: Props) {
   const db = useSQLiteContext();
   const theme = useTheme();
   const [amount, setAmount] = useState("");
   const [date, setDate] = useState(today());

   if (!source) return null;
   const active = source;

   function close() {
      setAmount("");
      setDate(today());
      onDismiss();
   }

   async function save() {
      const n = parseFloat(amount);
      if (isNaN(n) || n <= 0) {
         Alert.alert("Invalid amount", "Enter a positive number.");
         return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
         Alert.alert("Invalid date", "Use YYYY-MM-DD format.");
         return;
      }
      try {
         await insertIncome(db, { source_id: active.id, amount: n, date });
         close();
         onChanged();
      } catch {
         Alert.alert("Save failed", "Could not record the income.");
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
                  Add money · {source.name}
               </ThemedText>

               <ThemedText themeColor="textSecondary" style={styles.label}>
                  Amount ({source.currency})
               </ThemedText>
               <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 100000"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  style={[
                     styles.input,
                     { color: theme.text, backgroundColor: theme.backgroundSelected },
                  ]}
                  autoFocus
               />

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
                        Add
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
