import { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { CATEGORY_GROUPS, getLeavesForGroup } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
   visible: boolean;
   selectedCategoryId: number;
   onSelect: (categoryId: number) => void;
   onDismiss: () => void;
};

export function InlineCategoryPicker({ visible, selectedCategoryId, onSelect, onDismiss }: Props) {
   const theme = useTheme();
   const [groupId, setGroupId] = useState<number | null>(null);

   function handleDismiss() {
      setGroupId(null);
      onDismiss();
   }

   const activeGroup = groupId !== null ? CATEGORY_GROUPS.find((g) => g.id === groupId) : null;
   const leaves = groupId !== null ? getLeavesForGroup(groupId) : [];

   return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
         <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleDismiss}>
            <View
               style={[styles.container, { backgroundColor: theme.backgroundElement }]}
               onStartShouldSetResponder={() => true}
            >
               {groupId === null ? (
                  <>
                     <ThemedText type="smallBold" style={styles.header}>
                        Category
                     </ThemedText>
                     {CATEGORY_GROUPS.map((group) => (
                        <TouchableOpacity
                           key={group.id}
                           style={styles.row}
                           onPress={() => setGroupId(group.id)}
                        >
                           <View style={[styles.dot, { backgroundColor: group.color ?? "#888" }]} />
                           <ThemedText style={styles.rowLabel}>{group.name}</ThemedText>
                           <ThemedText themeColor="textSecondary">›</ThemedText>
                        </TouchableOpacity>
                     ))}
                  </>
               ) : (
                  <>
                     <TouchableOpacity style={styles.backRow} onPress={() => setGroupId(null)}>
                        <ThemedText themeColor="textSecondary">‹</ThemedText>
                        <ThemedText type="smallBold">{activeGroup?.name}</ThemedText>
                     </TouchableOpacity>
                     {leaves.map((leaf) => {
                        const selected = leaf.id === selectedCategoryId;
                        return (
                           <TouchableOpacity
                              key={leaf.id}
                              style={styles.row}
                              onPress={() => {
                                 setGroupId(null);
                                 onSelect(leaf.id);
                              }}
                           >
                              <View style={styles.dotPlaceholder} />
                              <ThemedText
                                 style={[styles.rowLabel, selected && styles.selectedLabel]}
                              >
                                 {leaf.name}
                              </ThemedText>
                              {selected && <ThemedText themeColor="textSecondary">✓</ThemedText>}
                           </TouchableOpacity>
                        );
                     })}
                  </>
               )}
            </View>
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
   container: {
      width: 240,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.two,
   },
   header: {
      paddingBottom: Spacing.two,
      paddingHorizontal: Spacing.three,
   },
   row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
   },
   backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingBottom: Spacing.two,
      paddingHorizontal: Spacing.three,
   },
   dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
   },
   dotPlaceholder: {
      width: 8,
      height: 8,
   },
   rowLabel: { flex: 1 },
   selectedLabel: { fontWeight: "600" },
});
