/**
 * Distance Calculation Utilities for Warehouse Layout
 *
 * Uses Manhattan distance (industry standard for grid-based warehouse layouts)
 * to calculate accurate travel distances for:
 * - Cart travel between parking spots
 * - Pedestrian walk from parking to elements and back
 */

import { WarehouseElement, RouteMarker, ROUTE_MARKER_CONFIGS, ELEMENT_CONFIGS } from './types';

// Pixels per foot (1 pixel = 1 inch, 12 inches = 1 foot)
const PIXELS_PER_FOOT = 12;

export interface Point {
  x: number;
  y: number;
}

export interface ParkingAssignment {
  parkingId: string;
  parkingLabel: string;
  parkingPosition: Point;
  assignedElements: Array<{
    elementId: string;
    elementLabel: string;
    position: Point;
    distanceToParking: number; // Manhattan distance in pixels
    roundTripFeet: number; // Round trip distance in feet
  }>;
  totalPedestrianDistPx: number; // Sum of all round trips in pixels
  totalPedestrianDistFeet: number;
}

export interface RouteSegment {
  start: Point;
  end: Point;
  startLabel: string;
  endLabel: string;
  segmentName: string;
  distancePx: number;
  distanceFeet: number;
  midpoint: Point;
  // Pedestrian info at the starting point of this segment (if it's a parking spot)
  pedestrianAtStart?: {
    elementsServed: number;
    walkDistanceFeet: number;
  };
}

export interface DistanceCalculationResult {
  segments: RouteSegment[];
  cartTravelPx: number;
  cartTravelFeet: number;
  pedestrianWalkPx: number;
  pedestrianWalkFeet: number;
  totalDistancePx: number;
  totalDistanceFeet: number;
  segmentCount: number;
  parkingStopCount: number;
  elementsServed: number;
  parkingAssignments: ParkingAssignment[];
}

/**
 * Calculate Manhattan distance between two points
 * Better for warehouse grids than Euclidean (crow-flies) distance
 */
export function calculateManhattanDistance(p1: Point, p2: Point): number {
  return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
}

/**
 * Calculate Euclidean distance (straight line)
 * Used for comparison or when direct paths are possible
 */
export function calculateEuclideanDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Convert pixels to feet
 */
export function pixelsToFeet(pixels: number): number {
  return pixels / PIXELS_PER_FOOT;
}

/**
 * Get the center point of a route marker
 */
export function getMarkerCenter(marker: RouteMarker): Point {
  const config = ROUTE_MARKER_CONFIGS[marker.marker_type];
  return {
    x: Number(marker.x_coordinate) + config.width / 2,
    y: Number(marker.y_coordinate) + config.height / 2,
  };
}

/**
 * Get the center point of a warehouse element
 */
export function getElementCenter(element: WarehouseElement): Point {
  return {
    x: Number(element.x_coordinate) + element.width / 2,
    y: Number(element.y_coordinate) + element.height / 2,
  };
}

/**
 * Assign each pickable element to its nearest cart parking spot
 */
export function assignElementsToParking(
  elements: WarehouseElement[],
  cartParkingSpots: RouteMarker[]
): ParkingAssignment[] {
  // Filter to only pickable elements (exclude text, lines, arrows)
  const pickableElements = elements.filter(
    e => e.element_type === 'bay' || e.element_type === 'flow_rack' || e.element_type === 'full_pallet'
  );

  // Initialize parking assignments
  const assignments: Map<string, ParkingAssignment> = new Map();

  cartParkingSpots.forEach(parking => {
    const center = getMarkerCenter(parking);
    assignments.set(parking.id, {
      parkingId: parking.id,
      parkingLabel: parking.label,
      parkingPosition: center,
      assignedElements: [],
      totalPedestrianDistPx: 0,
      totalPedestrianDistFeet: 0,
    });
  });

  // Assign each element to nearest parking
  pickableElements.forEach(element => {
    const elementCenter = getElementCenter(element);
    let nearestParkingId: string | null = null;
    let minDistance = Infinity;

    cartParkingSpots.forEach(parking => {
      const parkingCenter = getMarkerCenter(parking);
      const dist = calculateManhattanDistance(elementCenter, parkingCenter);
      if (dist < minDistance) {
        minDistance = dist;
        nearestParkingId = parking.id;
      }
    });

    if (nearestParkingId && assignments.has(nearestParkingId)) {
      const assignment = assignments.get(nearestParkingId)!;
      const roundTripPx = minDistance * 2;
      const roundTripFeet = pixelsToFeet(roundTripPx);

      assignment.assignedElements.push({
        elementId: element.id,
        elementLabel: element.label,
        position: elementCenter,
        distanceToParking: minDistance,
        roundTripFeet,
      });
      assignment.totalPedestrianDistPx += roundTripPx;
      assignment.totalPedestrianDistFeet += roundTripFeet;
    }
  });

  return Array.from(assignments.values());
}

/**
 * Sort cart parking spots using sequence_order or nearest-neighbor heuristic
 */
export function sortParkingSpots(
  startPoint: Point,
  parkingSpots: RouteMarker[]
): RouteMarker[] {
  // Check if all spots have sequence_order defined
  const allHaveSequence = parkingSpots.every(
    s => s.sequence_order !== undefined && s.sequence_order !== null
  );

  if (allHaveSequence) {
    return [...parkingSpots].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
  }

  // Otherwise use greedy nearest-neighbor
  const remaining = [...parkingSpots];
  const sorted: RouteMarker[] = [];
  let currentPos = startPoint;

  while (remaining.length > 0) {
    let nearestIdx = -1;
    let minDist = Infinity;

    remaining.forEach((spot, idx) => {
      const spotCenter = getMarkerCenter(spot);
      const dist = calculateManhattanDistance(currentPos, spotCenter);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });

    if (nearestIdx !== -1) {
      const nearest = remaining[nearestIdx];
      sorted.push(nearest);
      currentPos = getMarkerCenter(nearest);
      remaining.splice(nearestIdx, 1);
    }
  }

  return sorted;
}

