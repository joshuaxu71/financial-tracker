-- Migrate existing opening balances to transaction rows, then drop the column.
-- opening_balance is now represented as a positive transaction with no category_id.

INSERT INTO transaction (id, date, source_id, amount, category_id, description, sort_order, created_at, user_id)
SELECT
  gen_random_uuid ()::text,
  COALESCE(substring(created_at FROM 1 FOR 10), to_char(now(), 'YYYY-MM-DD')),
  id,
  opening_balance,
  NULL,
  'Opening balance',
  NULL,
  created_at,
  user_id
FROM source
WHERE opening_balance IS NOT NULL AND opening_balance <> 0;

ALTER TABLE source DROP COLUMN opening_balance;
