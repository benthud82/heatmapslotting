// Dashboard Analytics Utility Functions
// Provides calculations for velocity tiers, zone classification, efficiency metrics, and trend analysis

import {
  AggregatedPickData,
  PickTransaction,
  ItemReslottingOpportunity,
  ElementType,
  AggregatedItemPickData,
  ElementCapacityInfo,
  SwapSuggestion,
  CapacityAwareReslottingOpportunity,
  CapacityAwareTargetElement,
  PaginatedOpportunitiesResult,
  ItemVelocityAnalysis,
  ReslottingSummary,
  SlottingRecommendation as SlottingRec,
  VelocityTier as VelTier,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export type VelocityTier = 'hot' | 'warm' | 'cold';
export type SlottingRecommendation = 'move-closer' | 'optimal' | 'review' | 'move-further';

export interface VelocityAnalysis {
  elementId: string;
  elementName: string;
  totalPicks: number;
  avgDailyPicks: number;
  daysActive: number;
  velocityTier: VelocityTier;
  percentile: number;
  recommendation: SlottingRecommendation;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  distance: number; // Legacy: Manhattan distance to nearest cart parking spot

  // New Item-Level & Savings Fields
  itemId?: string;
  externalItemId?: string;
  itemDescription?: string;
  locationId?: string;
  externalLocationId?: string;

  currentDistance: number;       // Distance to nearest cart parking (pixels)
  optimalDistance: number;       // Target distance (0 for Hot)
  walkSavingsPerPick: number;    // Savings per visit in pixels
  dailyWalkSavingsFeet: number;  // Estimated daily savings
  dailyTimeSavingsMinutes: number;
  priorityScore: number;
}

export interface ZoneBreakdown {
  tier: VelocityTier;
  count: number;
  totalPicks: number;
  percentage: number;
  color: string;
}

export interface EfficiencyMetrics {
  travelScore: number; // 0-100, higher is better
  pickDensity: number; // picks per active location
  hotZoneUtilization: number; // % of picks from top 20% locations
  optimalSlottingRate: number; // % of items in optimal position
}

export interface PeriodComparison {
  current: {
    totalPicks: number;
    activeLocations: number;
    avgPicksPerLocation: number;
    topPerformer: string;
  };
  previous: {
    totalPicks: number;
    activeLocations: number;
    avgPicksPerLocation: number;
    topPerformer: string;
  };
  deltas: {
    totalPicks: number;
    totalPicksPercent: number;
    activeLocations: number;
    activeLocationsPercent: number;
    avgPicksPerLocation: number;
    avgPicksPerLocationPercent: number;
  };
}

export interface KPIData {
  totalPicks: number;
  totalPicksTrend: number; // % change
  activeLocations: number;
  totalLocations: number;
  utilizationPercent: number;
  avgPicksPerLocation: number;
  avgPicksTrend: number; // % change
}

// ============================================================================
// VELOCITY CALCULATIONS
// ============================================================================

/**
 * Calculate velocity tier based on percentile ranking
 * Hot: Top 20% (80-100 percentile)
 * Warm: Middle 60% (20-80 percentile)  
 * Cold: Bottom 20% (0-20 percentile)
 */
export function getVelocityTier(percentile: number): VelocityTier {
  if (percentile >= 80) return 'hot';
  if (percentile >= 20) return 'warm';
  return 'cold';
}

/**
 * Get color for velocity tier
 */
export function getVelocityColor(tier: VelocityTier): string {
  switch (tier) {
    case 'hot': return '#ef4444'; // red-500
    case 'warm': return '#f59e0b'; // amber-500
    case 'cold': return '#3b82f6'; // blue-500
  }
}

/**
 * Get gradient color based on value position between min and max
 */
export function getGradientColor(value: number, min: number, max: number): string {
  if (max === min) return '#3b82f6';

  const ratio = (value - min) / (max - min);

  // Blue (cold) -> Yellow (warm) -> Red (hot)
  if (ratio < 0.5) {
    // Blue to Yellow
    const r = Math.round(59 + (245 - 59) * (ratio * 2));
    const g = Math.round(130 + (158 - 130) * (ratio * 2));
    const b = Math.round(246 - 246 * (ratio * 2));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to Red
    const r = Math.round(245 + (239 - 245) * ((ratio - 0.5) * 2));
    const g = Math.round(158 - 158 * ((ratio - 0.5) * 2));
    const b = Math.round(11 + (68 - 11) * ((ratio - 0.5) * 2));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Calculate Manhattan distance between two points
 */
export function calculateManhattanDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
}

/**
 * Find the nearest cart parking spot and distance to it
 */
export function findNearestCartParking(
  element: { x: number; y: number; width?: number; height?: number },
  cartParkingSpots: Array<{ x: number; y: number }>
): number {
  if (cartParkingSpots.length === 0) return Infinity;

  // Use center of element if dimensions provided, otherwise assume provided point is center
  const elementCenter = {
    x: element.x + (element.width ? element.width / 2 : 0),
    y: element.y + (element.height ? element.height / 2 : 0)
  };

  // Cart parking spots are 40x24 (centered = +20, +12)
  const CART_PARKING_WIDTH = 40;
  const CART_PARKING_HEIGHT = 24;

  let minDistance = Infinity;
  for (const cart of cartParkingSpots) {
    const parkingCenter = {
      x: cart.x + CART_PARKING_WIDTH / 2,
      y: cart.y + CART_PARKING_HEIGHT / 2
    };
    const dist = calculateManhattanDistance(elementCenter, parkingCenter);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

/**
 * Determine slotting recommendation based on velocity AND distance
 * - Move Closer: High picks (Hot) but far from cart parking
 * - Move Further: Low picks (Cold) but close to cart parking
 */
export function getSlottingRecommendation(
  velocityTier: VelocityTier,
  percentile: number,
  distancePercentile: number
): SlottingRecommendation {
  // Hot items that are far from cart parking should move closer
  if (velocityTier === 'hot' && distancePercentile >= 50) {
    return 'move-closer';
  }
  // Hot items already close are optimal
  if (velocityTier === 'hot') {
    return 'optimal';
  }
  // Cold items that are close to cart parking should move further
  if (velocityTier === 'cold' && distancePercentile <= 20) {
    return 'move-further';
  }
  // Cold items already far are optimal (or at least not wasting prime space)
  if (velocityTier === 'cold') {
    return 'optimal';
  }
  // Warm tier items need review
  if (percentile >= 70 && distancePercentile >= 70) {
    return 'review'; // High-ish picks but far - might benefit from moving
  }
  return 'optimal';
}

/**
 * Analyze velocity for all elements, incorporating distance to cart parking
 */
export function analyzeVelocity(
  aggregatedData: (AggregatedPickData | any)[], // Use any to allow item properties without strict type guards for now
  previousPeriodData?: AggregatedPickData[],
  elements?: Array<{ id: string; x: number; y: number }>,
  cartParkingSpots?: Array<{ x: number; y: number }>
): VelocityAnalysis[] {
  if (aggregatedData.length === 0) return [];

  // Sort by total picks descending
  const sorted = [...aggregatedData].sort((a, b) => b.total_picks - a.total_picks);

  // Create a map of previous period data for trend calculation
  const previousMap = new Map<string, number>();
  if (previousPeriodData) {
    previousPeriodData.forEach(item => {
      previousMap.set(item.element_id, item.total_picks);
    });
  }

  // Create element position map
  const elementPositionMap = new Map<string, { x: number; y: number }>();
  if (elements) {
    elements.forEach(el => {
      elementPositionMap.set(el.id, { x: el.x, y: el.y });
    });
  }

  // Calculate distances for all elements
  const distances: number[] = [];
  sorted.forEach(item => {
    // For item-level data, we might have coordinates directly
    let pos: { x: number; y: number } | undefined;

    if (item.x_coordinate !== undefined && item.y_coordinate !== undefined) {
      pos = { x: Number(item.x_coordinate), y: Number(item.y_coordinate) };
    } else {
      pos = elementPositionMap.get(item.element_id);
    }

    if (pos && cartParkingSpots && cartParkingSpots.length > 0) {
      distances.push(findNearestCartParking(pos, cartParkingSpots));
    } else {
      distances.push(0);
    }
  });

  // Sort distances to calculate percentiles
  const sortedDistances = [...distances].sort((a, b) => a - b);

  return sorted.map((item, index) => {
    const percentile = ((sorted.length - index) / sorted.length) * 100;
    const velocityTier = getVelocityTier(percentile);
    const avgDailyPicks = item.days_count > 0 ? item.total_picks / item.days_count : item.total_picks;

    // Calculate distance and distance percentile
    const distance = distances[index];
    const distanceRank = sortedDistances.indexOf(distance);
    // Higher distance percentile = further from cart parking
    const distancePercentile = sortedDistances.length > 1
      ? ((distanceRank + 1) / sortedDistances.length) * 100
      : 50;

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;

    if (previousPeriodData && previousMap.has(item.element_id)) {
      const prevPicks = previousMap.get(item.element_id)!;
      if (prevPicks > 0) {
        trendPercent = ((item.total_picks - prevPicks) / prevPicks) * 100;
        if (trendPercent > 5) trend = 'up';
        else if (trendPercent < -5) trend = 'down';
      } else if (item.total_picks > 0) {
        trend = 'up';
        trendPercent = 100;
      }
    }

    // We assume 1 visit per active day (days_count)
    // 1 pixel = 1 inch
    const currentDistPx = distance;
    const roundTripPx = currentDistPx * 2;
    const totalVisits = item.days_count;

    // Total savings over the entire data period in pixels
    const totalSavingsPx = roundTripPx * totalVisits;

    // Convert to Feet (12 px = 1 ft)
    const totalSavingsFeet = totalSavingsPx / 12;

    // Estimate period duration from data to normalize to "Daily"
    // (Use the max days_count from the entire dataset as the period length approximation)
    const maxDays = sorted.length > 0 ? Math.max(...sorted.map(i => i.days_count)) : 1;
    const periodDuration = Math.max(maxDays, 1);

    const dailyWalkSavingsFeet = Math.round(totalSavingsFeet / periodDuration);

    // Walking speed: 3 mph = 264 ft/min
    const dailyTimeSavingsMinutes = Math.round((dailyWalkSavingsFeet / 264) * 10) / 10;

    // Priority Score for ranking: Total savings (impact)
    const priorityScore = totalSavingsFeet;

    return {
      elementId: item.element_id,
      elementName: item.element_name,
      // ... mapping item properties ...
      itemId: item.item_id || '', // Handle item-level vs element-level differences if needed
      externalItemId: item.external_item_id || '',
      itemDescription: item.item_description,
      locationId: item.location_id || '',
      externalLocationId: item.external_location_id || '',

      totalPicks: item.total_picks,
      avgDailyPicks: Math.round(avgDailyPicks * 10) / 10,
      daysActive: item.days_count,
      velocityTier,
      percentile: Math.round(percentile),
      recommendation: getSlottingRecommendation(velocityTier, percentile, distancePercentile),
      trend,
      trendPercent: Math.round(trendPercent),

      distance: Math.round(distance), // Legacy compatibility
      currentDistance: Math.round(distance),
      optimalDistance: 0, // Target is always closest possible
      walkSavingsPerPick: Math.round(roundTripPx), // Savings per visit in pixels
      dailyWalkSavingsFeet,
      dailyTimeSavingsMinutes,
      priorityScore,
    };
  });
}

// ============================================================================
// ZONE ANALYSIS
// ============================================================================

/**
 * Break down data by velocity zones
 */
export function getZoneBreakdown(velocityAnalysis: VelocityAnalysis[]): ZoneBreakdown[] {
  const zones: Record<VelocityTier, { count: number; totalPicks: number }> = {
    hot: { count: 0, totalPicks: 0 },
    warm: { count: 0, totalPicks: 0 },
    cold: { count: 0, totalPicks: 0 },
  };

  velocityAnalysis.forEach(item => {
    zones[item.velocityTier].count++;
    zones[item.velocityTier].totalPicks += item.totalPicks;
  });

  const totalPicks = velocityAnalysis.reduce((sum, item) => sum + item.totalPicks, 0);

  return [
    {
      tier: 'hot',
      count: zones.hot.count,
      totalPicks: zones.hot.totalPicks,
      percentage: totalPicks > 0 ? (zones.hot.totalPicks / totalPicks) * 100 : 0,
      color: getVelocityColor('hot'),
    },
    {
      tier: 'warm',
      count: zones.warm.count,
      totalPicks: zones.warm.totalPicks,
      percentage: totalPicks > 0 ? (zones.warm.totalPicks / totalPicks) * 100 : 0,
      color: getVelocityColor('warm'),
    },
    {
      tier: 'cold',
      count: zones.cold.count,
      totalPicks: zones.cold.totalPicks,
      percentage: totalPicks > 0 ? (zones.cold.totalPicks / totalPicks) * 100 : 0,
      color: getVelocityColor('cold'),
    },
  ];
}

// ============================================================================
// ACTION RECOMMENDATIONS
// ============================================================================

export interface MoveRecommendation {
  elementId: string;
  elementName: string;
  totalPicks: number;
  velocityTier: VelocityTier;
  percentile: number;
  trendPercent: number;
  action: 'move-closer' | 'move-further';
  dailyWalkSavingsFeet?: number;
  dailyTimeSavingsMinutes?: number;
}

/**
 * Get top move recommendations for the ActionBoard
 * Returns items that should be moved closer (hot but not optimal)
 * and items that should be moved further (cold, low percentile)
 * 
 * If no candidates are found with strict thresholds, progressively expands the search:
 * - Move Closer: Hot items far from cart -> Hot items anywhere -> Top picks that are far
 * - Move Further: Cold items close to cart -> Cold items anywhere -> Bottom picks that are close
 */
export function getTopMoveRecommendations(
  velocityAnalysis: VelocityAnalysis[],
  limit: number = 3
): { moveCloser: MoveRecommendation[]; moveFurther: MoveRecommendation[] } {

  // Helper to map items to MoveRecommendation format
  const toMoveRecommendation = (item: VelocityAnalysis, action: 'move-closer' | 'move-further'): MoveRecommendation => ({
    elementId: item.elementId,
    elementName: item.elementName,
    totalPicks: item.totalPicks,
    velocityTier: item.velocityTier,
    percentile: item.percentile,
    trendPercent: item.trendPercent,
    dailyWalkSavingsFeet: item.dailyWalkSavingsFeet,
    dailyTimeSavingsMinutes: item.dailyTimeSavingsMinutes,
    action,
  });

  // --- Move Closer Logic ---
  // Priority 1: Items explicitly marked as move-closer
  let moveCloserCandidates = velocityAnalysis
    .filter(item => item.recommendation === 'move-closer')
    .sort((a, b) => b.totalPicks - a.totalPicks);

  // Priority 2: If none, expand to all Hot items and sort by distance (furthest first)
  if (moveCloserCandidates.length === 0) {
    moveCloserCandidates = velocityAnalysis
      .filter(item => item.velocityTier === 'hot')
      .sort((a, b) => b.distance - a.distance); // Furthest hot items first
  }

  // Priority 3: If still none, take top picks that are far (top 40% picks, top 40% distance)
  if (moveCloserCandidates.length === 0) {
    moveCloserCandidates = velocityAnalysis
      .filter(item => item.percentile >= 60 && item.distance > 0)
      .sort((a, b) => (b.totalPicks * b.distance) - (a.totalPicks * a.distance)); // Weighted by picks * distance
  }

  const moveCloser = moveCloserCandidates.slice(0, limit).map(item => toMoveRecommendation(item, 'move-closer'));

  // --- Move Further Logic ---
  // Priority 1: Items explicitly marked as move-further
  let moveFurtherCandidates = velocityAnalysis
    .filter(item => item.recommendation === 'move-further')
    .sort((a, b) => a.totalPicks - b.totalPicks);

  // Priority 2: If none, expand to all Cold items and sort by distance (closest first)
  if (moveFurtherCandidates.length === 0) {
    moveFurtherCandidates = velocityAnalysis
      .filter(item => item.velocityTier === 'cold')
      .sort((a, b) => a.distance - b.distance); // Closest cold items first
  }

  // Priority 3: If still none, take bottom picks that are close (bottom 40% picks, bottom 40% distance)
  if (moveFurtherCandidates.length === 0) {
    moveFurtherCandidates = velocityAnalysis
      .filter(item => item.percentile <= 40 && item.distance > 0)
      .sort((a, b) => {
        // Prioritize lowest picks that are closest (inverse weighting)
        const scoreA = a.totalPicks > 0 ? a.distance / a.totalPicks : a.distance;
        const scoreB = b.totalPicks > 0 ? b.distance / b.totalPicks : b.distance;
        return scoreA - scoreB; // Lowest score = closest with fewest picks
      });
  }

  const moveFurther = moveFurtherCandidates.slice(0, limit).map(item => toMoveRecommendation(item, 'move-further'));

  return { moveCloser, moveFurther };
}

// ============================================================================
// EFFICIENCY CALCULATIONS
// ============================================================================

/**
 * Calculate efficiency metrics
 */
export function calculateEfficiencyMetrics(
  velocityAnalysis: VelocityAnalysis[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _totalElementCount: number
): EfficiencyMetrics {
  if (velocityAnalysis.length === 0) {
    return {
      travelScore: 0,
      pickDensity: 0,
      hotZoneUtilization: 0,
      optimalSlottingRate: 0,
    };
  }

  const totalPicks = velocityAnalysis.reduce((sum, item) => sum + item.totalPicks, 0);
  const activeLocations = velocityAnalysis.length;

  // Pick density: picks per active location
  const pickDensity = activeLocations > 0 ? totalPicks / activeLocations : 0;

  // Hot zone utilization: % of picks from top 20% of locations
  const top20Count = Math.max(1, Math.ceil(activeLocations * 0.2));
  const top20Picks = velocityAnalysis
    .slice(0, top20Count)
    .reduce((sum, item) => sum + item.totalPicks, 0);
  const hotZoneUtilization = totalPicks > 0 ? (top20Picks / totalPicks) * 100 : 0;

  // Optimal slotting rate: % of items marked as optimal
  const optimalCount = velocityAnalysis.filter(item => item.recommendation === 'optimal').length;
  const optimalSlottingRate = activeLocations > 0 ? (optimalCount / activeLocations) * 100 : 0;

  // Travel score: weighted calculation based on hot zone utilization and optimal slotting
  // Higher is better - ideal warehouse has high picks from easily accessible (hot) zones
  const travelScore = Math.min(100, Math.round(
    (hotZoneUtilization * 0.6) + (optimalSlottingRate * 0.4)
  ));

  return {
    travelScore,
    pickDensity: Math.round(pickDensity * 10) / 10,
    hotZoneUtilization: Math.round(hotZoneUtilization * 10) / 10,
    optimalSlottingRate: Math.round(optimalSlottingRate * 10) / 10,
  };
}

// ============================================================================
// KPI CALCULATIONS
// ============================================================================

/**
 * Calculate KPI data for the hero section
 */
export function calculateKPIs(
  currentData: AggregatedPickData[],
  previousData: AggregatedPickData[],
  totalElementCount: number
): KPIData {
  const currentTotal = currentData.reduce((sum, item) => sum + item.total_picks, 0);
  const previousTotal = previousData.reduce((sum, item) => sum + item.total_picks, 0);

  const currentActive = currentData.length;

  const currentAvg = currentActive > 0 ? currentTotal / currentActive : 0;
  const previousAvg = previousData.length > 0 ? previousTotal / previousData.length : 0;

  // Calculate trends
  const totalPicksTrend = previousTotal > 0
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : (currentTotal > 0 ? 100 : 0);

  const avgPicksTrend = previousAvg > 0
    ? ((currentAvg - previousAvg) / previousAvg) * 100
    : (currentAvg > 0 ? 100 : 0);

  return {
    totalPicks: currentTotal,
    totalPicksTrend: Math.round(totalPicksTrend * 10) / 10,
    activeLocations: currentActive,
    totalLocations: totalElementCount,
    utilizationPercent: totalElementCount > 0
      ? Math.round((currentActive / totalElementCount) * 100)
      : 0,
    avgPicksPerLocation: Math.round(currentAvg * 10) / 10,
    avgPicksTrend: Math.round(avgPicksTrend * 10) / 10,
  };
}

// ============================================================================
// PERIOD COMPARISON
// ============================================================================

/**
 * Compare two periods of data
 */
export function comparePeriods(
  currentData: AggregatedPickData[],
  previousData: AggregatedPickData[]
): PeriodComparison {
  const currentTotal = currentData.reduce((sum, item) => sum + item.total_picks, 0);
  const previousTotal = previousData.reduce((sum, item) => sum + item.total_picks, 0);

  const currentActive = currentData.length;
  const previousActive = previousData.length;

  const currentAvg = currentActive > 0 ? currentTotal / currentActive : 0;
  const previousAvg = previousActive > 0 ? previousTotal / previousActive : 0;

  const currentTop = currentData.length > 0
    ? [...currentData].sort((a, b) => b.total_picks - a.total_picks)[0].element_name
    : '-';
  const previousTop = previousData.length > 0
    ? [...previousData].sort((a, b) => b.total_picks - a.total_picks)[0].element_name
    : '-';

  return {
    current: {
      totalPicks: currentTotal,
      activeLocations: currentActive,
      avgPicksPerLocation: Math.round(currentAvg * 10) / 10,
      topPerformer: currentTop,
    },
    previous: {
      totalPicks: previousTotal,
      activeLocations: previousActive,
      avgPicksPerLocation: Math.round(previousAvg * 10) / 10,
      topPerformer: previousTop,
    },
    deltas: {
      totalPicks: currentTotal - previousTotal,
      totalPicksPercent: previousTotal > 0
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100 * 10) / 10
        : 0,
      activeLocations: currentActive - previousActive,
      activeLocationsPercent: previousActive > 0
        ? Math.round(((currentActive - previousActive) / previousActive) * 100 * 10) / 10
        : 0,
      avgPicksPerLocation: Math.round((currentAvg - previousAvg) * 10) / 10,
      avgPicksPerLocationPercent: previousAvg > 0
        ? Math.round(((currentAvg - previousAvg) / previousAvg) * 100 * 10) / 10
        : 0,
    },
  };
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get date range for a period type
 */
export function getDateRangeForPeriod(
  periodType: 'week' | 'month' | 'quarter',
  offset: number = 0 // 0 = current, 1 = previous, etc.
): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (periodType) {
    case 'week':
      // Get start of week (Sunday)
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek - (offset * 7));
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'month':
      start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
      break;

    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const targetQuarter = currentQuarter - offset;
      const targetYear = now.getFullYear() + Math.floor(targetQuarter / 4);
      const adjustedQuarter = ((targetQuarter % 4) + 4) % 4;

      start = new Date(targetYear, adjustedQuarter * 3, 1);
      end = new Date(targetYear, adjustedQuarter * 3 + 3, 0);
      break;
  }

  return {
    start: formatDateString(start),
    end: formatDateString(end),
  };
}

/**
 * Get date range for the last 7 calendar days (slidng window)
 * Today is excluded as it might be incomplete
 */
export function getLast7DaysRange(): { start: string; end: string } {
  const end = new Date();
  end.setDate(end.getDate() - 1); // Yesterday

  const start = new Date(end);
  start.setDate(end.getDate() - 6); // 7 days ago including yesterday

  return {
    start: formatDateString(start),
    end: formatDateString(end),
  };
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 */
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// ============================================================================
// SPARKLINE DATA
// ============================================================================

/**
 * Generate sparkline data from transactions
 */
export function generateSparklineData(
  transactions: PickTransaction[],
  days: number = 7
): number[] {
  const dailyMap = new Map<string, number>();

  // Get the last N days
  const today = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(formatDateString(date));
  }

  // Initialize with zeros
  dates.forEach(date => dailyMap.set(date, 0));

  // Sum up transactions
  transactions.forEach(t => {
    if (dailyMap.has(t.pick_date)) {
      dailyMap.set(t.pick_date, (dailyMap.get(t.pick_date) || 0) + t.pick_count);
    }
  });

  // Return ordered array
  return dates.map(date => dailyMap.get(date) || 0);
}

// ============================================================================
// PARETO ANALYSIS
// ============================================================================

export interface ParetoDataPoint {
  skuPercentile: number;    // % of SKUs (0-100)
  cumulativePicks: number;  // Cumulative % of picks (0-100)
  elementName: string;      // Location name for context
  externalItemId: string;   // SKU ID for display
  picks: number;            // Raw picks for this item
}

/**
 * Calculate Pareto distribution for ABC analysis
 * Shows how picks are distributed across SKUs (cumulative)
 */
export function getParetoDistribution(
  velocityAnalysis: VelocityAnalysis[]
): ParetoDataPoint[] {
  if (velocityAnalysis.length === 0) return [];

  const totalPicks = velocityAnalysis.reduce((sum, item) => sum + item.totalPicks, 0);
  if (totalPicks === 0) return [];

  // Sort by picks descending (should already be sorted, but ensure)
  const sorted = [...velocityAnalysis].sort((a, b) => b.totalPicks - a.totalPicks);

  let cumulativePicks = 0;

  return sorted.map((item, index) => {
    cumulativePicks += item.totalPicks;
    return {
      skuPercentile: Math.round(((index + 1) / sorted.length) * 100),
      cumulativePicks: Math.round((cumulativePicks / totalPicks) * 100),
      elementName: item.elementName,
      externalItemId: item.externalItemId || item.elementName,
      picks: item.totalPicks,
    };
  });
}

// ============================================================================
// CONGESTION ANALYSIS
// ============================================================================

export interface CongestionZone {
  row: number;
  col: number;
  density: number;         // Normalized density (0-1)
  pickCount: number;       // Raw pick count in this zone
  elements: string[];      // Element names in this zone
  x: number;               // X coordinate (for rendering)
  y: number;               // Y coordinate (for rendering)
  width: number;           // Zone width
  height: number;          // Zone height
}

interface ElementWithPicks {
  id: string;
  name: string;
  x: number;
  y: number;
  picks: number;
}

/**
 * Identify congestion zones using grid-based density calculation
 * Divides warehouse into gridSize x gridSize cells and sums picks per cell
 */
export function identifyCongestionZones(
  elements: { id: string; label: string; x_coordinate: number; y_coordinate: number }[],
  pickData: AggregatedPickData[],
  canvasWidth: number = 1200,
  canvasHeight: number = 800,
  gridSize: number = 10
): CongestionZone[] {
  if (elements.length === 0) return [];

  // Create a map of element picks
  const pickMap = new Map<string, number>();
  pickData.forEach(pick => {
    pickMap.set(pick.element_id, pick.total_picks);
  });

  // Map elements with their picks
  const elementsWithPicks: ElementWithPicks[] = elements.map(el => ({
    id: el.id,
    name: el.label,
    x: Number(el.x_coordinate),
    y: Number(el.y_coordinate),
    picks: pickMap.get(el.id) || 0,
  }));

  // Calculate cell dimensions
  const cellWidth = canvasWidth / gridSize;
  const cellHeight = canvasHeight / gridSize;

  // Initialize grid
  const grid: { pickCount: number; elements: string[] }[][] = [];
  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      grid[row][col] = { pickCount: 0, elements: [] };
    }
  }

  // Assign elements to grid cells
  elementsWithPicks.forEach(el => {
    const col = Math.min(Math.floor(el.x / cellWidth), gridSize - 1);
    const row = Math.min(Math.floor(el.y / cellHeight), gridSize - 1);

    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      grid[row][col].pickCount += el.picks;
      if (el.picks > 0) {
        grid[row][col].elements.push(el.name);
      }
    }
  });

  // Find max density for normalization
  let maxDensity = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col].pickCount > maxDensity) {
        maxDensity = grid[row][col].pickCount;
      }
    }
  }

  // Convert to CongestionZone array
  const zones: CongestionZone[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = grid[row][col];
      zones.push({
        row,
        col,
        density: maxDensity > 0 ? cell.pickCount / maxDensity : 0,
        pickCount: cell.pickCount,
        elements: cell.elements,
        x: col * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
      });
    }
  }

  return zones;
}

