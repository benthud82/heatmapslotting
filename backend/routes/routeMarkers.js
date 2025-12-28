const express = require('express');
const router = express.Router();
const { query } = require('../db');
const WalkDistanceService = require('../services/walkDistance');

// GET /api/layouts/:layoutId/route-markers - Get all route markers for a layout
router.get('/layouts/:layoutId/route-markers', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const layoutId = req.params.layoutId;

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layoutId, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get all route markers for this layout
    const result = await query(
      `SELECT * FROM route_markers 
       WHERE layout_id = $1 
       ORDER BY marker_type, sequence_order ASC`,
      [layoutId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/layouts/:layoutId/route-markers - Create a route marker
router.post('/layouts/:layoutId/route-markers', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const layoutId = req.params.layoutId;
    const { marker_type, label, x_coordinate, y_coordinate, sequence_order } = req.body;

    // Validate marker type
    const validTypes = ['start_point', 'stop_point', 'cart_parking'];
    if (!validTypes.includes(marker_type)) {
      return res.status(400).json({
        error: 'Invalid marker_type. Must be: start_point, stop_point, or cart_parking'
      });
    }

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layoutId, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // For start_point and stop_point, ensure only one exists per layout
    if (marker_type === 'start_point' || marker_type === 'stop_point') {
      const existingResult = await query(
        'SELECT id FROM route_markers WHERE layout_id = $1 AND marker_type = $2',
        [layoutId, marker_type]
      );

      if (existingResult.rows.length > 0) {
        return res.status(400).json({
          error: `A ${marker_type.replace('_', ' ')} already exists for this layout. Delete it first or update it.`
        });
      }
    }

    // For cart_parking, auto-calculate sequence_order if not provided
    let finalSequenceOrder = sequence_order;
    if (marker_type === 'cart_parking' && (sequence_order === undefined || sequence_order === null)) {
      const maxOrderResult = await query(
        `SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order 
         FROM route_markers 
         WHERE layout_id = $1 AND marker_type = 'cart_parking'`,
        [layoutId]
      );
      finalSequenceOrder = maxOrderResult.rows[0].next_order;
    }

    // Create the marker
    const result = await query(
      `INSERT INTO route_markers (layout_id, user_id, marker_type, label, x_coordinate, y_coordinate, sequence_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [layoutId, userId, marker_type, label || `${marker_type.replace('_', ' ')}`, x_coordinate, y_coordinate, finalSequenceOrder || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/route-markers/:id - Update a route marker
router.put('/route-markers/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const markerId = req.params.id;
    const { label, x_coordinate, y_coordinate, sequence_order } = req.body;

    const result = await query(
      `UPDATE route_markers
       SET label = COALESCE($1, label),
           x_coordinate = COALESCE($2, x_coordinate),
           y_coordinate = COALESCE($3, y_coordinate),
           sequence_order = COALESCE($4, sequence_order),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [label, x_coordinate, y_coordinate, sequence_order, markerId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route marker not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/route-markers/:id - Delete a route marker
router.delete('/route-markers/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const markerId = req.params.id;

    const result = await query(
      'DELETE FROM route_markers WHERE id = $1 AND user_id = $2 RETURNING id, marker_type',
      [markerId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route marker not found' });
    }

    res.json({ message: 'Route marker deleted successfully', id: markerId });
  } catch (error) {
    next(error);
  }
});

// GET /api/layouts/:layoutId/walk-distance - Calculate walk distance for a date range
router.get('/layouts/:layoutId/walk-distance', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const layoutId = req.params.layoutId;
    const { start_date, end_date } = req.query;

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layoutId, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get route markers
    const markersResult = await query(
      `SELECT * FROM route_markers 
       WHERE layout_id = $1 
       ORDER BY marker_type, sequence_order ASC`,
      [layoutId]
    );

    const markers = markersResult.rows;
    const startPoint = markers.find(m => m.marker_type === 'start_point');
    const stopPoint = markers.find(m => m.marker_type === 'stop_point');
    const cartParking = markers
      .filter(m => m.marker_type === 'cart_parking')
      .sort((a, b) => a.sequence_order - b.sequence_order);

    // Check if we have the minimum required markers
    if (!startPoint || !stopPoint || cartParking.length === 0) {
      return res.json({
        totalDistance: 0,
        totalDistanceFeet: 0,
        totalPicks: 0,
        avgDistancePerPick: 0,
        message: 'Please add start point, stop point, and at least one cart parking spot to calculate walk distance.',
        missingMarkers: {
          startPoint: !startPoint,
          stopPoint: !stopPoint,
          cartParking: cartParking.length === 0
        }
      });
    }

    // Build date filter for picks query
    const queryParams = [layoutId];
    let pickDateFilter = '';

    if (start_date) {
      queryParams.push(start_date);
      pickDateFilter += ` AND pick_date >= $${queryParams.length}`;
    }
    if (end_date) {
      queryParams.push(end_date);
      pickDateFilter += ` AND pick_date <= $${queryParams.length}`;
    }

    // Get pick transactions with element positions (combining    // Get pick transactions with element positions (combining both legacy and item-level picks)
    const picksResult = await query(
      `WITH all_picks AS (
        SELECT element_id, pick_date, pick_count
        FROM pick_transactions
        WHERE layout_id = $1 ${pickDateFilter}
        UNION ALL
        SELECT element_id, pick_date, pick_count
        FROM item_pick_transactions
        WHERE layout_id = $1 ${pickDateFilter}
       )
       SELECT 
        ap.element_id,
        ap.pick_date,
        ap.pick_count,
        we.x_coordinate,
        we.y_coordinate,
        we.label as element_label
       FROM all_picks ap
       JOIN warehouse_elements we ON ap.element_id = we.id
       WHERE we.layout_id = $1`,
      queryParams
    );

    const picks = picksResult.rows;

    if (picks.length === 0) {
      return res.json({
        totalDistance: 0,
        totalDistanceFeet: 0,
        cartTravelDistFeet: 0,
        pedestrianTravelDistFeet: 0,
        totalPicks: 0,
        visitCount: 0,
        avgDistancePerPickFeet: 0,
        message: 'No pick data found for the selected date range.'
      });
    }

    // Calculate using the service
    const metrics = WalkDistanceService.calculate(picks, markers);

    // Convert pixels to feet (assuming 1 px = 1 inch, so / 12)
    const pxToFeet = (px) => Math.round(px / 12);

    const totalDistanceFeet = pxToFeet(metrics.totalDistance);
    const cartTravelDistFeet = pxToFeet(metrics.cartTravelDist);
    const pedestrianTravelDistFeet = pxToFeet(metrics.pedestrianTravelDist);

    // Calculate estimated time (assuming walking speed of 3 mph = 264 feet/min)
    const walkingSpeedFeetPerMin = 264;
    const estimatedMinutes = Math.round(totalDistanceFeet / walkingSpeedFeetPerMin);

    res.json({
      totalDistance: Math.round(metrics.totalDistance),
      totalDistanceFeet,
      cartTravelDistFeet,
      pedestrianTravelDistFeet,

      totalPicks: picks.reduce((sum, p) => sum + Number(p.pick_count), 0),
      visitCount: metrics.visitCount,

      avgDistancePerPickFeet: metrics.visitCount > 0 ? Math.round((totalDistanceFeet / metrics.visitCount) * 10) / 10 : 0,
      avgDistancePerPickLabel: 'Avg per Visit', // Context hint for frontend

      estimatedMinutes,

      dailyBreakdown: metrics.dailyBreakdown.map(d => ({
        date: d.date,
        totalFeet: pxToFeet(d.cartDist + d.pedestrianDist),
        cartFeet: pxToFeet(d.cartDist),
        pedestrianFeet: pxToFeet(d.pedestrianDist),
        visits: d.visitCount
      })),

      markers: {
        startPoint: { label: startPoint.label, x: startPoint.x_coordinate, y: startPoint.y_coordinate },
        stopPoint: { label: stopPoint.label, x: stopPoint.x_coordinate, y: stopPoint.y_coordinate },
        cartParkingCount: cartParking.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;












