import { PowerSyncContext } from "@powersync/react";
import { PowerSyncDatabase } from "@powersync/web";
import type { PropsWithChildren } from "react";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";

import { AppSchema } from "./AppSchema";
import { AuthScreen } from "./AuthScreen";
import { supabaseConnector } from "./SupabaseConnector";
import { seedDefaults } from "./seed";

export const SystemProvider = ({ children }: PropsWithChildren) => {
   const [db, setDb] = useState<PowerSyncDatabase | null>(null);
   const [ready, setReady] = useState(false);
   const [error, setError] = useState<unknown>(null);
   const [user, setUser] = useState(supabaseConnector.currentSession?.user ?? null);

   useEffect(() => {
      // Created inside an effect so it only runs on the client (useEffect skips SSR)
      const instance = new PowerSyncDatabase({
         schema: AppSchema,
         database: {
            dbFilename: "financial.db",
            disableSSRWarning: true,
            worker: "/@powersync/worker.js",
         },
         sync: {
            worker: "/@powersync/worker.js",
         },
      });
      setDb(instance);

      async function setup() {
         try {
            await supabaseConnector.init();
            await instance.init();
            setUser(supabaseConnector.currentSession?.user ?? null);
            supabaseConnector.registerListener({
               sessionChanged: (session) => setUser(session.user),
            });
            setReady(true);
         } catch (e) {
            setError(e);
         }
      }
      void setup();
   }, []);

   useEffect(() => {
      if (!db || !ready) return;
      if (!user) {
         void db.disconnect();
         return;
      }
      void db.connect(supabaseConnector).catch((e) => setError(e));
      void seedDefaults(db);
   }, [db, user, ready]);

   if (error) {
      return (
         <Fallback
            message={`Failed to start sync: ${String(error)}`}
            onRetry={() => {
               setError(null);
               void supabaseConnector
                  .init()
                  .then(() => setUser(supabaseConnector.currentSession?.user ?? null))
                  .catch((e) => setError(e));
            }}
         />
      );
   }

   if (!ready) {
      return <Fallback message="Connecting to sync service…" />;
   }

   if (!user) {
      return <AuthScreen />;
   }

   return <PowerSyncContext.Provider value={db!}>{children}</PowerSyncContext.Provider>;
};

function Fallback({ message, onRetry }: { message: string; onRetry?: () => void }) {
   const theme = useTheme();
   return (
      <ThemedView themeColor="background" style={styles.container}>
         <ActivityIndicator color={theme.trackFocused} />
         <ThemedText themeColor="textSecondary" style={styles.text}>
            {message}
         </ThemedText>
         {onRetry && (
            <Pressable onPress={onRetry} style={styles.button}>
               <ThemedText themeColor="trackFocused" style={styles.buttonText}>
                  Retry
               </ThemedText>
            </Pressable>
         )}
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   container: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      gap: 16,
      padding: 24,
   },
   text: {
      fontSize: 14,
      textAlign: "center",
   },
   button: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
   },
   buttonText: {
      fontSize: 16,
      fontWeight: "600",
   },
});
