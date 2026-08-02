import { useEffect, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Props = {
   visible: boolean;
   year: number;
   month: number;
   maxYear: number;
   maxMonth: number;
   onSelect: (year: number, month: number) => void;
   onDismiss: () => void;
};

export function MonthPickerModal({
   visible,
   year,
   month,
   maxYear,
   maxMonth,
   onSelect,
   onDismiss,
}: Props) {
   const theme = useTheme();
   const [pickerYear, setPickerYear] = useState(year);

   useEffect(() => {
      if (visible) setPickerYear(year);
   }, [visible, year]);

   function handleMonthPress(m: number) {
      if (pickerYear === maxYear && m > maxMonth) return;
      onSelect(pickerYear, m);
   }

   const canGoForward = pickerYear < maxYear;

   return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
         <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
            <View
               style={[styles.container, { backgroundColor: theme.backgroundElement }]}
               onStartShouldSetResponder={() => true}
            >
               <View style={styles.yearRow}>
                  <TouchableOpacity
                     onPress={() => setPickerYear((y) => y - 1)}
                     style={styles.navButton}
                  >
                     <ThemedText>←</ThemedText>
                  </TouchableOpacity>
                  <ThemedText type="smallBold">{pickerYear}</ThemedText>
                  <TouchableOpacity
                     onPress={() => canGoForward && setPickerYear((y) => y + 1)}
                     style={styles.navButton}
                     disabled={!canGoForward}
                  >
                     <ThemedText themeColor={canGoForward ? "text" : "backgroundSelected"}>
                        →
                     </ThemedText>
                  </TouchableOpacity>
               </View>
               <View style={styles.grid}>
                  {MONTHS.map((label, i) => {
                     const m = i + 1;
                     const disabled = pickerYear === maxYear && m > maxMonth;
                     const selected = pickerYear === year && m === month;
                     return (
                        <TouchableOpacity
                           key={m}
                           style={[styles.monthCell, selected && { backgroundColor: theme.text }]}
                           onPress={() => handleMonthPress(m)}
                           disabled={disabled}
                        >
                           <ThemedText
                              style={[
                                 styles.monthLabel,
                                 disabled && { color: theme.backgroundSelected },
                                 selected && { color: theme.background },
                              ]}
                           >
                              {label}
                           </ThemedText>
                        </TouchableOpacity>
                     );
                  })}
               </View>
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
      gap: Spacing.three,
      width: 280,
      padding: Spacing.three,
      borderRadius: Spacing.two,
   },
   yearRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
   },
   navButton: { padding: Spacing.two },
   grid: {
      flexDirection: "row",
      flexWrap: "wrap",
   },
   monthCell: {
      alignItems: "center",
      width: "25%",
      paddingVertical: Spacing.two,
      borderRadius: Spacing.one,
   },
   monthLabel: { fontSize: 14 },
});
