/**
 * Distance Markers Utility
 *
 * Calculates and positions distance markers for elements being placed or dragged.
 * Shows edge-to-edge distances to the closest elements and route markers in each cardinal direction.
 */

import { WarehouseElement, RouteMarker, ROUTE_MARKER_CONFIGS } from './types';
import { getElementEdges } from './snapping';
import { pixelsToFeet } from './distanceCalculation';

/**
 * Bounds for a ghost or dragged element
 */
export interface ElementBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

/**
 * A single distance marker line with label
 */
export interface DistanceMarker {
  direction: 'left' | 'right' | 'up' | 'down';
  distancePx: number;
  distanceFeet: number;
  lineStart: { x: number; y: number };
  lineEnd: { x: number; y: number };
  labelPosition: { x: number; y: number };
  targetElementId: string;
  targetType: 'element' | 'start_point' | 'stop_point' | 'cart_parking';
}

/**
 * Result from distance marker calculation
 */
export interface DistanceMarkerResult {
  markers: DistanceMarker[];
}

/**
 * Internal type for tracking closest targets
 */
interface ClosestTarget {
  id: string;
  distance: number;
  edges: { left: number; right: number; top: number; bottom: number };
  targetType: 'element' | 'start_point' | 'stop_point' | 'cart_parking';
}

/**
 * Get edges for a route marker
 */
function getRouteMarkerEdges(marker: RouteMarker): { left: number; right: number; top: number; bottom: number } {
  const config = ROUTE_MARKER_CONFIGS[marker.marker_type];
  const x = Number(marker.x_coordinate);
  const y = Number(marker.y_coordinate);
  return {
    left: x,
    right: x + config.width,
    top: y,
    bottom: y + config.height
  };
}

/**
 * Calculate distance markers from a ghost/dragged element to nearest elements
 * and route markers in each cardinal direction (up, down, left, right).
 *
 * @param ghostBounds - The bounding box of the element being placed/dragged
 * @param elements - All warehouse elements to check against
 * @param routeMarkers - All route markers (start, stop, cart parking) to check against
 * @param excludeElementId - Optional ID to exclude (when dragging an existing element)
 * @returns Up to 4 distance markers, one for each direction where a target is found
 */
