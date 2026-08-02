import {
   type ReactNode,
   createContext,
   useCallback,
   useContext,
   useMemo,
   useRef,
   useState,
} from "react";
import PagerView from "react-native-pager-view";

export const TRACK_INDEX = 0;
export const DASHBOARD_INDEX = 1;
export const BUDGET_INDEX = 2;
export const FINANCE_INDEX = 3;
export const HOME_INDEX = TRACK_INDEX;

type TabNavigationContextType = {
   activeIndex: number;
   refreshKey: number;
   refresh: () => void;
   goToTab: (index: number) => void;
   pagerRef: React.RefObject<PagerView | null>;
};

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

export function TabNavigationProvider({ children }: { children: ReactNode }) {
   const [activeIndex, setActiveIndex] = useState(HOME_INDEX);
   const [refreshKey, setRefreshKey] = useState(0);
   const pagerRef = useRef<PagerView | null>(null);

   const refresh = useCallback(() => {
      setRefreshKey((k) => k + 1);
   }, []);

   const goToTab = useCallback((index: number) => {
      pagerRef.current?.setPage(index);
      setActiveIndex(index);
   }, []);

   const value = useMemo(
      () => ({ activeIndex, refreshKey, refresh, goToTab, pagerRef }),
      [activeIndex, refreshKey, refresh, goToTab],
   );

   return <TabNavigationContext.Provider value={value}>{children}</TabNavigationContext.Provider>;
}

export function useTabNavigation(): TabNavigationContextType {
   const ctx = useContext(TabNavigationContext);
   if (!ctx) throw new Error("useTabNavigation must be used within TabNavigationProvider");
   return ctx;
}
