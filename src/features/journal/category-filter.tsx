import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { Category } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
   categories: readonly Category[];
   selectedGroupId: number | null;
   onChange: (groupId: number | null) => void;
};

export function CategoryFilter({ categories, selectedGroupId, onChange }: Props) {
   const theme = useTheme();

   const topLevel = categories.filter((c) => c.parent_id === null);

   return (
      <ScrollView
         horizontal
         showsHorizontalScrollIndicator={false}
         contentContainerStyle={styles.content}
      >
         <Chip
            label="All"
            selected={selectedGroupId === null}
            theme={theme}
            onPress={() => onChange(null)}
         />
         {topLevel.map((group) => (
            <Chip
               key={group.id}
               label={group.name}
               selected={selectedGroupId === group.id}
               theme={theme}
               onPress={() => onChange(group.id)}
            />
         ))}
      </ScrollView>
   );
}

function Chip({
   label,
   selected,
   theme,
   onPress,
}: {
   label: string;
   selected: boolean;
   theme: { text: string; background: string; backgroundElement: string };
   onPress: () => void;
}) {
   return (
      <TouchableOpacity
         style={[styles.chip, { backgroundColor: selected ? theme.text : theme.backgroundElement }]}
         onPress={onPress}
      >
         <ThemedText type="smallBold" style={{ color: selected ? theme.background : theme.text }}>
            {label}
         </ThemedText>
      </TouchableOpacity>
   );
}

const styles = StyleSheet.create({
   content: {
      gap: Spacing.two,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
   },
   chip: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: 100,
   },
});