/**
 * Get hotspots (zones with high density)
 */
export function getHotspots(
  congestionZones: CongestionZone[],
  threshold: number = 0.7
): CongestionZone[] {
  return congestionZones
    .filter(zone => zone.density >= threshold)
    .sort((a, b) => b.density - a.density);
}

// ============================================================================
// ITEM-LEVEL VELOCITY ANALYSIS
// ============================================================================


// Walking speed constants
const WALKING_SPEED_FEET_PER_MINUTE = 264; // 3 mph
const PIXELS_PER_FOOT = 12; // 1 pixel = 1 inch, 12 inches = 1 foot

/**
 * Calculate walk savings for an item
 */
export function calculateWalkSavings(
  currentDistance: number,
  optimalDistance: number,
  avgDailyPicks: number
): {
  savingsPerPick: number;
  dailySavingsFeet: number;
  dailyTimeSavingsMinutes: number;
} {
  // Round trip savings (go and return)
  const roundTripSavings = Math.max(0, (currentDistance - optimalDistance) * 2);

  // Total daily savings in pixels
  const dailySavingsPixels = roundTripSavings * avgDailyPicks;

  // Convert to feet
  const dailySavingsFeet = dailySavingsPixels / PIXELS_PER_FOOT;

  // Calculate time savings
  const dailyTimeSavingsMinutes = dailySavingsFeet / WALKING_SPEED_FEET_PER_MINUTE;

  return {
    savingsPerPick: roundTripSavings,
    dailySavingsFeet: Math.round(dailySavingsFeet * 10) / 10,
    dailyTimeSavingsMinutes: Math.round(dailyTimeSavingsMinutes * 10) / 10,
  };
}

