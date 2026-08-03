export type Category = {
   id: string;
   slug: string;
   name: string;
   display_order: number;
   parent_id: string | null;
   color: string | null;
};

export const CATEGORY_GROUPS: readonly Category[] = [
   {
      id: "living",
      slug: "living",
      name: "Living",
      display_order: 1,
      parent_id: null,
      color: "#FF6B6B",
   },
   {
      id: "personal",
      slug: "personal",
      name: "Personal",
      display_order: 2,
      parent_id: null,
      color: "#4ECDC4",
   },
   {
      id: "holiday",
      slug: "holiday",
      name: "Holiday",
      display_order: 3,
      parent_id: null,
      color: "#45B7D1",
   },
];

export const CATEGORY_LEAVES: readonly Category[] = [
   {
      id: "house",
      slug: "house",
      name: "House",
      display_order: 1,
      parent_id: "living",
      color: null,
   },
   { id: "food", slug: "food", name: "Food", display_order: 2, parent_id: "living", color: null },
   {
      id: "needs",
      slug: "needs",
      name: "Needs",
      display_order: 3,
      parent_id: "living",
      color: null,
   },
   {
      id: "transportation",
      slug: "transportation",
      name: "Transportation",
      display_order: 4,
      parent_id: "personal",
      color: null,
   },
   {
      id: "misc",
      slug: "misc",
      name: "Miscellaneous",
      display_order: 5,
      parent_id: "personal",
      color: null,
   },
];

export const CATEGORIES: readonly Category[] = [...CATEGORY_GROUPS, ...CATEGORY_LEAVES];

export function getCategoryById(id: string): Category | undefined {
   return CATEGORIES.find((c) => c.id === id);
}

export function getLeavesForGroup(groupId: string): readonly Category[] {
   return CATEGORY_LEAVES.filter((c) => c.parent_id === groupId);
}

export function getGroupColor(categoryId: string): string {
   const cat = getCategoryById(categoryId);
   if (!cat) return "#888888";
   if (cat.parent_id === null) return cat.color ?? "#888888";
   const group = getCategoryById(cat.parent_id);
   return group?.color ?? "#888888";
}

export function resolveCategoryColor(categories: readonly Category[], categoryId: string): string {
   const byId = new Map(categories.map((c) => [c.id, c]));
   let cat = byId.get(categoryId);
   const seen = new Set<string>();
   while (cat && !seen.has(cat.id)) {
      seen.add(cat.id);
      if (cat.color) return cat.color;
      cat = cat.parent_id == null ? undefined : byId.get(cat.parent_id);
   }
   return "#888888";
}
