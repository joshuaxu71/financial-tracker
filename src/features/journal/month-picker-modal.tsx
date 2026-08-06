import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedIconBadge } from "@/components/themed-icon-badge";
import { ThemedText } from "@/components/themed-text";
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
         <Pressable style={styles.backdrop} onPress={onDismiss}>
            <Pressable onPress={() => {}}>
               <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.pickerYearNav}>
                     <ThemedIconBadge
                        icon={ChevronLeft}
                        onPress={() => setPickerYear((y) => y - 1)}
                        badgeThemeColor="text"
                        badgeStyle={styles.navButton}
                        themeColor="pureBackground"
                        size="nav"
                     />
                     <ThemedText type="smallBold">{pickerYear}</ThemedText>
                     {canGoForward ? (
                        <ThemedIconBadge
                           icon={ChevronRight}
                           onPress={() => setPickerYear((y) => y + 1)}
                           badgeThemeColor="text"
                           badgeStyle={styles.navButton}
                           themeColor="pureBackground"
                           size="nav"
                        />
                     ) : (
                        <View style={styles.navButton} />
                     )}
                  </View>

                  <View style={styles.monthGrid}>
                     {MONTHS.map((label, i) => {
                        const m = i + 1;
                        const disabled = pickerYear === maxYear && m > maxMonth;
                        const active = pickerYear === year && m === month;
                        return (
                           <TouchableOpacity
                              key={m}
                              style={[
                                 styles.monthCell,
                                 disabled && styles.monthCellDisabled,
                                 { borderColor: theme.backgroundSelected },
                                 active && {
                                    borderColor: theme.text,
                                    backgroundColor: theme.text,
                                 },
                              ]}
                              onPress={() => handleMonthPress(m)}
                              disabled={disabled}
                           >
                              <ThemedText
                                 type="smallBold"
                                 themeColor={active ? "background" : "text"}
                              >
                                 {label}
                              </ThemedText>
                           </TouchableOpacity>
                        );
                     })}
                  </View>
               </View>
            </Pressable>
         </Pressable>
      </Modal>
   );
}

const styles = StyleSheet.create({
   backdrop: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      padding: 20,
      backgroundColor: "#00000055",
   },
   sheet: {
      gap: 20,
      width: "100%",
      padding: 20,
      borderRadius: 16,
   },
   pickerYearNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
   },
   navButton: {
      justifyContent: "center",
      alignItems: "center",
      width: 24,
      aspectRatio: 1,
   },
   monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignContent: "space-between",
      gap: 8,
   },
   monthCell: {
      alignItems: "center",
      width: "23%",
      paddingVertical: 10,
      borderWidth: 2,
      borderRadius: 5,
   },
   monthCellDisabled: {
      opacity: 0.5,
   },
});
