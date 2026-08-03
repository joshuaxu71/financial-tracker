-- Add surrogate `id` PK to exchange_rates for PowerSync compatibility.
-- PowerSync rows always require an `id` column; the old PK was `currency`.
-- Run this only against databases that already ran 20260802000000_init.sql.

ALTER TABLE exchange_rates DROP CONSTRAINT exchange_rates_pkey;
ALTER TABLE exchange_rates ADD COLUMN id text;
UPDATE exchange_rates SET id = gen_random_uuid ()::text WHERE id IS NULL;
ALTER TABLE exchange_rates ALTER COLUMN id SET NOT NULL;
ALTER TABLE exchange_rates ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);
ALTER TABLE exchange_rates ADD CONSTRAINT exchange_rates_currency_key UNIQUE (currency);
CREATE INDEX IF NOT EXISTS exchange_rates_currency_idx ON exchange_rates (currency);
