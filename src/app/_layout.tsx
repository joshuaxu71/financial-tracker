import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { TabNavigationProvider } from "@/context/tab-navigation";
import { runMigrations } from "@/db/schema";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
   const colorScheme = useColorScheme();
   const [fontsLoaded] = useFonts({
      "Urbanist-Medium": require("../../assets/fonts/Urbanist-Medium.ttf"),
      "Urbanist-SemiBold": require("../../assets/fonts/Urbanist-SemiBold.ttf"),
      "Urbanist-Bold": require("../../assets/fonts/Urbanist-Bold.ttf"),
   });

   if (!fontsLoaded) {
      return null;
   }

   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <SQLiteProvider databaseName="financial.db" onInit={runMigrations}>
               <TabNavigationProvider>
                  <AnimatedSplashOverlay />
                  <AppTabs />
               </TabNavigationProvider>
            </SQLiteProvider>
         </ThemeProvider>
      </GestureHandlerRootView>
   );
}
