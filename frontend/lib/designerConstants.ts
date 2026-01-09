import { ElementType, RouteMarkerType } from './types';

// Element type abbreviations for auto-generated labels
export const ELEMENT_ABBREVIATIONS: Record<ElementType, string> = {
  bay: 'B',
  flow_rack: 'FR',
  full_pallet: 'P',
  text: 'T',
  line: 'L',
  arrow: 'A',
};

// Route marker label prefixes
export const MARKER_LABEL_PREFIXES: Record<RouteMarkerType, string> = {
  start_point: 'Start',
  stop_point: 'Stop',
  cart_parking: 'Cart',
};

// Element types that can receive pick data
export const PICKABLE_ELEMENT_TYPES: ElementType[] = ['bay', 'flow_rack', 'full_pallet'];

// Subscription tier limits for elements
export const TIER_ELEMENT_LIMITS: Record<string, number> = {
  free: 50,
  pro: 500,
  enterprise: Infinity,
};

// Default tier for unauthenticated users
export const DEFAULT_TIER = 'free';
export const DEFAULT_ELEMENT_LIMIT = 50;

// Paste offset (pixels) for duplicated elements
export const PASTE_OFFSET = 20;

// Generate an abbreviated label for an element
export function generateElementLabel(type: ElementType, existingElements: { element_type: ElementType }[]): string {
  const typeCount = existingElements.filter(el => el.element_type === type).length + 1;
  return `${ELEMENT_ABBREVIATIONS[type]}${typeCount}`;
}

// Generate a label for a route marker
export function generateMarkerLabel(type: RouteMarkerType, existingMarkers: { marker_type: RouteMarkerType }[]): string {
  const markerCount = existingMarkers.filter(m => m.marker_type === type).length + 1;
  return markerCount === 1 ? MARKER_LABEL_PREFIXES[type] : `${MARKER_LABEL_PREFIXES[type]} ${markerCount}`;
}

// Check if element type is pickable
export function isPickableType(type: ElementType): boolean {
  return PICKABLE_ELEMENT_TYPES.includes(type);
}

// Validate UUID format (filters out nanoid temp IDs)
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
