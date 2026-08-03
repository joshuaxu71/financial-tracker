import { useState } from "react";
import {
   ActivityIndicator,
   Alert,
   KeyboardAvoidingView,
   Platform,
   StyleSheet,
   TextInput,
   TouchableOpacity,
   View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { supabaseConnector } from "./SystemProvider";

export function AuthScreen() {
   const theme = useTheme();
   const [email, setEmail] = useState("");
   const [sending, setSending] = useState(false);

   async function sendLink() {
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
         Alert.alert("Invalid email", "Enter a valid email address.");
         return;
      }
      setSending(true);
      try {
         await supabaseConnector.signIn(trimmed);
         Alert.alert("Check your email", `A sign-in link was sent to ${trimmed}.`);
      } catch {
         Alert.alert("Sign-in failed", "Could not send the sign-in link. Try again.");
      } finally {
         setSending(false);
      }
   }

   return (
      <KeyboardAvoidingView
         style={[styles.container, { backgroundColor: theme.background }]}
         behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
         <View style={styles.card}>
            <ThemedText type="title" style={styles.title}>
               Sign in
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
               Enter your email to receive a magic sign-in link.
            </ThemedText>

            <TextInput
               value={email}
               onChangeText={setEmail}
               placeholder="you@example.com"
               placeholderTextColor={theme.textSecondary}
               autoCapitalize="none"
               autoCorrect={false}
               keyboardType="email-address"
               autoComplete="email"
               style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
               ]}
            />

            <TouchableOpacity
               onPress={sendLink}
               disabled={sending}
               style={[styles.button, { backgroundColor: theme.text }]}
            >
               {sending ? (
                  <ActivityIndicator color={theme.background} />
               ) : (
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                     Send link
                  </ThemedText>
               )}
            </TouchableOpacity>
         </View>
      </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   container: {
      justifyContent: "center",
      flex: 1,
      padding: Spacing.four,
   },
   card: {
      alignSelf: "center",
      gap: Spacing.three,
      width: "100%",
      maxWidth: 360,
   },
   title: {
      textAlign: "center",
   },
   subtitle: {
      marginBottom: Spacing.two,
      textAlign: "center",
   },
   input: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three,
      borderRadius: Spacing.two,
      fontSize: 15,
   },
   button: {
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: Spacing.three,
      borderRadius: Spacing.three,
   },
});
