-- Migration: Admin can enable/disable users and families
-- Run in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN users.is_active IS 'When false, user cannot log in';
COMMENT ON COLUMN families.is_active IS 'When false, all members of this family cannot log in';
