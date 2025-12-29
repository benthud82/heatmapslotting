-- Migration 007: Labor Management System (LMS)
-- Adds tables for labor standards, performance tracking, staffing forecasts, and ROI simulations
-- This enables efficiency tracking, headcount planning, and ROI calculations for reslotting

-- =============================================================================
-- LABOR_STANDARDS TABLE
-- Stores engineered time standards and cost configuration per layout
-- Used for efficiency calculations, staffing, and ROI projections
-- =============================================================================

CREATE TABLE IF NOT EXISTS labor_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,

    -- Time standards in SECONDS
    pick_time_seconds DECIMAL(8,2) NOT NULL DEFAULT 15.0,      -- Time to physically pick one item
    walk_speed_fpm DECIMAL(8,2) NOT NULL DEFAULT 264.0,        -- Walking speed in feet per minute (3 mph)
    pack_time_seconds DECIMAL(8,2) NOT NULL DEFAULT 30.0,      -- Time to pack one item
    putaway_time_seconds DECIMAL(8,2) NOT NULL DEFAULT 20.0,   -- Time to put away one item

    -- Time allowances (as percentages)
    fatigue_allowance_percent DECIMAL(5,2) NOT NULL DEFAULT 10.0,  -- Personal/fatigue allowance
    delay_allowance_percent DECIMAL(5,2) NOT NULL DEFAULT 5.0,     -- Unavoidable delays

    -- Reslotting time for ROI calculations
    reslot_time_minutes DECIMAL(6,2) NOT NULL DEFAULT 12.0,    -- Time to relocate one item (minutes)

    -- Labor cost configuration
    hourly_labor_rate DECIMAL(10,2) NOT NULL DEFAULT 18.00,    -- Base hourly rate in dollars
    benefits_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.30,    -- Total cost = rate × multiplier

    -- Shift configuration
    shift_hours DECIMAL(4,2) NOT NULL DEFAULT 8.0,             -- Standard shift length in hours
    target_efficiency_percent DECIMAL(5,2) NOT NULL DEFAULT 85.0,  -- Target efficiency percentage

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each layout can only have one standards configuration
    CONSTRAINT unique_standards_per_layout UNIQUE(layout_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labor_standards_layout ON labor_standards(layout_id);

-- Comments
COMMENT ON TABLE labor_standards IS 'Engineered labor time standards and cost configuration per layout';
COMMENT ON COLUMN labor_standards.pick_time_seconds IS 'Time in seconds to physically pick one item from shelf';
COMMENT ON COLUMN labor_standards.walk_speed_fpm IS 'Walking speed in feet per minute (264 = 3 mph default)';
COMMENT ON COLUMN labor_standards.pack_time_seconds IS 'Time in seconds to pack one picked item';
COMMENT ON COLUMN labor_standards.putaway_time_seconds IS 'Time in seconds for put-away operations';
COMMENT ON COLUMN labor_standards.fatigue_allowance_percent IS 'Personal/fatigue time allowance as percentage';
COMMENT ON COLUMN labor_standards.delay_allowance_percent IS 'Unavoidable delay allowance as percentage';
COMMENT ON COLUMN labor_standards.reslot_time_minutes IS 'Time in minutes to relocate one item (for ROI calc)';
COMMENT ON COLUMN labor_standards.hourly_labor_rate IS 'Base hourly labor rate in dollars';
COMMENT ON COLUMN labor_standards.benefits_multiplier IS 'Multiplier for total labor cost (includes benefits)';
COMMENT ON COLUMN labor_standards.shift_hours IS 'Standard shift length in hours';
COMMENT ON COLUMN labor_standards.target_efficiency_percent IS 'Target efficiency percentage goal';

-- =============================================================================
-- LABOR_PERFORMANCE TABLE
-- Records actual labor hours for efficiency comparison against standards
-- Allows users to input daily actuals for variance analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS labor_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    performance_date DATE NOT NULL,

    -- Actual metrics (user input)
    actual_picks INTEGER NOT NULL CHECK (actual_picks >= 0),
    actual_hours DECIMAL(6,2) NOT NULL CHECK (actual_hours > 0),
    actual_walk_distance_feet DECIMAL(12,2),  -- Optional, calculated if not provided

    -- Calculated fields (populated by system on insert/update)
    standard_hours DECIMAL(6,2),              -- Expected hours based on standards
    efficiency_percent DECIMAL(5,2),          -- (standard_hours / actual_hours) × 100

    -- Breakdown by activity (calculated)
    pick_time_hours DECIMAL(6,2),
    walk_time_hours DECIMAL(6,2),
    pack_time_hours DECIMAL(6,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One performance record per layout per date
    CONSTRAINT unique_performance_per_day UNIQUE(layout_id, performance_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labor_performance_layout ON labor_performance(layout_id);
CREATE INDEX IF NOT EXISTS idx_labor_performance_date ON labor_performance(performance_date);
CREATE INDEX IF NOT EXISTS idx_labor_performance_layout_date ON labor_performance(layout_id, performance_date);

-- Comments
COMMENT ON TABLE labor_performance IS 'Daily actual labor hours for efficiency tracking against standards';
COMMENT ON COLUMN labor_performance.actual_picks IS 'Number of picks completed on this date';
COMMENT ON COLUMN labor_performance.actual_hours IS 'Actual labor hours worked on this date';
COMMENT ON COLUMN labor_performance.standard_hours IS 'Expected hours based on labor standards (calculated)';
COMMENT ON COLUMN labor_performance.efficiency_percent IS 'Efficiency = (standard_hours / actual_hours) × 100';

-- =============================================================================
-- STAFFING_FORECASTS TABLE
-- Stores staffing calculations for future reference and trending
-- =============================================================================

CREATE TABLE IF NOT EXISTS staffing_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,

    -- Input
    forecasted_picks INTEGER NOT NULL CHECK (forecasted_picks > 0),
    period_days INTEGER NOT NULL DEFAULT 1 CHECK (period_days > 0),

    -- Calculated output
    required_headcount DECIMAL(4,1) NOT NULL,
    required_hours DECIMAL(8,2) NOT NULL,
    estimated_labor_cost DECIMAL(10,2),
    picks_per_person DECIMAL(8,1),
    utilization_percent DECIMAL(5,2),

    -- Snapshot of standards used (for historical accuracy)
    standards_snapshot JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One forecast per layout per date
    CONSTRAINT unique_forecast_per_day UNIQUE(layout_id, forecast_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staffing_forecasts_layout ON staffing_forecasts(layout_id);
CREATE INDEX IF NOT EXISTS idx_staffing_forecasts_date ON staffing_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_staffing_forecasts_layout_date ON staffing_forecasts(layout_id, forecast_date);

-- Comments
COMMENT ON TABLE staffing_forecasts IS 'Saved staffing calculations for headcount planning';
COMMENT ON COLUMN staffing_forecasts.forecasted_picks IS 'Expected picks for the forecast period';
COMMENT ON COLUMN staffing_forecasts.period_days IS 'Number of days in forecast period';
COMMENT ON COLUMN staffing_forecasts.required_headcount IS 'Calculated number of pickers needed';
COMMENT ON COLUMN staffing_forecasts.standards_snapshot IS 'JSON snapshot of labor standards used for this calculation';

-- =============================================================================
-- ROI_SIMULATIONS TABLE
-- Stores ROI calculation snapshots for reslotting recommendations
-- Tracks before/after comparisons and payback projections
-- =============================================================================

CREATE TABLE IF NOT EXISTS roi_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    simulation_name VARCHAR(100),
    simulation_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Current state metrics (before reslotting)
    current_daily_walk_feet DECIMAL(12,2),
    current_daily_walk_minutes DECIMAL(8,2),
    current_daily_labor_cost DECIMAL(10,2),

    -- Projected state (after reslotting)
    projected_daily_walk_feet DECIMAL(12,2),
    projected_daily_walk_minutes DECIMAL(8,2),
    projected_daily_labor_cost DECIMAL(10,2),

    -- Savings calculations
    daily_savings_feet DECIMAL(12,2),
    daily_savings_minutes DECIMAL(8,2),
    daily_savings_dollars DECIMAL(10,2),
    weekly_savings_dollars DECIMAL(10,2),
    monthly_savings_dollars DECIMAL(10,2),
    annual_savings_dollars DECIMAL(12,2),

    -- Implementation metrics
    items_to_reslot INTEGER,
    estimated_reslot_hours DECIMAL(6,2),
    implementation_cost DECIMAL(10,2),
    payback_days INTEGER,

    -- Snapshot of recommendations used
    recommendations_snapshot JSONB,

    -- Snapshot of standards used
    standards_snapshot JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roi_simulations_layout ON roi_simulations(layout_id);
CREATE INDEX IF NOT EXISTS idx_roi_simulations_date ON roi_simulations(simulation_date);

-- Comments
COMMENT ON TABLE roi_simulations IS 'Saved ROI calculations for reslotting recommendations';
COMMENT ON COLUMN roi_simulations.simulation_name IS 'Optional name for this simulation';
COMMENT ON COLUMN roi_simulations.current_daily_walk_feet IS 'Current daily walk distance in feet';
COMMENT ON COLUMN roi_simulations.projected_daily_walk_feet IS 'Projected walk distance after reslotting';
COMMENT ON COLUMN roi_simulations.daily_savings_dollars IS 'Estimated daily labor cost savings';
COMMENT ON COLUMN roi_simulations.payback_days IS 'Days until implementation cost is recovered';
COMMENT ON COLUMN roi_simulations.recommendations_snapshot IS 'JSON snapshot of items recommended for reslotting';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access data for their own layouts
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE labor_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_simulations ENABLE ROW LEVEL SECURITY;

-- Labor Standards policies
CREATE POLICY "Users can view labor standards in their layouts" ON labor_standards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_standards.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert labor standards in their layouts" ON labor_standards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_standards.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update labor standards in their layouts" ON labor_standards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_standards.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete labor standards in their layouts" ON labor_standards
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_standards.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

-- Labor Performance policies
CREATE POLICY "Users can view labor performance in their layouts" ON labor_performance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_performance.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert labor performance in their layouts" ON labor_performance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_performance.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update labor performance in their layouts" ON labor_performance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_performance.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete labor performance in their layouts" ON labor_performance
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = labor_performance.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

-- Staffing Forecasts policies
CREATE POLICY "Users can view staffing forecasts in their layouts" ON staffing_forecasts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = staffing_forecasts.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert staffing forecasts in their layouts" ON staffing_forecasts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = staffing_forecasts.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update staffing forecasts in their layouts" ON staffing_forecasts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = staffing_forecasts.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete staffing forecasts in their layouts" ON staffing_forecasts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = staffing_forecasts.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

-- ROI Simulations policies
CREATE POLICY "Users can view ROI simulations in their layouts" ON roi_simulations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = roi_simulations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ROI simulations in their layouts" ON roi_simulations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = roi_simulations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ROI simulations in their layouts" ON roi_simulations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = roi_simulations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete ROI simulations in their layouts" ON roi_simulations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = roi_simulations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- Automatically update the updated_at timestamp on labor_standards changes
-- =============================================================================

CREATE OR REPLACE FUNCTION update_labor_standards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_labor_standards_updated_at
    BEFORE UPDATE ON labor_standards
    FOR EACH ROW
    EXECUTE FUNCTION update_labor_standards_updated_at();
