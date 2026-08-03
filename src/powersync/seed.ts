import type { AbstractPowerSyncDatabase, Transaction } from "@powersync/react-native";

// Deterministic ids so that seeding on multiple devices produces the same rows
// and sync converges (last-write-wins) instead of duplicating.
const SEED = {
   groups: [
      {
         id: "00000000-0000-4000-8000-000000000006",
         slug: "living",
         name: "Living",
         order: 1,
         color: "#FF6B6B",
      },
      {
         id: "00000000-0000-4000-8000-000000000007",
         slug: "personal",
         name: "Personal",
         order: 2,
         color: "#4ECDC4",
      },
      {
         id: "00000000-0000-4000-8000-000000000008",
         slug: "holiday",
         name: "Holiday",
         order: 3,
         color: "#45B7D1",
      },
   ] as const,
   leaves: [
      {
         id: "00000000-0000-4000-8000-000000000001",
         slug: "house",
         name: "House",
         order: 1,
         parent: "00000000-0000-4000-8000-000000000006",
      },
      {
         id: "00000000-0000-4000-8000-000000000002",
         slug: "food",
         name: "Food",
         order: 2,
         parent: "00000000-0000-4000-8000-000000000006",
      },
      {
         id: "00000000-0000-4000-8000-000000000003",
         slug: "needs",
         name: "Needs",
         order: 3,
         parent: "00000000-0000-4000-8000-000000000006",
      },
      {
         id: "00000000-0000-4000-8000-000000000004",
         slug: "transportation",
         name: "Transportation",
         order: 4,
         parent: "00000000-0000-4000-8000-000000000007",
      },
      {
         id: "00000000-0000-4000-8000-000000000005",
         slug: "misc",
         name: "Miscellaneous",
         order: 5,
         parent: "00000000-0000-4000-8000-000000000007",
      },
   ] as const,
   source: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Cash",
      currency: "JPY",
      color: "#8B9DC3",
      order: 1,
   },
};

/**
 * Seeds the default category tree and source for a brand-new user. The old SQLite
 * migrations handled this; now PowerSync bootstraps an empty schema, so we seed
 * idempotently on first launch. No-op once any category exists.
 */
export async function seedDefaults(db: AbstractPowerSyncDatabase): Promise<void> {
   const count = await db.getOptional<{ n: number }>("SELECT COUNT(*) AS n FROM categories");
   if ((count?.n ?? 0) > 0) return;

   const now = new Date().toISOString();
   await db.writeTransaction(async (tx: Transaction) => {
      for (const g of SEED.groups) {
         await tx.execute(
            "INSERT INTO categories (id, slug, name, display_order, parent_id, color) VALUES (?, ?, ?, ?, ?, ?)",
            [g.id, g.slug, g.name, g.order, null, g.color],
         );
      }
      for (const l of SEED.leaves) {
         await tx.execute(
            "INSERT INTO categories (id, slug, name, display_order, parent_id) VALUES (?, ?, ?, ?, ?)",
            [l.id, l.slug, l.name, l.order, l.parent],
         );
      }
      await tx.execute(
         "INSERT INTO sources (id, name, currency, color, opening_balance, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
         [
            SEED.source.id,
            SEED.source.name,
            SEED.source.currency,
            SEED.source.color,
            0,
            SEED.source.order,
            now,
         ],
      );
   });
}
