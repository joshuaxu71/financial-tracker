import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES, getCategoryById } from '@/constants/categories';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getExpensesByMonth, type Expense } from '@/db/expenses';
import {
  deleteBudget,
  getBudgets,
  insertBudget,
  updateBudget,
  type Budget,
  type NewBudget,
} from '@/db/budgets';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount } from '@/utils/currency';
import { currentYearMonth, formatMonthYear } from '@/utils/date';

function spendingForBudget(expenses: Expense[], budget: Budget): number {
  const relevant =
    budget.category_ids.length === 0
      ? expenses
      : expenses.filter((e) => budget.category_ids.includes(e.category_id));
  return relevant.reduce((sum, e) => sum + e.amount, 0);
}

type BudgetDraft = {
  name: string;
  amount: string;
  appliesToAll: boolean;
  selectedCategoryIds: Set<number>;
};

function emptyDraft(): BudgetDraft {
  return { name: '', amount: '', appliesToAll: true, selectedCategoryIds: new Set() };
}

function draftFromBudget(budget: Budget): BudgetDraft {
  return {
    name: budget.name,
    amount: String(budget.amount),
    appliesToAll: budget.category_ids.length === 0,
    selectedCategoryIds: new Set(budget.category_ids),
  };
}

export default function BudgetScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { year, month } = currentYearMonth();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [draft, setDraft] = useState<BudgetDraft>(emptyDraft);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [b, e] = await Promise.all([
        getBudgets(db),
        getExpensesByMonth(db, year, month),
      ]);
      setBudgets(b);
      setExpenses(e);
    } finally {
      setIsLoading(false);
    }
  }, [db, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddModal() {
    setEditingBudget(null);
    setDraft(emptyDraft());
    setModalVisible(true);
  }

  function openEditModal(budget: Budget) {
    setEditingBudget(budget);
    setDraft(draftFromBudget(budget));
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingBudget(null);
    setDraft(emptyDraft());
  }

  async function handleSave() {
    const amount = parseFloat(draft.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive budget amount.');
      return;
    }
    if (!draft.appliesToAll && draft.selectedCategoryIds.size === 0) {
      Alert.alert('No categories', 'Select at least one category, or choose "All expenses".');
      return;
    }

    const categoryNames = draft.appliesToAll
      ? 'All expenses'
      : [...draft.selectedCategoryIds].map((id) => getCategoryById(id)?.name ?? '').join(', ');

    const newBudget: NewBudget = {
      name: draft.name.trim() || categoryNames,
      amount,
      period: 'monthly',
      category_ids: draft.appliesToAll ? [] : [...draft.selectedCategoryIds],
    };

    try {
      if (editingBudget) {
        await updateBudget(db, editingBudget.id, newBudget);
      } else {
        await insertBudget(db, newBudget);
      }
      closeModal();
      load();
    } catch {
      Alert.alert('Save failed', 'Could not save the budget. Please try again.');
    }
  }

  function handleDeletePress(budget: Budget) {
    Alert.alert('Delete budget', `Remove "${budget.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(db, budget.id);
          load();
        },
      },
    ]);
  }

  function toggleCategory(id: number) {
    setDraft((prev) => {
      const next = new Set(prev.selectedCategoryIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, selectedCategoryIds: next };
    });
  }

  const monthLabel = formatMonthYear(year, month);
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Budget</ThemedText>
            <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                + Add
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedView type="backgroundElement" style={styles.summaryCard}>
            <ThemedText type="small" themeColor="textSecondary">
              {monthLabel}
            </ThemedText>
            <ThemedText type="subtitle">{formatAmount(totalSpend)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              total spent
            </ThemedText>
          </ThemedView>

          {isLoading ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Loading…
            </ThemedText>
          ) : budgets.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No budgets yet. Tap + Add to create one.
            </ThemedText>
          ) : (
            budgets.map((budget) => {
              const spent = spendingForBudget(expenses, budget);
              const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
              const isOver = pct > 100;
              const scopeLabel =
                budget.category_ids.length === 0
                  ? 'All expenses'
                  : budget.category_ids
                      .map((id) => getCategoryById(id)?.name ?? '')
                      .join(', ');
              const progressWidth = `${Math.min(pct, 100).toFixed(1)}%`;

              return (
                <TouchableOpacity
                  key={budget.id}
                  onPress={() => openEditModal(budget)}
                  onLongPress={() => handleDeletePress(budget)}
                  activeOpacity={0.7}>
                  <ThemedView type="backgroundElement" style={styles.budgetCard}>
                    <View style={styles.budgetCardHeader}>
                      <ThemedText type="smallBold">{budget.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatAmount(spent)} / {formatAmount(budget.amount)}
                      </ThemedText>
                    </View>

                    <ThemedText type="small" themeColor="textSecondary">
                      {scopeLabel}
                    </ThemedText>

                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: theme.backgroundSelected },
                      ]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            width: progressWidth as any,
                            backgroundColor: isOver ? '#ef4444' : theme.text,
                          },
                        ]}
                      />
                    </View>

                    <ThemedText type="small" themeColor={isOver ? 'text' : 'textSecondary'}>
                      {Math.round(pct)}%{isOver ? ' — over budget' : ''}
                    </ThemedText>
                  </ThemedView>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold">
                  {editingBudget ? 'Edit Budget' : 'New Budget'}
                </ThemedText>
                <TouchableOpacity onPress={closeModal}>
                  <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" themeColor="textSecondary">
                  Name (optional)
                </ThemedText>
                <TextInput
                  value={draft.name}
                  onChangeText={(v) => setDraft((p) => ({ ...p, name: v }))}
                  placeholder="e.g. Monthly food"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.textInput,
                    { color: theme.text, borderColor: theme.backgroundElement },
                  ]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" themeColor="textSecondary">
                  Monthly amount
                </ThemedText>
                <TextInput
                  value={draft.amount}
                  onChangeText={(v) => setDraft((p) => ({ ...p, amount: v }))}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  style={[
                    styles.textInput,
                    { color: theme.text, borderColor: theme.backgroundElement },
                  ]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" themeColor="textSecondary">
                  Applies to
                </ThemedText>

                <TouchableOpacity
                  onPress={() => setDraft((p) => ({ ...p, appliesToAll: true }))}
                  style={[
                    styles.scopeOption,
                    {
                      backgroundColor: draft.appliesToAll
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText type="small">All expenses</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDraft((p) => ({ ...p, appliesToAll: false }))}
                  style={[
                    styles.scopeOption,
                    {
                      backgroundColor: !draft.appliesToAll
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText type="small">Specific categories</ThemedText>
                </TouchableOpacity>

                {!draft.appliesToAll && (
                  <View style={styles.categoryList}>
                    {CATEGORIES.map((cat) => {
                      const isSelected = draft.selectedCategoryIds.has(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => toggleCategory(cat.id)}
                          style={[
                            styles.categoryOption,
                            {
                              backgroundColor: isSelected
                                ? theme.backgroundSelected
                                : theme.backgroundElement,
                            },
                          ]}>
                          <ThemedText type="small">{cat.name}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.8}
                style={[styles.saveButton, { backgroundColor: theme.text }]}>
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  Save
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    padding: Spacing.two,
  },
  summaryCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
    paddingTop: Spacing.six,
  },
  budgetCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  budgetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalContent: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scopeOption: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  categoryList: {
    gap: Spacing.two,
    paddingLeft: Spacing.three,
  },
  categoryOption: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  saveButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
