import { usePowerSync } from "@powersync/react";
import { useCallback, useMemo, useState } from "react";
import {
   Alert,
   type DimensionValue,
   FlatList,
   Modal,
   StyleSheet,
   TextInput,
   TouchableOpacity,
   View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Overlay } from "@/components/overlay";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
   type CategoryTreeNode,
   buildCategoryTree,
   resolveCategoryColor,
} from "@/constants/categories";
import { CATEGORY_COLORS } from "@/constants/category-colors";
import { sheetStyles } from "@/constants/sheet-styles";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useSettings } from "@/context/settings-context";
import {
   type BudgetMovementRow,
   type CategoryRow,
   addBudgetMovement,
   deleteCategory,
   ensureMonthlyAllocations,
   getAllCategories,
   getBudgetMovements,
   getCategoryUsage,
   insertCategory,
   updateCategory,
} from "@/db/categories";
import { getRates } from "@/db/rates";
import { getAllSources } from "@/db/sources";
import { type Transaction, getAllTransactions } from "@/db/transactions";
import {
   type BudgetState,
   budgetStateForMonth,
   convertTransactionsToBase,
} from "@/features/budget/budget-calc";
import { useTheme } from "@/hooks/use-theme";
import { formatAmount } from "@/utils/currency";
import { today } from "@/utils/date";

type Props = {
   visible: boolean;
   year: number;
   month: number;
   onDismiss: () => void;
   onChanged: () => void;
};

type TreeNode = CategoryTreeNode<CategoryRow>;

function budgetViolation(categories: readonly CategoryRow[]): string | null {
   const hasChildren = (id: string) => categories.some((c) => c.parent_id === id);
   for (const group of categories) {
      if (group.budget == null) continue;
      const leaves = categories.filter((c) => c.parent_id === group.id && !hasChildren(c.id));
      if (leaves.length === 0) continue;
      const setLeaves = leaves.filter((l) => l.budget != null);
      const sum = setLeaves.reduce((s, l) => s + (l.budget ?? 0), 0);
      if (setLeaves.length === leaves.length) {
         if (Math.abs(sum - group.budget) > 0.009) {
            return `"${group.name}" has a budget of ¥${group.budget}, but its sub-categories total ¥${sum}. When all are set they must match exactly.`;
         }
      } else if (sum > group.budget) {
         return `"${group.name}" has a budget of ¥${group.budget}, but its set sub-categories already total ¥${sum}. Unset ones share the remainder.`;
      }
   }
   return null;
}