/**
 * Get item-level slotting recommendation with walk savings consideration
 */
export function getItemSlottingRecommendation(
  velocityTier: VelTier,
  percentile: number,
  distancePercentile: number,
  walkSavingsPerPick: number
): SlottingRec {
  // Hot items that are NOT already in prime spots should move closer
  // (only items in the closest 30% are considered "optimal")
  if (velocityTier === 'hot' && distancePercentile >= 30) {
    return 'move-closer';
  }

  // Hot items already in prime spots (closest 30%) are optimal
  if (velocityTier === 'hot') {
    return 'optimal';
  }

  // Cold items that are close to cart parking (in prime space) should move further
  if (velocityTier === 'cold' && distancePercentile <= 20) {
    return 'move-further';
  }

  // Cold items already far are optimal
  if (velocityTier === 'cold') {
    return 'optimal';
  }

  // Warm items with significant walk savings potential should move closer
  // (previously 'review' - now included in reslot opportunities)
  if (velocityTier === 'warm' && walkSavingsPerPick > 200) {
    return 'move-closer';
  }

  // Warm items with moderate walk savings could be reviewed
  if (velocityTier === 'warm' && walkSavingsPerPick > 100) {
    return 'review';
  }

  return 'optimal';
}

/**
 * Calculate priority score for reslotting recommendations
 * Higher score = higher priority for reslotting
 *
 * Uses totalPicks (not avgDailyPicks) so that within the same bay/distance,
 * items with more picks in the selected date range rank higher.
 */
