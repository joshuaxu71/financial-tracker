import { Children, forwardRef, useImperativeHandle, useState } from "react";
import { View } from "react-native";

import type { PagerHandle, PagerViewProps } from "./pager-view.types";

const PagerView = forwardRef<PagerHandle, PagerViewProps>(
   ({ style, initialPage = 0, children }, ref) => {
      const [activePage, setActivePage] = useState(initialPage);

      useImperativeHandle(ref, () => ({
         setPage: (index: number) => setActivePage(index),
      }));

      const pages = Children.toArray(children);

      return (
         <View style={style}>
            {pages.map((page, index) => (
               <View key={index} style={[{ flex: 1 }, index !== activePage && { display: "none" }]}>
                  {page}
               </View>
            ))}
         </View>
      );
   },
);

PagerView.displayName = "PagerView";

export default PagerView;
