-- Drop the category `slug` column and its unique index. The app no longer
-- uses slugs; the default category is now selected by name.
ALTER TABLE category DROP COLUMN IF EXISTS slug;
DROP INDEX IF EXISTS categories_user_slug_unique;