export function calculateDistanceMarkers(
  ghostBounds: ElementBounds,
  elements: WarehouseElement[],
  routeMarkers: RouteMarker[] = [],
  excludeElementId?: string
): DistanceMarkerResult {
  const markers: DistanceMarker[] = [];

  // Track closest target in each direction (can be element or route marker)
  let closestLeft: ClosestTarget | null = null;
  let closestRight: ClosestTarget | null = null;
  let closestUp: ClosestTarget | null = null;
  let closestDown: ClosestTarget | null = null;

  // Helper to check and update closest in each direction
  const checkTarget = (
    id: string,
    edges: { left: number; right: number; top: number; bottom: number },
    targetType: ClosestTarget['targetType']
  ) => {
    // Check LEFT: target's right edge < ghost's left edge
    if (edges.right < ghostBounds.left) {
      const hasYOverlap = !(edges.bottom < ghostBounds.top || edges.top > ghostBounds.bottom);
      if (hasYOverlap) {
        const distance = ghostBounds.left - edges.right;
        if (!closestLeft || distance < closestLeft.distance) {
          closestLeft = { id, distance, edges, targetType };
        }
      }
    }

    // Check RIGHT: target's left edge > ghost's right edge
    if (edges.left > ghostBounds.right) {
      const hasYOverlap = !(edges.bottom < ghostBounds.top || edges.top > ghostBounds.bottom);
      if (hasYOverlap) {
        const distance = edges.left - ghostBounds.right;
        if (!closestRight || distance < closestRight.distance) {
          closestRight = { id, distance, edges, targetType };
        }
      }
    }

    // Check UP: target's bottom edge < ghost's top edge
    if (edges.bottom < ghostBounds.top) {
      const hasXOverlap = !(edges.right < ghostBounds.left || edges.left > ghostBounds.right);
      if (hasXOverlap) {
        const distance = ghostBounds.top - edges.bottom;
        if (!closestUp || distance < closestUp.distance) {
          closestUp = { id, distance, edges, targetType };
        }
      }
    }

    // Check DOWN: target's top edge > ghost's bottom edge
    if (edges.top > ghostBounds.bottom) {
      const hasXOverlap = !(edges.right < ghostBounds.left || edges.left > ghostBounds.right);
      if (hasXOverlap) {
        const distance = edges.top - ghostBounds.bottom;
        if (!closestDown || distance < closestDown.distance) {
          closestDown = { id, distance, edges, targetType };
        }
      }
    }
  };

  // Check warehouse elements (only pickable types)
  const pickableElements = elements.filter(
    el => ['bay', 'flow_rack', 'full_pallet'].includes(el.element_type) &&
          el.id !== excludeElementId
  );

  for (const element of pickableElements) {
    const edges = getElementEdges(element);
    checkTarget(element.id, edges, 'element');
  }

  // Check route markers (start, stop, cart parking)
  for (const marker of routeMarkers) {
    const edges = getRouteMarkerEdges(marker);
    checkTarget(marker.id, edges, marker.marker_type);
  }

  // Build markers for each direction found
  // LEFT: horizontal line from target's right edge to ghost's left edge
  if (closestLeft) {
    const targetEdges = closestLeft.edges;
    const overlapTop = Math.max(ghostBounds.top, targetEdges.top);
    const overlapBottom = Math.min(ghostBounds.bottom, targetEdges.bottom);
    const yMid = (overlapTop + overlapBottom) / 2;

    markers.push({
      direction: 'left',
      distancePx: closestLeft.distance,
      distanceFeet: pixelsToFeet(closestLeft.distance),
      lineStart: { x: targetEdges.right, y: yMid },
      lineEnd: { x: ghostBounds.left, y: yMid },
      labelPosition: {
        x: (targetEdges.right + ghostBounds.left) / 2,
        y: yMid
      },
      targetElementId: closestLeft.id,
      targetType: closestLeft.targetType
    });
  }

  // RIGHT: horizontal line from ghost's right edge to target's left edge
  if (closestRight) {
    const targetEdges = closestRight.edges;
    const overlapTop = Math.max(ghostBounds.top, targetEdges.top);
    const overlapBottom = Math.min(ghostBounds.bottom, targetEdges.bottom);
    const yMid = (overlapTop + overlapBottom) / 2;

    markers.push({
      direction: 'right',
      distancePx: closestRight.distance,
      distanceFeet: pixelsToFeet(closestRight.distance),
      lineStart: { x: ghostBounds.right, y: yMid },
      lineEnd: { x: targetEdges.left, y: yMid },
      labelPosition: {
        x: (ghostBounds.right + targetEdges.left) / 2,
        y: yMid
      },
      targetElementId: closestRight.id,
      targetType: closestRight.targetType
    });
  }

  // UP: vertical line from target's bottom edge to ghost's top edge
  if (closestUp) {
    const targetEdges = closestUp.edges;
    const overlapLeft = Math.max(ghostBounds.left, targetEdges.left);
    const overlapRight = Math.min(ghostBounds.right, targetEdges.right);
    const xMid = (overlapLeft + overlapRight) / 2;

    markers.push({
      direction: 'up',
      distancePx: closestUp.distance,
      distanceFeet: pixelsToFeet(closestUp.distance),
      lineStart: { x: xMid, y: targetEdges.bottom },
      lineEnd: { x: xMid, y: ghostBounds.top },
      labelPosition: {
        x: xMid,
        y: (targetEdges.bottom + ghostBounds.top) / 2
      },
      targetElementId: closestUp.id,
      targetType: closestUp.targetType
    });
  }

  // DOWN: vertical line from ghost's bottom edge to target's top edge
  if (closestDown) {
    const targetEdges = closestDown.edges;
    const overlapLeft = Math.max(ghostBounds.left, targetEdges.left);
    const overlapRight = Math.min(ghostBounds.right, targetEdges.right);
    const xMid = (overlapLeft + overlapRight) / 2;

    markers.push({
      direction: 'down',
      distancePx: closestDown.distance,
      distanceFeet: pixelsToFeet(closestDown.distance),
      lineStart: { x: xMid, y: ghostBounds.bottom },
      lineEnd: { x: xMid, y: targetEdges.top },
      labelPosition: {
        x: xMid,
        y: (ghostBounds.bottom + targetEdges.top) / 2
      },
      targetElementId: closestDown.id,
      targetType: closestDown.targetType
    });
  }

  return { markers };
}
