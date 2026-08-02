import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
   Alert,
   FlatList,
   Modal,
   StyleSheet,
   TextInput,
   TouchableOpacity,
   View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { type Category, resolveCategoryColor } from "@/constants/categories";
import { CATEGORY_COLORS } from "@/constants/category-colors";
import { BottomTabInset, Spacing } from "@/constants/theme";
import {
   type CategoryRow,
   deleteCategory,
   getAllCategories,
   getCategoryUsage,
   insertCategory,
   updateCategory,
} from "@/db/categories";
import { useTheme } from "@/hooks/use-theme";

type Props = {
   visible: boolean;
   onDismiss: () => void;
   onChanged: () => void;
};

type TreeNode = {
   category: Category;
   depth: number;
   children: TreeNode[];
};

function buildTree(categories: readonly Category[]): TreeNode[] {
   const byParent = new Map<number | null, Category[]>();
   for (const c of categories) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
   }
   function build(cats: Category[], depth: number): TreeNode[] {
      return cats.map((c) => ({
         category: c,
         depth,
         children: build(byParent.get(c.id) ?? [], depth + 1),
      }));
   }
   return build(byParent.get(null) ?? [], 0);
}

export function CategoriesModal({ visible, onDismiss, onChanged }: Props) {
   const db = useSQLiteContext();
   const theme = useTheme();

   const [categories, setCategories] = useState<CategoryRow[]>([]);
   const [usage, setUsage] = useState<Map<number, number>>(new Map());
   const [expanded, setExpanded] = useState<Set<number>>(new Set());
   const [editor, setEditor] = useState<{
      mode: "new" | "edit";
      id: number | null;
      name: string;
      parentId: number | null;
      color: string | null;
   } | null>(null);
   const [showParentPicker, setShowParentPicker] = useState(false);
   const [showReassign, setShowReassign] = useState(false);

   const load = useCallback(async () => {
      const cats = await getAllCategories(db);
      setCategories(cats);
      setUsage(await getCategoryUsage(db));
      setExpanded(new Set(cats.filter((c) => c.parent_id === null).map((c) => c.id)));
   }, [db]);

   const tree = useMemo(() => buildTree(categories), [categories]);

   const descendants = useMemo(() => {
      const set = new Set<number>();
      function visit(id: number) {
         for (const c of categories) {
            if (c.parent_id === id && !set.has(c.id)) {
               set.add(c.id);
               visit(c.id);
            }
         }
      }
      return (id: number) => {
         set.clear();
         visit(id);
         return set;
      };
   }, [categories]);

   function toggle(id: number) {
      setExpanded((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   }

   function openNew() {
      setEditor({ mode: "new", id: null, name: "", parentId: null, color: null });
   }

   function openEdit(category: Category) {
      setEditor({
         mode: "edit",
         id: category.id,
         name: category.name,
         parentId: category.parent_id,
         color: category.color,
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
      try {
         if (editor.mode === "new") {
            await insertCategory(db, {
               name: editor.name,
               parent_id: editor.parentId,
               color: editor.color,
            });
         } else if (editor.id != null) {
            await updateCategory(db, editor.id, {
               name: editor.name,
               parent_id: editor.parentId,
               color: editor.color,
            });
         }
         setEditor(null);
         await load();
         onChanged();
      } catch {
         Alert.alert("Save failed", "Could not save the category.");
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

   async function reassignAndDelete(targetId: number) {
      if (!editor || editor.id == null) return;
      await deleteCategory(db, editor.id, targetId);
      setShowReassign(false);
      setEditor(null);
      await load();
      onChanged();
   }

   const reassignTargets = useMemo(() => {
      if (!editor?.id) return categories;
      const excluded = new Set<number>([editor.id]);
      descendants(editor.id).forEach((id) => excluded.add(id));
      return categories.filter((c) => !excluded.has(c.id));
   }, [categories, editor, descendants]);

   const parentName = editor
      ? (categories.find((c) => c.id === editor.parentId)?.name ?? "None (top level)")
      : "";

   function renderNode(node: TreeNode) {
      const isExpanded = expanded.has(node.category.id);
      const hasChildren = node.children.length > 0;
      const dotColor = resolveCategoryColor(categories, node.category.id);
      const count = usage.get(node.category.id) ?? 0;
      const isTopLevel = node.category.parent_id === null;

      return (
         <View key={node.category.id}>
            <TouchableOpacity
               style={[styles.row, { paddingLeft: Spacing.four + node.depth * Spacing.three }]}
               activeOpacity={0.7}
               onPress={() => (hasChildren ? toggle(node.category.id) : openEdit(node.category))}
               onLongPress={() => openEdit(node.category)}
            >
               <View style={[styles.dot, { backgroundColor: dotColor }]} />
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
            </TouchableOpacity>
            {hasChildren && isExpanded && node.children.map((child) => renderNode(child))}
         </View>
      );
   }

   return (
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss} onShow={load}>
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
            <Modal transparent animationType="fade" onRequestClose={() => setEditor(null)}>
               <TouchableOpacity
                  style={styles.overlay}
                  activeOpacity={1}
                  onPress={() => setEditor(null)}
               >
                  <View
                     style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
                     onStartShouldSetResponder={() => true}
                  >
                     <ThemedText type="smallBold" style={styles.sheetTitle}>
                        {editor.mode === "new" ? "New category" : `Edit ${editor.name}`}
                     </ThemedText>

                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Name
                     </ThemedText>
                     <TextInput
                        value={editor.name}
                        onChangeText={(v) => setEditor({ ...editor, name: v })}
                        placeholder="e.g. Travel"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                           styles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                        autoFocus
                     />

                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Parent
                     </ThemedText>
                     <TouchableOpacity
                        style={[styles.parentRow, { backgroundColor: theme.backgroundSelected }]}
                        onPress={() => setShowParentPicker(true)}
                     >
                        <ThemedText>{parentName}</ThemedText>
                        <ThemedText themeColor="textSecondary">▾</ThemedText>
                     </TouchableOpacity>

                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Color
                     </ThemedText>
                     <View style={styles.swatchRow}>
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
                                 style={editor.color === null && styles.selectedText}
                              >
                                 Inherit
                              </ThemedText>
                           </TouchableOpacity>
                        )}
                        {CATEGORY_COLORS.map((c) => (
                           <TouchableOpacity
                              key={c}
                              style={[
                                 styles.swatch,
                                 { backgroundColor: c },
                                 editor.color === c && styles.swatchSelected,
                              ]}
                              onPress={() => setEditor({ ...editor, color: c })}
                           />
                        ))}
                     </View>

                     <View style={styles.sheetActions}>
                        {editor.mode === "edit" && (
                           <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton}>
                              <ThemedText type="smallBold" style={styles.deleteText}>
                                 Delete
                              </ThemedText>
                           </TouchableOpacity>
                        )}
                        <TouchableOpacity
                           onPress={save}
                           style={[styles.saveButton, { backgroundColor: theme.text }]}
                        >
                           <ThemedText type="smallBold" style={{ color: theme.background }}>
                              Save
                           </ThemedText>
                        </TouchableOpacity>
                     </View>
                  </View>
               </TouchableOpacity>
            </Modal>
         )}

         {showParentPicker && editor && (
            <Modal
               transparent
               animationType="fade"
               onRequestClose={() => setShowParentPicker(false)}
            >
               <TouchableOpacity
                  style={styles.overlay}
                  activeOpacity={1}
                  onPress={() => setShowParentPicker(false)}
               >
                  <View
                     style={[styles.picker, { backgroundColor: theme.backgroundElement }]}
                     onStartShouldSetResponder={() => true}
                  >
                     <ThemedText type="smallBold" style={styles.sheetTitle}>
                        Parent
                     </ThemedText>
                     <TouchableOpacity
                        style={styles.pickerRow}
                        onPress={() => {
                           setEditor({ ...editor, parentId: null });
                           setShowParentPicker(false);
                        }}
                     >
                        <ThemedText style={editor.parentId === null && styles.selectedText}>
                           None (top level)
                        </ThemedText>
                        {editor.parentId === null && (
                           <ThemedText themeColor="textSecondary">✓</ThemedText>
                        )}
                     </TouchableOpacity>
                     {categories
                        .filter(
                           (c) => !descendants(editor.id ?? -1).has(c.id) && c.id !== editor.id,
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
                                 <View style={[styles.dot, { backgroundColor: color }]} />
                                 <ThemedText
                                    style={[
                                       styles.pickerLabel,
                                       editor.parentId === c.id && styles.selectedText,
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
                  </View>
               </TouchableOpacity>
            </Modal>
         )}

         {showReassign && editor && (
            <Modal transparent animationType="fade" onRequestClose={() => setShowReassign(false)}>
               <TouchableOpacity
                  style={styles.overlay}
                  activeOpacity={1}
                  onPress={() => setShowReassign(false)}
               >
                  <View
                     style={[styles.picker, { backgroundColor: theme.backgroundElement }]}
                     onStartShouldSetResponder={() => true}
                  >
                     <ThemedText type="smallBold" style={styles.sheetTitle}>
                        Move {usage.get(editor.id ?? -1) ?? 0} expenses to…
                     </ThemedText>
                     <ThemedText themeColor="textSecondary" style={styles.sheetSubtitle}>
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
                              <View style={[styles.dot, { backgroundColor: color }]} />
                              <ThemedText style={styles.pickerLabel}>{c.name}</ThemedText>
                           </TouchableOpacity>
                        );
                     })}
                     <TouchableOpacity
                        style={styles.pickerRow}
                        onPress={() => setShowReassign(false)}
                     >
                        <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                     </TouchableOpacity>
                  </View>
               </TouchableOpacity>
            </Modal>
         )}
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
      paddingVertical: Spacing.one,
   },
   dot: {
      flexShrink: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
   },
   rowName: { flex: 1, fontSize: 15 },
   count: { fontSize: 12 },
   editHint: { fontSize: 12 },
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
   sheetTitle: { marginBottom: Spacing.one },
   sheetSubtitle: { marginBottom: Spacing.two },
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
   parentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.two,
   },
   swatchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.two,
      marginTop: Spacing.one,
   },
   inheritChip: {
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      borderRadius: Spacing.two,
   },
   swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
   },
   swatchSelected: {
      borderWidth: 2,
      borderColor: "#fff",
   },
   sheetActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: Spacing.three,
      marginTop: Spacing.four,
   },
   deleteButton: {
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
   },
   deleteText: { color: "#FF453A" },
   saveButton: {
      alignItems: "center",
      paddingHorizontal: Spacing.five,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.three,
   },
   selectedText: { fontWeight: "700" },
   picker: {
      width: 280,
      maxHeight: 420,
      padding: Spacing.three,
      borderRadius: Spacing.three,
   },
   pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingHorizontal: Spacing.one,
      paddingVertical: Spacing.two,
   },
   pickerLabel: { flex: 1 },
});
