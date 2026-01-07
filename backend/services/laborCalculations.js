/**
 * Labor Management System - Calculation Service
 * Core formulas for efficiency, staffing, and ROI calculations
 */

// Default labor standards (used when no custom standards configured)
const DEFAULT_STANDARDS = {
  // Legacy fields (kept for backward compatibility)
  pick_time_seconds: 15.0,      // Legacy: combined pick time
  pack_time_seconds: 30.0,      // Legacy: pack time
  putaway_time_seconds: 20.0,   // Legacy: putaway time

  // NEW: Granular picking time elements
  pick_item_seconds: 12.0,      // Time to reach, grab, retrieve item from slot
  tote_time_seconds: 8.0,       // Time to place item in cart/tote
  scan_time_seconds: 5.0,       // Time to scan barcode, confirm on RF device

  // Walk and allowances
  walk_speed_fpm: 264.0,        // 3 mph = 264 feet per minute
  fatigue_allowance_percent: 10.0,
  delay_allowance_percent: 5.0,

  // Cost and shift settings
  reslot_time_minutes: 12.0,
  hourly_labor_rate: 18.00,
  benefits_multiplier: 1.30,
  shift_hours: 8.0,
  target_efficiency_percent: 85.0,
};

/**
 * Get standards - returns null/undefined values as-is, only uses defaults if no standards exist
 * This ensures we never silently use fallback values
 */
