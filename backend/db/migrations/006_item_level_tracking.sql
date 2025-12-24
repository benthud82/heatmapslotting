-- Migration 006: Item-Level Pick Tracking
-- Adds locations, items, and item_pick_transactions tables for granular pick analysis
-- This enables reslotting recommendations at the individual item/SKU level

-- =============================================================================
-- LOCATIONS TABLE
-- Each warehouse element (bay, flow rack, pallet) can contain multiple locations
-- Each location is a slot that holds one specific item
-- =============================================================================

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id UUID NOT NULL REFERENCES warehouse_elements(id) ON DELETE CASCADE,
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    location_id VARCHAR(50) NOT NULL,      -- External identifier from WMS (e.g., "LOC-001")
    label VARCHAR(100),                     -- Optional display label
    relative_x DECIMAL(6,2) DEFAULT 0,      -- Position within element (for future visualization)
    relative_y DECIMAL(6,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each location_id must be unique within a layout
    CONSTRAINT unique_location_per_layout UNIQUE(layout_id, location_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_element ON locations(element_id);
CREATE INDEX IF NOT EXISTS idx_locations_layout ON locations(layout_id);
CREATE INDEX IF NOT EXISTS idx_locations_external_id ON locations(layout_id, location_id);

-- Comments
COMMENT ON TABLE locations IS 'Individual slot locations within warehouse elements (bays, flow racks, pallets)';
COMMENT ON COLUMN locations.location_id IS 'External location identifier from WMS system';
COMMENT ON COLUMN locations.relative_x IS 'X position within parent element for visualization (future use)';
COMMENT ON COLUMN locations.relative_y IS 'Y position within parent element for visualization (future use)';

-- =============================================================================
-- ITEMS TABLE
-- Stores item/SKU information with current location assignment
-- Each item has a 1:1 relationship with a location
-- =============================================================================

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,          -- External SKU/item ID from WMS (e.g., "SKU-12345")
    description VARCHAR(255),                -- Optional item description
    current_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each item_id must be unique within a layout
    CONSTRAINT unique_item_per_layout UNIQUE(layout_id, item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_layout ON items(layout_id);
CREATE INDEX IF NOT EXISTS idx_items_external_id ON items(layout_id, item_id);
CREATE INDEX IF NOT EXISTS idx_items_location ON items(current_location_id);

-- Comments
COMMENT ON TABLE items IS 'SKU/product master with current location assignment for reslotting analysis';
COMMENT ON COLUMN items.item_id IS 'External SKU/item identifier from WMS system';
COMMENT ON COLUMN items.current_location_id IS 'Current slotted location - used for reslotting recommendations';

-- =============================================================================
-- ITEM_PICK_TRANSACTIONS TABLE
-- Records picks at the item level for velocity analysis and reslotting
-- =============================================================================

CREATE TABLE IF NOT EXISTS item_pick_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    element_id UUID NOT NULL REFERENCES warehouse_elements(id) ON DELETE CASCADE,
    pick_date DATE NOT NULL,
    pick_count INTEGER NOT NULL CHECK (pick_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate entries for same item/location/date combination
    CONSTRAINT unique_item_pick_per_day UNIQUE(item_id, location_id, pick_date)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_item_picks_layout ON item_pick_transactions(layout_id);
CREATE INDEX IF NOT EXISTS idx_item_picks_item ON item_pick_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_picks_location ON item_pick_transactions(location_id);
CREATE INDEX IF NOT EXISTS idx_item_picks_element ON item_pick_transactions(element_id);
CREATE INDEX IF NOT EXISTS idx_item_picks_date ON item_pick_transactions(pick_date);
CREATE INDEX IF NOT EXISTS idx_item_picks_layout_date ON item_pick_transactions(layout_id, pick_date);

-- Comments
COMMENT ON TABLE item_pick_transactions IS 'Item-level pick history for velocity analysis and reslotting recommendations';
COMMENT ON COLUMN item_pick_transactions.pick_count IS 'Number of picks for this item at this location on this date';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access data for their own layouts
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_pick_transactions ENABLE ROW LEVEL SECURITY;

-- Locations policies
CREATE POLICY "Users can view locations in their layouts" ON locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = locations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert locations in their layouts" ON locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = locations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update locations in their layouts" ON locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = locations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete locations in their layouts" ON locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = locations.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

-- Items policies
CREATE POLICY "Users can view items in their layouts" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = items.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert items in their layouts" ON items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = items.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their layouts" ON items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = items.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their layouts" ON items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = items.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

-- Item pick transactions policies
CREATE POLICY "Users can view item picks in their layouts" ON item_pick_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = item_pick_transactions.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert item picks in their layouts" ON item_pick_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = item_pick_transactions.layout_id
            AND layouts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete item picks in their layouts" ON item_pick_transactions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM layouts
            WHERE layouts.id = item_pick_transactions.layout_id
            AND layouts.user_id = auth.uid()
        )
    );
