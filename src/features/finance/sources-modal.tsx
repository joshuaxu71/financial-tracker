import { usePowerSync } from "@powersync/react";
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
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Overlay } from "@/components/overlay";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { CATEGORY_COLORS } from "@/constants/category-colors";
import { CURRENCIES, currencyName } from "@/constants/currencies";
import { sheetStyles } from "@/constants/sheet-styles";
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
   id: string | null;
   name: string;
   currency: string;
   color: string | null;
};

export function SourcesModal({ visible, onDismiss, onChanged }: Props) {
   const db = usePowerSync();
   const theme = useTheme();

   const [sources, setSources] = useState<SourceRow[]>([]);
   const [usage, setUsage] = useState<Map<string, number>>(new Map());
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
      });
   }

   function openEdit(source: SourceRow) {
      setEditor({
         mode: "edit",
         id: source.id,
         name: source.name,
         currency: source.currency,
         color: source.color,
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
      try {
         if (editor.mode === "new") {
            await insertSource(db, {
               name: editor.name,
               currency: editor.currency,
               color: editor.color,
            });
         } else if (editor.id != null) {
            await updateSource(db, editor.id, {
               name: editor.name,
               currency: editor.currency,
               color: editor.color,
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

   async function reassignAndDelete(targetId: string) {
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
         <SafeAreaProvider>
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
                           <View
                              style={[
                                 sheetStyles.dot,
                                 { backgroundColor: item.color ?? "#888888" },
                              ]}
                           />
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
               <Overlay visible onRequestClose={() => setEditor(null)}>
                  <ThemedView themeColor="backgroundElement" style={sheetStyles.sheet}>
                     <ThemedText type="smallBold" style={sheetStyles.title}>
                        {editor.mode === "new" ? "New source" : `Edit ${editor.name}`}
                     </ThemedText>

                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Name
                     </ThemedText>
                     <TextInput
                        value={editor.name}
                        onChangeText={(v) => setEditor({ ...editor, name: v })}
                        placeholder="e.g. Wise, Rakuten, Credit Card"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                           sheetStyles.input,
                           { color: theme.text, backgroundColor: theme.backgroundSelected },
                        ]}
                        autoFocus
                     />

                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Currency
                     </ThemedText>
                     <TouchableOpacity
                        style={[
                           sheetStyles.selectRow,
                           { backgroundColor: theme.backgroundSelected },
                        ]}
                        onPress={() => setShowCurrencyPicker(true)}
                     >
                        <ThemedText>
                           {editor.currency} · {currencyName(editor.currency)}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary">▾</ThemedText>
                     </TouchableOpacity>

                     <ThemedText themeColor="textSecondary" style={sheetStyles.label}>
                        Color
                     </ThemedText>
                     <View style={sheetStyles.swatchRow}>
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

            {showCurrencyPicker && editor && (
               <Overlay visible onRequestClose={() => setShowCurrencyPicker(false)}>
                  <ThemedView themeColor="backgroundElement" style={sheetStyles.picker}>
                     <ThemedText type="smallBold" style={sheetStyles.title}>
                        Currency
                     </ThemedText>
                     <ScrollView style={styles.currencyList} nestedScrollEnabled>
                        {CURRENCIES.map((c) => (
                           <TouchableOpacity
                              key={c.code}
                              style={sheetStyles.pickerRow}
                              onPress={() => {
                                 setEditor({ ...editor, currency: c.code });
                                 setShowCurrencyPicker(false);
                              }}
                           >
                              <ThemedText
                                 style={[
                                    sheetStyles.pickerLabel,
                                    editor.currency === c.code && sheetStyles.selectedText,
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
                     {reassignTargets.map((s) => (
                        <TouchableOpacity
                           key={s.id}
                           style={sheetStyles.pickerRow}
                           onPress={() => reassignAndDelete(s.id)}
                        >
                           <ThemedView
                              style={[sheetStyles.dot, { backgroundColor: s.color ?? "#888888" }]}
                           />
                           <ThemedText style={sheetStyles.pickerLabel}>{s.name}</ThemedText>
                           <ThemedText themeColor="textSecondary" type="small">
                              {s.currency}
                           </ThemedText>
                        </TouchableOpacity>
                     ))}
                     <TouchableOpacity
                        style={sheetStyles.pickerRow}
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
      minHeight: 48,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
   },
   rowMain: { flex: 1, gap: Spacing.half, minWidth: 0 },
   rowName: { fontSize: 15 },
   currencyList: {
      maxHeight: 220,
      marginTop: Spacing.one,
      borderRadius: Spacing.two,
   },
});
