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
  roundTripDistanceFeet?: number;
}

// =============================================================================
// ITEM-LEVEL TRACKING TYPES
// =============================================================================

// Location: A specific slot within a warehouse element
export interface Location {
  id: string;
  element_id: string;
  layout_id: string;
  external_location_id: string;  // External ID from WMS (e.g., "LOC-001")
  label?: string;
  element_name: string;
  element_x: number;
  element_y: number;
  relative_x: number;
  relative_y: number;
  current_item_internal_id?: string;
  current_item_id?: string;
  current_item_description?: string;
  updated_at: string;
}

// Item: A SKU/product that can be slotted in a location
export interface Item {
  id: string;
  layout_id: string;
  external_item_id: string;       // External SKU (e.g., "SKU-12345")
  description?: string;
  current_location_id?: string;
  current_location_external_id?: string;
  location_label?: string;
  element_id?: string;
  element_name?: string;
  element_x?: number;
  element_y?: number;
  created_at: string;
  updated_at: string;
}

// Item-level pick transaction
export interface ItemPickTransaction {
  id: string;
  item_id: string;
  external_item_id: string;
  location_id: string;
  external_location_id: string;
  element_id: string;
  element_name: string;
  pick_date: string;
  pick_count: number;
}

// Aggregated item-level pick data
export interface AggregatedItemPickData {
  item_id: string;
  external_item_id: string;
  item_description?: string;
  location_id: string;
  external_location_id: string;
  element_id: string;
  element_name: string;
  element_type: ElementType;
  x_coordinate: number;
  y_coordinate: number;
  total_picks: number;
  days_count: number;
  first_date: string;
  last_date: string;
  roundTripDistanceFeet?: number;
}

// Velocity tier for items
export type VelocityTier = 'hot' | 'warm' | 'cold';

// Slotting recommendation
export type SlottingRecommendation = 'move-closer' | 'optimal' | 'review' | 'move-further';

// Item-level velocity analysis
export interface ItemVelocityAnalysis {
  itemId: string;
  externalItemId: string;
  itemDescription?: string;
  locationId: string;
  externalLocationId: string;
  elementId: string;
  elementName: string;
  totalPicks: number;
  avgDailyPicks: number;
  daysActive: number;
  velocityTier: VelocityTier;
  percentile: number;
  currentDistance: number;       // Distance to nearest cart parking (pixels)
  optimalDistance: number;       // Distance of best available slot (pixels)
  walkSavingsPerPick: number;    // (current - optimal) * 2 for round trip (pixels)
  dailyWalkSavingsFeet: number;  // Estimated daily walk savings in feet
  dailyTimeSavingsMinutes: number; // Estimated daily time savings
  recommendation: SlottingRecommendation;
  priorityScore: number;         // For ranking recommendations
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

// Reslotting summary
export interface ReslottingSummary {
  totalItemsAnalyzed: number;
  itemsNeedingReslot: number;
  potentialDailyWalkSavingsFeet: number;
  potentialDailyTimeSavingsMinutes: number;
}

// Move recommendation for display
export interface MoveRecommendation {
  item: ItemVelocityAnalysis;
  rank: number;
}

export interface UploadPicksResponse {
  message: string;
  rowsProcessed: number;
  dataType?: 'item-level' | 'element-level';
  stats?: {
    uniqueItems: number;
    uniqueLocations: number;
  };
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
  cartTravelDistFeet: number;
  pedestrianTravelDistFeet: number;
  totalPicks: number;
  visitCount: number;
  avgDistancePerPick: number;
  avgDistancePerPickFeet: number;
  avgDistancePerPickLabel?: string;
  estimatedMinutes: number;
  dailyBreakdown: Array<{
    date: string;
    totalFeet: number;
    cartFeet: number;
    pedestrianFeet: number;
    visits: number;
  }>;
  routeSummary?: {
    startToFirstCart: number;
    lastCartToStop: number;
    pickingDistance: number;
  };
  cartUtilization?: Array<{
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

// Item-level reslotting opportunity
export interface ItemReslottingOpportunity {
  item: ItemVelocityAnalysis;
  currentElement: {
    id: string;
    name: string;
    type: ElementType;
    distance: number;  // pixels
  };
  targetElements: Array<{
    id: string;
    name: string;
    type: ElementType;
    distance: number;  // pixels
    walkSavings: number;  // feet/day
  }>;
  totalDailyWalkSavings: number;
  recommendation: 'move-closer' | 'move-further';
}

// =============================================================================
// CAPACITY-AWARE RESLOTTING TYPES
// =============================================================================

// Element capacity tracking based on item counts
export interface ElementCapacityInfo {
  elementId: string;
  elementName: string;
  itemCount: number;           // Number of unique items currently in element
  estimatedCapacity: number;   // Total estimated slots
  estimatedEmpty: number;      // Estimated empty slots
  occupancyRate: number;       // itemCount / estimatedCapacity (0-1)
}

// Swap suggestion when no empty slots available
export interface SwapSuggestion {
  coldItem: {
    itemId: string;
    externalItemId: string;
    itemDescription?: string;
    velocityTier: VelocityTier;
    totalPicks: number;
    avgDailyPicks: number;
  };
  reason: string;  // e.g., "Cold item (2 picks/day) can free prime space"
}

// Extended target element with capacity info
export interface CapacityAwareTargetElement {
  id: string;
  name: string;
  type: ElementType;
  distance: number;           // pixels
  walkSavings: number;        // feet/day
  hasEmptySlot: boolean;      // true if estimated empty slots > 0
  estimatedEmpty: number;     // number of estimated empty slots
  swapSuggestion?: SwapSuggestion;  // populated when hasEmptySlot is false
}

// Updated reslotting opportunity with capacity awareness
export interface CapacityAwareReslottingOpportunity extends Omit<ItemReslottingOpportunity, 'targetElements'> {
  targetElements: CapacityAwareTargetElement[];
  moveType: 'empty-slot' | 'swap' | 'unknown';  // Primary move strategy
}

// Paginated result for reslotting opportunities
export interface PaginatedOpportunitiesResult {
  opportunities: CapacityAwareReslottingOpportunity[];
  hasMore: boolean;
  totalAvailable: number;
  totalSavingsFeet: number;  // Sum of ALL opportunity savings (not just paginated)
}
