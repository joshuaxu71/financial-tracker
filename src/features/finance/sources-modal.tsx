import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
   Alert,
   FlatList,
   Modal,
   ScrollView,
   StyleSheet,
   TextInput,
   TouchableOpacity,
   View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { CATEGORY_COLORS } from "@/constants/category-colors";
import { CURRENCIES, currencyName } from "@/constants/currencies";
import { BottomTabInset, Spacing } from "@/constants/theme";
import {
   type SourceRow,
   deleteSource,
   getAllSources,
   getSourceUsage,
   insertSource,
   updateSource,
} from "@/db/sources";
import { useTheme } from "@/hooks/use-theme";

type Props = {
   visible: boolean;
   onDismiss: () => void;
   onChanged: () => void;
};

type Editor = {
   mode: "new" | "edit";
   id: number | null;
   name: string;
   currency: string;
   color: string | null;
   openingBalance: string;
};

export function SourcesModal({ visible, onDismiss, onChanged }: Props) {
   const db = useSQLiteContext();
   const theme = useTheme();

   const [sources, setSources] = useState<SourceRow[]>([]);
   const [usage, setUsage] = useState<Map<number, number>>(new Map());
   const [editor, setEditor] = useState<Editor | null>(null);
   const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
   const [showReassign, setShowReassign] = useState(false);

   const load = useCallback(async () => {
      const all = await getAllSources(db);
      setSources(all);
      setUsage(await getSourceUsage(db));
   }, [db]);

   function openNew() {
      setEditor({
         mode: "new",
         id: null,
         name: "",
         currency: "JPY",
         color: null,
         openingBalance: "",
      });
   }

   function openEdit(source: SourceRow) {
      setEditor({
         mode: "edit",
         id: source.id,
         name: source.name,
         currency: source.currency,
         color: source.color,
         openingBalance: source.opening_balance !== 0 ? String(source.opening_balance) : "",
      });
   }

   async function save() {
      if (!editor) return;
      if (editor.name.trim() === "") {
         Alert.alert("Name required", "Please enter a source name.");
         return;
      }
      if (editor.color === null) {
         Alert.alert("Color required", "Please pick a color for this source.");
         return;
      }
      const balance = editor.openingBalance.trim() === "" ? 0 : parseFloat(editor.openingBalance);
      if (isNaN(balance) || balance < 0) {
         Alert.alert("Invalid balance", "Enter a positive number, or leave it empty for ¥0.");
         return;
      }

      try {
         if (editor.mode === "new") {
            await insertSource(db, {
               name: editor.name,
               currency: editor.currency,
               color: editor.color,
               opening_balance: balance,
            });
         } else if (editor.id != null) {
            await updateSource(db, editor.id, {
               name: editor.name,
               currency: editor.currency,
               color: editor.color,
               opening_balance: balance,
            });
         }
         setEditor(null);
         await load();
         onChanged();
      } catch {
         Alert.alert("Save failed", "Could not save the source.");
      }
   }

   function confirmDelete() {
      if (!editor || editor.id == null) return;
      const count = usage.get(editor.id) ?? 0;
      if (count > 0) {
         setShowReassign(true);
      } else {
         Alert.alert("Delete source", `Delete "${editor.name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
               text: "Delete",
               style: "destructive",
               onPress: async () => {
                  await deleteSource(db, editor.id!, null);
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
      await deleteSource(db, editor.id, targetId);
      setShowReassign(false);
      setEditor(null);
      await load();
      onChanged();
   }

   const reassignTargets = sources.filter((s) => s.id !== editor?.id);

   return (
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss} onShow={load}>
         <SafeAreaView style={styles.flex} edges={["top"]}>
            <View style={styles.header}>
               <ThemedText type="subtitle" style={styles.headerTitle}>
                  Sources
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
               data={sources}
               keyExtractor={(s) => String(s.id)}
               renderItem={({ item }) => {
                  const count = usage.get(item.id) ?? 0;
                  return (
                     <TouchableOpacity
                        style={styles.row}
                        activeOpacity={0.7}
                        onPress={() => openEdit(item)}
                     >
                        <View style={[styles.dot, { backgroundColor: item.color ?? "#888888" }]} />
                        <View style={styles.rowMain}>
                           <ThemedText style={styles.rowName} numberOfLines={1}>
                              {item.name}
                           </ThemedText>
                           <ThemedText themeColor="textSecondary" type="small">
                              {currencyName(item.currency)}
                           </ThemedText>
                        </View>
                        {count > 0 && (
                           <ThemedText themeColor="textSecondary" type="small">
                              {count}
                           </ThemedText>
                        )}
                        <ThemedText themeColor="textSecondary" type="small">
                           edit
                        </ThemedText>
                     </TouchableOpacity>
                  );
               }}
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
                        {editor.mode === "new" ? "New source" : `Edit ${editor.name}`}
                     </ThemedText>

                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Name
                     </ThemedText>
                     <TextInput
                        value={editor.name}
                        onChangeText={(v) => setEditor({ ...editor, name: v })}
                        placeholder="e.g. Wise, Rakuten, Credit Card"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                           styles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                        autoFocus
                     />

                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Currency
                     </ThemedText>
                     <TouchableOpacity
                        style={[styles.parentRow, { backgroundColor: theme.backgroundSelected }]}
                        onPress={() => setShowCurrencyPicker(true)}
                     >
                        <ThemedText>
                           {editor.currency} · {currencyName(editor.currency)}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary">▾</ThemedText>
                     </TouchableOpacity>

                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Opening balance
                     </ThemedText>
                     <TextInput
                        value={editor.openingBalance}
                        onChangeText={(v) => setEditor({ ...editor, openingBalance: v })}
                        placeholder={`e.g. 100000 (${editor.currency})`}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                        style={[
                           styles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                     />

                     <ThemedText themeColor="textSecondary" style={styles.label}>
                        Color
                     </ThemedText>
                     <View style={styles.swatchRow}>
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

         {showCurrencyPicker && editor && (
            <Modal
               transparent
               animationType="fade"
               onRequestClose={() => setShowCurrencyPicker(false)}
            >
               <TouchableOpacity
                  style={styles.overlay}
                  activeOpacity={1}
                  onPress={() => setShowCurrencyPicker(false)}
               >
                  <View
                     style={[styles.picker, { backgroundColor: theme.backgroundElement }]}
                     onStartShouldSetResponder={() => true}
                  >
                     <ThemedText type="smallBold" style={styles.sheetTitle}>
                        Currency
                     </ThemedText>
                     <ScrollView nestedScrollEnabled>
                        {CURRENCIES.map((c) => (
                           <TouchableOpacity
                              key={c.code}
                              style={styles.pickerRow}
                              onPress={() => {
                                 setEditor({ ...editor, currency: c.code });
                                 setShowCurrencyPicker(false);
                              }}
                           >
                              <ThemedText
                                 style={[
                                    styles.pickerLabel,
                                    editor.currency === c.code && styles.selectedText,
                                 ]}
                              >
                                 {c.code} · {c.name}
                              </ThemedText>
                              {editor.currency === c.code && (
                                 <ThemedText themeColor="textSecondary">✓</ThemedText>
                              )}
                           </TouchableOpacity>
                        ))}
                     </ScrollView>
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
                     {reassignTargets.map((s) => (
                        <TouchableOpacity
                           key={s.id}
                           style={styles.pickerRow}
                           onPress={() => reassignAndDelete(s.id)}
                        >
                           <View style={[styles.dot, { backgroundColor: s.color ?? "#888888" }]} />
                           <ThemedText style={styles.pickerLabel}>{s.name}</ThemedText>
                           <ThemedText themeColor="textSecondary" type="small">
                              {s.currency}
                           </ThemedText>
                        </TouchableOpacity>
                     ))}
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
      minHeight: 48,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
   },
   rowMain: { flex: 1, gap: Spacing.half, minWidth: 0 },
   rowName: { fontSize: 15 },
   dot: {
      flexShrink: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
   },
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
      paddingVertical: Spacing.two,
   },
   pickerLabel: { flex: 1 },
});
