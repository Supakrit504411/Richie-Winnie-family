-- Migration: Add avatar_url for profile photos
-- Run this in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN users.avatar_url IS 'Optional profile photo URL (Supabase Storage)';
