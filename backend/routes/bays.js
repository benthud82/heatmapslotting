const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateElement } = require('../middleware/validate');
const { auditLog } = require('../middleware/audit');
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

// GET /api/elements - Fetch warehouse elements for user's layout (with pagination)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { layout_id } = req.query;

    if (!layout_id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = (page - 1) * limit;

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layout_id, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Get count and elements in parallel
    const [countResult, dataResult] = await Promise.all([
      query('SELECT COUNT(*) FROM warehouse_elements WHERE layout_id = $1', [layout_id]),
      query(
        `SELECT * FROM warehouse_elements
         WHERE layout_id = $1
         ORDER BY created_at ASC
         LIMIT $2 OFFSET $3`,
        [layout_id, limit, offset]
      )
    ]);

    const total = parseInt(countResult.rows[0].count);

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

// POST /api/elements - Create a new warehouse element
const { checkElementLimit } = require('../middleware/limits');
router.post('/', authMiddleware, checkElementLimit, validateElement, auditLog('CREATE', 'element'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { element_type, label, x_coordinate, y_coordinate, rotation, width: reqWidth, height: reqHeight, layout_id } = req.body;

    if (!layout_id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    // Validate element type
    if (!ELEMENT_TYPES[element_type]) {
      return res.status(400).json({ error: 'Invalid element_type. Must be: bay, flow_rack, full_pallet, text, line, or arrow' });
    }

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layout_id, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
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
      [layout_id, element_type, label, x_coordinate, y_coordinate, width, height, rotation || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/elements/:id - Update an existing warehouse element
router.put('/:id', authMiddleware, validateElement, auditLog('UPDATE', 'element'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const elementId = req.params.id;
    const { label, x_coordinate, y_coordinate, rotation, width, height } = req.body;

    // We need to verify ownership of the element via the layout
    // First, get the layout_id of the element
    const elementResult = await query(
      `SELECT we.layout_id 
       FROM warehouse_elements we
       JOIN layouts l ON we.layout_id = l.id
       WHERE we.id = $1 AND l.user_id = $2`,
      [elementId, userId]
    );

    if (elementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found or access denied' });
    }

    const layoutId = elementResult.rows[0].layout_id;

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
       WHERE id = $7
       RETURNING *`,
      [label, x_coordinate, y_coordinate, rotation, width, height, elementId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/elements/:id - Delete a warehouse element
router.delete('/:id', authMiddleware, auditLog('DELETE', 'element'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const elementId = req.params.id;

    // Verify ownership via layout join
    const result = await query(
      `DELETE FROM warehouse_elements we
       USING layouts l
       WHERE we.layout_id = l.id
       AND we.id = $1
       AND l.user_id = $2
       RETURNING we.id`,
      [elementId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found or access denied' });
    }

    res.json({ message: 'Element deleted successfully', id: elementId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
