import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";

export const sheetStyles = StyleSheet.create({
   sheet: {
      gap: Spacing.two,
      width: 320,
      padding: Spacing.four,
      borderRadius: Spacing.three,
   },
   title: { marginBottom: Spacing.one },
   subtitle: { marginBottom: Spacing.two },
   label: {
      marginTop: Spacing.two,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
   },
   input: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.two,
      fontSize: 15,
   },
   selectRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.two,
   },
   actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: Spacing.three,
      marginTop: Spacing.four,
   },
   cancelButton: {
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
   },
   deleteButton: {
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
   },
   deleteText: { color: "#FF453A" },
   saveButton: {
      alignItems: "center",
      paddingHorizontal: Spacing.five,
      paddingVertical: Spacing.two,
      borderRadius: Spacing.three,
   },
   swatchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.two,
      marginTop: Spacing.one,
   },
   swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
   },
   swatchSelected: {
      borderWidth: 2,
      borderColor: "#fff",
   },
   selectedText: { fontFamily: "Urbanist-Bold" },
   picker: {
      width: 280,
      maxHeight: 420,
      padding: Spacing.three,
      borderRadius: Spacing.three,
   },
   pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingVertical: Spacing.two,
   },
   pickerLabel: { flex: 1 },
   dot: {
      flexShrink: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
   },
});
