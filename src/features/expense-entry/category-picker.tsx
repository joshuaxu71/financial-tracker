import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORIES, type Category } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  selectedId: number;
  onChange: (category: Category) => void;
};

export function CategoryPicker({ selectedId, onChange }: Props) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {CATEGORIES.map((cat) => {
        const isSelected = cat.id === selectedId;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onChange(cat)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              { backgroundColor: isSelected ? theme.text : theme.backgroundElement },
            ]}>
            <ThemedText
              type="small"
              style={{ color: isSelected ? theme.background : theme.textSecondary }}>
              {cat.name}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
});
