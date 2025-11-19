// Type definitions for warehouse element placement

export type ElementType = 'bay' | 'flow_rack' | 'full_pallet' | 'text' | 'line' | 'arrow';

export type LabelDisplayMode = 'none' | 'hover' | 'selected' | 'all';

export interface WarehouseElement {
  id: string;
  layout_id: string;
  element_type: ElementType;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  rotation: number;
  created_at: string;
  updated_at: string;
}

export interface Layout {
  id: string;
  user_id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  created_at: string;
  updated_at: string;
}

export interface CreateElementRequest {
  element_type: ElementType;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  rotation?: number;
  width?: number;
  height?: number;
}

export interface UpdateElementRequest {
  label?: string;
  x_coordinate?: number;
  y_coordinate?: number;
  rotation?: number;
  width?: number;
  height?: number;
}

export interface PickTransaction {
  element_id: string;
  element_name: string;
  pick_date: string;
  pick_count: number;
}

export interface AggregatedPickData {
  element_id: string;
  element_name: string;
  total_picks: number;
  days_count: number;
  first_date: string;
  last_date: string;
}

export interface UploadPicksResponse {
  message: string;
  rowsProcessed: number;
  warnings?: {
    unmatchedElements: string[];
    message: string;
  };
}

export interface UploadPicksError {
  error: string;
  unmatchedElements?: string[];
  details?: string[];
  message?: string;
}

// Element type configurations with actual pixel dimensions (1 inch = 1 pixel)
export const ELEMENT_CONFIGS: Record<
  ElementType,
  {
    width: number;
    height: number;
    color: string;
    displayName: string;
    description: string;
  }
> = {
  bay: {
    width: 24,  // 24 pixels = 24 inches
    height: 48, // 48 pixels = 48 inches
    color: '#3b82f6', // Industrial blue
    displayName: 'Bay',
    description: '24" × 48"'
  },
  flow_rack: {
    width: 120,  // 120 pixels = 120 inches
    height: 120, // 120 pixels = 120 inches
    color: '#10b981', // Industrial green
    displayName: 'Flow Rack',
    description: '120" × 120"'
  },
  full_pallet: {
    width: 48,  // 48 pixels = 48 inches
    height: 52, // 52 pixels = 52 inches
    color: '#f59e0b', // Industrial amber
    displayName: 'Full Pallet',
    description: '48" × 52"'
  },
  text: {
    width: 100,
    height: 24,
    color: '#e2e8f0',
    displayName: 'Text',
    description: 'Label'
  },
  line: {
    width: 100,
    height: 2,
    color: '#e2e8f0',
    displayName: 'Line',
    description: 'Line segment'
  },
  arrow: {
    width: 100,
    height: 2,
    color: '#e2e8f0',
    displayName: 'Arrow',
    description: 'Directional arrow'
  }
};
