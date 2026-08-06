import { type StyleProp, StyleSheet, TouchableOpacity, type ViewStyle } from "react-native";

import { ThemedIcon, type ThemedIconProps } from "@/components/themed-icon";
import { ThemedView } from "@/components/themed-view";
import { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedIconBadgeProps = ThemedIconProps & {
   badgeThemeColor?: ThemeColor;
   badgeColor?: string;
   badgeStyle?: StyleProp<ViewStyle>;
   onPress?: () => void;
};

export function ThemedIconBadge({
   badgeThemeColor,
   badgeColor,
   badgeStyle,
   onPress,
   ...iconProps
}: ThemedIconBadgeProps) {
   const theme = useTheme();
   const resolvedBackgroundColor = badgeColor ?? theme[badgeThemeColor ?? "text"];

   if (onPress) {
      return (
         <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.badge, { backgroundColor: resolvedBackgroundColor }, badgeStyle]}
         >
            <ThemedIcon {...iconProps} />
         </TouchableOpacity>
      );
   }

   return (
      <ThemedView style={[styles.badge, { backgroundColor: resolvedBackgroundColor }, badgeStyle]}>
         <ThemedIcon {...iconProps} />
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   badge: {
      justifyContent: "center",
      alignItems: "center",
      aspectRatio: 1,
      padding: 10,
      borderRadius: 4,
   },
});
