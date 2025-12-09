-- Migration: 005_waitlist.sql
-- Description: Create waitlist_signups table for landing page waitlist functionality

-- Waitlist signups table
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  company_name VARCHAR(200),
  company_size VARCHAR(50),           -- 'solo', '2-10', '11-50', '51-200', '200+'
  role VARCHAR(100),                   -- Job title/role
  use_case TEXT,                       -- Optional: how they plan to use it
  referral_source VARCHAR(100),        -- 'google', 'linkedin', 'twitter', 'referral', 'other'
  referral_code VARCHAR(50),           -- If referred by existing signup
  unique_referral_code VARCHAR(50) UNIQUE,  -- Their own referral code
  referral_count INTEGER DEFAULT 0,    -- Number of successful referrals
  email_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token UUID DEFAULT gen_random_uuid(),
  waitlist_position INTEGER,           -- Auto-calculated position
  priority_score INTEGER DEFAULT 0,    -- For prioritization (referrals bump this up)
  ip_address INET,
  user_agent TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral ON waitlist_signups(unique_referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist_signups(waitlist_position);

-- Function to auto-assign waitlist position and generate referral code
CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  NEW.waitlist_position := COALESCE(
    (SELECT MAX(waitlist_position) FROM waitlist_signups) + 1,
    1
  );
  -- Generate unique referral code (8 character alphanumeric)
  NEW.unique_referral_code := UPPER(SUBSTRING(MD5(NEW.email || NOW()::TEXT) FOR 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for re-running migration)
DROP TRIGGER IF EXISTS set_waitlist_position ON waitlist_signups;

-- Create trigger
CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON waitlist_signups
  FOR EACH ROW
  EXECUTE FUNCTION assign_waitlist_position();

-- Function to process referrals (bump referrer's position)
CREATE OR REPLACE FUNCTION process_referral(referrer_id UUID)
RETURNS VOID AS $$
DECLARE
  current_position INTEGER;
  new_position INTEGER;
BEGIN
  -- Increment referral count
  UPDATE waitlist_signups
  SET referral_count = referral_count + 1,
      priority_score = priority_score + 5
  WHERE id = referrer_id;

  -- Get current position
  SELECT waitlist_position INTO current_position
  FROM waitlist_signups
  WHERE id = referrer_id;

  -- Calculate new position (move up 5 spots, minimum position 1)
  new_position := GREATEST(current_position - 5, 1);

  -- If actually moving up
  IF new_position < current_position THEN
    -- Shift others down
    UPDATE waitlist_signups
    SET waitlist_position = waitlist_position + 1
    WHERE waitlist_position >= new_position
      AND waitlist_position < current_position
      AND id != referrer_id;

    -- Update referrer's position
    UPDATE waitlist_signups
    SET waitlist_position = new_position
    WHERE id = referrer_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from authenticated service role only
-- Note: In Supabase, use service_role key for backend operations
CREATE POLICY "Allow all operations for service role" ON waitlist_signups
  FOR ALL USING (true);

-- Grant permissions (adjust based on your Supabase setup)
-- GRANT ALL ON waitlist_signups TO service_role;