function getStandardsWithDefaults(standards) {
  if (!standards) return { ...DEFAULT_STANDARDS };

  // Helper to parse value, preserving null/undefined distinction
  const parseValue = (value, defaultValue) => {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  return {
    // Legacy fields
    pick_time_seconds: parseValue(standards.pick_time_seconds, DEFAULT_STANDARDS.pick_time_seconds),
    pack_time_seconds: parseValue(standards.pack_time_seconds, DEFAULT_STANDARDS.pack_time_seconds),
    putaway_time_seconds: parseValue(standards.putaway_time_seconds, DEFAULT_STANDARDS.putaway_time_seconds),

    // NEW: Granular picking time elements
    pick_item_seconds: parseValue(standards.pick_item_seconds, DEFAULT_STANDARDS.pick_item_seconds),
    tote_time_seconds: parseValue(standards.tote_time_seconds, DEFAULT_STANDARDS.tote_time_seconds),
    scan_time_seconds: parseValue(standards.scan_time_seconds, DEFAULT_STANDARDS.scan_time_seconds),

    // Walk and allowances
    walk_speed_fpm: parseValue(standards.walk_speed_fpm, DEFAULT_STANDARDS.walk_speed_fpm),
    fatigue_allowance_percent: parseValue(standards.fatigue_allowance_percent, DEFAULT_STANDARDS.fatigue_allowance_percent),
    delay_allowance_percent: parseValue(standards.delay_allowance_percent, DEFAULT_STANDARDS.delay_allowance_percent),

    // Cost and shift settings
    reslot_time_minutes: parseValue(standards.reslot_time_minutes, DEFAULT_STANDARDS.reslot_time_minutes),
    hourly_labor_rate: parseValue(standards.hourly_labor_rate, DEFAULT_STANDARDS.hourly_labor_rate),
    benefits_multiplier: parseValue(standards.benefits_multiplier, DEFAULT_STANDARDS.benefits_multiplier),
    shift_hours: parseValue(standards.shift_hours, DEFAULT_STANDARDS.shift_hours),
    target_efficiency_percent: parseValue(standards.target_efficiency_percent, DEFAULT_STANDARDS.target_efficiency_percent),
  };
}

/**
 * Calculate total allowance multiplier from fatigue and delay percentages
 */
function calculateAllowanceMultiplier(standards) {
  const fatigueAllowance = standards.fatigue_allowance_percent / 100;
  const delayAllowance = standards.delay_allowance_percent / 100;
  return 1 + fatigueAllowance + delayAllowance;
}

/**
 * Calculate standard time per pick in seconds
 * Includes pick time, walk time, pack time, and put away time
 *
 * @param {number} avgWalkDistanceFeet - Average round-trip walk distance per pick
 * @param {object} standards - Labor standards configuration
 * @returns {number} Standard time in seconds
 */
function calculateStandardTimePerPick(avgWalkDistanceFeet, standards) {
  const s = getStandardsWithDefaults(standards);

  // Walk time in seconds = (distance in feet / speed in fpm) * 60
  const walkTimeSeconds = (avgWalkDistanceFeet / s.walk_speed_fpm) * 60;

  // Total base time per pick
  const baseTimeSeconds = s.pick_time_seconds + walkTimeSeconds + s.pack_time_seconds + s.putaway_time_seconds;

  // Apply allowances
  const allowanceMultiplier = calculateAllowanceMultiplier(s);

  return baseTimeSeconds * allowanceMultiplier;
}

/**
 * Calculate efficiency metrics from pick data
 *
 * @param {number} totalPicks - Total number of picks
 * @param {number} totalWalkDistanceFeet - Total walk distance in feet
 * @param {number|null} actualHours - Actual hours worked (if tracking actuals)
 * @param {object} standards - Labor standards configuration
 * @returns {object} Efficiency metrics
 */
function calculateEfficiencyMetrics(totalPicks, totalWalkDistanceFeet, actualHours, standards) {
  const s = getStandardsWithDefaults(standards);

  // Calculate average walk distance per pick
  const avgWalkDistancePerPick = totalPicks > 0 ? totalWalkDistanceFeet / totalPicks : 0;

  // Standard time per pick (in seconds)
  const standardTimePerPick = calculateStandardTimePerPick(avgWalkDistancePerPick, s);

  // Total standard time (in hours)
  const standardTimeSeconds = totalPicks * standardTimePerPick;
  const standardHours = standardTimeSeconds / 3600;

  // Breakdown by activity (before allowances)
  const pickTimeHours = (totalPicks * s.pick_time_seconds) / 3600;
  const walkTimeHours = (totalWalkDistanceFeet / s.walk_speed_fpm) / 60;
  const packTimeHours = (totalPicks * s.pack_time_seconds) / 3600;
  const allowanceMultiplier = calculateAllowanceMultiplier(s);
  const allowanceHours = (pickTimeHours + walkTimeHours + packTimeHours) * (allowanceMultiplier - 1);

  // Calculate efficiency if actual hours provided
  let efficiencyPercent = null;
  if (actualHours && actualHours > 0) {
    efficiencyPercent = (standardHours / actualHours) * 100;
  }

  // Calculate labor cost
  const fullyLoadedRate = s.hourly_labor_rate * s.benefits_multiplier;
  const estimatedLaborCost = standardHours * fullyLoadedRate;

  return {
    totalPicks,
    totalWalkDistanceFeet: Math.round(totalWalkDistanceFeet * 100) / 100,
    avgWalkDistancePerPick: Math.round(avgWalkDistancePerPick * 100) / 100,
    standardHours: Math.round(standardHours * 100) / 100,
    actualHours: actualHours ? Math.round(actualHours * 100) / 100 : null,
    efficiencyPercent: efficiencyPercent ? Math.round(efficiencyPercent * 10) / 10 : null,
    targetEfficiencyPercent: s.target_efficiency_percent,
    breakdown: {
      pickTimeHours: Math.round(pickTimeHours * 100) / 100,
      walkTimeHours: Math.round(walkTimeHours * 100) / 100,
      packTimeHours: Math.round(packTimeHours * 100) / 100,
      allowanceHours: Math.round(allowanceHours * 100) / 100,
    },
    estimatedLaborCost: Math.round(estimatedLaborCost * 100) / 100,
  };
}

/**
 * Calculate staffing requirements
 *
 * @param {number} forecastedPicks - Expected picks for the period
 * @param {number} periodDays - Number of days in forecast period
 * @param {number} avgWalkDistancePerPick - Average walk distance per pick
 * @param {object} standards - Labor standards configuration
 * @returns {object} Staffing calculation results
 */
function calculateStaffingRequirements(forecastedPicks, periodDays, avgWalkDistancePerPick, standards) {
  const s = getStandardsWithDefaults(standards);

  // Standard time per pick (in seconds)
  const standardTimePerPick = calculateStandardTimePerPick(avgWalkDistancePerPick, s);

  // Total standard time for all picks (in hours)
  const totalStandardSeconds = forecastedPicks * standardTimePerPick;
  const totalStandardHours = totalStandardSeconds / 3600;

  // Available productive hours per person per shift
  const targetEfficiency = s.target_efficiency_percent / 100;
  const availableHoursPerPerson = s.shift_hours * targetEfficiency;

  // Total available hours across all days
  const totalAvailableHoursPerPerson = availableHoursPerPerson * periodDays;

  // Required headcount (ceiling to ensure coverage)
  const requiredHeadcount = Math.ceil(totalStandardHours / totalAvailableHoursPerPerson);

  // Actual utilization with this headcount
  const actualCapacityHours = requiredHeadcount * totalAvailableHoursPerPerson;
  const utilizationPercent = (totalStandardHours / actualCapacityHours) * 100;

  // Picks per person
  const picksPerPerson = forecastedPicks / requiredHeadcount;

  // Labor cost
  const fullyLoadedRate = s.hourly_labor_rate * s.benefits_multiplier;
  const estimatedLaborCost = totalStandardHours * fullyLoadedRate;

  return {
    forecastedPicks,
    periodDays,
    requiredHeadcount,
    totalLaborHours: Math.round(totalStandardHours * 100) / 100,
    estimatedLaborCost: Math.round(estimatedLaborCost * 100) / 100,
    picksPerPerson: Math.round(picksPerPerson * 10) / 10,
    utilizationPercent: Math.round(utilizationPercent * 10) / 10,
  };
}

/**
 * Calculate ROI from reslotting opportunities
 *
 * @param {number} currentDailyWalkFeet - Current total daily walk distance
 * @param {number} dailySavingsFeet - Walk distance saved by reslotting
 * @param {number} itemsToReslot - Number of items to relocate
 * @param {object} standards - Labor standards configuration
 * @returns {object} ROI calculation results
 */
function calculateROI(currentDailyWalkFeet, dailySavingsFeet, itemsToReslot, standards) {
  const s = getStandardsWithDefaults(standards);

  // Projected daily walk after reslotting
  const projectedDailyWalkFeet = currentDailyWalkFeet - dailySavingsFeet;

  // Convert walk distance to time (minutes)
  const currentDailyWalkMinutes = currentDailyWalkFeet / s.walk_speed_fpm;
  const projectedDailyWalkMinutes = projectedDailyWalkFeet / s.walk_speed_fpm;
  const dailySavingsMinutes = dailySavingsFeet / s.walk_speed_fpm;

  // Convert to hours for cost calculation
  const dailySavingsHours = dailySavingsMinutes / 60;

  // Calculate labor cost
  const fullyLoadedRate = s.hourly_labor_rate * s.benefits_multiplier;

  // Current and projected daily labor cost (walk portion only)
  const currentDailyLaborCost = (currentDailyWalkMinutes / 60) * fullyLoadedRate;
  const projectedDailyLaborCost = (projectedDailyWalkMinutes / 60) * fullyLoadedRate;

  // Savings
  const dailySavingsDollars = dailySavingsHours * fullyLoadedRate;
  const weeklySavingsDollars = dailySavingsDollars * 5;  // 5 working days
  const monthlySavingsDollars = dailySavingsDollars * 21.67;  // Average working days
  const annualSavingsDollars = dailySavingsDollars * 250;  // 250 working days

  // Implementation cost
  const reslotTimeHours = (itemsToReslot * s.reslot_time_minutes) / 60;
  const implementationCost = reslotTimeHours * fullyLoadedRate;

  // Payback period (days)
  const paybackDays = dailySavingsDollars > 0
    ? Math.ceil(implementationCost / dailySavingsDollars)
    : 0;

  return {
    currentState: {
      dailyWalkFeet: Math.round(currentDailyWalkFeet * 100) / 100,
      dailyWalkMinutes: Math.round(currentDailyWalkMinutes * 100) / 100,
      dailyLaborCost: Math.round(currentDailyLaborCost * 100) / 100,
    },
    projectedState: {
      dailyWalkFeet: Math.round(projectedDailyWalkFeet * 100) / 100,
      dailyWalkMinutes: Math.round(projectedDailyWalkMinutes * 100) / 100,
      dailyLaborCost: Math.round(projectedDailyLaborCost * 100) / 100,
    },
    savings: {
      dailyFeet: Math.round(dailySavingsFeet * 100) / 100,
      dailyMinutes: Math.round(dailySavingsMinutes * 100) / 100,
      dailyDollars: Math.round(dailySavingsDollars * 100) / 100,
      weeklyDollars: Math.round(weeklySavingsDollars * 100) / 100,
      monthlyDollars: Math.round(monthlySavingsDollars * 100) / 100,
      annualDollars: Math.round(annualSavingsDollars * 100) / 100,
    },
    implementation: {
      itemsToReslot,
      estimatedHours: Math.round(reslotTimeHours * 100) / 100,
      estimatedCost: Math.round(implementationCost * 100) / 100,
      paybackDays,
    },
  };
}

/**
 * Calculate performance metrics for a single day
 * Called when user inputs actual hours
 *
 * @param {number} actualPicks - Actual picks completed
 * @param {number} actualHours - Actual hours worked
 * @param {number} walkDistanceFeet - Walk distance (calculated or estimated)
 * @param {object} standards - Labor standards configuration
 * @returns {object} Performance metrics
 */
function calculatePerformanceMetrics(actualPicks, actualHours, walkDistanceFeet, standards) {
  const s = getStandardsWithDefaults(standards);

  // Calculate average walk distance per pick
  const avgWalkDistancePerPick = actualPicks > 0 ? walkDistanceFeet / actualPicks : 0;

  // Standard time per pick
  const standardTimePerPick = calculateStandardTimePerPick(avgWalkDistancePerPick, s);

  // Standard hours
  const standardTimeSeconds = actualPicks * standardTimePerPick;
  const standardHours = standardTimeSeconds / 3600;

  // Efficiency
  const efficiencyPercent = actualHours > 0 ? (standardHours / actualHours) * 100 : 0;

  // Breakdown
  const pickTimeHours = (actualPicks * s.pick_time_seconds) / 3600;
  const walkTimeHours = (walkDistanceFeet / s.walk_speed_fpm) / 60;
  const packTimeHours = (actualPicks * s.pack_time_seconds) / 3600;

  return {
    standardHours: Math.round(standardHours * 100) / 100,
    efficiencyPercent: Math.round(efficiencyPercent * 10) / 10,
    pickTimeHours: Math.round(pickTimeHours * 100) / 100,
    walkTimeHours: Math.round(walkTimeHours * 100) / 100,
    packTimeHours: Math.round(packTimeHours * 100) / 100,
  };
}

/**
 * Calculate time element breakdown for picking operations
 * Breaks down total estimated time into walk, pick, tote, scan, and allowance components
 *
 * @param {number} totalPicks - Total number of picks
 * @param {number} totalWalkDistanceFeet - Total walk distance in feet (round-trip)
 * @param {object} standards - Labor standards configuration
 * @returns {object} Time breakdown by element
 */
function calculateTimeElementBreakdown(totalPicks, totalWalkDistanceFeet, standards) {
  const s = getStandardsWithDefaults(standards);

  // Calculate time for each element in hours
  const walkHours = (totalWalkDistanceFeet / s.walk_speed_fpm) / 60;
  const pickHours = (totalPicks * s.pick_item_seconds) / 3600;
  const toteHours = (totalPicks * s.tote_time_seconds) / 3600;
  const scanHours = (totalPicks * s.scan_time_seconds) / 3600;

  // Base time before allowances
  const baseHours = walkHours + pickHours + toteHours + scanHours;

  // PFD allowance
  const allowanceMultiplier = calculateAllowanceMultiplier(s);
  const allowanceHours = baseHours * (allowanceMultiplier - 1);

  // Total estimated hours
  const totalHours = baseHours + allowanceHours;

  // Calculate percentages
  const walkPercent = totalHours > 0 ? (walkHours / totalHours) * 100 : 0;
  const pickPercent = totalHours > 0 ? (pickHours / totalHours) * 100 : 0;
  const totePercent = totalHours > 0 ? (toteHours / totalHours) * 100 : 0;
  const scanPercent = totalHours > 0 ? (scanHours / totalHours) * 100 : 0;
  const allowancePercent = totalHours > 0 ? (allowanceHours / totalHours) * 100 : 0;

  // Calculate labor cost
  const fullyLoadedRate = s.hourly_labor_rate * s.benefits_multiplier;
  const estimatedLaborCost = totalHours * fullyLoadedRate;

  return {
    totalPicks,
    totalWalkDistanceFeet: Math.round(totalWalkDistanceFeet * 100) / 100,
    elements: {
      walk: {
        hours: Math.round(walkHours * 1000) / 1000,
        percent: Math.round(walkPercent * 10) / 10,
        label: 'Walk to Location',
      },
      pick: {
        hours: Math.round(pickHours * 1000) / 1000,
        percent: Math.round(pickPercent * 10) / 10,
        label: 'Pick Item',
      },
      tote: {
        hours: Math.round(toteHours * 1000) / 1000,
        percent: Math.round(totePercent * 10) / 10,
        label: 'Place in Tote',
      },
      scan: {
        hours: Math.round(scanHours * 1000) / 1000,
        percent: Math.round(scanPercent * 10) / 10,
        label: 'Scan/Confirm',
      },
      allowance: {
        hours: Math.round(allowanceHours * 1000) / 1000,
        percent: Math.round(allowancePercent * 10) / 10,
        label: 'PFD Allowance',
      },
    },
    totalEstimatedHours: Math.round(totalHours * 100) / 100,
    estimatedLaborCost: Math.round(estimatedLaborCost * 100) / 100,
    standards: {
      pickItemSeconds: s.pick_item_seconds,
      toteTimeSeconds: s.tote_time_seconds,
      scanTimeSeconds: s.scan_time_seconds,
      walkSpeedFpm: s.walk_speed_fpm,
      pfdAllowancePercent: (allowanceMultiplier - 1) * 100,
    },
  };
}

/**
 * Calculate walk burden metrics for detailed walk analysis
 *
 * @param {number} totalWalkDistanceFeet - Total walk distance in feet
 * @param {number} totalPicks - Total number of picks
 * @param {number} optimalDistanceFeet - Optimal walk distance if reslotted (optional)
 * @param {object} standards - Labor standards configuration
 * @returns {object} Walk burden metrics
 */
function calculateWalkBurdenMetrics(totalWalkDistanceFeet, totalPicks, optimalDistanceFeet, standards) {
  const s = getStandardsWithDefaults(standards);

  // Convert to miles
  const dailyMiles = totalWalkDistanceFeet / 5280;

  // Calculate walk time
  const walkMinutes = totalWalkDistanceFeet / s.walk_speed_fpm;
  const walkHours = walkMinutes / 60;

  // Shift duration for percentage calculation
  const shiftMinutes = s.shift_hours * 60;
  const walkTimePercent = (walkMinutes / shiftMinutes) * 100;

  // Average distance per pick (round trip)
  const avgDistPerPick = totalPicks > 0 ? totalWalkDistanceFeet / totalPicks : 0;

  // Optimal calculations (if provided)
  const optimalMiles = optimalDistanceFeet ? optimalDistanceFeet / 5280 : null;
  const optimalAvgDistPerPick = optimalDistanceFeet && totalPicks > 0
    ? optimalDistanceFeet / totalPicks
    : null;

  // Potential savings
  const savingsFeet = optimalDistanceFeet
    ? Math.max(0, totalWalkDistanceFeet - optimalDistanceFeet)
    : null;
  const savingsMiles = savingsFeet ? savingsFeet / 5280 : null;
  const savingsMinutes = savingsFeet ? savingsFeet / s.walk_speed_fpm : null;

  // Cost calculations
  const fullyLoadedRate = s.hourly_labor_rate * s.benefits_multiplier;
  const dailyWalkCost = walkHours * fullyLoadedRate;
  const savingsDollarsDaily = savingsMinutes ? (savingsMinutes / 60) * fullyLoadedRate : null;
  const savingsDollarsAnnual = savingsDollarsDaily ? savingsDollarsDaily * 250 : null;

  return {
    current: {
      distanceFeet: Math.round(totalWalkDistanceFeet * 100) / 100,
      distanceMiles: Math.round(dailyMiles * 100) / 100,
      timeMinutes: Math.round(walkMinutes * 10) / 10,
      timeHours: Math.round(walkHours * 100) / 100,
      percentOfShift: Math.round(walkTimePercent * 10) / 10,
      avgDistPerPick: Math.round(avgDistPerPick * 10) / 10,
      dailyCost: Math.round(dailyWalkCost * 100) / 100,
    },
    optimal: optimalDistanceFeet ? {
      distanceFeet: Math.round(optimalDistanceFeet * 100) / 100,
      distanceMiles: Math.round(optimalMiles * 100) / 100,
      avgDistPerPick: Math.round(optimalAvgDistPerPick * 10) / 10,
    } : null,
    potentialSavings: savingsFeet ? {
      distanceFeet: Math.round(savingsFeet * 100) / 100,
      distanceMiles: Math.round(savingsMiles * 100) / 100,
      timeMinutes: Math.round(savingsMinutes * 10) / 10,
      dailyDollars: Math.round(savingsDollarsDaily * 100) / 100,
      annualDollars: Math.round(savingsDollarsAnnual * 100) / 100,
    } : null,
    targetWalkPercent: 35.0,  // Industry target: walk should be <35% of shift
  };
}

/**
 * Calculate trend metrics from performance history
 *
 * @param {Array} performanceHistory - Array of { date, efficiency_percent, picks, hours }
 * @returns {object} Trend analysis metrics
 */
function calculateTrendMetrics(performanceHistory) {
  if (!performanceHistory || performanceHistory.length === 0) {
    return {
      hasData: false,
      rollingAvg7Day: null,
      weekOverWeekChange: null,
      bestDay: null,
      worstDay: null,
      trend: null,
    };
  }

  // Sort by date descending (most recent first)
  const sorted = [...performanceHistory].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  // Calculate 7-day rolling average (last 7 entries)
  const last7 = sorted.slice(0, 7);
  const avg7Day = last7.length > 0
    ? last7.reduce((sum, p) => sum + (p.efficiency_percent || 0), 0) / last7.length
    : null;

  // Calculate previous 7-day average for WoW comparison
  const prev7 = sorted.slice(7, 14);
  const prevAvg7Day = prev7.length > 0
    ? prev7.reduce((sum, p) => sum + (p.efficiency_percent || 0), 0) / prev7.length
    : null;

  // Week-over-week change
  const weekOverWeekChange = avg7Day && prevAvg7Day
    ? ((avg7Day - prevAvg7Day) / prevAvg7Day) * 100
    : null;

  // Find best and worst days (from last 30 entries)
  const last30 = sorted.slice(0, 30).filter(p => p.efficiency_percent != null);
  let bestDay = null;
  let worstDay = null;

  if (last30.length > 0) {
    bestDay = last30.reduce((best, p) =>
      (p.efficiency_percent || 0) > (best.efficiency_percent || 0) ? p : best
    , last30[0]);

    worstDay = last30.reduce((worst, p) =>
      (p.efficiency_percent || 0) < (worst.efficiency_percent || 0) ? p : worst
    , last30[0]);
  }

  // Determine trend direction
  let trend = 'stable';
  if (weekOverWeekChange !== null) {
    if (weekOverWeekChange > 5) trend = 'improving';
    else if (weekOverWeekChange < -5) trend = 'declining';
  }

  return {
    hasData: true,
    rollingAvg7Day: avg7Day ? Math.round(avg7Day * 10) / 10 : null,
    weekOverWeekChange: weekOverWeekChange ? Math.round(weekOverWeekChange * 10) / 10 : null,
    bestDay: bestDay ? {
      date: bestDay.date,
      efficiency: Math.round(bestDay.efficiency_percent * 10) / 10,
      picks: bestDay.picks,
    } : null,
    worstDay: worstDay ? {
      date: worstDay.date,
      efficiency: Math.round(worstDay.efficiency_percent * 10) / 10,
      picks: worstDay.picks,
    } : null,
    trend,
    dataPoints: sorted.length,
  };
}

module.exports = {
  DEFAULT_STANDARDS,
  getStandardsWithDefaults,
  calculateAllowanceMultiplier,
  calculateStandardTimePerPick,
  calculateEfficiencyMetrics,
  calculateStaffingRequirements,
  calculateROI,
  calculatePerformanceMetrics,
  // NEW exports
  calculateTimeElementBreakdown,
  calculateWalkBurdenMetrics,
  calculateTrendMetrics,
};
