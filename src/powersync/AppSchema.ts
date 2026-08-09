import { Schema, Table, column } from "@powersync/common";

export const AppSchema = new Schema({
   categories: new Table(
      {
         slug: column.text,
         name: column.text,
         display_order: column.integer,
         parent_id: column.text,
         color: column.text,
         budget: column.real,
         budget_start: column.text,
      },
      { indexes: { slug_idx: ["slug"], parent_idx: ["parent_id"] } },
   ),
   expenses: new Table(
      {
         date: column.text,
         category_id: column.text,
         source_id: column.text,
         amount: column.real,
         description: column.text,
         created_at: column.text,
         sort_order: column.real,
      },
      { indexes: { date_idx: ["date"], category_idx: ["category_id"], source_idx: ["source_id"] } },
   ),
   budgets: new Table(
      {
         name: column.text,
         amount: column.real,
         period: column.text,
         created_at: column.text,
      },
      { indexes: { created_idx: ["created_at"] } },
   ),
   budget_categories: new Table(
      {
         budget_id: column.text,
         category_id: column.text,
      },
      { indexes: { budget_idx: ["budget_id"], category_idx: ["category_id"] } },
   ),
   budget_history: new Table(
      {
         category_id: column.text,
         month: column.text,
         allocation: column.real,
      },
      { indexes: { month_idx: ["month"], category_idx: ["category_id"] } },
   ),
   budget_movements: new Table(
      {
         category_id: column.text,
         date: column.text,
         amount: column.real,
      },
      { indexes: { category_idx: ["category_id"], date_idx: ["date"] } },
   ),
   sources: new Table(
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
   income_entries: new Table(
      {
         source_id: column.text,
         amount: column.real,
         date: column.text,
         created_at: column.text,
      },
      { indexes: { date_idx: ["date"], source_idx: ["source_id"] } },
   ),
   exchange_rates: new Table(
      {
         currency: column.text,
         rate: column.real,
         updated_at: column.text,
      },
      { indexes: { currency_idx: ["currency"] } },
   ),
   transfers: new Table(
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