/**
 * Calculate complete distance metrics for warehouse route
 * Includes both cart travel and pedestrian walk distances
 */
export function calculateRouteDistance(
  routeMarkers: RouteMarker[],
  elements: WarehouseElement[]
): DistanceCalculationResult | null {
  const startPoint = routeMarkers.find(m => m.marker_type === 'start_point');
  const stopPoint = routeMarkers.find(m => m.marker_type === 'stop_point');
  const cartParking = routeMarkers.filter(m => m.marker_type === 'cart_parking');

  if (!startPoint || !stopPoint) {
    return null;
  }

  const startCenter = getMarkerCenter(startPoint);
  const stopCenter = getMarkerCenter(stopPoint);

  // If no parking spots, just calculate start to stop
  if (cartParking.length === 0) {
    const distPx = calculateManhattanDistance(startCenter, stopCenter);
    const distFeet = pixelsToFeet(distPx);

    return {
      segments: [{
        start: startCenter,
        end: stopCenter,
        startLabel: startPoint.label || 'Start',
        endLabel: stopPoint.label || 'Stop',
        segmentName: 'Start → Stop',
        distancePx: distPx,
        distanceFeet: distFeet,
        midpoint: {
          x: (startCenter.x + stopCenter.x) / 2,
          y: (startCenter.y + stopCenter.y) / 2,
        },
      }],
      cartTravelPx: distPx,
      cartTravelFeet: distFeet,
      pedestrianWalkPx: 0,
      pedestrianWalkFeet: 0,
      totalDistancePx: distPx,
      totalDistanceFeet: distFeet,
      segmentCount: 1,
      parkingStopCount: 0,
      elementsServed: 0,
      parkingAssignments: [],
    };
  }

  // Assign elements to parking spots
  const parkingAssignments = assignElementsToParking(elements, cartParking);

  // Sort parking spots
  const sortedParking = sortParkingSpots(startCenter, cartParking);

  // Build route segments
  const points: Array<{ marker: RouteMarker; center: Point }> = [
    { marker: startPoint, center: startCenter },
    ...sortedParking.map(p => ({ marker: p, center: getMarkerCenter(p) })),
    { marker: stopPoint, center: stopCenter },
  ];

  const segments: RouteSegment[] = [];
  let totalCartPx = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const distPx = calculateManhattanDistance(p1.center, p2.center);
    const distFeet = pixelsToFeet(distPx);
    totalCartPx += distPx;

    // Build segment name
    let segmentName = '';
    if (p1.marker.marker_type === 'start_point') {
      segmentName = 'Start → ';
    } else if (p1.marker.marker_type === 'cart_parking') {
      const seqNum = sortedParking.findIndex(p => p.id === p1.marker.id) + 1;
      segmentName = `P${seqNum} → `;
    }

    if (p2.marker.marker_type === 'stop_point') {
      segmentName += 'Stop';
    } else if (p2.marker.marker_type === 'cart_parking') {
      const seqNum = sortedParking.findIndex(p => p.id === p2.marker.id) + 1;
      segmentName += `P${seqNum}`;
    }

    // Get pedestrian info if starting from a parking spot
    let pedestrianAtStart: RouteSegment['pedestrianAtStart'];
    if (p1.marker.marker_type === 'cart_parking') {
      const assignment = parkingAssignments.find(a => a.parkingId === p1.marker.id);
      if (assignment && assignment.assignedElements.length > 0) {
        pedestrianAtStart = {
          elementsServed: assignment.assignedElements.length,
          walkDistanceFeet: assignment.totalPedestrianDistFeet,
        };
      }
    }

    segments.push({
      start: p1.center,
      end: p2.center,
      startLabel: p1.marker.label || (p1.marker.marker_type === 'start_point' ? 'Start' : 'Stop'),
      endLabel: p2.marker.label || (p2.marker.marker_type === 'stop_point' ? 'Stop' : 'Start'),
      segmentName,
      distancePx: distPx,
      distanceFeet: distFeet,
      midpoint: {
        x: (p1.center.x + p2.center.x) / 2,
        y: (p1.center.y + p2.center.y) / 2,
      },
      pedestrianAtStart,
    });
  }

  // Calculate totals
  const totalPedestrianPx = parkingAssignments.reduce(
    (sum, a) => sum + a.totalPedestrianDistPx, 0
  );
  const totalPedestrianFeet = pixelsToFeet(totalPedestrianPx);
  const totalCartFeet = pixelsToFeet(totalCartPx);
  const totalElementsServed = parkingAssignments.reduce(
    (sum, a) => sum + a.assignedElements.length, 0
  );

  return {
    segments,
    cartTravelPx: totalCartPx,
    cartTravelFeet: totalCartFeet,
    pedestrianWalkPx: totalPedestrianPx,
    pedestrianWalkFeet: totalPedestrianFeet,
    totalDistancePx: totalCartPx + totalPedestrianPx,
    totalDistanceFeet: totalCartFeet + totalPedestrianFeet,
    segmentCount: segments.length,
    parkingStopCount: sortedParking.length,
    elementsServed: totalElementsServed,
    parkingAssignments,
  };
}