export function calculatePriorityScore(
  totalPicks: number,
  walkSavingsPerPick: number,
  _velocityTier: VelTier // kept for potential future use
): number {
  // Simple formula: total picks × walk savings per pick
  // This ensures items in the same location rank by pick volume
  return Math.round(totalPicks * walkSavingsPerPick);
}

/**
 * Find the optimal (closest) available distance for an item
 * For now, uses the minimum distance across all elements as a proxy
 */
export function findOptimalDistance(
  allDistances: number[]
): number {
  if (allDistances.length === 0) return 0;

  // The optimal distance is the minimum distance found
  // In practice, this would consider available/empty slots
  return Math.min(...allDistances.filter(d => d > 0)) || 0;
}

/**
 * Analyze velocity for all items at the item level
 */
export function analyzeItemVelocity(
  aggregatedItemData: AggregatedItemPickData[],
  previousPeriodData?: AggregatedItemPickData[],
  cartParkingSpots?: Array<{ x: number; y: number }>
): ItemVelocityAnalysis[] {
  if (aggregatedItemData.length === 0) return [];

  // Sort by total picks descending
  const sorted = [...aggregatedItemData].sort((a, b) => Number(b.total_picks) - Number(a.total_picks));

  // Create a map of previous period data for trend calculation
  const previousMap = new Map<string, number>();
  if (previousPeriodData) {
    previousPeriodData.forEach(item => {
      previousMap.set(item.item_id, Number(item.total_picks));
    });
  }

  // Calculate distances for all items (as a fallback)
  const distances: number[] = sorted.map(item => {
    if (cartParkingSpots && cartParkingSpots.length > 0) {
      return findNearestCartParking(
        { x: Number(item.x_coordinate), y: Number(item.y_coordinate) },
        cartParkingSpots
      );
    }
    return 0;
  });

  // Find optimal distance (minimum non-zero distance)
  const optimalDistance = findOptimalDistance(distances);

  // Sort distances to calculate percentiles
  const sortedDistances = [...distances].sort((a, b) => a - b);

  return sorted.map((item, index) => {
    const totalPicks = Number(item.total_picks);
    const daysCount = Number(item.days_count);
    const percentile = ((sorted.length - index) / sorted.length) * 100;
    const velocityTier = getVelocityTier(percentile) as VelTier;
    const avgDailyPicks = daysCount > 0 ? totalPicks / daysCount : totalPicks;

    // Calculate distance and distance percentile
    // Use pre-calculated distance if available (from enrichItemDataWithDistance in page.tsx)
    const currentDistance = item.roundTripDistanceFeet !== undefined
      ? (item.roundTripDistanceFeet * 12) / 2 // Convert feet back to one-way pixels
      : distances[index];

    // Always use distances[index] for percentile lookup since sortedDistances is built from distances array
    const distanceForPercentile = distances[index];
    const distanceRank = sortedDistances.indexOf(distanceForPercentile);
    const distancePercentile = sortedDistances.length > 1
      ? ((distanceRank + 1) / sortedDistances.length) * 100
      : 50;

    // Calculate walk savings
    const walkSavings = calculateWalkSavings(currentDistance, optimalDistance, avgDailyPicks);

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;

    if (previousPeriodData && previousMap.has(item.item_id)) {
      const prevPicks = previousMap.get(item.item_id)!;
      if (prevPicks > 0) {
        trendPercent = ((totalPicks - prevPicks) / prevPicks) * 100;
        if (trendPercent > 5) trend = 'up';
        else if (trendPercent < -5) trend = 'down';
      } else if (totalPicks > 0) {
        trend = 'up';
        trendPercent = 100;
      }
    }

    // Get recommendation
    // DEBUG: Log for A1 items
    if (item.external_item_id === 'SKU-221' || item.external_item_id === 'SKU-224' || item.external_item_id === 'SKU-226') {
      console.log(`[DEBUG RECOMMENDATION] ${item.external_item_id}: velocityTier=${velocityTier}, distancePercentile=${distancePercentile.toFixed(1)}, walkSavingsPerPick=${walkSavings.savingsPerPick}`);
    }
    const recommendation = getItemSlottingRecommendation(
      velocityTier,
      percentile,
      distancePercentile,
      walkSavings.savingsPerPick
    );

    // Calculate priority score using totalPicks for the selected date range
    const priorityScore = calculatePriorityScore(
      totalPicks,
      walkSavings.savingsPerPick,
      velocityTier
    );

    return {
      itemId: item.item_id,
      externalItemId: item.external_item_id,
      itemDescription: item.item_description,
      locationId: item.location_id,
      externalLocationId: item.external_location_id,
      elementId: item.element_id,
      elementName: item.element_name,
      totalPicks,
      avgDailyPicks: Math.round(avgDailyPicks * 10) / 10,
      daysActive: daysCount,
      velocityTier,
      percentile: Math.round(percentile),
      currentDistance: Math.round(currentDistance),
      optimalDistance: Math.round(optimalDistance),
      walkSavingsPerPick: Math.round(walkSavings.savingsPerPick),
      dailyWalkSavingsFeet: walkSavings.dailySavingsFeet,
      dailyTimeSavingsMinutes: walkSavings.dailyTimeSavingsMinutes,
      recommendation,
      priorityScore,
      trend,
      trendPercent: Math.round(trendPercent),
    };
  });
}

