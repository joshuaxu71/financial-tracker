import { useCallback, useEffect, useState } from 'react';
import { Alert, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCategoryById } from '@/constants/categories';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { deleteExpense, getExpensesByMonth, type Expense } from '@/db/expenses';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount } from '@/utils/currency';
import {
  currentYearMonth,
  formatDisplayDate,
  formatMonthYear,
  nextMonth,
  prevMonth,
} from '@/utils/date';

type DateSection = {
  date: string;
  total: number;
  data: Expense[];
};

function groupByDate(expenses: Expense[]): DateSection[] {
  const map = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const group = map.get(expense.date) ?? [];
    group.push(expense);
    map.set(expense.date, group);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({
      date,
      total: data.reduce((sum, e) => sum + e.amount, 0),
      data,
    }));
}

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { year: initYear, month: initMonth } = currentYearMonth();

  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getExpensesByMonth(db, year, month);
      setExpenses(data);
    } finally {
      setIsLoading(false);
    }
  }, [db, year, month]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  function handleDeletePress(id: string) {
    Alert.alert('Delete expense', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(db, id);
          loadExpenses();
        },
      },
    ]);
  }

  function navigatePrev() {
    const prev = prevMonth(year, month);
    setYear(prev.year);
    setMonth(prev.month);
  }

  function navigateNext() {
    const next = nextMonth(year, month);
    setYear(next.year);
    setMonth(next.month);
  }

  const isCurrentMonth = year === initYear && month === initMonth;
  const sections = groupByDate(expenses);
  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ThemedText type="subtitle">History</ThemedText>

              <View style={styles.monthNav}>
                <TouchableOpacity onPress={navigatePrev} style={styles.arrowButton}>
                  <ThemedText themeColor="textSecondary">←</ThemedText>
                </TouchableOpacity>

                <View style={styles.monthInfo}>
                  <ThemedText type="smallBold">{formatMonthYear(year, month)}</ThemedText>
                  {!isLoading && expenses.length > 0 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatAmount(monthTotal)} total
                    </ThemedText>
                  )}
                </View>

                <TouchableOpacity
                  onPress={navigateNext}
                  disabled={isCurrentMonth}
                  style={styles.arrowButton}>
                  <ThemedText themeColor={isCurrentMonth ? 'backgroundElement' : 'textSecondary'}>
                    →
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {isLoading ? 'Loading…' : 'No expenses this month.'}
            </ThemedText>
          }
          renderSectionHeader={({ section }) => (
            <View
              style={[styles.sectionHeader, { borderBottomColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDisplayDate(section.date)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatAmount(section.total)}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => {
            const category = getCategoryById(item.category_id);
            return (
              <TouchableOpacity
                onLongPress={() => handleDeletePress(item.id)}
                activeOpacity={0.7}
                style={styles.expenseRow}>
                <ThemedView type="backgroundElement" style={styles.categoryChip}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {category?.name ?? '—'}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={styles.description} numberOfLines={1}>
                  {item.description || '—'}
                </ThemedText>
                <ThemedText type="smallBold">{formatAmount(item.amount)}</ThemedText>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  listHeader: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    padding: Spacing.two,
  },
  monthInfo: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  emptyText: {
    textAlign: 'center',
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  categoryChip: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  description: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
});
