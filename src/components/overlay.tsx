import { type PropsWithChildren } from "react";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";

type OverlayProps = PropsWithChildren<{
   visible: boolean;
   onRequestClose: () => void;
}>;

export function Overlay({ visible, onRequestClose, children }: OverlayProps) {
   return (
      <ThemedView visible={visible} fadeAnimation fadeDurationMs={150} style={styles.root}>
         <Pressable style={styles.backdrop} onPress={onRequestClose}>
            <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
               <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
                  {children}
               </Pressable>
            </SafeAreaView>
         </Pressable>
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   root: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
      elevation: 10,
   },
   backdrop: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
   },
   safe: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      width: "100%",
   },
   content: {
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
   },
});
