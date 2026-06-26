-- Migration: Add target_child_id to missions table
-- Run this in Supabase SQL Editor

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS target_child_id UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN missions.target_child_id IS 'Optional: assign mission to a specific child. NULL = all children in family';