/**
 * Get top item-level reslotting recommendations
 */
export function getItemReslottingRecommendations(
  itemAnalysis: ItemVelocityAnalysis[],
  limit: number = 5
): {
  moveCloser: ItemVelocityAnalysis[];
  moveFurther: ItemVelocityAnalysis[];
  summary: ReslottingSummary;
} {
  // Get items that need reslotting
  const moveCloserCandidates = itemAnalysis
    .filter(item => item.recommendation === 'move-closer')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const moveFurtherCandidates = itemAnalysis
    .filter(item => item.recommendation === 'move-further')
    .sort((a, b) => a.currentDistance - b.currentDistance); // Closest first

  // If no move-closer candidates, look for hot items that could benefit
  let moveCloser = moveCloserCandidates.slice(0, limit);
  if (moveCloser.length === 0) {
    moveCloser = itemAnalysis
      .filter(item => item.velocityTier === 'hot' && item.dailyWalkSavingsFeet > 0)
      .sort((a, b) => b.dailyWalkSavingsFeet - a.dailyWalkSavingsFeet)
      .slice(0, limit);
  }

  // If no move-further candidates, look for cold items in prime spots
  let moveFurther = moveFurtherCandidates.slice(0, limit);
  if (moveFurther.length === 0) {
    moveFurther = itemAnalysis
      .filter(item => item.velocityTier === 'cold' && item.currentDistance < item.optimalDistance * 2)
      .sort((a, b) => a.totalPicks - b.totalPicks)
      .slice(0, limit);
  }

  // Calculate summary
  const itemsNeedingReslot = itemAnalysis.filter(
    item => item.recommendation === 'move-closer' || item.recommendation === 'move-further'
  ).length;

  const potentialDailyWalkSavingsFeet = itemAnalysis
    .filter(item => item.recommendation === 'move-closer')
    .reduce((sum, item) => sum + item.dailyWalkSavingsFeet, 0);

  const potentialDailyTimeSavingsMinutes = potentialDailyWalkSavingsFeet / WALKING_SPEED_FEET_PER_MINUTE;

  return {
    moveCloser,
    moveFurther,
    summary: {
      totalItemsAnalyzed: itemAnalysis.length,
      itemsNeedingReslot,
      potentialDailyWalkSavingsFeet: Math.round(potentialDailyWalkSavingsFeet),
      potentialDailyTimeSavingsMinutes: Math.round(potentialDailyTimeSavingsMinutes * 10) / 10,
    },
  };
}

