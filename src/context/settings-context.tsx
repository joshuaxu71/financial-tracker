import { usePowerSync } from "@powersync/react";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { CURRENCIES } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { refreshRates } from "@/db/rates";
import { getUserPreference, upsertUserPreference } from "@/db/user-preference";
import { useTheme } from "@/hooks/use-theme";

type SettingsContextValue = {
   baseCurrency: string;
   setBaseCurrency: (currency: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>({
   baseCurrency: "JPY",
   setBaseCurrency: async () => {},
});

function CurrencySetup({ onSelect }: { onSelect: (currency: string) => Promise<void> }) {
   const theme = useTheme();
   const [selected, setSelected] = useState<string | null>(null);

   return (
      <SafeAreaProvider>
         <SafeAreaView style={[styles.setup, { backgroundColor: theme.background }]}>
            <ThemedText type="subtitle" style={styles.setupTitle}>
               Base currency
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.setupSubtitle}>
               Your net worth and budgets will be shown in this currency.
            </ThemedText>
            <FlatList
               data={CURRENCIES}
               keyExtractor={(c) => c.code}
               renderItem={({ item }) => {
                  const isSelected = item.code === selected;
                  return (
                     <TouchableOpacity
                        style={[
                           styles.currencyRow,
                           { backgroundColor: theme.backgroundElement },
                           isSelected && { borderColor: theme.text },
                        ]}
                        onPress={() => setSelected(item.code)}
                        activeOpacity={0.7}
                     >
                        <ThemedText type="smallBold">{item.code}</ThemedText>
                        <ThemedText themeColor="textSecondary">{item.name}</ThemedText>
                     </TouchableOpacity>
                  );
               }}
               contentContainerStyle={styles.currencyList}
            />
            {selected !== null && (
               <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: theme.text }]}
                  onPress={() => onSelect(selected)}
               >
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                     Continue with {selected}
                  </ThemedText>
               </TouchableOpacity>
            )}
         </SafeAreaView>
      </SafeAreaProvider>
   );
}

export function SettingsProvider({ children }: { children: ReactNode }) {
   const db = usePowerSync();
   const [baseCurrency, setBaseCurrencyState] = useState<string | null>(null);
   const [isReady, setIsReady] = useState(false);

   useEffect(() => {
      getUserPreference(db).then((s) => {
         setBaseCurrencyState(s.base_currency);
         setIsReady(true);
      });
   }, [db]);

   const setBaseCurrency = useCallback(
      async (currency: string) => {
         await upsertUserPreference(db, { base_currency: currency });
         setBaseCurrencyState(currency);
         await refreshRates(db, currency, true);
      },
      [db],
   );

   if (!isReady) return null;

   if (baseCurrency === null) {
      return <CurrencySetup onSelect={setBaseCurrency} />;
   }

   return (
      <SettingsContext.Provider value={{ baseCurrency, setBaseCurrency }}>
         {children}
      </SettingsContext.Provider>
   );
}

export function useSettings() {
   return useContext(SettingsContext);
}

const styles = StyleSheet.create({
   setup: {
      flex: 1,
      paddingHorizontal: Spacing.four,
   },
   setupTitle: {
      marginTop: Spacing.four,
      marginBottom: Spacing.two,
   },
   setupSubtitle: {
      marginBottom: Spacing.four,
   },
   currencyList: {
      gap: Spacing.two,
      paddingBottom: Spacing.four,
   },
   currencyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: Spacing.three,
      borderWidth: 1,
      borderRadius: Spacing.two,
      borderColor: "transparent",
   },
   confirmButton: {
      alignItems: "center",
      marginBottom: Spacing.four,
      padding: Spacing.three,
      borderRadius: Spacing.three,
   },
});
