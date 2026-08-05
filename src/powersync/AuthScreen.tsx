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

import { supabaseConnector } from "./SupabaseConnector";

export function AuthScreen() {
   const theme = useTheme();
   const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [busy, setBusy] = useState(false);

   async function submit() {
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
         Alert.alert("Invalid email", "Enter a valid email address.");
         return;
      }
      if (password.length < 6) {
         Alert.alert("Invalid password", "Password must be at least 6 characters.");
         return;
      }
      setBusy(true);
      try {
         if (mode === "sign-up") {
            const sessionCreated = await supabaseConnector.signUp(trimmed, password);
            if (!sessionCreated) {
               Alert.alert(
                  "Confirm your email",
                  `We sent a confirmation link to ${trimmed}. Click it, then sign in.`,
               );
            }
         } else {
            await supabaseConnector.signIn(trimmed, password);
         }
      } catch (error) {
         const message =
            error instanceof Error ? error.message : "Something went wrong. Try again.";
         Alert.alert(mode === "sign-up" ? "Sign up failed" : "Sign in failed", message);
      } finally {
         setBusy(false);
      }
   }

   return (
      <KeyboardAvoidingView
         style={[styles.container, { backgroundColor: theme.background }]}
         behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
         <View style={styles.card}>
            <ThemedText type="title" style={styles.title}>
               {mode === "sign-in" ? "Sign in" : "Create account"}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
               {mode === "sign-in"
                  ? "Welcome back. Enter your email and password."
                  : "Your data syncs across all your devices."}
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

            <TextInput
               value={password}
               onChangeText={setPassword}
               placeholder="Password"
               placeholderTextColor={theme.textSecondary}
               secureTextEntry
               autoCapitalize="none"
               autoComplete="current-password"
               onSubmitEditing={submit}
               style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
               ]}
            />

            <TouchableOpacity
               onPress={submit}
               disabled={busy}
               style={[styles.button, { backgroundColor: theme.text }]}
            >
               {busy ? (
                  <ActivityIndicator color={theme.background} />
               ) : (
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                     {mode === "sign-in" ? "Sign in" : "Sign up"}
                  </ThemedText>
               )}
            </TouchableOpacity>

            <TouchableOpacity
               onPress={() => {
                  setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"));
                  setPassword("");
               }}
               disabled={busy}
            >
               <ThemedText type="smallBold" themeColor="trackFocused" style={styles.toggle}>
                  {mode === "sign-in" ? "New here? Create an account" : "Have an account? Sign in"}
               </ThemedText>
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
   toggle: {
      textAlign: "center",
   },
});
