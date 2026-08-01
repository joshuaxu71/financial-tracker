import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES, type Category } from '@/constants/categories';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { insertExpenses } from '@/db/expenses';
import { CategoryPicker } from '@/features/expense-entry/category-picker';
import {
  SpreadsheetEntryGrid,
  type SpreadsheetEntryGridHandle,
} from '@/features/expense-entry/spreadsheet-entry-grid';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDisplayDate, today } from '@/utils/date';

export default function TrackScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const gridRef = useRef<SpreadsheetEntryGridHandle>(null);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[1]); // Food
  const [isSaving, setIsSaving] = useState(false);

  const isToday = selectedDate === today();

  async function handleSave() {
    const rows = gridRef.current?.getRows() ?? [];
    if (rows.length === 0) return;

    const hasInvalidAmount = rows.some((r) => {
      const n = parseFloat(r.amount);
      return isNaN(n) || n <= 0;
    });
    if (hasInvalidAmount) {
      Alert.alert('Invalid amount', 'All amounts must be positive numbers.');
      return;
    }

    setIsSaving(true);
    try {
      await insertExpenses(
        db,
        rows.map((r) => ({
          date: selectedDate,
          category_id: selectedCategory.id,
          amount: parseFloat(r.amount),
          description: r.description.trim(),
        })),
      );
      gridRef.current?.clearRows();
    } catch {
      Alert.alert('Save failed', 'Could not save expenses. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDiscard(onConfirm: () => void) {
    const rows = gridRef.current?.getRows() ?? [];
    if (rows.length === 0) {
      onConfirm();
      return;
    }
    Alert.alert('Unsaved entries', 'Changing this will discard your current entries.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onConfirm },
    ]);
  }

  function handleDateChange(delta: number) {
    confirmDiscard(() => {
      setSelectedDate((d) => addDays(d, delta));
      gridRef.current?.clearRows();
    });
  }

  function handleCategoryChange(category: Category) {
    if (category.id === selectedCategory.id) return;
    confirmDiscard(() => {
      setSelectedCategory(category);
      gridRef.current?.clearRows();
    });
  }

  const dateLabel = isToday ? 'Today' : formatDisplayDate(selectedDate);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="subtitle">Track</ThemedText>
            </View>

            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => handleDateChange(-1)} style={styles.arrowButton}>
                <ThemedText themeColor="textSecondary">←</ThemedText>
              </TouchableOpacity>
              <ThemedText type="smallBold">{dateLabel}</ThemedText>
              <TouchableOpacity
                onPress={() => handleDateChange(1)}
                disabled={isToday}
                style={styles.arrowButton}>
                <ThemedText themeColor={isToday ? 'backgroundElement' : 'textSecondary'}>
                  →
                </ThemedText>
              </TouchableOpacity>
            </View>

            <CategoryPicker selectedId={selectedCategory.id} onChange={handleCategoryChange} />

            <View style={styles.gridContainer}>
              <SpreadsheetEntryGrid ref={gridRef} />
            </View>
          </ScrollView>

          <View style={[styles.saveArea, { paddingBottom: BottomTabInset + Spacing.three }]}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
              style={[styles.saveButton, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {isSaving ? 'Saving…' : 'Save'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  header: {
    paddingHorizontal: Spacing.four,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  arrowButton: {
    padding: Spacing.two,
  },
  gridContainer: {
    marginHorizontal: Spacing.four,
  },
  saveArea: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  saveButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
