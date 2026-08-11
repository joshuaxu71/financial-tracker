import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { TabNavigationProvider } from "@/context/tab-navigation";
import { SystemProvider } from "@/powersync/SystemProvider";

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
            <SystemProvider>
               <TabNavigationProvider>
                  <AppTabs />
               </TabNavigationProvider>
            </SystemProvider>
            <AnimatedSplashOverlay />
         </ThemeProvider>
      </GestureHandlerRootView>
   );
}
