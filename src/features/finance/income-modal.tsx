import { usePowerSync } from "@powersync/react";
import { useState } from "react";
import { Alert, TextInput, TouchableOpacity, View } from "react-native";

import { Overlay } from "@/components/overlay";
import { ThemedText } from "@/components/themed-text";
import { sheetStyles } from "@/constants/sheet-styles";
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
   const db = usePowerSync();
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
      <Overlay visible={visible} onRequestClose={close}>
         <View style={[sheetStyles.sheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={sheetStyles.title}>
               Add money · {source.name}
            </ThemedText>

            <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
               Amount ({source.currency})
            </ThemedText>
            <TextInput
               value={amount}
               onChangeText={setAmount}
               placeholder="e.g. 100000"
               placeholderTextColor={theme.textSecondary}
               keyboardType="decimal-pad"
               style={[
                  sheetStyles.input,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
               ]}
               autoFocus
            />

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
                     Add
                  </ThemedText>
               </TouchableOpacity>
            </View>
         </View>
      </Overlay>
   );
}
