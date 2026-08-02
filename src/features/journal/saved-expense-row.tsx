import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { type Category, resolveCategoryColor } from "@/constants/categories";
import { formatCurrencyAmount } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { type Expense } from "@/db/expenses";
import { type SourceRow } from "@/db/sources";

type Props = {
   expense: Expense;
   categories: readonly Category[];
   sources: readonly SourceRow[];
   onDelete?: () => void;
};

export function SavedExpenseRow({ expense, categories, sources, onDelete }: Props) {
   const category = categories.find((c) => c.id === expense.category_id);
   const dotColor = resolveCategoryColor(categories, expense.category_id);
   const source = sources.find((s) => s.id === expense.source_id);
   const currency = source?.currency ?? "JPY";

   function handleLongPress() {
      if (!onDelete) return;
      const label = expense.description || formatCurrencyAmount(expense.amount, currency);
      Alert.alert("Delete expense", `Delete "${label}"?`, [
         { text: "Cancel", style: "cancel" },
         { text: "Delete", style: "destructive", onPress: onDelete },
      ]);
   }

   return (
      <TouchableOpacity style={styles.row} onLongPress={handleLongPress} activeOpacity={0.7}>
         <ThemedText themeColor="backgroundSelected" style={styles.handle}>
            ⠿
         </ThemedText>
         <View style={[styles.dot, { backgroundColor: dotColor }]} />
         <ThemedText style={styles.categoryName} numberOfLines={1}>
            {category?.name ?? "?"}
         </ThemedText>
         <ThemedText themeColor="textSecondary" style={styles.description} numberOfLines={1}>
            {expense.description}
         </ThemedText>
         <ThemedText style={styles.amount}>
            {formatCurrencyAmount(expense.amount, currency)}
         </ThemedText>
      </TouchableOpacity>
   );
}

const styles = StyleSheet.create({
   row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      minHeight: 40,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
   },
   handle: { fontSize: 16 },
   dot: {
      flexShrink: 0,
      width: 8,
      height: 8,
      borderRadius: 4,
   },
   categoryName: {
      width: 80,
      fontSize: 13,
   },
   description: {
      flex: 1,
      fontSize: 14,
   },
   amount: {
      fontSize: 14,
      fontVariant: ["tabular-nums"],
   },
});
