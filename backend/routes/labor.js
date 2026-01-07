/**
 * Labor Management System Routes
 * Endpoints for labor standards, efficiency tracking, staffing, and ROI
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { auditLog } = require('../middleware/audit');
const {
  DEFAULT_STANDARDS,
  getStandardsWithDefaults,
  calculateEfficiencyMetrics,
  calculateStaffingRequirements,
  calculateROI,
  calculatePerformanceMetrics,
  // NEW: Time element breakdown functions
  calculateTimeElementBreakdown,
  calculateWalkBurdenMetrics,
  calculateTrendMetrics,
} = require('../services/laborCalculations');

// Helper: Verify layout ownership
async function verifyLayoutOwnership(layoutId, userId) {
  const result = await query(
    'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
    [layoutId, userId]
  );
  return result.rows.length > 0;
}

// Helper: Get or create labor standards for a layout
async function getOrCreateStandards(layoutId) {
  // Try to get existing standards
  const result = await query(
    'SELECT * FROM labor_standards WHERE layout_id = $1',
    [layoutId]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Return defaults (not persisted until user saves)
  return {
    layout_id: layoutId,
    ...DEFAULT_STANDARDS,
    id: null,
    created_at: null,
    updated_at: null,
  };
}

// Helper: Calculate total walk distance for a layout (from pick data)
async function calculateTotalWalkDistance(layoutId, startDate, endDate) {
  // Get route markers (cart parking spots)
  const markersResult = await query(
    `SELECT x_coordinate, y_coordinate
     FROM route_markers
     WHERE layout_id = $1 AND marker_type = 'cart_parking'
     ORDER BY sequence_order ASC`,
    [layoutId]
  );

  // If no parking spots, try start_point
  let parkingSpots = markersResult.rows;
  if (parkingSpots.length === 0) {
    const startResult = await query(
      `SELECT x_coordinate, y_coordinate
       FROM route_markers
       WHERE layout_id = $1 AND marker_type = 'start_point'`,
      [layoutId]
    );
    parkingSpots = startResult.rows;
  }

  if (parkingSpots.length === 0) {
    // No reference point - can't calculate walk distance
    return { totalWalkFeet: 0, totalPicks: 0 };
  }

  // Use first parking spot as reference
  const parkingX = parseFloat(parkingSpots[0].x_coordinate);
  const parkingY = parseFloat(parkingSpots[0].y_coordinate);

  // Build date filter
  let dateFilter = '';
  const queryParams = [layoutId];

  if (startDate) {
    queryParams.push(startDate);
    dateFilter += ` AND pick_date >= $${queryParams.length}`;
  }
  if (endDate) {
    queryParams.push(endDate);
    dateFilter += ` AND pick_date <= $${queryParams.length}`;
  }

  // Get aggregated picks with element positions
  const picksResult = await query(
    `WITH all_picks AS (
       SELECT element_id, SUM(pick_count) as total_picks
       FROM (
         SELECT element_id, pick_count FROM pick_transactions
         WHERE layout_id = $1 ${dateFilter}
         UNION ALL
         SELECT element_id, pick_count FROM item_pick_transactions
         WHERE layout_id = $1 ${dateFilter}
       ) combined
       GROUP BY element_id
     )
     SELECT
       ap.element_id,
       ap.total_picks,
       we.x_coordinate,
       we.y_coordinate,
       we.width,
       we.height
     FROM all_picks ap
     JOIN warehouse_elements we ON ap.element_id = we.id`,
    queryParams
  );

  // Calculate total walk distance (Manhattan distance, round-trip)
  let totalWalkFeet = 0;
  let totalPicks = 0;

  for (const row of picksResult.rows) {
    const picks = parseInt(row.total_picks);
    totalPicks += picks;

    // Element center
    const elemX = parseFloat(row.x_coordinate) + (parseFloat(row.width) / 2);
    const elemY = parseFloat(row.y_coordinate) + (parseFloat(row.height) / 2);

    // Manhattan distance (in pixels, 1 pixel = 1 inch)
    const distancePixels = Math.abs(elemX - parkingX) + Math.abs(elemY - parkingY);

    // Round trip, convert to feet (12 inches per foot)
    const roundTripFeet = (distancePixels * 2) / 12;

    // Total for this element
    totalWalkFeet += roundTripFeet * picks;
  }

  return { totalWalkFeet, totalPicks };
}

// =============================================================================
// LABOR STANDARDS ENDPOINTS
// =============================================================================

/**
 * GET /api/layouts/:layoutId/labor/standards
 * Get labor standards configuration for a layout
 */
