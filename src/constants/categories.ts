export type Category = {
   id: number;
   slug: string;
   name: string;
   display_order: number;
   parent_id: number | null;
   color: string | null;
};

export const CATEGORY_GROUPS: readonly Category[] = [
   { id: 6, slug: "living", name: "Living", display_order: 1, parent_id: null, color: "#FF6B6B" },
   {
      id: 7,
      slug: "personal",
      name: "Personal",
      display_order: 2,
      parent_id: null,
      color: "#4ECDC4",
   },
   { id: 8, slug: "holiday", name: "Holiday", display_order: 3, parent_id: null, color: "#45B7D1" },
];

export const CATEGORY_LEAVES: readonly Category[] = [
   { id: 1, slug: "house", name: "House", display_order: 1, parent_id: 6, color: null },
   { id: 2, slug: "food", name: "Food", display_order: 2, parent_id: 6, color: null },
   { id: 3, slug: "needs", name: "Needs", display_order: 3, parent_id: 6, color: null },
   {
      id: 4,
      slug: "transportation",
      name: "Transportation",
      display_order: 4,
      parent_id: 7,
      color: null,
   },
   { id: 5, slug: "misc", name: "Miscellaneous", display_order: 5, parent_id: 7, color: null },
];

export const CATEGORIES: readonly Category[] = [...CATEGORY_GROUPS, ...CATEGORY_LEAVES];

export function getCategoryById(id: number): Category | undefined {
   return CATEGORIES.find((c) => c.id === id);
}

export function getLeavesForGroup(groupId: number): readonly Category[] {
   return CATEGORY_LEAVES.filter((c) => c.parent_id === groupId);
}

export function getGroupColor(categoryId: number): string {
   const cat = getCategoryById(categoryId);
   if (!cat) return "#888888";
   if (cat.parent_id === null) return cat.color ?? "#888888";
   const group = getCategoryById(cat.parent_id);
   return group?.color ?? "#888888";
}
