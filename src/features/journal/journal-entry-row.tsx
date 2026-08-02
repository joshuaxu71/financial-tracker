import { useState } from "react";
import type { RefObject } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { type Category, resolveCategoryColor } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { type SourceRow } from "@/db/sources";
import { SourcePicker } from "@/features/finance/source-picker";
import { useTheme } from "@/hooks/use-theme";

import { InlineCategoryPicker } from "./inline-category-picker";
import type { JournalEntryRow as JournalEntryRowType } from "./use-journal-entries";

type Props = {
   row: JournalEntryRowType;
   categories: readonly Category[];
   sources: readonly SourceRow[];
   amountInputRef: RefObject<TextInput | null>;
   descInputRef: RefObject<TextInput | null>;
   onAmountChange: (value: string) => void;
   onDescriptionChange: (value: string) => void;
   onCategoryChange: (categoryId: number) => void;
   onSourceChange: (sourceId: number) => void;
   onAmountSubmit: () => void;
   onDescriptionSubmit: () => void;
   onDeleteRow: () => void;
   onAmountFocus: () => void;
   onDescriptionFocus: () => void;
};

export function JournalEntryRow({
   row,
   categories,
   sources,
   amountInputRef,
   descInputRef,
   onAmountChange,
   onDescriptionChange,
   onCategoryChange,
   onSourceChange,
   onAmountSubmit,
   onDescriptionSubmit,
   onDeleteRow,
   onAmountFocus,
   onDescriptionFocus,
}: Props) {
   const theme = useTheme();
   const [showCategoryPicker, setShowCategoryPicker] = useState(false);
   const [showSourcePicker, setShowSourcePicker] = useState(false);
   const category = categories.find((c) => c.id === row.category_id);
   const dotColor = resolveCategoryColor(categories, row.category_id);
   const source = sources.find((s) => s.id === row.source_id);
   const sourceColor = source?.color ?? "#888888";

   function handleBackspace() {
      if (row.amount === "" && row.description === "") onDeleteRow();
   }

   return (
      <View style={styles.row}>
         <TextInput
            ref={amountInputRef}
            value={row.amount}
            onChangeText={onAmountChange}
            onSubmitEditing={onAmountSubmit}
            onFocus={onAmountFocus}
            keyboardType="decimal-pad"
            returnKeyType="next"
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            style={[styles.amountInput, { color: theme.text }]}
            onKeyPress={({ nativeEvent }) => {
               if (nativeEvent.key === "Backspace") handleBackspace();
            }}
         />
         <TextInput
            ref={descInputRef}
            value={row.description}
            onChangeText={onDescriptionChange}
            onSubmitEditing={onDescriptionSubmit}
            onFocus={onDescriptionFocus}
            returnKeyType="next"
            placeholder="Description"
            placeholderTextColor={theme.textSecondary}
            style={[styles.descInput, { color: theme.text }]}
            onKeyPress={({ nativeEvent }) => {
               if (nativeEvent.key === "Backspace") handleBackspace();
            }}
         />
         <TouchableOpacity
            style={styles.sourceButton}
            onPress={() => setShowSourcePicker(true)}
            accessibilityLabel={`Source ${source?.name ?? "?"}`}
         >
            <View style={[styles.sourceDot, { backgroundColor: sourceColor }]} />
         </TouchableOpacity>
         <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryPicker(true)}
         >
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <ThemedText themeColor="textSecondary" style={styles.categoryLabel} numberOfLines={1}>
               {category?.name ?? "?"}
            </ThemedText>
         </TouchableOpacity>
         <InlineCategoryPicker
            visible={showCategoryPicker}
            categories={categories}
            selectedCategoryId={row.category_id}
            onSelect={(id) => {
               onCategoryChange(id);
               setShowCategoryPicker(false);
            }}
            onDismiss={() => setShowCategoryPicker(false)}
         />
         <SourcePicker
            visible={showSourcePicker}
            sources={sources}
            selectedSourceId={row.source_id}
            onSelect={onSourceChange}
            onDismiss={() => setShowSourcePicker(false)}
         />
      </View>
   );
}

const styles = StyleSheet.create({
   row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      minHeight: 40,
      paddingHorizontal: Spacing.four,
   },
   amountInput: {
      width: 72,
      paddingVertical: Spacing.one,
      fontSize: 15,
   },
   descInput: {
      flex: 1,
      paddingVertical: Spacing.one,
      fontSize: 15,
   },
   categoryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.one,
      maxWidth: 72,
   },
   sourceButton: {
      justifyContent: "center",
      alignItems: "center",
      width: 24,
      height: 24,
      borderRadius: 12,
   },
   sourceDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
   },
   dot: {
      flexShrink: 0,
      width: 8,
      height: 8,
      borderRadius: 4,
   },
   categoryLabel: { fontSize: 12 },
});
