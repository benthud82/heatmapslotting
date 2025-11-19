const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const authMiddleware = require('../middleware/auth');
const { query } = require('../db');

// Configure multer for memory storage (CSV files are small)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// POST /api/picks/upload - Upload CSV with pick data
router.post('/upload', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;

    // Get user's layout
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE user_id = $1',
      [userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'No layout found. Please create a layout first.' });
    }

    const layoutId = layoutResult.rows[0].id;

    // Get all warehouse elements for this layout (for validation)
    const elementsResult = await query(
      'SELECT id, label FROM warehouse_elements WHERE layout_id = $1',
      [layoutId]
    );

    // Create a map of label -> element_id for fast lookup
    const elementMap = new Map();
    elementsResult.rows.forEach(row => {
      elementMap.set(row.label.trim().toLowerCase(), row.id);
    });

    // Parse CSV from buffer
    const rows = [];
    const errors = [];
    const unmatchedElements = new Set();

    const bufferStream = Readable.from(req.file.buffer);

    await new Promise((resolve, reject) => {
      bufferStream
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase(),
          skipLines: 0,
        }))
        .on('data', (row) => {
          // Validate required columns
          if (!row.element_name || !row.date || row.pick_count === undefined) {
            errors.push(`Missing required columns in row: ${JSON.stringify(row)}`);
            return;
          }

          const elementName = row.element_name.trim();
          const elementNameLower = elementName.toLowerCase();
          const pickDate = row.date.trim();
          const pickCount = parseInt(row.pick_count, 10);

          // Validate date format (YYYY-MM-DD)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(pickDate)) {
            errors.push(`Invalid date format "${pickDate}". Expected YYYY-MM-DD`);
            return;
          }

          // Validate pick count is a positive integer
          if (isNaN(pickCount) || pickCount < 0) {
            errors.push(`Invalid pick_count "${row.pick_count}" for element "${elementName}"`);
            return;
          }

          // Track element that doesn't exist (but don't error - just skip the row)
          if (!elementMap.has(elementNameLower)) {
            unmatchedElements.add(elementName);
            return; // Skip this row but continue processing others
          }

          rows.push({
            element_id: elementMap.get(elementNameLower),
            pick_date: pickDate,
            pick_count: pickCount,
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });


    if (errors.length > 0) {
      return res.status(400).json({
        error: 'CSV validation failed',
        details: errors,
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'CSV file is empty or contains no valid data',
      });
    }

    // Bulk insert pick transactions (using INSERT ... ON CONFLICT UPDATE for upserts)
    const insertPromises = rows.map(row =>
      query(
        `INSERT INTO pick_transactions (layout_id, element_id, pick_date, pick_count)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (element_id, pick_date)
         DO UPDATE SET pick_count = EXCLUDED.pick_count, created_at = NOW()`,
        [layoutId, row.element_id, row.pick_date, row.pick_count]
      )
    );

    await Promise.all(insertPromises);

    const response = {
      message: 'Pick data uploaded successfully',
      rowsProcessed: rows.length,
    };

    // Add warnings if there were unmatched elements
    if (unmatchedElements.size > 0) {
      response.warnings = {
        unmatchedElements: Array.from(unmatchedElements).sort(),
        message: 'Some element names in the CSV do not exist in the layout and were skipped.',
      };
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/picks - Get pick data with optional date filters
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    // Get user's layout
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE user_id = $1',
      [userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.json([]); // No layout yet, return empty array
    }

    const layoutId = layoutResult.rows[0].id;

    // Build query with optional date filters
    let queryText = `
      SELECT
        pt.element_id,
        we.label as element_name,
        to_char(pt.pick_date, 'YYYY-MM-DD') as pick_date,
        pt.pick_count
      FROM pick_transactions pt
      JOIN warehouse_elements we ON pt.element_id = we.id
      WHERE pt.layout_id = $1
    `;
    const queryParams = [layoutId];

    if (start_date) {
      queryParams.push(start_date);
      queryText += ` AND pt.pick_date >= $${queryParams.length}`;
    }

    if (end_date) {
      queryParams.push(end_date);
      queryText += ` AND pt.pick_date <= $${queryParams.length}`;
    }

    queryText += ' ORDER BY pt.pick_date DESC, we.label ASC';

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/picks/aggregated - Get aggregated pick counts per element
router.get('/aggregated', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    // Get user's layout
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE user_id = $1',
      [userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.json([]); // No layout yet, return empty array
    }

    const layoutId = layoutResult.rows[0].id;

    // Build query with optional date filters and aggregation
    let queryText = `
      SELECT
        pt.element_id,
        we.label as element_name,
        SUM(pt.pick_count) as total_picks,
        COUNT(*) as days_count,
        to_char(MIN(pt.pick_date), 'YYYY-MM-DD') as first_date,
        to_char(MAX(pt.pick_date), 'YYYY-MM-DD') as last_date
      FROM pick_transactions pt
      JOIN warehouse_elements we ON pt.element_id = we.id
      WHERE pt.layout_id = $1
    `;
    const queryParams = [layoutId];

    if (start_date) {
      queryParams.push(start_date);
      queryText += ` AND pt.pick_date >= $${queryParams.length}`;
    }

    if (end_date) {
      queryParams.push(end_date);
      queryText += ` AND pt.pick_date <= $${queryParams.length}`;
    }

    queryText += ' GROUP BY pt.element_id, we.label ORDER BY total_picks DESC';

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/picks/dates - Get all dates that have pick data
router.get('/dates', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's layout
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE user_id = $1',
      [userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.json([]);
    }

    const layoutId = layoutResult.rows[0].id;

    const result = await query(
      `SELECT DISTINCT to_char(pick_date, 'YYYY-MM-DD') as pick_date 
       FROM pick_transactions 
       WHERE layout_id = $1 
       ORDER BY pick_date DESC`,
      [layoutId]
    );

    // Return array of date strings
    res.json(result.rows.map(row => row.pick_date));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/picks - Clear all pick data for the user's layout
router.delete('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's layout
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE user_id = $1',
      [userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'No layout found' });
    }

    const layoutId = layoutResult.rows[0].id;

    const result = await query(
      'DELETE FROM pick_transactions WHERE layout_id = $1',
      [layoutId]
    );

    res.json({
      message: 'Pick data cleared successfully',
      rowsDeleted: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
