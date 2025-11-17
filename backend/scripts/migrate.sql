-- Warehouse Element Placement MVP Database Schema
-- Run this in Supabase SQL Editor

-- Users and authentication (mock auth for MVP)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Single auto-saving layout per user
CREATE TABLE IF NOT EXISTS layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'My Warehouse Layout',
    canvas_width INTEGER NOT NULL DEFAULT 1200,
    canvas_height INTEGER NOT NULL DEFAULT 800,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)  -- One layout per user
);

-- Warehouse elements (bays, flow racks, full pallets)
CREATE TABLE IF NOT EXISTS warehouse_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    element_type VARCHAR(20) NOT NULL CHECK (element_type IN ('bay', 'flow_rack', 'full_pallet')),
    label VARCHAR(100) NOT NULL,
    x_coordinate DECIMAL(10,2) NOT NULL,
    y_coordinate DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    rotation DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pick transactions for heatmap visualization
CREATE TABLE IF NOT EXISTS pick_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    element_id UUID REFERENCES warehouse_elements(id) ON DELETE CASCADE,
    pick_date DATE NOT NULL,
    pick_count INTEGER NOT NULL CHECK (pick_count >= 0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(element_id, pick_date)  -- Prevent duplicate entries for same element/date
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_layouts_user ON layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_elements_layout ON warehouse_elements(layout_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_elements_type ON warehouse_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_pick_transactions_layout ON pick_transactions(layout_id);
CREATE INDEX IF NOT EXISTS idx_pick_transactions_element ON pick_transactions(element_id);
CREATE INDEX IF NOT EXISTS idx_pick_transactions_date ON pick_transactions(pick_date);
CREATE INDEX IF NOT EXISTS idx_pick_transactions_layout_date ON pick_transactions(layout_id, pick_date);

