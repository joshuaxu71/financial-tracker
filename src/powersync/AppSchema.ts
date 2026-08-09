import { Schema, Table, column } from "@powersync/common";

export const AppSchema = new Schema({
   category: new Table(
      {
         name: column.text,
         display_order: column.integer,
         parent_id: column.text,
         color: column.text,
         budget: column.real,
         budget_start: column.text,
      },
      { indexes: { parent_idx: ["parent_id"] } },
   ),
   transaction: new Table(
      {
         date: column.text,
         source_id: column.text,
         amount: column.real,
         category_id: column.text,
         description: column.text,
         sort_order: column.real,
         created_at: column.text,
      },
      { indexes: { date_idx: ["date"], category_idx: ["category_id"], source_idx: ["source_id"] } },
   ),
   budget_movement: new Table(
      {
         category_id: column.text,
         date: column.text,
         amount: column.real,
      },
      { indexes: { category_idx: ["category_id"], date_idx: ["date"] } },
   ),
   source: new Table(
      {
         name: column.text,
         currency: column.text,
         color: column.text,
         opening_balance: column.real,
         sort_order: column.integer,
         created_at: column.text,
      },
      { indexes: { sort_idx: ["sort_order"] } },
   ),
   exchange_rate: new Table(
      {
         currency: column.text,
         rate: column.real,
         updated_at: column.text,
      },
      { indexes: { currency_idx: ["currency"] } },
   ),
   transfer: new Table(
      {
         from_source_id: column.text,
         to_source_id: column.text,
         from_amount: column.real,
         to_amount: column.real,
         exchange_rate: column.real,
         date: column.text,
         description: column.text,
         created_at: column.text,
      },
      { indexes: { date_idx: ["date"], from_idx: ["from_source_id"], to_idx: ["to_source_id"] } },
   ),
});

export type AppDatabase = (typeof AppSchema)["types"];
