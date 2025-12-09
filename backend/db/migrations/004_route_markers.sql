-- Migration 004: Route Markers for Walk Distance Tracking
-- Adds start points, stop points, and cart parking spots for warehouse layouts

-- Create route_markers table
CREATE TABLE IF NOT EXISTS route_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  marker_type VARCHAR(20) NOT NULL,
  label VARCHAR(100),
  x_coordinate DECIMAL(10,2) NOT NULL,
  y_coordinate DECIMAL(10,2) NOT NULL,
  sequence_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_marker_type CHECK (marker_type IN ('start_point', 'stop_point', 'cart_parking'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_markers_layout ON route_markers(layout_id);
CREATE INDEX IF NOT EXISTS idx_route_markers_user ON route_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_route_markers_type ON route_markers(layout_id, marker_type);

-- Add comments for documentation
COMMENT ON TABLE route_markers IS 'Stores route markers (start/stop points, cart parking) for walk distance calculations';
COMMENT ON COLUMN route_markers.marker_type IS 'Type of marker: start_point, stop_point, or cart_parking';
COMMENT ON COLUMN route_markers.sequence_order IS 'Order of cart parking spots in the pick path (1, 2, 3...)';





