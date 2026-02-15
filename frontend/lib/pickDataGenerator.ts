/**
 * Pick Data Generator - Creates realistic, distance-weighted pick data
 * for demonstration purposes. Generates data that shows:
 * 1. Elements closer to cart parking have higher pick counts (natural distance gradient)
 * 2. Intentional outliers - hot items in distant locations (demonstrates reslotting opportunities)
 * 3. Velocity tier distribution (HOT/WARM/COLD items)
 */

import { WarehouseElement, RouteMarker } from './types';

export interface GeneratedPick {
  item_id: string;
  location_id: string;
  element_name: string;
  date: string;
  pick_count: number;
}

export interface GenerationConfig {
  elements: WarehouseElement[];
  cartParkingSpots: RouteMarker[];
  startDate: Date;
  endDate: Date;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface GenerationStats {
  totalPicks: number;
  uniqueItems: number;
  uniqueLocations: number;
  uniqueElements: number;
  dateCount: number;
  outlierCount: number;
}

/**
 * Calculate Manhattan distance between two points
 * (More realistic for warehouse travel than Euclidean distance)
 */
function manhattanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Calculate the center point of an element
 */
function getElementCenter(element: WarehouseElement): { x: number; y: number } {
  return {
    x: element.x_coordinate + element.width / 2,
    y: element.y_coordinate + element.height / 2,
  };
}

/**
 * Find the minimum distance from an element to any cart parking spot
 */
function getMinDistanceToCartParking(
  element: WarehouseElement,
  cartParkingSpots: RouteMarker[],
  fallbackCenter: { x: number; y: number }
): number {
  const elementCenter = getElementCenter(element);

  if (cartParkingSpots.length === 0) {
    // Fall back to canvas center if no cart parking defined
    return manhattanDistance(
      elementCenter.x,
      elementCenter.y,
      fallbackCenter.x,
      fallbackCenter.y
    );
  }

  let minDistance = Infinity;
  for (const spot of cartParkingSpots) {
    const distance = manhattanDistance(
      elementCenter.x,
      elementCenter.y,
      spot.x_coordinate,
      spot.y_coordinate
    );
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

/**
 * Generate an array of dates between start and end (inclusive)
 * Only includes weekdays by default
 */
function generateDateRange(
  startDate: Date,
  endDate: Date,
  weekdaysOnly: boolean = true
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    if (!weekdaysOnly || (day !== 0 && day !== 6)) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Generate a random velocity tier with the following distribution:
 * - HOT (15%): High velocity items
 * - WARM (25%): Medium velocity items
 * - COLD (60%): Low velocity items
 */
function getVelocityTier(): { tier: 'hot' | 'warm' | 'cold'; multiplier: number } {
  const roll = Math.random();

  if (roll < 0.15) {
    // HOT: 0.8 to 1.5x multiplier
    return { tier: 'hot', multiplier: 0.8 + Math.random() * 0.7 };
  } else if (roll < 0.40) {
    // WARM: 0.25 to 0.55x multiplier
    return { tier: 'warm', multiplier: 0.25 + Math.random() * 0.3 };
  } else {
    // COLD: 0.02 to 0.15x multiplier
    return { tier: 'cold', multiplier: 0.02 + Math.random() * 0.13 };
  }
}

/**
 * Main generation function - creates distance-weighted pick data
 */
export function generatePickData(config: GenerationConfig): {
  picks: GeneratedPick[];
  stats: GenerationStats;
} {
  const {
    elements,
    cartParkingSpots,
    startDate,
    endDate,
    canvasWidth = 1200,
    canvasHeight = 800,
  } = config;

  // Filter to only pickable elements (not text, lines, arrows)
  const pickableElements = elements.filter(
    (el) => !['text', 'line', 'arrow'].includes(el.element_type)
  );

  if (pickableElements.length === 0) {
    return {
      picks: [],
      stats: {
        totalPicks: 0,
        uniqueItems: 0,
        uniqueLocations: 0,
        uniqueElements: 0,
        dateCount: 0,
        outlierCount: 0,
      },
    };
  }

  const fallbackCenter = { x: canvasWidth / 2, y: canvasHeight / 2 };
  const dates = generateDateRange(startDate, endDate);
  const MAX_BASE_PICKS = 150;

  // Calculate distances for each element
  const elementDistances = pickableElements.map((element) => ({
    element,
    distance: getMinDistanceToCartParking(element, cartParkingSpots, fallbackCenter),
  }));

  // Sort by distance (closest first) and calculate normalized distance rank
  elementDistances.sort((a, b) => a.distance - b.distance);

  const maxDistance = Math.max(...elementDistances.map((ed) => ed.distance));
  const minDistance = Math.min(...elementDistances.map((ed) => ed.distance));
  const distanceRange = maxDistance - minDistance || 1;

  // Add normalized distance rank (0 = closest, 1 = farthest)
  const rankedElements = elementDistances.map((ed) => ({
    ...ed,
    distanceRank: (ed.distance - minDistance) / distanceRange,
  }));

  // Select ~10% of distant elements for outlier injection
  const distantElements = rankedElements.filter((re) => re.distanceRank > 0.6);
  const outlierCount = Math.max(1, Math.ceil(distantElements.length * 0.15));
  const outlierElementLabels = new Set<string>();

  // Randomly select outlier elements from distant ones
  const shuffledDistant = [...distantElements].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(outlierCount, shuffledDistant.length); i++) {
    outlierElementLabels.add(shuffledDistant[i].element.label);
  }

  const picks: GeneratedPick[] = [];
  let itemCounter = 1;
  const uniqueItems = new Set<string>();
  const uniqueLocations = new Set<string>();

  // Generate picks for each element
  for (const { element, distanceRank } of rankedElements) {
    // Distance multiplier: 1.0 for closest, 0.3 for farthest
    const distanceMultiplier = 1 - distanceRank * 0.7;

    // Generate 8-12 locations per element
    const numLocations = 8 + Math.floor(Math.random() * 5);
    const isOutlierElement = outlierElementLabels.has(element.label);

    // Track if we've already injected an outlier item for this element
    let outlierInjected = false;

    for (let locIndex = 0; locIndex < numLocations; locIndex++) {
      const locationId = `LOC-${element.label}-${String(locIndex + 1).padStart(2, '0')}`;
      const itemId = `SKU-${String(itemCounter++).padStart(3, '0')}`;

      uniqueLocations.add(locationId);
      uniqueItems.add(itemId);

      // Determine velocity tier
      let velocityTier = getVelocityTier();

      // OUTLIER INJECTION: Force one item in each distant outlier element to be HOT
      if (isOutlierElement && !outlierInjected && locIndex === 0) {
        velocityTier = { tier: 'hot', multiplier: 1.2 + Math.random() * 0.3 }; // Extra hot!
        outlierInjected = true;
      }

      // Generate picks for each date
      for (const date of dates) {
        // Daily variation ±20%
        const dailyVariation = 0.8 + Math.random() * 0.4;

        // Calculate final pick count
        const rawPicks =
          MAX_BASE_PICKS *
          distanceMultiplier *
          velocityTier.multiplier *
          dailyVariation;

        // Ensure at least 1 pick, but apply some randomness for variety
        const pickCount = Math.max(1, Math.floor(rawPicks));

        picks.push({
          item_id: itemId,
          location_id: locationId,
          element_name: element.label,
          date,
          pick_count: pickCount,
        });
      }
    }
  }

  // Calculate total picks
  const totalPicks = picks.reduce((sum, p) => sum + p.pick_count, 0);

  return {
    picks,
    stats: {
      totalPicks,
      uniqueItems: uniqueItems.size,
      uniqueLocations: uniqueLocations.size,
      uniqueElements: pickableElements.length,
      dateCount: dates.length,
      outlierCount: outlierElementLabels.size,
    },
  };
}

/**
 * Generate default 8 weekdays backwards from today
 */
export function getDefaultDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  let weekdaysCount = 0;

  // Go back until we have 8 weekdays
  while (weekdaysCount < 8) {
    startDate.setDate(startDate.getDate() - 1);
    const day = startDate.getDay();
    if (day !== 0 && day !== 6) {
      weekdaysCount++;
    }
  }

  return { startDate, endDate };
}

/**
 * Estimate the number of picks that will be generated
 */
export function estimatePickCount(
  elementCount: number,
  dateCount: number
): { minPicks: number; maxPicks: number; estimatedPicks: number } {
  // Average 10 locations per element, average ~30 picks per location per day
  const avgLocationsPerElement = 10;
  const avgPicksPerLocationPerDay = 30;

  const estimatedPicks =
    elementCount * avgLocationsPerElement * dateCount * avgPicksPerLocationPerDay;

  return {
    minPicks: Math.floor(estimatedPicks * 0.7),
    maxPicks: Math.ceil(estimatedPicks * 1.3),
    estimatedPicks: Math.round(estimatedPicks),
  };
}
