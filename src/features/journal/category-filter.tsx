import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { CATEGORY_GROUPS } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
   selectedGroupId: number | null;
   onChange: (groupId: number | null) => void;
};

const ALL_CHIP = { id: null as number | null, name: "All" };

export function CategoryFilter({ selectedGroupId, onChange }: Props) {
   const theme = useTheme();

   const chips = [
      ALL_CHIP,
      ...CATEGORY_GROUPS.map((g) => ({ id: g.id as number | null, name: g.name })),
   ];

   return (
      <ScrollView
         horizontal
         showsHorizontalScrollIndicator={false}
         contentContainerStyle={styles.content}
      >
         {chips.map((chip) => {
            const selected = chip.id === selectedGroupId;
            return (
               <TouchableOpacity
                  key={chip.id ?? "all"}
                  style={[
                     styles.chip,
                     { backgroundColor: selected ? theme.text : theme.backgroundElement },
                  ]}
                  onPress={() => onChange(chip.id)}
               >
                  <ThemedText
                     type="smallBold"
                     style={{ color: selected ? theme.background : theme.text }}
                  >
                     {chip.name}
                  </ThemedText>
               </TouchableOpacity>
            );
         })}
      </ScrollView>
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
