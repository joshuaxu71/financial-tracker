import { useEffect, useState } from "react";
import { Animated, View, type ViewProps } from "react-native";

import { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const DEFAULT_FADE_DURATION_MS = 200;

export type ThemedViewProps = ViewProps & {
   lightColor?: string;
   darkColor?: string;
   themeColor?: ThemeColor;
   /**
    * When provided, ThemedView manages its own mount/unmount and fades its
    * opacity in/out instead of always rendering. Pass `fadeAnimation={false}`
    * to skip the animation (mounts/unmounts immediately).
    */
   visible?: boolean;
   fadeAnimation?: boolean;
   fadeDurationMs?: number;
};

export function ThemedView({
   style,
   lightColor,
   darkColor,
   themeColor,
   visible,
   fadeAnimation = true,
   fadeDurationMs = DEFAULT_FADE_DURATION_MS,
   ...otherProps
}: ThemedViewProps) {
   const theme = useTheme();
   const hasVisibility = visible !== undefined;

   const [opacity] = useState<Animated.Value>(() => new Animated.Value(visible ? 1 : 0));
   const [mounted, setMounted] = useState(visible ?? true);

   useEffect(() => {
      if (!hasVisibility) return;

      if (visible) {
         setMounted(true);
         if (!fadeAnimation) {
            opacity.setValue(1);
         } else {
            Animated.timing(opacity, {
               toValue: 1,
               duration: fadeDurationMs,
               useNativeDriver: true,
            }).start();
         }
      } else if (!fadeAnimation) {
         opacity.setValue(0);
         setMounted(false);
      } else {
         Animated.timing(opacity, {
            toValue: 0,
            duration: fadeDurationMs,
            useNativeDriver: true,
         }).start(() => setMounted(false));
      }
   }, [visible, hasVisibility, fadeAnimation, fadeDurationMs, opacity]);

   const backgroundColor = theme[themeColor ?? "background"];

   if (hasVisibility) {
      if (!mounted) return null;
      return <Animated.View style={[{ backgroundColor, opacity }, style]} {...otherProps} />;
   }

   return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
