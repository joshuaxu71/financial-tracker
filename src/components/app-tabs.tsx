import { ChartPie, Landmark, NotebookPen } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FinanceScreen from "@/app/finance";
import HistoryScreen from "@/app/history";
import TrackScreen from "@/app/index";
import PagerView from "@/components/pager-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
   DASHBOARD_INDEX,
   FINANCE_INDEX,
   HOME_INDEX,
   TRACK_INDEX,
   useTabNavigation,
} from "@/context/tab-navigation";
import { useTheme } from "@/hooks/use-theme";

const TAB_LABELS = ["Track", "Dashboard", "Finance"];

export default function AppTabs() {
   const theme = useTheme();
   const { activeIndex, goToTab, pagerRef } = useTabNavigation();
   const insets = useSafeAreaInsets();
   const { height: screenHeight } = useWindowDimensions();
   const isIos = Platform.OS === "ios";

   const TAB_ICONS = [NotebookPen, ChartPie, Landmark];
   const TAB_SELECTED_COLORS = [theme.trackFocused, theme.dashboardFocused, theme.financeFocused];
   const ICON_SELECTED_COLORS = [
      theme.trackNavigationColor,
      theme.dashboardNavigationColor,
      theme.financeNavigationColor,
   ];

   return (
      <ThemedView themeColor="background" style={styles.container}>
         <ThemedView
            themeColor="pureBackground"
            style={[
               styles.header,
               {
                  height: insets.top + screenHeight * 0.06,
                  paddingBottom: screenHeight * 0.02,
               },
            ]}
         >
            <ThemedText style={styles.headerTitle}>{TAB_LABELS[activeIndex]}</ThemedText>
         </ThemedView>

         <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={HOME_INDEX}
            onPageSelected={(e) => goToTab(e.nativeEvent.position)}
         >
            <View key={TRACK_INDEX} style={styles.page}>
               <TrackScreen />
            </View>
            <View key={DASHBOARD_INDEX} style={styles.page}>
               <HistoryScreen />
            </View>
            <View key={FINANCE_INDEX} style={styles.page}>
               <FinanceScreen />
            </View>
         </PagerView>

         <ThemedView
            themeColor="pureBackground"
            style={[
               styles.tabBar,
               {
                  marginBottom: isIos ? 16 : insets.bottom || 16,
               },
            ]}
         >
            {TAB_ICONS.map((Icon, index) => {
               const active = index === activeIndex;
               return (
                  <Pressable key={index} style={styles.tab} onPress={() => goToTab(index)}>
                     <View
                        style={[
                           styles.tabIconWrapper,
                           active && { backgroundColor: TAB_SELECTED_COLORS[index] },
                        ]}
                     >
                        <Icon size={22} color={active ? ICON_SELECTED_COLORS[index] : theme.text} />
                     </View>
                  </Pressable>
               );
            })}
         </ThemedView>
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1 },
   header: {
      justifyContent: "flex-end",
      alignItems: "center",
      padding: 8,
   },
   headerTitle: {
      fontFamily: "Urbanist-Medium",
      fontSize: 20,
   },
   pager: { flex: 1 },
   page: { flex: 1 },
   tabBar: {
      flexDirection: "row",
      alignSelf: "center",
      gap: 8,
      width: "80%",
      padding: 8,
      borderRadius: 9999,
      shadowOpacity: 0.04,
      shadowRadius: 24,
   },
   tab: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      aspectRatio: 1,
   },
   tabIconWrapper: {
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      borderRadius: 9999,
      overflow: "hidden",
   },
});
