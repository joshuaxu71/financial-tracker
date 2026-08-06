import { type PropsWithChildren, useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OverlayProps = PropsWithChildren<{
   visible: boolean;
   onRequestClose: () => void;
}>;

export function Overlay({ visible, onRequestClose, children }: OverlayProps) {
   const [mounted, setMounted] = useState(visible);
   const [opacity] = useState(() => new Animated.Value(visible ? 1 : 0));

   useEffect(() => {
      if (visible) {
         setMounted(true);
         Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
         }).start();
      } else {
         Animated.timing(opacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
         }).start(({ finished }) => {
            if (finished) setMounted(false);
         });
      }
   }, [visible, opacity]);

   if (!mounted) return null;

   return (
      <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
         <Pressable style={styles.backdrop} onPress={onRequestClose}>
            <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
               <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
                  {children}
               </Pressable>
            </SafeAreaView>
         </Pressable>
      </Animated.View>
   );
}

const styles = StyleSheet.create({
   root: {
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
