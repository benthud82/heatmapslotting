const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db');

// GET /api/items - Get all items for a layout
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

    // Get all items with their current location and element info
    const result = await query(
      `SELECT
        i.id,
        i.item_id as external_item_id,
        i.description,
        i.current_location_id,
        l.location_id as current_location_external_id,
        l.label as location_label,
        l.element_id,
        we.label as element_name,
        we.x_coordinate as element_x,
        we.y_coordinate as element_y,
        i.created_at,
        i.updated_at
      FROM items i
      LEFT JOIN locations l ON i.current_location_id = l.id
      LEFT JOIN warehouse_elements we ON l.element_id = we.id
      WHERE i.layout_id = $1
      ORDER BY i.item_id ASC`,
      [layout_id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id - Get a single item
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT
        i.id,
        i.item_id as external_item_id,
        i.description,
        i.current_location_id,
        l.location_id as current_location_external_id,
        l.label as location_label,
        l.element_id,
        we.label as element_name,
        we.x_coordinate as element_x,
        we.y_coordinate as element_y,
        i.created_at,
        i.updated_at
      FROM items i
      JOIN layouts lay ON i.layout_id = lay.id
      LEFT JOIN locations l ON i.current_location_id = l.id
      LEFT JOIN warehouse_elements we ON l.element_id = we.id
      WHERE i.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/items/:id - Update an item
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { description } = req.body;

    // Verify item belongs to user's layout
    const itemResult = await query(
      `SELECT i.id FROM items i
       JOIN layouts lay ON i.layout_id = lay.id
       WHERE i.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const result = await query(
      `UPDATE items SET description = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [description, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/items/:id/location - Reassign item to a different location
router.put('/:id/location', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { location_id } = req.body;

    if (!location_id) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Verify item belongs to user's layout
    const itemResult = await query(
      `SELECT i.id, i.layout_id FROM items i
       JOIN layouts lay ON i.layout_id = lay.id
       WHERE i.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const layoutId = itemResult.rows[0].layout_id;

    // Verify the new location belongs to the same layout
    const locationResult = await query(
      'SELECT id FROM locations WHERE id = $1 AND layout_id = $2',
      [location_id, layoutId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found in this layout' });
    }

    // Update item's location
    const result = await query(
      `UPDATE items SET current_location_id = $1, updated_at = NOW() WHERE id = $2
       RETURNING
         id,
         item_id as external_item_id,
         description,
         current_location_id,
         updated_at`,
      [location_id, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id/picks - Get pick history for an item
router.get('/:id/picks', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Verify item belongs to user's layout
    const itemResult = await query(
      `SELECT i.id FROM items i
       JOIN layouts lay ON i.layout_id = lay.id
       WHERE i.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Build query for pick history
    let queryText = `
      SELECT
        ipt.id,
        to_char(ipt.pick_date, 'YYYY-MM-DD') as pick_date,
        ipt.pick_count,
        l.location_id as location_external_id,
        we.label as element_name
      FROM item_pick_transactions ipt
      JOIN locations l ON ipt.location_id = l.id
      JOIN warehouse_elements we ON ipt.element_id = we.id
      WHERE ipt.item_id = $1
    `;
    const queryParams = [id];

    if (start_date) {
      queryParams.push(start_date);
      queryText += ` AND ipt.pick_date >= $${queryParams.length}`;
    }

    if (end_date) {
      queryParams.push(end_date);
      queryText += ` AND ipt.pick_date <= $${queryParams.length}`;
    }

    queryText += ' ORDER BY ipt.pick_date DESC';

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/items/:id - Delete an item
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify item belongs to user's layout
    const itemResult = await query(
      `SELECT i.id FROM items i
       JOIN layouts lay ON i.layout_id = lay.id
       WHERE i.id = $1 AND lay.user_id = $2`,
      [id, userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await query('DELETE FROM items WHERE id = $1', [id]);

    res.json({ message: 'Item deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
