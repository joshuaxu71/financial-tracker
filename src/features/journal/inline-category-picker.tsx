import { useState } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
   type Category,
   type CategoryTreeNode,
   buildCategoryTree,
   resolveCategoryColor,
} from "@/constants/categories";
import { Spacing } from "@/constants/theme";

type Props = {
   visible: boolean;
   categories: readonly Category[];
   selectedCategoryId: string;
   onSelect: (categoryId: string) => void;
   onDismiss: () => void;
};

type TreeNode = CategoryTreeNode<Category>;

export function InlineCategoryPicker({
   visible,
   categories,
   selectedCategoryId,
   onSelect,
   onDismiss,
}: Props) {
   const [expanded, setExpanded] = useState<Set<string>>(new Set());

   const tree = buildCategoryTree(categories);

   function reset() {
      setExpanded(new Set());
   }

   function handleDismiss() {
      reset();
      onDismiss();
   }

   function toggle(id: string) {
      setExpanded((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   }

   function renderNode(node: TreeNode, depth: number) {
      const hasChildren = node.children.length > 0;
      const isExpanded = expanded.has(node.category.id);
      const isSelected = node.category.id === selectedCategoryId;
      const color = resolveCategoryColor(categories, node.category.id);

      return (
         <View key={node.category.id}>
            <TouchableOpacity
               style={[styles.row, { paddingLeft: Spacing.three + depth * Spacing.three }]}
               onPress={() => (hasChildren ? toggle(node.category.id) : select(node.category.id))}
            >
               {hasChildren ? (
                  <ThemedText themeColor="textSecondary" style={styles.chevron}>
                     {isExpanded ? "▾" : "▸"}
                  </ThemedText>
               ) : (
                  <ThemedView style={[styles.dot, { backgroundColor: color }]} />
               )}
               <ThemedText style={[styles.rowLabel, isSelected && styles.selectedLabel]}>
                  {node.category.name}
               </ThemedText>
               {isSelected && <ThemedText themeColor="textSecondary">✓</ThemedText>}
            </TouchableOpacity>
            {hasChildren && isExpanded && node.children.map((c) => renderNode(c, depth + 1))}
         </View>
      );
   }

   function select(id: string) {
      reset();
      onSelect(id);
   }

   return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
         <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleDismiss}>
            <ThemedView
               themeColor="backgroundElement"
               style={styles.container}
               onStartShouldSetResponder={() => true}
            >
               <ThemedText type="smallBold" style={styles.header}>
                  Category
               </ThemedText>
               <ScrollView style={styles.scroll} nestedScrollEnabled>
                  {tree.map((n) => renderNode(n, 0))}
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
   container: {
      width: 260,
      maxHeight: 420,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.two,
   },
   scroll: { flexGrow: 0 },
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
   chevron: {
      width: 14,
      textAlign: "center",
   },
   dot: {
      width: 8,
      height: 8,
      marginLeft: 3,
      borderRadius: 4,
   },
   rowLabel: { flex: 1 },
   selectedLabel: { fontFamily: "Urbanist-SemiBold" },
});
