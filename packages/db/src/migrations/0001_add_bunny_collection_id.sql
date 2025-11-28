-- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for ALTER COLUMN)
-- This migration adds bunny_collection_id to the project table
ALTER TABLE `project` ADD COLUMN `bunny_collection_id` text;
