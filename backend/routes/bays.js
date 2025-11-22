const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db');

// Element type configurations (dimensions in pixels, 1 pixel = 1 inch)
const ELEMENT_TYPES = {
  bay: { width: 24, height: 48 },
  flow_rack: { width: 120, height: 120 },
  full_pallet: { width: 48, height: 52 },
  text: { width: 100, height: 24 },
  line: { width: 100, height: 2 },
  arrow: { width: 100, height: 2 }
};

// Helper function to get user's layout ID
async function getUserLayoutId(userId) {
  const result = await query(
    'SELECT id FROM layouts WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// GET /api/elements - Fetch warehouse elements for user's layout
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { layout_id } = req.query;

    // Get user's layout ID
    let layoutId = layout_id || await getUserLayoutId(userId);

    if (!layoutId) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Fetch all elements for the layout
    const result = await query(
      `SELECT * FROM warehouse_elements
       WHERE layout_id = $1
       ORDER BY created_at ASC`,
      [layoutId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/elements - Create a new warehouse element
const { checkElementLimit } = require('../middleware/limits');
router.post('/', authMiddleware, checkElementLimit, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { element_type, label, x_coordinate, y_coordinate, rotation, width: reqWidth, height: reqHeight } = req.body;

    // Validate element type
    if (!ELEMENT_TYPES[element_type]) {
      return res.status(400).json({ error: 'Invalid element_type. Must be: bay, flow_rack, full_pallet, text, line, or arrow' });
    }

    // User is already authenticated via Supabase middleware

    // Get or create layout
    let layoutId = await getUserLayoutId(userId);
    if (!layoutId) {
      const layoutResult = await query(
        `INSERT INTO layouts (user_id, name) VALUES ($1, $2) RETURNING id`,
        [userId, 'My Warehouse Layout']
      );
      layoutId = layoutResult.rows[0].id;
    }

    // Get element dimensions (prefer request body for resizable elements, fallback to defaults)
    const defaultDims = ELEMENT_TYPES[element_type];
    const width = reqWidth || defaultDims.width;
    const height = reqHeight || defaultDims.height;

    // Create element
    const result = await query(
      `INSERT INTO warehouse_elements
       (layout_id, element_type, label, x_coordinate, y_coordinate, width, height, rotation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [layoutId, element_type, label, x_coordinate, y_coordinate, width, height, rotation || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/elements/:id - Update an existing warehouse element
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const elementId = req.params.id;
    const { label, x_coordinate, y_coordinate, rotation, width, height } = req.body;

    // Verify the element belongs to user's layout
    const layoutId = await getUserLayoutId(userId);
    if (!layoutId) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // If label is being updated, check for duplicates (case-insensitive)
    if (label) {
      const duplicateCheck = await query(
        `SELECT id FROM warehouse_elements
         WHERE layout_id = $1
           AND LOWER(label) = LOWER($2)
           AND id != $3`,
        [layoutId, label, elementId]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          error: `Element with label "${label}" already exists in this layout`
        });
      }
    }

    const result = await query(
      `UPDATE warehouse_elements
       SET label = COALESCE($1, label),
           x_coordinate = COALESCE($2, x_coordinate),
           y_coordinate = COALESCE($3, y_coordinate),
           rotation = COALESCE($4, rotation),
           width = COALESCE($5, width),
           height = COALESCE($6, height),
           updated_at = NOW()
       WHERE id = $7 AND layout_id = $8
       RETURNING *`,
      [label, x_coordinate, y_coordinate, rotation, width, height, elementId, layoutId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/elements/:id - Delete a warehouse element
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const elementId = req.params.id;

    // Verify the element belongs to user's layout
    const layoutId = await getUserLayoutId(userId);
    if (!layoutId) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const result = await query(
      'DELETE FROM warehouse_elements WHERE id = $1 AND layout_id = $2 RETURNING id',
      [elementId, layoutId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    res.json({ message: 'Element deleted successfully', id: elementId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