export function CategoriesModal({ visible, year, month, onDismiss, onChanged }: Props) {
   const db = usePowerSync();
   const theme = useTheme();
   const { baseCurrency } = useSettings();

   const [categories, setCategories] = useState<CategoryRow[]>([]);
   const [usage, setUsage] = useState<Map<string, number>>(new Map());
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [movements, setMovements] = useState<BudgetMovementRow[]>([]);
   const [expanded, setExpanded] = useState<Set<string>>(new Set());
   const [balanceEditor, setBalanceEditor] = useState<{
      categoryId: string;
      value: string;
      currentAvailable: number;
   } | null>(null);
   const [editor, setEditor] = useState<{
      mode: "new" | "edit";
      id: string | null;
      name: string;
      parentId: string | null;
      color: string | null;
      budget: string;
   } | null>(null);
   const [showParentPicker, setShowParentPicker] = useState(false);
   const [showReassign, setShowReassign] = useState(false);

   const load = useCallback(async () => {
      const cats = await getAllCategories(db);
      setCategories(cats);
      setUsage(await getCategoryUsage(db));
      await ensureMonthlyAllocations(db, cats);
      setMovements(await getBudgetMovements(db));
      const [rawTransactions, s, r] = await Promise.all([
         getAllTransactions(db),
         getAllSources(db),
         getRates(db),
      ]);
      setTransactions(convertTransactionsToBase(rawTransactions, s, r, baseCurrency));
      setExpanded(new Set(cats.filter((c) => c.parent_id === null).map((c) => c.id)));
   }, [db]);

   const tree = useMemo(() => buildCategoryTree(categories), [categories]);

   const descendants = useMemo(() => {
      const set = new Set<string>();
      function visit(id: string) {
         for (const c of categories) {
            if (c.parent_id === id && !set.has(c.id)) {
               set.add(c.id);
               visit(c.id);
            }
         }
      }
      return (id: string) => {
         set.clear();
         visit(id);
         return set;
      };
   }, [categories]);

   function toggle(id: string) {
      setExpanded((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   }

   function openNew() {
      setEditor({ mode: "new", id: null, name: "", parentId: null, color: null, budget: "" });
   }

   function openEdit(category: CategoryRow) {
      setEditor({
         mode: "edit",
         id: category.id,
         name: category.name,
         parentId: category.parent_id,
         color: category.color,
         budget: category.budget != null ? String(category.budget) : "",
      });
   }

   async function save() {
      if (!editor) return;
      if (editor.name.trim() === "") {
         Alert.alert("Name required", "Please enter a category name.");
         return;
      }
      if (editor.parentId === null && editor.color === null) {
         Alert.alert("Color required", "Top-level categories need a color.");
         return;
      }
      const budget = editor.budget.trim() === "" ? null : parseFloat(editor.budget);
      if (budget !== null && (isNaN(budget) || budget < 0)) {
         Alert.alert("Invalid budget", "Enter a positive number, or leave it empty for no budget.");
         return;
      }

      const prospective = categories.map((c) =>
         c.id === editor.id
            ? {
                 ...c,
                 name: editor.name.trim(),
                 parent_id: editor.parentId,
                 color: editor.color,
                 budget,
              }
            : c,
      );
      const violation = budgetViolation(prospective);
      if (violation) {
         Alert.alert("Budget mismatch", violation);
         return;
      }

      try {
         if (editor.mode === "new") {
            await insertCategory(db, {
               name: editor.name,
               parent_id: editor.parentId,
               color: editor.color,
               budget,
            });
         } else if (editor.id != null) {
            await updateCategory(db, editor.id, {
               name: editor.name,
               parent_id: editor.parentId,
               color: editor.color,
               budget,
            });
         }
         setEditor(null);
         await load();
         onChanged();
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         Alert.alert("Save failed", `Could not save the category.\n\n${message}`);
      }
   }

   function confirmDelete() {
      if (!editor || editor.id == null) return;
      const count = usage.get(editor.id) ?? 0;
      if (count > 0) {
         setShowReassign(true);
      } else {
         Alert.alert("Delete category", `Delete "${editor.name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
               text: "Delete",
               style: "destructive",
               onPress: async () => {
                  await deleteCategory(db, editor.id!, null);
                  setEditor(null);
                  await load();
                  onChanged();
               },
            },
         ]);
      }
   }

   async function reassignAndDelete(targetId: string) {
      if (!editor || editor.id == null) return;
      await deleteCategory(db, editor.id, targetId);
      setShowReassign(false);
      setEditor(null);
      await load();
      onChanged();
   }

   function openSetBalance() {
      if (!editor || editor.id == null) return;
      const budget = budgetForId(editor.id);
      const currentAvailable = Math.round(budget?.available ?? 0);
      setBalanceEditor({
         categoryId: editor.id,
         value: String(currentAvailable),
         currentAvailable,
      });
   }

   const reassignTargets = useMemo(() => {
      if (!editor?.id) return categories;
      const excluded = new Set<string>([editor.id]);
      descendants(editor.id).forEach((id) => excluded.add(id));
      return categories.filter((c) => !excluded.has(c.id));
   }, [categories, editor, descendants]);

   const parentName = editor
      ? (categories.find((c) => c.id === editor.parentId)?.name ?? "None (top level)")
      : "";

   function budgetForId(id: string): BudgetState | null {
      const cat = categories.find((c) => c.id === id);
      if (cat?.budget == null) return null;
      return budgetStateForMonth(categories, transactions, movements, id, year, month);
   }

   function renderNode(node: TreeNode) {
      const isExpanded = expanded.has(node.category.id);
      const hasChildren = node.children.length > 0;
      const dotColor = resolveCategoryColor(categories, node.category.id);
      const count = usage.get(node.category.id) ?? 0;
      const isTopLevel = node.category.parent_id === null;
      const budget = budgetForId(node.category.id);
      const spent = budget?.spent ?? 0;
      const available = budget?.available ?? 0;
      const pct = available > 0 ? Math.min((spent / available) * 100, 100) : 0;
      const isOver = available > 0 && spent > available;
      const showBudgetBar = budget != null && !(hasChildren && isExpanded);

      return (
         <View key={node.category.id}>
            <TouchableOpacity
               style={styles.row}
               activeOpacity={0.7}
               onPress={() => (hasChildren ? toggle(node.category.id) : openEdit(node.category))}
               onLongPress={() => openEdit(node.category)}
            >
               <ThemedView style={[sheetStyles.dot, { backgroundColor: dotColor }]} />
               <View style={styles.rowMain}>
                  <View style={styles.rowTop}>
                     <ThemedText style={styles.rowName} numberOfLines={1}>
                        {node.category.name}
                     </ThemedText>
                     {count > 0 && (
                        <ThemedText themeColor="textSecondary" style={styles.count}>
                           {count}
                        </ThemedText>
                     )}
                     {hasChildren ? (
                        <ThemedText themeColor="textSecondary">{isExpanded ? "▾" : "▸"}</ThemedText>
                     ) : isTopLevel ? null : (
                        <ThemedText themeColor="textSecondary" style={styles.editHint}>
                           edit
                        </ThemedText>
                     )}
                  </View>
                  {showBudgetBar && (
                     <View style={styles.rowBudget}>
                        <ThemedText
                           type="small"
                           themeColor={isOver ? "text" : "textSecondary"}
                           style={styles.budgetText}
                        >
                           {formatAmount(spent)} / {formatAmount(available)}
                        </ThemedText>
                        <ThemedView themeColor="backgroundSelected" style={styles.budgetTrack}>
                           <ThemedView
                              style={[
                                 styles.budgetFill,
                                 {
                                    width: `${pct.toFixed(1)}%` as DimensionValue,
                                    backgroundColor: isOver ? "#ef4444" : dotColor,
                                 },
                              ]}
                           />
                        </ThemedView>
                     </View>
                  )}
               </View>
            </TouchableOpacity>
            {hasChildren && isExpanded && (
               <View style={[styles.childGroup, { borderTopColor: theme.backgroundSelected }]}>
                  {node.children.map((child) => renderNode(child))}
               </View>
            )}
         </View>
      );
   }

   return (
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss} onShow={load}>
         <SafeAreaProvider>
            <SafeAreaView style={styles.flex} edges={["top"]}>
               <View style={styles.header}>
                  <ThemedText type="subtitle" style={styles.headerTitle}>
                     Categories
                  </ThemedText>
                  <View style={styles.headerActions}>
                     <TouchableOpacity
                        onPress={openNew}
                        style={[styles.addButton, { backgroundColor: theme.text }]}
                     >
                        <ThemedText type="smallBold" style={{ color: theme.background }}>
                           + New
                        </ThemedText>
                     </TouchableOpacity>
                     <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                        <ThemedText themeColor="textSecondary">Done</ThemedText>
                     </TouchableOpacity>
                  </View>
               </View>

               <FlatList
                  data={tree}
                  keyExtractor={(n) => String(n.category.id)}
                  renderItem={({ item }) => renderNode(item)}
                  contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.five }}
               />
            </SafeAreaView>

            {editor && (
               <Overlay visible onRequestClose={() => setEditor(null)}>
                  <ThemedView themeColor="backgroundElement" style={sheetStyles.sheet}>
                     <ThemedText type="smallBold" style={sheetStyles.title}>
                        {editor.mode === "new" ? "New category" : `Edit ${editor.name}`}
                     </ThemedText>

                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Name
                     </ThemedText>
                     <TextInput
                        value={editor.name}
                        onChangeText={(v) => setEditor({ ...editor, name: v })}
                        placeholder="e.g. Travel"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                           sheetStyles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                        autoFocus
                     />

                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Parent
                     </ThemedText>
                     <TouchableOpacity
                        style={[
                           sheetStyles.selectRow,
                           { backgroundColor: theme.backgroundSelected },
                        ]}
                        onPress={() => setShowParentPicker(true)}
                     >
                        <ThemedText>{parentName}</ThemedText>
                        <ThemedText themeColor="textSecondary">▾</ThemedText>
                     </TouchableOpacity>

                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Color
                     </ThemedText>
                     <View style={sheetStyles.swatchRow}>
                        {editor.parentId !== null && (
                           <TouchableOpacity
                              style={[
                                 styles.inheritChip,
                                 { backgroundColor: theme.backgroundSelected },
                              ]}
                              onPress={() => setEditor({ ...editor, color: null })}
                           >
                              <ThemedText
                                 type="small"
                                 style={editor.color === null && sheetStyles.selectedText}
                              >
                                 Inherit
                              </ThemedText>
                           </TouchableOpacity>
                        )}
                        {CATEGORY_COLORS.map((c) => (
                           <TouchableOpacity
                              key={c}
                              style={[
                                 sheetStyles.swatch,
                                 { backgroundColor: c },
                                 editor.color === c && sheetStyles.swatchSelected,
                              ]}
                              onPress={() => setEditor({ ...editor, color: c })}
                           />
                        ))}
                     </View>

                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Monthly budget
                     </ThemedText>
                     <TextInput
                        value={editor.budget}
                        onChangeText={(v) => setEditor({ ...editor, budget: v })}
                        placeholder={
                           editor.parentId === null ? "e.g. 150000 (¥)" : "Empty = no budget"
                        }
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                        style={[
                           sheetStyles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                     />
                     <ThemedText themeColor="textSecondary" style={styles.budgetHint}>
                        {editor.parentId === null
                           ? "Group budget. If all sub-categories set one, they must equal this."
                           : "Sub-category budget. Unset ones share the group's remainder."}
                     </ThemedText>
                     {editor.mode === "edit" &&
                        editor.id != null &&
                        categories.find((c) => c.id === editor.id)?.budget != null && (
                           <TouchableOpacity
                              onPress={openSetBalance}
                              style={styles.setBalanceButton}
                           >
                              <ThemedText type="small" style={styles.setBalanceText}>
                                 Set balance
                              </ThemedText>
                           </TouchableOpacity>
                        )}

                     <View style={sheetStyles.actions}>
                        {editor.mode === "edit" && (
                           <TouchableOpacity
                              onPress={confirmDelete}
                              style={sheetStyles.deleteButton}
                           >
                              <ThemedText type="smallBold" style={sheetStyles.deleteText}>
                                 Delete
                              </ThemedText>
                           </TouchableOpacity>
                        )}
                        <TouchableOpacity
                           onPress={save}
                           style={[sheetStyles.saveButton, { backgroundColor: theme.text }]}
                        >
                           <ThemedText type="smallBold" style={{ color: theme.background }}>
                              Save
                           </ThemedText>
                        </TouchableOpacity>
                     </View>
                  </ThemedView>
               </Overlay>
            )}

            {showParentPicker && editor && (
               <Overlay visible onRequestClose={() => setShowParentPicker(false)}>
                  <ThemedView themeColor="backgroundElement" style={sheetStyles.picker}>
                     <ThemedText type="smallBold" style={sheetStyles.title}>
                        Parent
                     </ThemedText>
                     <TouchableOpacity
                        style={styles.pickerRow}
                        onPress={() => {
                           setEditor({ ...editor, parentId: null });
                           setShowParentPicker(false);
                        }}
                     >
                        <ThemedText style={editor.parentId === null && sheetStyles.selectedText}>
                           None (top level)
                        </ThemedText>
                        {editor.parentId === null && (
                           <ThemedText themeColor="textSecondary">✓</ThemedText>
                        )}
                     </TouchableOpacity>
                     {categories
                        .filter(
                           (c) => !descendants(editor.id ?? "").has(c.id) && c.id !== editor.id,
                        )
                        .map((c) => {
                           const color = resolveCategoryColor(categories, c.id);
                           return (
                              <TouchableOpacity
                                 key={c.id}
                                 style={styles.pickerRow}
                                 onPress={() => {
                                    setEditor({ ...editor, parentId: c.id });
                                    setShowParentPicker(false);
                                 }}
                              >
                                 <ThemedView
                                    style={[sheetStyles.dot, { backgroundColor: color }]}
                                 />
                                 <ThemedText
                                    style={[
                                       sheetStyles.pickerLabel,
                                       editor.parentId === c.id && sheetStyles.selectedText,
                                    ]}
                                 >
                                    {c.name}
                                 </ThemedText>
                                 {editor.parentId === c.id && (
                                    <ThemedText themeColor="textSecondary">✓</ThemedText>
                                 )}
                              </TouchableOpacity>
                           );
                        })}
                  </ThemedView>
               </Overlay>
            )}

            {balanceEditor && (
               <Overlay visible onRequestClose={() => setBalanceEditor(null)}>
                  <ThemedView themeColor="backgroundElement" style={sheetStyles.sheet}>
                     <ThemedText type="smallBold" style={sheetStyles.title}>
                        Set balance
                     </ThemedText>
                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Available balance as of today
                     </ThemedText>
                     <TextInput
                        value={balanceEditor.value}
                        onChangeText={(v) => setBalanceEditor({ ...balanceEditor, value: v })}
                        keyboardType="decimal-pad"
                        autoFocus
                        style={[
                           sheetStyles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                     />
                     <View style={sheetStyles.actions}>
                        <TouchableOpacity
                           onPress={() => setBalanceEditor(null)}
                           style={sheetStyles.deleteButton}
                        >
                           <ThemedText type="smallBold" style={sheetStyles.deleteText}>
                              Cancel
                           </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                           onPress={async () => {
                              const newBalance = parseFloat(balanceEditor.value);
                              if (isNaN(newBalance) || newBalance < 0) {
                                 Alert.alert("Invalid balance", "Enter a non-negative number.");
                                 return;
                              }
                              const delta = newBalance - balanceEditor.currentAvailable;
                              await addBudgetMovement(db, balanceEditor.categoryId, today(), delta);
                              setBalanceEditor(null);
                              await load();
                              onChanged();
                           }}
                           style={[sheetStyles.saveButton, { backgroundColor: theme.text }]}
                        >
                           <ThemedText type="smallBold" style={{ color: theme.background }}>
                              Set
                           </ThemedText>
                        </TouchableOpacity>
                     </View>
                  </ThemedView>
               </Overlay>
            )}

            {showReassign && editor && (
               <Overlay visible onRequestClose={() => setShowReassign(false)}>
                  <ThemedView themeColor="backgroundElement" style={sheetStyles.picker}>
                     <ThemedText type="smallBold" style={sheetStyles.title}>
                        Move {usage.get(editor.id ?? "") ?? 0} expenses to…
                     </ThemedText>
                     <ThemedText themeColor="textSecondary" style={sheetStyles.subtitle}>
                        Deleting &quot;{editor.name}&quot; — choose where its expenses go.
                     </ThemedText>
                     {reassignTargets.map((c) => {
                        const color = resolveCategoryColor(categories, c.id);
                        return (
                           <TouchableOpacity
                              key={c.id}
                              style={styles.pickerRow}
                              onPress={() => reassignAndDelete(c.id)}
                           >
                              <ThemedView style={[sheetStyles.dot, { backgroundColor: color }]} />
                              <ThemedText style={sheetStyles.pickerLabel}>{c.name}</ThemedText>
                           </TouchableOpacity>
                        );
                     })}
                     <TouchableOpacity
                        style={styles.pickerRow}
                        onPress={() => setShowReassign(false)}
                     >
                        <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                     </TouchableOpacity>
                  </ThemedView>
               </Overlay>
            )}
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
   headerTitle: { fontSize: 32 },
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
   row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      minHeight: 44,
      paddingRight: Spacing.four,
      paddingLeft: Spacing.four,
      paddingVertical: Spacing.one,
   },
   childGroup: {
      paddingVertical: Spacing.one,
      borderTopWidth: 1,
   },
   rowMain: { flex: 1, gap: Spacing.half, minWidth: 0 },
   rowTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
   },
   rowBudget: { gap: Spacing.half, paddingRight: Spacing.three },
   budgetText: { fontSize: 11 },
   budgetTrack: {
      height: 4,
      borderRadius: 2,
      overflow: "hidden",
   },
   budgetFill: {
      height: "100%",
      borderRadius: 2,
   },

   rowName: { flex: 1, fontSize: 15 },
   count: { fontSize: 12 },
   editHint: { fontSize: 12 },

   budgetHint: {
      marginBottom: Spacing.one,
      fontSize: 11,
   },
   setBalanceButton: {
      alignSelf: "flex-start",
      paddingVertical: Spacing.two,
   },
   setBalanceText: { color: "#0A84FF" },

   inheritChip: {
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      borderRadius: Spacing.two,
   },

   pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingHorizontal: Spacing.one,
      paddingVertical: Spacing.two,
   },
});
