-- Migration 003: Allow Multiple Layouts Per User
-- This migration removes the UNIQUE constraint on user_id to allow users to have multiple layouts

-- Drop the unique constraint on user_id
ALTER TABLE layouts DROP CONSTRAINT IF EXISTS layouts_user_id_key;

-- Add an index on user_id for performance (since we'll be querying by user_id frequently)
CREATE INDEX IF NOT EXISTS idx_layouts_user_id ON layouts(user_id);