// =============================================================================
// CAPACITY-AWARE RESLOTTING HELPERS
// =============================================================================

/**
 * Calculate element capacity information based on item counts and threshold.
 *
 * Formula: estimatedCapacity = itemCount / (1 - threshold)
 * Example: 10 items + 15% threshold -> 10 / 0.85 = ~12 total -> ~2 empty
 *
 * @param itemData - Aggregated item pick data
 * @param capacityThreshold - Percentage of slots assumed empty (0-1, e.g., 0.15 for 15%)
 */
export function calculateElementCapacity(
  itemData: AggregatedItemPickData[],
  capacityThreshold: number = 0.15
): Map<string, ElementCapacityInfo> {
  const capacityMap = new Map<string, ElementCapacityInfo>();

  // Group items by element
  const itemsByElement = new Map<string, AggregatedItemPickData[]>();
  itemData.forEach(item => {
    const existing = itemsByElement.get(item.element_id) || [];
    existing.push(item);
    itemsByElement.set(item.element_id, existing);
  });

  // Calculate capacity for each element
  itemsByElement.forEach((items, elementId) => {
    const itemCount = items.length;
    const elementName = items[0]?.element_name || elementId;

    // Avoid division by zero; clamp threshold between 0.01 and 0.99
    const clampedThreshold = Math.max(0.01, Math.min(0.99, capacityThreshold));

    // estimatedCapacity = itemCount / (1 - threshold)
    const estimatedCapacity = Math.round(itemCount / (1 - clampedThreshold));
    const estimatedEmpty = Math.max(0, estimatedCapacity - itemCount);
    const occupancyRate = estimatedCapacity > 0 ? itemCount / estimatedCapacity : 1;

    capacityMap.set(elementId, {
      elementId,
      elementName,
      itemCount,
      estimatedCapacity,
      estimatedEmpty,
      occupancyRate,
    });
  });

  return capacityMap;
}

/**
 * Find cold items in an element that could be swapped with a hot item.
 * Returns the best swap candidate (coldest item with lowest picks).
 *
 * With global search enabled, looks for cold items in ANY same-type element
 * that is closer to parking (occupying prime real estate).
 */
