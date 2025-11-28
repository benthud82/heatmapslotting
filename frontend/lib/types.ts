// Type definitions for warehouse element placement

export type ElementType = 'bay' | 'flow_rack' | 'full_pallet' | 'text' | 'line' | 'arrow';

export type RouteMarkerType = 'start_point' | 'stop_point' | 'cart_parking';

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
  layout_id?: string;
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

// Route Markers for Walk Distance
export interface RouteMarker {
  id: string;
  layout_id: string;
  user_id?: string;
  marker_type: RouteMarkerType;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  sequence_order?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRouteMarkerRequest {
  marker_type: RouteMarkerType;
  label?: string;
  x_coordinate: number;
  y_coordinate: number;
  sequence_order?: number;
}

export interface WalkDistanceData {
  totalDistance: number;
  totalDistanceFeet: number;
  totalPicks: number;
  avgDistancePerPick: number;
  avgDistancePerPickFeet: number;
  estimatedMinutes: number;
  routeSummary: {
    startToFirstCart: number;
    lastCartToStop: number;
    pickingDistance: number;
  };
  cartUtilization: Array<{
    label: string;
    picksServed: number;
    totalWalkDistance: number;
    totalWalkDistanceFeet: number;
  }>;
  markers: {
    startPoint: { label: string; x: number; y: number } | null;
    stopPoint: { label: string; x: number; y: number } | null;
    cartParkingCount: number;
  };
  message?: string;
  missingMarkers?: {
    startPoint: boolean;
    stopPoint: boolean;
    cartParking: boolean;
  };
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

// Route Marker configurations
export const ROUTE_MARKER_CONFIGS: Record<
  RouteMarkerType,
  {
    width: number;
    height: number;
    color: string;
    displayName: string;
    description: string;
    icon: string;
  }
> = {
  start_point: {
    width: 32,
    height: 32,
    color: '#10b981', // Green
    displayName: 'Start Point',
    description: 'Pick route start',
    icon: '🚀'
  },
  stop_point: {
    width: 32,
    height: 32,
    color: '#ef4444', // Red
    displayName: 'Stop Point',
    description: 'Pick route end',
    icon: '🏁'
  },
  cart_parking: {
    width: 40,
    height: 24,
    color: '#f59e0b', // Amber - indicates parking spot
    displayName: 'Cart Parking',
    description: 'Cart staging area',
    icon: '🛒'
  }
};
