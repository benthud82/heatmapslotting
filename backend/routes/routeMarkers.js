const express = require('express');
const router = express.Router();
const { query } = require('../db');

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
    let dateFilter = '';
    const queryParams = [layoutId];
    
    if (start_date) {
      queryParams.push(start_date);
      dateFilter += ` AND pt.pick_date >= $${queryParams.length}`;
    }
    if (end_date) {
      queryParams.push(end_date);
      dateFilter += ` AND pt.pick_date <= $${queryParams.length}`;
    }

    // Get pick transactions with element positions
    const picksResult = await query(
      `SELECT 
        pt.element_id,
        pt.pick_count,
        we.x_coordinate,
        we.y_coordinate,
        we.label as element_label
       FROM pick_transactions pt
       JOIN warehouse_elements we ON pt.element_id = we.id
       WHERE we.layout_id = $1 ${dateFilter}`,
      queryParams
    );

    const picks = picksResult.rows;

    if (picks.length === 0) {
      return res.json({
        totalDistance: 0,
        totalDistanceFeet: 0,
        totalPicks: 0,
        avgDistancePerPick: 0,
        message: 'No pick data found for the selected date range.'
      });
    }

    // Calculate distances
    const calculateManhattanDistance = (p1, p2) => {
      return Math.abs(Number(p2.x) - Number(p1.x)) + Math.abs(Number(p2.y) - Number(p1.y));
    };

    const findNearestCartParking = (element) => {
      let nearest = cartParking[0];
      let minDistance = Infinity;

      for (const cart of cartParking) {
        const dist = calculateManhattanDistance(
          { x: element.x_coordinate, y: element.y_coordinate },
          { x: cart.x_coordinate, y: cart.y_coordinate }
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearest = cart;
        }
      }
      return { cart: nearest, distance: minDistance };
    };

    let totalDistance = 0;
    let totalPicks = 0;
    const cartUtilization = {};

    // Initialize cart utilization
    cartParking.forEach(cart => {
      cartUtilization[cart.id] = {
        label: cart.label,
        picksServed: 0,
        totalWalkDistance: 0
      };
    });

    // Start to first cart
    const startToFirstCart = calculateManhattanDistance(
      { x: startPoint.x_coordinate, y: startPoint.y_coordinate },
      { x: cartParking[0].x_coordinate, y: cartParking[0].y_coordinate }
    );
    totalDistance += startToFirstCart;

    // Calculate walk distance for each pick (round trip from nearest cart)
    for (const pick of picks) {
      const { cart, distance } = findNearestCartParking(pick);
      const roundTripDistance = distance * 2 * Number(pick.pick_count);
      totalDistance += roundTripDistance;
      totalPicks += Number(pick.pick_count);

      // Track cart utilization
      if (cartUtilization[cart.id]) {
        cartUtilization[cart.id].picksServed += Number(pick.pick_count);
        cartUtilization[cart.id].totalWalkDistance += roundTripDistance;
      }
    }

    // Last cart to stop
    const lastCart = cartParking[cartParking.length - 1];
    const lastCartToStop = calculateManhattanDistance(
      { x: lastCart.x_coordinate, y: lastCart.y_coordinate },
      { x: stopPoint.x_coordinate, y: stopPoint.y_coordinate }
    );
    totalDistance += lastCartToStop;

    // Convert to feet (assuming layout units are inches - 1 inch = 1 unit)
    const totalDistanceFeet = Math.round(totalDistance / 12);

    // Calculate estimated time (assuming walking speed of 3 mph = 264 feet/min)
    const walkingSpeedFeetPerMin = 264;
    const estimatedMinutes = Math.round(totalDistanceFeet / walkingSpeedFeetPerMin);

    res.json({
      totalDistance: Math.round(totalDistance),
      totalDistanceFeet,
      totalPicks,
      avgDistancePerPick: totalPicks > 0 ? Math.round((totalDistance / totalPicks) * 10) / 10 : 0,
      avgDistancePerPickFeet: totalPicks > 0 ? Math.round((totalDistanceFeet / totalPicks) * 10) / 10 : 0,
      estimatedMinutes,
      routeSummary: {
        startToFirstCart: Math.round(startToFirstCart),
        lastCartToStop: Math.round(lastCartToStop),
        pickingDistance: Math.round(totalDistance - startToFirstCart - lastCartToStop)
      },
      cartUtilization: Object.values(cartUtilization).map(cart => ({
        ...cart,
        totalWalkDistance: Math.round(cart.totalWalkDistance),
        totalWalkDistanceFeet: Math.round(cart.totalWalkDistance / 12)
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










