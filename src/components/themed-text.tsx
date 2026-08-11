import { Platform, StyleSheet, Text, type TextProps } from "react-native";

import { Fonts, ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
   type?:
      "default" | "title" | "small" | "smallBold" | "subtitle" | "link" | "linkPrimary" | "code";
   themeColor?: ThemeColor;
};

export function ThemedText({ style, type = "default", themeColor, ...rest }: ThemedTextProps) {
   const theme = useTheme();

   return (
      <Text
         style={[
            { color: theme[themeColor ?? "text"] },
            type === "default" && styles.default,
            type === "title" && styles.title,
            type === "small" && styles.small,
            type === "smallBold" && styles.smallBold,
            type === "subtitle" && styles.subtitle,
            type === "link" && styles.link,
            type === "linkPrimary" && styles.linkPrimary,
            type === "code" && styles.code,
            style,
         ]}
         {...rest}
      />
   );
}

const styles = StyleSheet.create({
   small: {
      fontFamily: "Urbanist-Medium",
      fontSize: 14,
      lineHeight: 20,
   },
   smallBold: {
      fontFamily: "Urbanist-Bold",
      fontSize: 14,
      lineHeight: 20,
   },
   default: {
      fontFamily: "Urbanist-Medium",
      fontSize: 16,
      lineHeight: 24,
   },
   title: {
      fontFamily: "Urbanist-Bold",
      fontSize: 48,
      lineHeight: 52,
   },
   subtitle: {
      fontFamily: "Urbanist-Bold",
      fontSize: 32,
      lineHeight: 44,
   },
   link: {
      fontFamily: "Urbanist-Medium",
      fontSize: 14,
      lineHeight: 30,
   },
   linkPrimary: {
      color: "#3c87f7",
      fontFamily: "Urbanist-Medium",
      fontSize: 14,
      lineHeight: 30,
   },
   code: {
      fontFamily: Fonts.mono,
      fontSize: 12,
      fontWeight: Platform.select({ android: 700 }) ?? 500,
   },
});