router.get('/:layoutId/labor/standards', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const standards = await getOrCreateStandards(layoutId);
    res.json(standards);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/layouts/:layoutId/labor/standards
 * Create or update labor standards configuration
 */
router.put('/:layoutId/labor/standards', auditLog('UPDATE', 'labor_standards'), async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const {
      // Legacy fields
      pick_time_seconds,
      pack_time_seconds,
      putaway_time_seconds,
      // NEW: Granular picking time elements
      pick_item_seconds,
      tote_time_seconds,
      scan_time_seconds,
      // Walk and allowances
      walk_speed_fpm,
      fatigue_allowance_percent,
      delay_allowance_percent,
      // Cost and shift settings
      reslot_time_minutes,
      hourly_labor_rate,
      benefits_multiplier,
      shift_hours,
      target_efficiency_percent,
    } = req.body;

    // Upsert standards (includes both legacy and new fields)
    const result = await query(
      `INSERT INTO labor_standards (
         layout_id, pick_time_seconds, walk_speed_fpm, pack_time_seconds, putaway_time_seconds,
         fatigue_allowance_percent, delay_allowance_percent, reslot_time_minutes,
         hourly_labor_rate, benefits_multiplier, shift_hours, target_efficiency_percent,
         pick_item_seconds, tote_time_seconds, scan_time_seconds
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (layout_id) DO UPDATE SET
         pick_time_seconds = COALESCE($2, labor_standards.pick_time_seconds),
         walk_speed_fpm = COALESCE($3, labor_standards.walk_speed_fpm),
         pack_time_seconds = COALESCE($4, labor_standards.pack_time_seconds),
         putaway_time_seconds = COALESCE($5, labor_standards.putaway_time_seconds),
         fatigue_allowance_percent = COALESCE($6, labor_standards.fatigue_allowance_percent),
         delay_allowance_percent = COALESCE($7, labor_standards.delay_allowance_percent),
         reslot_time_minutes = COALESCE($8, labor_standards.reslot_time_minutes),
         hourly_labor_rate = COALESCE($9, labor_standards.hourly_labor_rate),
         benefits_multiplier = COALESCE($10, labor_standards.benefits_multiplier),
         shift_hours = COALESCE($11, labor_standards.shift_hours),
         target_efficiency_percent = COALESCE($12, labor_standards.target_efficiency_percent),
         pick_item_seconds = COALESCE($13, labor_standards.pick_item_seconds),
         tote_time_seconds = COALESCE($14, labor_standards.tote_time_seconds),
         scan_time_seconds = COALESCE($15, labor_standards.scan_time_seconds),
         updated_at = NOW()
       RETURNING *`,
      [
        layoutId,
        pick_time_seconds,
        walk_speed_fpm,
        pack_time_seconds,
        putaway_time_seconds,
        fatigue_allowance_percent,
        delay_allowance_percent,
        reslot_time_minutes,
        hourly_labor_rate,
        benefits_multiplier,
        shift_hours,
        target_efficiency_percent,
        pick_item_seconds,
        tote_time_seconds,
        scan_time_seconds,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// EFFICIENCY CALCULATION ENDPOINTS
// =============================================================================

/**
 * GET /api/layouts/:layoutId/labor/efficiency
 * Calculate current efficiency metrics based on pick data and standards
 *
 * IMPORTANT: Efficiency is only calculated when performance records cover
 * all pick data dates. Otherwise, efficiency would be incorrectly inflated.
 */
router.get('/:layoutId/labor/efficiency', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get standards
    const standards = await getOrCreateStandards(layoutId);

    // Build date filter for queries
    let pickDateFilter = '';
    let perfDateFilter = '';
    const pickQueryParams = [layoutId];
    const perfQueryParams = [layoutId];

    if (start_date) {
      pickQueryParams.push(start_date);
      pickDateFilter += ` AND pick_date >= $${pickQueryParams.length}`;
      perfQueryParams.push(start_date);
      perfDateFilter += ` AND performance_date >= $${perfQueryParams.length}`;
    }
    if (end_date) {
      pickQueryParams.push(end_date);
      pickDateFilter += ` AND pick_date <= $${pickQueryParams.length}`;
      perfQueryParams.push(end_date);
      perfDateFilter += ` AND performance_date <= $${perfQueryParams.length}`;
    }

    // Calculate walk distance and total picks
    const { totalWalkFeet, totalPicks } = await calculateTotalWalkDistance(layoutId, start_date, end_date);

    // Count unique pick dates
    const pickDatesResult = await query(
      `SELECT COUNT(DISTINCT pick_date) as pick_days FROM (
         SELECT pick_date FROM pick_transactions WHERE layout_id = $1 ${pickDateFilter}
         UNION
         SELECT pick_date FROM item_pick_transactions WHERE layout_id = $1 ${pickDateFilter}
       ) combined`,
      pickQueryParams
    );
    const pickDays = parseInt(pickDatesResult.rows[0].pick_days) || 0;

    // Get performance records count and sum
    const perfResult = await query(
      `SELECT COUNT(*) as perf_days, SUM(actual_hours) as total_actual_hours
       FROM labor_performance
       WHERE layout_id = $1 ${perfDateFilter}`,
      perfQueryParams
    );

    const perfDays = parseInt(perfResult.rows[0].perf_days) || 0;
    let actualHours = null;

    // Only use actual hours if we have complete coverage
    // (performance records for all or most pick dates)
    if (perfDays > 0 && pickDays > 0) {
      const coveragePercent = (perfDays / pickDays) * 100;
      // Require at least 80% coverage to calculate efficiency
      if (coveragePercent >= 80) {
        actualHours = parseFloat(perfResult.rows[0].total_actual_hours);
      }
    }

    // Calculate efficiency metrics
    const metrics = calculateEfficiencyMetrics(totalPicks, totalWalkFeet, actualHours, standards);

    // Add date range and coverage info
    metrics.dateRange = {
      start: start_date || null,
      end: end_date || null,
    };
    metrics.coverage = {
      pickDays,
      perfDays,
      coveragePercent: pickDays > 0 ? Math.round((perfDays / pickDays) * 100) : 0,
    };

    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/layouts/:layoutId/labor/time-breakdown
 * Calculate time element breakdown for picking operations
 * Shows how total estimated time breaks down into walk, pick, tote, scan, and PFD allowance
 */
router.get('/:layoutId/labor/time-breakdown', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get standards
    const standards = await getOrCreateStandards(layoutId);

    // Calculate walk distance and total picks
    const { totalWalkFeet, totalPicks } = await calculateTotalWalkDistance(layoutId, start_date, end_date);

    if (totalPicks === 0) {
      return res.json({
        hasData: false,
        message: 'No pick data available. Upload pick data to see time element breakdown.',
        totalPicks: 0,
        totalEstimatedHours: 0,
        elements: null,
      });
    }

    // Calculate time element breakdown
    const breakdown = calculateTimeElementBreakdown(totalPicks, totalWalkFeet, standards);

    // Add date range info
    breakdown.hasData = true;
    breakdown.dateRange = {
      start: start_date || null,
      end: end_date || null,
    };

    res.json(breakdown);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/layouts/:layoutId/labor/walk-burden
 * Calculate detailed walk burden metrics
 */
router.get('/:layoutId/labor/walk-burden', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get standards
    const standards = await getOrCreateStandards(layoutId);

    // Calculate walk distance and total picks
    const { totalWalkFeet, totalPicks } = await calculateTotalWalkDistance(layoutId, start_date, end_date);

    if (totalPicks === 0) {
      return res.json({
        hasData: false,
        message: 'No pick data available.',
        current: null,
        optimal: null,
        potentialSavings: null,
      });
    }

    // Calculate optimal distance (minimum distance from pick data)
    // This is the best-case scenario if all picks came from closest locations
    const parkingResult = await query(
      `SELECT x_coordinate, y_coordinate
       FROM route_markers
       WHERE layout_id = $1 AND marker_type IN ('cart_parking', 'start_point')
       ORDER BY marker_type ASC, sequence_order ASC
       LIMIT 1`,
      [layoutId]
    );

    let optimalDistanceFeet = null;

    if (parkingResult.rows.length > 0) {
      const parkingX = parseFloat(parkingResult.rows[0].x_coordinate);
      const parkingY = parseFloat(parkingResult.rows[0].y_coordinate);

      // Find minimum distance among elements with picks
      let dateFilter = '';
      const queryParams = [layoutId];

      if (start_date) {
        queryParams.push(start_date);
        dateFilter += ` AND pick_date >= $${queryParams.length}`;
      }
      if (end_date) {
        queryParams.push(end_date);
        dateFilter += ` AND pick_date <= $${queryParams.length}`;
      }

      const elementsResult = await query(
        `SELECT DISTINCT we.x_coordinate, we.y_coordinate, we.width, we.height
         FROM warehouse_elements we
         WHERE we.id IN (
           SELECT DISTINCT element_id FROM pick_transactions
           WHERE layout_id = $1 ${dateFilter}
           UNION
           SELECT DISTINCT element_id FROM item_pick_transactions
           WHERE layout_id = $1 ${dateFilter}
         )`,
        queryParams
      );

      if (elementsResult.rows.length > 0) {
        let minDistance = Infinity;
        for (const row of elementsResult.rows) {
          const elemX = parseFloat(row.x_coordinate) + (parseFloat(row.width) / 2);
          const elemY = parseFloat(row.y_coordinate) + (parseFloat(row.height) / 2);
          const distance = Math.abs(elemX - parkingX) + Math.abs(elemY - parkingY);
          if (distance < minDistance) {
            minDistance = distance;
          }
        }

        // Optimal = if all picks came from closest location (round-trip, in feet)
        optimalDistanceFeet = (minDistance * 2 * totalPicks) / 12;
      }
    }

    // Calculate walk burden metrics
    const walkBurden = calculateWalkBurdenMetrics(totalWalkFeet, totalPicks, optimalDistanceFeet, standards);

    walkBurden.hasData = true;
    walkBurden.dateRange = {
      start: start_date || null,
      end: end_date || null,
    };
    walkBurden.totalPicks = totalPicks;

    res.json(walkBurden);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/layouts/:layoutId/labor/trends
 * Calculate efficiency trend metrics from performance history
 */
router.get('/:layoutId/labor/trends', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get performance history (last 60 days)
    const result = await query(
      `SELECT
         performance_date as date,
         efficiency_percent,
         actual_picks as picks,
         actual_hours as hours
       FROM labor_performance
       WHERE layout_id = $1
       ORDER BY performance_date DESC
       LIMIT 60`,
      [layoutId]
    );

    const performanceHistory = result.rows;

    // Calculate trend metrics
    const trends = calculateTrendMetrics(performanceHistory);

    // Add chart data (last 30 days for display)
    trends.chartData = performanceHistory.slice(0, 30).reverse().map(p => ({
      date: p.date,
      efficiency: p.efficiency_percent,
      picks: p.picks,
    }));

    res.json(trends);
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PERFORMANCE TRACKING ENDPOINTS
// =============================================================================

/**
 * POST /api/layouts/:layoutId/labor/performance
 * Record actual labor hours for a specific date
 */
router.post('/:layoutId/labor/performance', auditLog('CREATE', 'labor_performance'), async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const { performance_date, actual_picks, actual_hours } = req.body;

    if (!performance_date || !actual_picks || !actual_hours) {
      return res.status(400).json({ error: 'performance_date, actual_picks, and actual_hours are required' });
    }

    // Get standards
    const standards = await getOrCreateStandards(layoutId);

    // Calculate walk distance from pick data
    const { totalWalkFeet, totalPicks } = await calculateTotalWalkDistance(layoutId, null, null);

    if (totalPicks === 0) {
      return res.status(400).json({
        error: 'Cannot calculate performance: no pick data with element positions found. Ensure picks are associated with warehouse elements that have positions.'
      });
    }

    const avgWalkPerPick = totalWalkFeet / totalPicks;
    const estimatedWalkFeet = actual_picks * avgWalkPerPick;

    // Calculate performance metrics
    const metrics = calculatePerformanceMetrics(
      actual_picks,
      actual_hours,
      estimatedWalkFeet,
      standards
    );

    // Upsert performance record
    const result = await query(
      `INSERT INTO labor_performance (
         layout_id, performance_date, actual_picks, actual_hours,
         actual_walk_distance_feet, standard_hours, efficiency_percent,
         pick_time_hours, walk_time_hours, pack_time_hours
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (layout_id, performance_date) DO UPDATE SET
         actual_picks = $3,
         actual_hours = $4,
         actual_walk_distance_feet = $5,
         standard_hours = $6,
         efficiency_percent = $7,
         pick_time_hours = $8,
         walk_time_hours = $9,
         pack_time_hours = $10
       RETURNING *`,
      [
        layoutId,
        performance_date,
        actual_picks,
        actual_hours,
        estimatedWalkFeet,
        metrics.standardHours,
        metrics.efficiencyPercent,
        metrics.pickTimeHours,
        metrics.walkTimeHours,
        metrics.packTimeHours,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/layouts/:layoutId/labor/performance
 * Get historical performance records
 */
router.get('/:layoutId/labor/performance', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { start_date, end_date, page = 1, limit = 30 } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Build query
    let queryText = `
      SELECT * FROM labor_performance
      WHERE layout_id = $1
    `;
    const queryParams = [layoutId];

    if (start_date) {
      queryParams.push(start_date);
      queryText += ` AND performance_date >= $${queryParams.length}`;
    }
    if (end_date) {
      queryParams.push(end_date);
      queryText += ` AND performance_date <= $${queryParams.length}`;
    }

    // Count total
    const countResult = await query(
      queryText.replace('SELECT *', 'SELECT COUNT(*)'),
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` ORDER BY performance_date DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await query(queryText, queryParams);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/layouts/:layoutId/labor/performance/:date
 * Delete a performance record for a specific date
 */
router.delete('/:layoutId/labor/performance/:date', auditLog('DELETE', 'labor_performance'), async (req, res, next) => {
  try {
    const { layoutId, date } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const result = await query(
      'DELETE FROM labor_performance WHERE layout_id = $1 AND performance_date = $2 RETURNING id',
      [layoutId, date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Performance record not found' });
    }

    res.json({ message: 'Performance record deleted', id: result.rows[0].id });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// STAFFING CALCULATOR ENDPOINTS
// =============================================================================

/**
 * POST /api/layouts/:layoutId/labor/staffing/calculate
 * Calculate staffing requirements for a given forecast
 */
router.post('/:layoutId/labor/staffing/calculate', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const { forecastedPicks, periodDays = 1 } = req.body;

    if (!forecastedPicks || forecastedPicks <= 0) {
      return res.status(400).json({ error: 'forecastedPicks must be a positive number' });
    }

    // Get standards
    const standards = await getOrCreateStandards(layoutId);

    // Get average walk distance from historical data
    const { totalWalkFeet, totalPicks } = await calculateTotalWalkDistance(layoutId, null, null);

    if (totalPicks === 0) {
      return res.status(400).json({
        error: 'Cannot calculate staffing: no pick data with element positions found. Upload pick data and ensure warehouse elements have positions.'
      });
    }

    const avgWalkDistancePerPick = totalWalkFeet / totalPicks;

    // Calculate staffing
    const staffingResult = calculateStaffingRequirements(
      forecastedPicks,
      periodDays,
      avgWalkDistancePerPick,
      standards
    );

    // Include standards used
    staffingResult.standardsUsed = getStandardsWithDefaults(standards);

    res.json(staffingResult);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/layouts/:layoutId/labor/staffing/save
 * Save a staffing forecast for future reference
 */
router.post('/:layoutId/labor/staffing/save', auditLog('CREATE', 'staffing_forecasts'), async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const {
      forecast_date,
      forecasted_picks,
      period_days = 1,
      required_headcount,
      required_hours,
      estimated_labor_cost,
      picks_per_person,
      utilization_percent,
    } = req.body;

    if (!forecast_date || !forecasted_picks || !required_headcount) {
      return res.status(400).json({ error: 'forecast_date, forecasted_picks, and required_headcount are required' });
    }

    // Get current standards for snapshot
    const standards = await getOrCreateStandards(layoutId);
    const standardsSnapshot = getStandardsWithDefaults(standards);

    const result = await query(
      `INSERT INTO staffing_forecasts (
         layout_id, forecast_date, forecasted_picks, period_days,
         required_headcount, required_hours, estimated_labor_cost,
         picks_per_person, utilization_percent, standards_snapshot
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (layout_id, forecast_date) DO UPDATE SET
         forecasted_picks = $3,
         period_days = $4,
         required_headcount = $5,
         required_hours = $6,
         estimated_labor_cost = $7,
         picks_per_person = $8,
         utilization_percent = $9,
         standards_snapshot = $10
       RETURNING *`,
      [
        layoutId,
        forecast_date,
        forecasted_picks,
        period_days,
        required_headcount,
        required_hours,
        estimated_labor_cost,
        picks_per_person,
        utilization_percent,
        JSON.stringify(standardsSnapshot),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/layouts/:layoutId/labor/staffing/history
 * Get historical staffing forecasts
 */
router.get('/:layoutId/labor/staffing/history', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Count total
    const countResult = await query(
      'SELECT COUNT(*) FROM staffing_forecasts WHERE layout_id = $1',
      [layoutId]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(
      `SELECT * FROM staffing_forecasts
       WHERE layout_id = $1
       ORDER BY forecast_date DESC
       LIMIT $2 OFFSET $3`,
      [layoutId, parseInt(limit), offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// ROI SIMULATOR ENDPOINTS
// =============================================================================

/**
 * GET /api/layouts/:layoutId/labor/roi/calculate
 * Calculate ROI based on current reslotting opportunities
 */
router.get('/:layoutId/labor/roi/calculate', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get standards
    const standards = await getOrCreateStandards(layoutId);
    const s = getStandardsWithDefaults(standards);

    // Get current walk distance
    const { totalWalkFeet, totalPicks } = await calculateTotalWalkDistance(layoutId, start_date, end_date);

    // Calculate daily averages (assuming date range represents a period)
    // For now, assume the data represents one day's worth or we need to calculate days
    let dateFilter = '';
    const queryParams = [layoutId];

    if (start_date) {
      queryParams.push(start_date);
      dateFilter += ` AND pick_date >= $${queryParams.length}`;
    }
    if (end_date) {
      queryParams.push(end_date);
      dateFilter += ` AND pick_date <= $${queryParams.length}`;
    }

    // Count unique days
    const daysResult = await query(
      `SELECT COUNT(DISTINCT pick_date) as days FROM (
         SELECT pick_date FROM pick_transactions WHERE layout_id = $1 ${dateFilter}
         UNION
         SELECT pick_date FROM item_pick_transactions WHERE layout_id = $1 ${dateFilter}
       ) combined`,
      queryParams
    );
    const totalDays = parseInt(daysResult.rows[0].days) || 1;

    // Daily averages
    const dailyWalkFeet = totalWalkFeet / totalDays;
    const dailyPicks = totalPicks / totalDays;

    // Get reslotting opportunities (hot items that are far from parking)
    // This is a simplified version - in the frontend we have more sophisticated analysis
    const parkingResult = await query(
      `SELECT x_coordinate, y_coordinate
       FROM route_markers
       WHERE layout_id = $1 AND marker_type IN ('cart_parking', 'start_point')
       ORDER BY marker_type ASC, sequence_order ASC
       LIMIT 1`,
      [layoutId]
    );

    let recommendations = [];
    let totalSavingsFeet = 0;

    if (parkingResult.rows.length > 0) {
      const parkingX = parseFloat(parkingResult.rows[0].x_coordinate);
      const parkingY = parseFloat(parkingResult.rows[0].y_coordinate);

      // Get item-level data with positions
      const itemsResult = await query(
        `SELECT
           i.id as item_id,
           i.item_id as external_item_id,
           we.id as element_id,
           we.label as element_name,
           we.x_coordinate,
           we.y_coordinate,
           we.width,
           we.height,
           SUM(ipt.pick_count) as total_picks
         FROM item_pick_transactions ipt
         JOIN items i ON ipt.item_id = i.id
         JOIN warehouse_elements we ON ipt.element_id = we.id
         WHERE ipt.layout_id = $1 ${dateFilter}
         GROUP BY i.id, i.item_id, we.id, we.label, we.x_coordinate, we.y_coordinate, we.width, we.height
         ORDER BY total_picks DESC
         LIMIT 50`,
        queryParams
      );

      // Calculate percentiles and identify items to move
      const items = itemsResult.rows.map(row => {
        const elemX = parseFloat(row.x_coordinate) + (parseFloat(row.width) / 2);
        const elemY = parseFloat(row.y_coordinate) + (parseFloat(row.height) / 2);
        const distance = Math.abs(elemX - parkingX) + Math.abs(elemY - parkingY);
        return {
          ...row,
          distance,
          dailyPicks: parseFloat(row.total_picks) / totalDays,
        };
      });

      // Find hot items (top 20% by picks) that are far (top 50% by distance)
      const sortedByPicks = [...items].sort((a, b) => b.dailyPicks - a.dailyPicks);
      const hotThreshold = sortedByPicks[Math.floor(sortedByPicks.length * 0.2)]?.dailyPicks || 0;

      const sortedByDistance = [...items].sort((a, b) => b.distance - a.distance);
      const farThreshold = sortedByDistance[Math.floor(sortedByDistance.length * 0.5)]?.distance || 0;

      // Find minimum distance (optimal position)
      const minDistance = Math.min(...items.map(i => i.distance), farThreshold / 2);

      for (const item of items) {
        if (item.dailyPicks >= hotThreshold && item.distance >= farThreshold) {
          const savingsPerPickFeet = ((item.distance - minDistance) * 2) / 12; // Round-trip, convert to feet
          const dailySavingsFeet = savingsPerPickFeet * item.dailyPicks;
          const dailySavingsDollars = (dailySavingsFeet / s.walk_speed_fpm / 60) * s.hourly_labor_rate * s.benefits_multiplier;

          recommendations.push({
            itemId: item.item_id,
            externalItemId: item.external_item_id,
            currentElement: item.element_name,
            currentDistance: Math.round((item.distance * 2) / 12 * 100) / 100, // Round-trip feet
            recommendedDistance: Math.round((minDistance * 2) / 12 * 100) / 100,
            walkSavingsFeet: Math.round(dailySavingsFeet * 100) / 100,
            dailySavingsDollars: Math.round(dailySavingsDollars * 100) / 100,
            dailyPicks: Math.round(item.dailyPicks * 10) / 10,
            priority: Math.round(dailySavingsFeet * item.dailyPicks),
          });

          totalSavingsFeet += dailySavingsFeet;
        }
      }

      // Sort by priority
      recommendations.sort((a, b) => b.priority - a.priority);
    }

    // Calculate ROI
    const roiResult = calculateROI(dailyWalkFeet, totalSavingsFeet, recommendations.length, standards);

    // Add recommendations
    roiResult.recommendations = recommendations;

    res.json(roiResult);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/layouts/:layoutId/labor/roi/save
 * Save an ROI simulation snapshot
 */
router.post('/:layoutId/labor/roi/save', auditLog('CREATE', 'roi_simulations'), async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const {
      simulation_name,
      currentState,
      projectedState,
      savings,
      implementation,
      recommendations,
    } = req.body;

    // Get current standards for snapshot
    const standards = await getOrCreateStandards(layoutId);
    const standardsSnapshot = getStandardsWithDefaults(standards);

    const result = await query(
      `INSERT INTO roi_simulations (
         layout_id, simulation_name,
         current_daily_walk_feet, current_daily_walk_minutes, current_daily_labor_cost,
         projected_daily_walk_feet, projected_daily_walk_minutes, projected_daily_labor_cost,
         daily_savings_feet, daily_savings_minutes, daily_savings_dollars,
         weekly_savings_dollars, monthly_savings_dollars, annual_savings_dollars,
         items_to_reslot, estimated_reslot_hours, implementation_cost, payback_days,
         recommendations_snapshot, standards_snapshot
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        layoutId,
        simulation_name || `Simulation ${new Date().toISOString().split('T')[0]}`,
        currentState?.dailyWalkFeet,
        currentState?.dailyWalkMinutes,
        currentState?.dailyLaborCost,
        projectedState?.dailyWalkFeet,
        projectedState?.dailyWalkMinutes,
        projectedState?.dailyLaborCost,
        savings?.dailyFeet,
        savings?.dailyMinutes,
        savings?.dailyDollars,
        savings?.weeklyDollars,
        savings?.monthlyDollars,
        savings?.annualDollars,
        implementation?.itemsToReslot,
        implementation?.estimatedHours,
        implementation?.estimatedCost,
        implementation?.paybackDays,
        JSON.stringify(recommendations || []),
        JSON.stringify(standardsSnapshot),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/layouts/:layoutId/labor/roi/history
 * Get historical ROI simulations
 */
router.get('/:layoutId/labor/roi/history', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Count total
    const countResult = await query(
      'SELECT COUNT(*) FROM roi_simulations WHERE layout_id = $1',
      [layoutId]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(
      `SELECT * FROM roi_simulations
       WHERE layout_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [layoutId, parseInt(limit), offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/layouts/:layoutId/labor/roi/export
 * Export ROI report as CSV
 */
router.get('/:layoutId/labor/roi/export', async (req, res, next) => {
  try {
    const { layoutId } = req.params;
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    if (!await verifyLayoutOwnership(layoutId, userId)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get ROI data (reuse calculation endpoint logic)
    // For simplicity, we'll make an internal call to the calculate endpoint
    // In production, you'd refactor this into a shared service

    // Get standards
    const standards = await getOrCreateStandards(layoutId);
    const s = getStandardsWithDefaults(standards);

    // Get current walk distance
    const { totalWalkFeet, totalPicks } = await calculateTotalWalkDistance(layoutId, start_date, end_date);

    // Get layout name
    const layoutResult = await query(
      'SELECT name FROM layouts WHERE id = $1',
      [layoutId]
    );
    const layoutName = layoutResult.rows[0]?.name || 'Unknown';

    // Build CSV content
    let csv = 'ROI Analysis Report\n';
    csv += `Layout,${layoutName}\n`;
    csv += `Generated,${new Date().toISOString()}\n`;
    csv += `Date Range,${start_date || 'All'} to ${end_date || 'All'}\n`;
    csv += '\n';
    csv += 'SUMMARY\n';
    csv += `Total Picks,${totalPicks}\n`;
    csv += `Total Walk Distance (ft),${Math.round(totalWalkFeet)}\n`;
    csv += `Walk Speed (fpm),${s.walk_speed_fpm}\n`;
    csv += `Hourly Rate,$${s.hourly_labor_rate}\n`;
    csv += `Benefits Multiplier,${s.benefits_multiplier}x\n`;
    csv += '\n';
    csv += 'RECOMMENDATIONS\n';
    csv += 'Item ID,Current Element,Current Distance (ft),Walk Savings (ft/day),Daily Savings ($),Priority\n';

    // TODO: Add recommendations from ROI calculation
    // For now, just return the summary

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="roi-report-${layoutId.substring(0, 8)}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
