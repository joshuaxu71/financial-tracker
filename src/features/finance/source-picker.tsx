import { Modal, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { type SourceRow } from "@/db/sources";

type Props = {
   visible: boolean;
   sources: readonly SourceRow[];
   selectedSourceId: string;
   onSelect: (sourceId: string) => void;
   onDismiss: () => void;
};

export function SourcePicker({ visible, sources, selectedSourceId, onSelect, onDismiss }: Props) {
   return (
      <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
         <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
            <ThemedView
               themeColor="backgroundElement"
               style={styles.sheet}
               onStartShouldSetResponder={() => true}
            >
               <ThemedText type="smallBold" style={styles.title}>
                  Source
               </ThemedText>
               <ScrollView nestedScrollEnabled style={{ maxHeight: 420 }}>
                  {sources.map((s) => {
                     const selected = s.id === selectedSourceId;
                     return (
                        <TouchableOpacity
                           key={s.id}
                           style={styles.row}
                           onPress={() => {
                              onSelect(s.id);
                              onDismiss();
                           }}
                        >
                           <ThemedView
                              style={[styles.dot, { backgroundColor: s.color ?? "#888888" }]}
                           />
                           <ThemedText
                              style={[styles.label, selected && styles.selectedText]}
                              numberOfLines={1}
                           >
                              {s.name}
                           </ThemedText>
                           <ThemedText themeColor="textSecondary" style={styles.currency}>
                              {s.currency}
                           </ThemedText>
                           {selected && <ThemedText themeColor="textSecondary">✓</ThemedText>}
                        </TouchableOpacity>
                     );
                  })}
               </ScrollView>
            </ThemedView>
         </TouchableOpacity>
      </Modal>
   );
}

const styles = StyleSheet.create({
   overlay: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
   },
   sheet: {
      width: 260,
      maxHeight: 480,
      padding: Spacing.three,
      borderRadius: Spacing.three,
   },
   title: { marginBottom: Spacing.one },
   row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingVertical: Spacing.two,
   },
   dot: {
      flexShrink: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
   },
   label: { flex: 1, fontSize: 15 },
   currency: { fontSize: 12 },
   selectedText: { fontFamily: "Urbanist-Bold" },
});
