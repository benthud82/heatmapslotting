// Dashboard Analytics Utility Functions
// Provides calculations for velocity tiers, zone classification, efficiency metrics, and trend analysis

import { AggregatedPickData, PickTransaction } from './types';

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
  distance: number; // Manhattan distance to nearest cart parking spot
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
  element: { x: number; y: number },
  cartParkingSpots: Array<{ x: number; y: number }>
): number {
  if (cartParkingSpots.length === 0) return Infinity;

  let minDistance = Infinity;
  for (const cart of cartParkingSpots) {
    const dist = calculateManhattanDistance(element, cart);
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
  aggregatedData: AggregatedPickData[],
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
    const pos = elementPositionMap.get(item.element_id);
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

    return {
      elementId: item.element_id,
      elementName: item.element_name,
      totalPicks: item.total_picks,
      avgDailyPicks: Math.round(avgDailyPicks * 10) / 10,
      daysActive: item.days_count,
      velocityTier,
      percentile: Math.round(percentile),
      recommendation: getSlottingRecommendation(velocityTier, percentile, distancePercentile),
      trend,
      trendPercent: Math.round(trendPercent),
      distance: Math.round(distance),
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
  elementName: string;      // Name for tooltip
  picks: number;            // Raw picks for this element
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

