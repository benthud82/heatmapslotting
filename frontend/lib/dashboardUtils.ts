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
 * Determine slotting recommendation based on velocity and current analysis
 */
export function getSlottingRecommendation(
  velocityTier: VelocityTier,
  percentile: number
): SlottingRecommendation {
  if (velocityTier === 'hot' && percentile >= 90) {
    return 'optimal'; // Already high velocity, likely well-slotted
  }
  if (velocityTier === 'hot') {
    return 'move-closer'; // High velocity, could benefit from closer slotting
  }
  if (velocityTier === 'cold' && percentile <= 10) {
    return 'move-further'; // Very low velocity, move to less accessible area
  }
  if (velocityTier === 'cold') {
    return 'review'; // Low velocity, needs analysis
  }
  return 'optimal'; // Warm tier is generally well-positioned
}

/**
 * Analyze velocity for all elements
 */
export function analyzeVelocity(
  aggregatedData: AggregatedPickData[],
  previousPeriodData?: AggregatedPickData[]
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

  return sorted.map((item, index) => {
    const percentile = ((sorted.length - index) / sorted.length) * 100;
    const velocityTier = getVelocityTier(percentile);
    const avgDailyPicks = item.days_count > 0 ? item.total_picks / item.days_count : item.total_picks;
    
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
      recommendation: getSlottingRecommendation(velocityTier, percentile),
      trend,
      trendPercent: Math.round(trendPercent),
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
// EFFICIENCY CALCULATIONS
// ============================================================================

/**
 * Calculate efficiency metrics
 */
export function calculateEfficiencyMetrics(
  velocityAnalysis: VelocityAnalysis[],
  totalElementCount: number
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

