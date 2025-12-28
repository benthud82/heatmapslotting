const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateLayout } = require('../middleware/validate');
const { auditLog } = require('../middleware/audit');
const { query } = require('../db');

// GET /api/layouts - Get all layouts for the authenticated user (with pagination)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Get count and layouts in parallel
    const [countResult, dataResult] = await Promise.all([
      query('SELECT COUNT(*) FROM layouts WHERE user_id = $1', [userId]),
      query(
        'SELECT * FROM layouts WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      )
    ]);

    const total = parseInt(countResult.rows[0].count);

    // If no layouts exist and on first page, create a default one
    if (total === 0 && page === 1) {
      const newLayout = await query(
        `INSERT INTO layouts (user_id, name, canvas_width, canvas_height)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 'My Warehouse Layout', 1200, 800]
      );
      return res.json({
        data: [newLayout.rows[0]],
        pagination: { page: 1, limit, total: 1, pages: 1 }
      });
    }

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/layouts - Create a new layout
router.post('/', authMiddleware, validateLayout, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, canvas_width, canvas_height } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Layout name is required' });
    }

    const result = await query(
      `INSERT INTO layouts (user_id, name, canvas_width, canvas_height)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, canvas_width || 1200, canvas_height || 800]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/layouts/:id - Update layout properties
router.put('/:id', authMiddleware, validateLayout, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const layoutId = req.params.id;
    const { name, canvas_width, canvas_height } = req.body;

    const result = await query(
      `UPDATE layouts
       SET name = COALESCE($1, name),
           canvas_width = COALESCE($2, canvas_width),
           canvas_height = COALESCE($3, canvas_height),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, canvas_width, canvas_height, layoutId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/layouts/:id - Delete a layout
router.delete('/:id', authMiddleware, auditLog('DELETE', 'layout'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const layoutId = req.params.id;

    const result = await query(
      'DELETE FROM layouts WHERE id = $1 AND user_id = $2 RETURNING id',
      [layoutId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    res.json({ message: 'Layout deleted successfully', id: layoutId });
  } catch (error) {
    next(error);
  }
});

// GET /api/layouts/:id/elements - Get all warehouse elements for a specific layout
router.get('/:id/elements', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const layoutId = req.params.id;

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layoutId, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

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
