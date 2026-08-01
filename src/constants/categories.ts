export type Category = {
  id: number;
  slug: string;
  name: string;
  display_order: number;
};

export const CATEGORIES: readonly Category[] = [
  { id: 1, slug: 'house', name: 'House', display_order: 1 },
  { id: 2, slug: 'food', name: 'Food', display_order: 2 },
  { id: 3, slug: 'needs', name: 'Needs', display_order: 3 },
  { id: 4, slug: 'transportation', name: 'Transportation', display_order: 4 },
  { id: 5, slug: 'misc', name: 'Miscellaneous', display_order: 5 },
] as const;

export function getCategoryById(id: number): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
