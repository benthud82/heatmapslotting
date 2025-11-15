const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../db');

// GET /api/layouts - Get or create user's single layout
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Ensure mock user exists (for development with mock auth)
    // In production, user will already exist from registration
    try {
      await query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [userId, req.user.email || 'mock@example.com', 'mock-hash']
      );
    } catch (err) {
      // User might already exist, continue
    }

    // Try to get existing layout
    let result = await query(
      'SELECT * FROM layouts WHERE user_id = $1',
      [userId]
    );

    // If no layout exists, create one
    if (result.rows.length === 0) {
      result = await query(
        `INSERT INTO layouts (user_id, name, canvas_width, canvas_height)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 'My Warehouse Layout', 1200, 800]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/layouts - Update layout properties
router.put('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, canvas_width, canvas_height } = req.body;

    const result = await query(
      `UPDATE layouts
       SET name = COALESCE($1, name),
           canvas_width = COALESCE($2, canvas_width),
           canvas_height = COALESCE($3, canvas_height),
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [name, canvas_width, canvas_height, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/layouts/elements - Get all warehouse elements for user's layout
router.get('/elements', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get layout first
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE user_id = $1',
      [userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.json([]); // No layout yet, return empty array
    }

    const layoutId = layoutResult.rows[0].id;

    // Get all elements
    const elementsResult = await query(
      `SELECT * FROM warehouse_elements
       WHERE layout_id = $1
       ORDER BY created_at ASC`,
      [layoutId]
    );

    res.json(elementsResult.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

