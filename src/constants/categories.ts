export type Category = {
   id: string;
   name: string;
   display_order: number;
   parent_id: string | null;
   color: string | null;
};

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

export type CategoryTreeNode<T extends { id: string; parent_id: string | null }> = {
   category: T;
   depth: number;
   children: CategoryTreeNode<T>[];
};

export function buildCategoryTree<T extends { id: string; parent_id: string | null }>(
   categories: readonly T[],
): CategoryTreeNode<T>[] {
   const byParent = new Map<string | null, T[]>();
   for (const c of categories) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
   }
   function build(cats: T[], depth: number): CategoryTreeNode<T>[] {
      return cats.map((c) => ({
         category: c,
         depth,
         children: build(byParent.get(c.id) ?? [], depth + 1),
      }));
   }
   return build(byParent.get(null) ?? [], 0);
}
