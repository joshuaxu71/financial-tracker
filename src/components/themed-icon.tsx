import type { LucideIcon, LucideProps } from "lucide-react-native";

import { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const ICON_SIZE_PRESETS = {
   nav: { width: 16, height: 16, strokeWidth: 3, absoluteStrokeWidth: true },
} as const;

export type ThemedIconProps = Omit<LucideProps, "color"> & {
   icon: LucideIcon;
   themeColor?: ThemeColor;
   color?: string;
   size?: keyof typeof ICON_SIZE_PRESETS;
};

export function ThemedIcon({ icon: Icon, themeColor, color, size, ...rest }: ThemedIconProps) {
   const theme = useTheme();
   const sizeProps = size ? ICON_SIZE_PRESETS[size] : undefined;

   return <Icon color={color ?? theme[themeColor ?? "text"]} {...sizeProps} {...rest} />;
}
