// Type definitions for warehouse element placement

export type ElementType = 'bay' | 'flow_rack' | 'full_pallet';

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
}

export interface UpdateElementRequest {
  label?: string;
  x_coordinate?: number;
  y_coordinate?: number;
  rotation?: number;
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
  }
};
