import type { StyleProp, ViewStyle } from "react-native";

export type PagerHandle = { setPage: (index: number) => void };

export type PagerViewProps = {
   style?: StyleProp<ViewStyle>;
   initialPage?: number;
   onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
   children: React.ReactNode;
};