export function findSwapCandidate(
  targetElementId: string,
  itemAnalysis: ItemVelocityAnalysis[],
  excludeItemIds: Set<string> = new Set(),
  globalSearchContext?: {
    allElements: Array<{ id: string; element_type: ElementType; distance: number }>;
    targetElementType: ElementType;
    hotItemCurrentDistance: number;
  }
): SwapSuggestion | undefined {
  // Tier 1: Find cold items in the target element
  const coldItems = itemAnalysis
    .filter(item =>
      item.elementId === targetElementId &&
      item.velocityTier === 'cold' &&
      !excludeItemIds.has(item.itemId)
    )
    .sort((a, b) => a.totalPicks - b.totalPicks); // Lowest picks first

  if (coldItems.length > 0) {
    const candidate = coldItems[0];
    return {
      coldItem: {
        itemId: candidate.itemId,
        externalItemId: candidate.externalItemId,
        itemDescription: candidate.itemDescription,
        velocityTier: candidate.velocityTier,
        totalPicks: candidate.totalPicks,
        avgDailyPicks: candidate.avgDailyPicks,
      },
      reason: `Cold item (${candidate.avgDailyPicks.toFixed(1)} picks/day) can free prime space`,
    };
  }

  // Tier 2: Try warm items as fallback (bottom 40% of warm) in target element
  const warmItems = itemAnalysis
    .filter(item =>
      item.elementId === targetElementId &&
      item.velocityTier === 'warm' &&
      item.percentile < 40 &&
      !excludeItemIds.has(item.itemId)
    )
    .sort((a, b) => a.totalPicks - b.totalPicks);

  if (warmItems.length > 0) {
    const candidate = warmItems[0];
    return {
      coldItem: {
        itemId: candidate.itemId,
        externalItemId: candidate.externalItemId,
        itemDescription: candidate.itemDescription,
        velocityTier: candidate.velocityTier,
        totalPicks: candidate.totalPicks,
        avgDailyPicks: candidate.avgDailyPicks,
      },
      reason: `Low-velocity warm item (${candidate.avgDailyPicks.toFixed(1)} picks/day) can relocate`,
    };
  }

  // Tier 3: Global search - find cold items in prime locations (same type, closer to parking)
  if (globalSearchContext) {
    const { allElements, targetElementType, hotItemCurrentDistance } = globalSearchContext;

    // DEBUG: Log global search context
    console.log('[SWAP DEBUG] Global search for target:', targetElementId, {
      targetType: targetElementType,
      hotItemDistance: hotItemCurrentDistance,
      totalColdItems: itemAnalysis.filter(i => i.velocityTier === 'cold').length,
      sameTypeElements: allElements.filter(e => e.element_type === targetElementType).length,
    });

    // Find cold items in same-type elements that are CLOSER to parking than the hot item's current location
    // These are cold items occupying prime real estate that should be moved
    const coldItemsInPrimeSpots = itemAnalysis
      .filter(item => {
        if (excludeItemIds.has(item.itemId)) return false;
        if (item.velocityTier !== 'cold') return false;

        const itemElement = allElements.find(e => e.id === item.elementId);
        if (!itemElement) return false;

        // Must be same element type
        if (itemElement.element_type !== targetElementType) return false;

        // Must be in a prime spot (closer to parking than the hot item)
        return itemElement.distance < hotItemCurrentDistance;
      })
      .sort((a, b) => {
        // Sort by: lowest picks first (coldest), then by distance (closest to parking = most wasted)
        const aElement = allElements.find(e => e.id === a.elementId);
        const bElement = allElements.find(e => e.id === b.elementId);
        const aDistance = aElement?.distance || Infinity;
        const bDistance = bElement?.distance || Infinity;

        // Primary: lowest picks (coldest)
        if (a.totalPicks !== b.totalPicks) return a.totalPicks - b.totalPicks;
        // Secondary: closest to parking (worst offender)
        return aDistance - bDistance;
      });

    console.log('[SWAP DEBUG] Cold items in prime spots found:', coldItemsInPrimeSpots.length);

    if (coldItemsInPrimeSpots.length > 0) {
      const candidate = coldItemsInPrimeSpots[0];
      const candidateElement = allElements.find(e => e.id === candidate.elementId);
      const distanceFt = candidateElement ? Math.round(candidateElement.distance / 12) : 0;

      return {
        coldItem: {
          itemId: candidate.itemId,
          externalItemId: candidate.externalItemId,
          itemDescription: candidate.itemDescription,
          velocityTier: candidate.velocityTier,
          totalPicks: candidate.totalPicks,
          avgDailyPicks: candidate.avgDailyPicks,
        },
        reason: `Cold item in prime spot (${distanceFt} ft from parking, ${candidate.avgDailyPicks.toFixed(1)} picks/day) should relocate`,
      };
    }
  }

  return undefined;
}

/**
 * Find reslotting opportunities for items based on walk burden reduction.
 * Returns target elements that could reduce walk burden if items were moved there.
 * Now with capacity awareness, swap suggestions, and pagination support.
 *
 * @param itemAnalysis - Item velocity analysis results from analyzeItemVelocity()
 * @param elements - All warehouse elements with their types and positions
 * @param cartParkingSpots - Cart parking locations for distance calculations
 * @param sameElementTypeOnly - If true, only suggest moves to same element type
 * @param itemData - Optional: raw item data for capacity calculation
 * @param capacityThreshold - Assumed % of empty slots (0-1, default 0.15)
 * @param paginationOptions - Optional pagination settings (limit, offset)
 */
