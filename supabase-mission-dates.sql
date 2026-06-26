-- Migration: Add date fields and attachments to missions table
-- Run this in Supabase SQL Editor

-- Add start_date, end_date, recurring_days, and attachments columns to missions table
ALTER TABLE missions 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS recurring_days TEXT[],
  ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Add comments for documentation
COMMENT ON COLUMN missions.start_date IS 'Mission start date (optional)';
COMMENT ON COLUMN missions.end_date IS 'Mission end date (optional)';
COMMENT ON COLUMN missions.recurring_days IS 'Days of week for recurring missions: monday, tuesday, wednesday, thursday, friday, saturday, sunday';
COMMENT ON COLUMN missions.attachments IS 'Parent-attached files/images (JSONB array of URLs)';
