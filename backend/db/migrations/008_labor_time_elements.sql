-- Migration 008: Labor Time Elements
-- Adds granular picking time elements to labor_standards table
-- Allows separate configuration of pick, tote, and scan times (previously combined)

-- =============================================================================
-- ADD NEW TIME ELEMENT COLUMNS TO LABOR_STANDARDS
-- These provide more granular control over picking time calculations
-- =============================================================================

-- Pick Item Time: Time to reach, grab, and retrieve item from slot
ALTER TABLE labor_standards
ADD COLUMN IF NOT EXISTS pick_item_seconds DECIMAL(8,2) DEFAULT 12.0;

-- Tote Time: Time to place item in cart/tote and arrange
ALTER TABLE labor_standards
ADD COLUMN IF NOT EXISTS tote_time_seconds DECIMAL(8,2) DEFAULT 8.0;

-- Scan Time: Time to scan barcode and confirm on RF device
ALTER TABLE labor_standards
ADD COLUMN IF NOT EXISTS scan_time_seconds DECIMAL(8,2) DEFAULT 5.0;

-- Add comments for new columns
COMMENT ON COLUMN labor_standards.pick_item_seconds IS 'Time in seconds to reach, grab, and retrieve item from slot (default 12s)';
COMMENT ON COLUMN labor_standards.tote_time_seconds IS 'Time in seconds to place item in cart/tote and arrange (default 8s)';
COMMENT ON COLUMN labor_standards.scan_time_seconds IS 'Time in seconds to scan barcode and confirm on RF device (default 5s)';

-- =============================================================================
-- DATA MIGRATION
-- Set default values for existing records that have NULL values
-- =============================================================================

UPDATE labor_standards
SET
  pick_item_seconds = COALESCE(pick_item_seconds, 12.0),
  tote_time_seconds = COALESCE(tote_time_seconds, 8.0),
  scan_time_seconds = COALESCE(scan_time_seconds, 5.0)
WHERE pick_item_seconds IS NULL
   OR tote_time_seconds IS NULL
   OR scan_time_seconds IS NULL;

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- The original pick_time_seconds (15s) represented a combined pick time.
-- The new granular approach breaks this into:
--   - pick_item_seconds (12s): Physical pick action
--   - tote_time_seconds (8s): Placing in tote
--   - scan_time_seconds (5s): Scanning/confirming
--
-- Total picking base time = pick_item + tote + scan = 25s
-- This is different from the legacy 15s because it's more comprehensive.
--
-- The legacy fields (pick_time_seconds, pack_time_seconds, putaway_time_seconds)
-- are retained for backward compatibility but the new time element breakdown
-- uses the new granular fields.
--
-- Time Per Pick Formula (new):
--   walkTimeSeconds = (roundTripDistanceFeet / walk_speed_fpm) * 60
--   baseTimeSeconds = walkTime + pick_item + tote + scan
--   standardTimeSeconds = baseTimeSeconds * (1 + fatigue_allowance + delay_allowance)
