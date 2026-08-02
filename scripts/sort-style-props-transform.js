/**
 * jscodeshift transform: reorders keys within StyleSheet.create({...}) objects
 * per concentric CSS order (position -> flex/layout -> box model -> visual -> typography).
 */

const GROUPS = [
   // position
   ["position", "top", "right", "bottom", "left", "zIndex"],
   // flex / layout
   [
      "display",
      "flexDirection",
      "flexWrap",
      "justifyContent",
      "alignItems",
      "alignSelf",
      "alignContent",
      "flex",
      "flexGrow",
      "flexShrink",
      "flexBasis",
      "gap",
      "rowGap",
      "columnGap",
   ],
   // box model
   [
      "width",
      "minWidth",
      "maxWidth",
      "height",
      "minHeight",
      "maxHeight",
      "aspectRatio",
      "margin",
      "marginTop",
      "marginRight",
      "marginBottom",
      "marginLeft",
      "marginHorizontal",
      "marginVertical",
      "padding",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "paddingHorizontal",
      "paddingVertical",
      "borderWidth",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderRadius",
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
   ],
   // visual
   [
      "backgroundColor",
      "opacity",
      "borderColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "borderStyle",
      "shadowColor",
      "shadowOffset",
      "shadowOpacity",
      "shadowRadius",
      "elevation",
      "overflow",
   ],
   // typography
   [
      "color",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "lineHeight",
      "letterSpacing",
      "textAlign",
      "textDecorationLine",
      "textTransform",
   ],
];

const ORDER = new Map();
GROUPS.flat().forEach((name, index) => ORDER.set(name, index));

function keyName(prop) {
   if (prop.key.type === "Identifier") return prop.key.name;
   if (prop.key.type === "StringLiteral" || prop.key.type === "Literal")
      return String(prop.key.value);
   return null;
}

function sortStyleObject(j, objExpr) {
   const properties = objExpr.properties;
   if (!properties.every((p) => p.type === "ObjectProperty" || p.type === "Property")) return;

   const decorated = properties.map((prop, index) => {
      const name = keyName(prop);
      const rank =
         name !== null && ORDER.has(name) ? ORDER.get(name) : GROUPS.flat().length + index;
      return { prop, rank, index };
   });

   decorated.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.index - b.index));

   objExpr.properties = decorated.map((d) => d.prop);
}

module.exports = function transform(file, api) {
   const j = api.jscodeshift;
   const root = j(file.source);

   root
      .find(j.CallExpression, {
         callee: { object: { name: "StyleSheet" }, property: { name: "create" } },
      })
      .forEach((path) => {
         const arg = path.node.arguments[0];
         if (!arg || arg.type !== "ObjectExpression") return;

         arg.properties.forEach((topProp) => {
            const value = topProp.value;
            if (value && value.type === "ObjectExpression") {
               sortStyleObject(j, value);
            }
         });
      });

   return root.toSource({ quote: "double" });
};
