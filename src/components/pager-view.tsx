import { type ElementRef, type Ref, forwardRef } from "react";
import PagerViewNative from "react-native-pager-view";

import type { PagerHandle, PagerViewProps } from "./pager-view.types";

const PagerView = forwardRef<PagerHandle, PagerViewProps>((props, ref) => (
   <PagerViewNative {...props} ref={ref as unknown as Ref<ElementRef<typeof PagerViewNative>>} />
));

PagerView.displayName = "PagerView";

export default PagerView;
