const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db');

// GET /api/locations - Get all locations for a layout
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { layout_id } = req.query;

    if (!layout_id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layout_id, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get all locations with their element info and current item
    const result = await query(
      `SELECT
        l.id,
        l.location_id as external_location_id,
        l.label,
        l.element_id,
        we.label as element_name,
        we.x_coordinate as element_x,
        we.y_coordinate as element_y,
        l.relative_x,
        l.relative_y,
        l.created_at,
        l.updated_at,
        i.id as current_item_internal_id,
        i.item_id as current_item_id,
        i.description as current_item_description
      FROM locations l
      JOIN warehouse_elements we ON l.element_id = we.id
      LEFT JOIN items i ON i.current_location_id = l.id
      WHERE l.layout_id = $1
      ORDER BY we.label ASC, l.location_id ASC`,
      [layout_id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/locations/:id - Get a single location
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT
        l.id,
        l.location_id as external_location_id,
        l.label,
        l.element_id,
        we.label as element_name,
        we.x_coordinate as element_x,
        we.y_coordinate as element_y,
        l.relative_x,
        l.relative_y,
        l.created_at,
        l.updated_at,
        i.id as current_item_internal_id,
        i.item_id as current_item_id,
        i.description as current_item_description
      FROM locations l
      JOIN warehouse_elements we ON l.element_id = we.id
      JOIN layouts lay ON l.layout_id = lay.id
      LEFT JOIN items i ON i.current_location_id = l.id
      WHERE l.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/locations/:id - Update a location
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { label, relative_x, relative_y } = req.body;

    // Verify location belongs to user's layout
    const locationResult = await query(
      `SELECT l.id FROM locations l
       JOIN layouts lay ON l.layout_id = lay.id
       WHERE l.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      values.push(label);
    }

    if (relative_x !== undefined) {
      updates.push(`relative_x = $${paramIndex++}`);
      values.push(relative_x);
    }

    if (relative_y !== undefined) {
      updates.push(`relative_y = $${paramIndex++}`);
      values.push(relative_y);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE locations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/locations/:id - Delete a location
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify location belongs to user's layout
    const locationResult = await query(
      `SELECT l.id FROM locations l
       JOIN layouts lay ON l.layout_id = lay.id
       WHERE l.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await query('DELETE FROM locations WHERE id = $1', [id]);

    res.json({ message: 'Location deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

// GET /api/locations/by-element/:elementId - Get locations for a specific element
router.get('/by-element/:elementId', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { elementId } = req.params;

    // Verify element belongs to user's layout
    const elementResult = await query(
      `SELECT we.id FROM warehouse_elements we
       JOIN layouts lay ON we.layout_id = lay.id
       WHERE we.id = $1 AND lay.user_id = $2`,
      [elementId, userId]
    );

    if (elementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    const result = await query(
      `SELECT
        l.id,
        l.location_id as external_location_id,
        l.label,
        l.relative_x,
        l.relative_y,
        l.created_at,
        i.id as current_item_internal_id,
        i.item_id as current_item_id,
        i.description as current_item_description
      FROM locations l
      LEFT JOIN items i ON i.current_location_id = l.id
      WHERE l.element_id = $1
      ORDER BY l.location_id ASC`,
      [elementId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