export function findItemReslottingOpportunities(
  itemAnalysis: ItemVelocityAnalysis[],
  elements: Array<{ id: string; label: string; x: number; y: number; element_type: ElementType }>,
  cartParkingSpots: Array<{ x: number; y: number }>,
  sameElementTypeOnly: boolean = true,
  itemData?: AggregatedItemPickData[],
  capacityThreshold: number = 0.15,
  paginationOptions?: {
    limit?: number;
    offset?: number;
  }
): PaginatedOpportunitiesResult {
  const { limit = 10, offset = 0 } = paginationOptions || {};
  if (!itemAnalysis.length || !elements.length || !cartParkingSpots.length) {
    return { opportunities: [], hasMore: false, totalAvailable: 0, totalSavingsFeet: 0 };
  }

  // Calculate element capacities if item data is provided
  const capacityMap = itemData
    ? calculateElementCapacity(itemData, capacityThreshold)
    : new Map<string, ElementCapacityInfo>();

  // Track remaining slots per element (decremented as we assign items)
  const remainingSlots = new Map<string, number>();
  capacityMap.forEach((info, elementId) => {
    remainingSlots.set(elementId, info.estimatedEmpty);
  });

  // Track which items have been suggested for swaps (to avoid double-booking)
  const usedSwapItems = new Set<string>();

  // Create element distance map from nearest parking (Manhattan distance)
  const elementDistances = new Map<string, number>();
  const elementMap = new Map<string, typeof elements[0]>();

  elements.forEach(el => {
    elementMap.set(el.id, el);
    // Calculate Manhattan distance to nearest cart parking using CENTERS
    const dist = findNearestCartParking(
      { x: el.x, y: el.y, width: (el as any).width || 48, height: (el as any).height || 48 }, // Fallback to 4x4ft if missing
      cartParkingSpots
    );
    elementDistances.set(el.id, dist);
  });

  // Get sorted elements by distance (closest first)
  const sortedElements = [...elements].sort((a, b) =>
    (elementDistances.get(a.id) || 0) - (elementDistances.get(b.id) || 0)
  );

  // Sort items by priority (highest savings potential first - hot items far from parking)
  const sortedItems = itemAnalysis
    .filter(item => item.recommendation === 'move-closer')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // DEBUG: Log filtering stats
  console.log('[RESLOT DEBUG] Total items in analysis:', itemAnalysis.length);
  console.log('[RESLOT DEBUG] Items with move-closer recommendation:', sortedItems.length);

  // DEBUG: Find and log specific items (SKU-221, SKU-224, SKU-226) to see why they have different recommendations
  const debugItems = itemAnalysis.filter(i =>
    i.externalItemId === 'SKU-221' || i.externalItemId === 'SKU-224' || i.externalItemId === 'SKU-226'
  );
  console.log('[RESLOT DEBUG] A1 ITEMS COMPARISON:');
  debugItems.forEach(item => {
    console.log(`  ${item.externalItemId}: picks=${item.totalPicks} | tier=${item.velocityTier} | percentile=${item.percentile} | distancePercentile=${Math.round((item.currentDistance / Math.max(...itemAnalysis.map(i => i.currentDistance))) * 100)} | recommendation=${item.recommendation} | element=${item.elementName} | distance=${item.currentDistance}`);
  });

  console.log('[RESLOT DEBUG] Velocity tier breakdown:', {
    hot: itemAnalysis.filter(i => i.velocityTier === 'hot').length,
    warm: itemAnalysis.filter(i => i.velocityTier === 'warm').length,
    cold: itemAnalysis.filter(i => i.velocityTier === 'cold').length,
  });
  console.log('[RESLOT DEBUG] Recommendation breakdown:', {
    moveCloser: itemAnalysis.filter(i => i.recommendation === 'move-closer').length,
    optimal: itemAnalysis.filter(i => i.recommendation === 'optimal').length,
    moveFurther: itemAnalysis.filter(i => i.recommendation === 'move-further').length,
    review: itemAnalysis.filter(i => i.recommendation === 'review').length,
  });

  const opportunities: CapacityAwareReslottingOpportunity[] = [];

  // For each item with move-closer recommendation, find target elements
  sortedItems.forEach(item => {
    const currentElement = elementMap.get(item.elementId);
    if (!currentElement) return;

    const currentDistance = elementDistances.get(item.elementId) || item.currentDistance;

    // Find potential target elements with capacity awareness
    const targetElements: CapacityAwareTargetElement[] = sortedElements
      .filter(el => {
        // Skip current element
        if (el.id === item.elementId) return false;

        // Filter by element type if required
        if (sameElementTypeOnly && el.element_type !== currentElement.element_type) {
          return false;
        }

        // Only pickable element types (exclude text, line, arrow)
        if (['text', 'line', 'arrow'].includes(el.element_type)) {
          return false;
        }

        // Only suggest elements that are closer
        const targetDist = elementDistances.get(el.id) || 0;
        return targetDist < currentDistance;
      })
      .map(el => {
        const targetDist = elementDistances.get(el.id) || 0;
        const walkSavingsPerPickPixels = (currentDistance - targetDist) * 2; // Round trip
        // Use totalPicks so items in the same bay rank by pick volume for selected date range
        const walkSavingsFeet = Math.round((walkSavingsPerPickPixels * item.totalPicks) / 12); // Convert to feet

        // Check REMAINING capacity for this element (not original capacity)
        const remaining = remainingSlots.get(el.id) ?? 0;
        const hasEmptySlot = itemData ? remaining > 0 : true; // Assume available if no data

        // Find swap candidate if no empty slots
        let swapSuggestion: SwapSuggestion | undefined;
        if (!hasEmptySlot && itemData) {
          // Build global search context for finding cold items in prime locations
          const allElementsWithDistance = elements.map(e => ({
            id: e.id,
            element_type: e.element_type,
            distance: elementDistances.get(e.id) || 0
          }));

          swapSuggestion = findSwapCandidate(
            el.id,
            itemAnalysis,
            usedSwapItems,
            {
              allElements: allElementsWithDistance,
              targetElementType: currentElement.element_type,
              hotItemCurrentDistance: currentDistance
            }
          );
        }

        return {
          id: el.id,
          name: el.label,
          type: el.element_type,
          distance: targetDist,
          walkSavings: walkSavingsFeet,
          hasEmptySlot,
          estimatedEmpty: remaining,
          swapSuggestion,
        };
      })
      // Sort: empty slots first, then by distance (closest first for same availability)
      .sort((a, b) => {
        if (a.hasEmptySlot && !b.hasEmptySlot) return -1;
        if (!a.hasEmptySlot && b.hasEmptySlot) return 1;
        // Both have or don't have slots - prefer closer elements
        return a.distance - b.distance;
      })
      .slice(0, 3); // Top 3 suggestions

    if (targetElements.length > 0) {
      // Determine move type based on primary target
      const primaryTarget = targetElements[0];
      const moveType = primaryTarget.hasEmptySlot
        ? 'empty-slot'
        : primaryTarget.swapSuggestion
          ? 'swap'
          : 'unknown';

      // Reserve the slot: decrement remaining slots for the primary target
      if (primaryTarget.hasEmptySlot) {
        const currentRemaining = remainingSlots.get(primaryTarget.id) ?? 0;
        remainingSlots.set(primaryTarget.id, Math.max(0, currentRemaining - 1));
      } else if (primaryTarget.swapSuggestion) {
        // Mark the swap item as used
        usedSwapItems.add(primaryTarget.swapSuggestion.coldItem.itemId);
      }

      opportunities.push({
        item,
        currentElement: {
          id: currentElement.id,
          name: currentElement.label,
          type: currentElement.element_type,
          distance: currentDistance,
        },
        targetElements,
        totalDailyWalkSavings: targetElements[0].walkSavings,
        recommendation: 'move-closer',
        moveType,
      });
    }
  });

  // Sort by potential savings (highest first)
  const sortedOpportunities = opportunities.sort((a, b) => b.totalDailyWalkSavings - a.totalDailyWalkSavings);

  // DEBUG: Log top 10 sorted opportunities with their key values
  console.log('[RESLOT DEBUG] TOP 10 OPPORTUNITIES AFTER SORT:');
  sortedOpportunities.slice(0, 10).forEach((opp, idx) => {
    console.log(`  #${idx + 1}: ${opp.item.externalItemId} | picks=${opp.item.totalPicks} | walkSavings=${opp.totalDailyWalkSavings} | priorityScore=${opp.item.priorityScore} | element=${opp.currentElement.name} | distance=${opp.currentElement.distance}`);
  });

  // DEBUG: Log final results
  console.log('[RESLOT DEBUG] Total opportunities created:', opportunities.length);
  console.log('[RESLOT DEBUG] Move type breakdown:', {
    emptySlot: opportunities.filter(o => o.moveType === 'empty-slot').length,
    swap: opportunities.filter(o => o.moveType === 'swap').length,
    unknown: opportunities.filter(o => o.moveType === 'unknown').length,
  });

  // DEBUG: Check why items didn't get opportunities
  const itemsWithOpportunities = new Set(opportunities.map(o => o.item.itemId));
  const itemsWithoutOpportunities = sortedItems.filter(i => !itemsWithOpportunities.has(i.itemId));
  console.log('[RESLOT DEBUG] Items that got opportunities:', itemsWithOpportunities.size);
  console.log('[RESLOT DEBUG] Items WITHOUT opportunities (no closer target found):', itemsWithoutOpportunities.length);
  if (itemsWithoutOpportunities.length > 0) {
    console.log('[RESLOT DEBUG] Sample items without targets:', itemsWithoutOpportunities.slice(0, 3).map(i => ({
      id: i.externalItemId,
      elementId: i.elementId,
      distance: i.currentDistance,
      velocityTier: i.velocityTier,
    })));
  }

  // Calculate total savings from ALL opportunities before pagination
  const totalSavingsFeet = sortedOpportunities.reduce(
    (sum, opp) => sum + opp.totalDailyWalkSavings,
    0
  );

  // Apply pagination
  const totalAvailable = sortedOpportunities.length;
  const paginatedOpportunities = sortedOpportunities.slice(offset, offset + limit);
  const hasMore = offset + limit < totalAvailable;

  console.log('[RESLOT DEBUG] Pagination:', { offset, limit, totalAvailable, hasMore, returned: paginatedOpportunities.length, totalSavingsFeet });

  return {
    opportunities: paginatedOpportunities,
    hasMore,
    totalAvailable,
    totalSavingsFeet,
  };
}

