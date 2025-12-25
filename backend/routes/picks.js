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

const { checkPickHistoryLimit } = require('../middleware/limits');

// Helper function to get or create a location
async function getOrCreateLocation(layoutId, elementId, externalLocationId) {
  // Try to find existing location
  const existingResult = await query(
    'SELECT id FROM locations WHERE layout_id = $1 AND location_id = $2',
    [layoutId, externalLocationId]
  );

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0].id;
  }

  // Create new location
  const insertResult = await query(
    `INSERT INTO locations (layout_id, element_id, location_id, label)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (layout_id, location_id) DO UPDATE SET element_id = EXCLUDED.element_id
     RETURNING id`,
    [layoutId, elementId, externalLocationId, externalLocationId]
  );

  return insertResult.rows[0].id;
}

// Helper function to get or create an item
async function getOrCreateItem(layoutId, externalItemId, locationId) {
  // Try to find existing item
  const existingResult = await query(
    'SELECT id FROM items WHERE layout_id = $1 AND item_id = $2',
    [layoutId, externalItemId]
  );

  if (existingResult.rows.length > 0) {
    // Update current location
    await query(
      'UPDATE items SET current_location_id = $1, updated_at = NOW() WHERE id = $2',
      [locationId, existingResult.rows[0].id]
    );
    return existingResult.rows[0].id;
  }

  // Create new item
  const insertResult = await query(
    `INSERT INTO items (layout_id, item_id, current_location_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (layout_id, item_id) DO UPDATE SET current_location_id = EXCLUDED.current_location_id
     RETURNING id`,
    [layoutId, externalItemId, locationId]
  );

  return insertResult.rows[0].id;
}

// POST /api/picks/upload - Upload CSV with item-level pick data
// New CSV format: item_id, location_id, element_name, date, pick_count
router.post('/upload', authMiddleware, checkPickHistoryLimit, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const layoutId = req.body.layoutId;

    if (!layoutId) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layoutId, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found or access denied.' });
    }

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
    const newLocations = new Set();
    const newItems = new Set();

    const bufferStream = Readable.from(req.file.buffer);

    await new Promise((resolve, reject) => {
      bufferStream
        .pipe(csv({
          mapHeaders: ({ header }) => {
            const h = header.trim().toLowerCase();
            // Normalize headers to match expected database/logic keys
            if (h === 'item id') return 'item_id';
            if (h === 'location id') return 'location_id';
            if (h === 'element') return 'element_name';
            if (h === 'picks' || h === 'count') return 'pick_count';
            if (h === 'date') return 'date'; // Explicitly keep 'date'
            return h.replace(/\s+/g, '_'); // Fallback for others
          },
          skipLines: 0,
        }))
        .on('data', (row) => {
          // Check for new item-level format (item_id, location_id, element_name, date, pick_count)
          const hasItemFields = row.item_id !== undefined && row.location_id !== undefined;

          if (hasItemFields) {
            // New item-level CSV format
            if (!row.item_id || !row.location_id || !row.element_name || !row.date || row.pick_count === undefined) {
              errors.push(`Missing required columns in row: ${JSON.stringify(row)}`);
              return;
            }

            const itemId = row.item_id.trim();
            const locationId = row.location_id.trim();
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
              errors.push(`Invalid pick_count "${row.pick_count}" for item "${itemId}"`);
              return;
            }

            // Track element that doesn't exist
            if (!elementMap.has(elementNameLower)) {
              unmatchedElements.add(elementName);
              return;
            }

            rows.push({
              item_id: itemId,
              location_id: locationId,
              element_id: elementMap.get(elementNameLower),
              element_name: elementName,
              pick_date: pickDate,
              pick_count: pickCount,
              is_item_level: true,
            });

            newLocations.add(locationId);
            newItems.add(itemId);
          } else {
            // Legacy element-level CSV format (element_name, date, pick_count)
            if (!row.element_name || !row.date || row.pick_count === undefined) {
              errors.push(`Missing required columns in row: ${JSON.stringify(row)}`);
              return;
            }

            const elementName = row.element_name.trim();
            const elementNameLower = elementName.toLowerCase();
            const pickDate = row.date.trim();
            const pickCount = parseInt(row.pick_count, 10);

            if (!/^\d{4}-\d{2}-\d{2}$/.test(pickDate)) {
              errors.push(`Invalid date format "${pickDate}". Expected YYYY-MM-DD`);
              return;
            }

            if (isNaN(pickCount) || pickCount < 0) {
              errors.push(`Invalid pick_count "${row.pick_count}" for element "${elementName}"`);
              return;
            }

            if (!elementMap.has(elementNameLower)) {
              unmatchedElements.add(elementName);
              return;
            }

            rows.push({
              element_id: elementMap.get(elementNameLower),
              pick_date: pickDate,
              pick_count: pickCount,
              is_item_level: false,
            });
          }
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

    // Apply date cutoff based on subscription tier
    const cutoffDate = req.pickHistoryCutoff;
    const tierName = req.userTier;

    let filteredRows = rows;
    if (cutoffDate) {
      filteredRows = rows.filter(row => row.pick_date >= cutoffDate);
    }

    if (filteredRows.length === 0) {
      return res.status(400).json({
        error: 'All data is outside your allowed date range',
        message: `Your ${tierName} plan allows data from the last ${req.userLimits?.pickHistoryDays || 7} days. Upgrade to Pro for 90 days of history.`,
        upgradeUrl: '/pricing',
      });
    }

    // Process rows - handle both item-level and element-level data
    const isItemLevel = filteredRows[0]?.is_item_level;
    let processedCount = 0;

    if (isItemLevel) {
      // Item-level processing: use bulk inserts for performance
      // Step 1: Bulk upsert all unique locations
      const uniqueLocations = [...new Map(filteredRows.map(row => [
        row.location_id,
        { location_id: row.location_id, element_id: row.element_id }
      ])).values()];

      if (uniqueLocations.length > 0) {
        const locationValues = uniqueLocations.map((loc, i) =>
          `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
        ).join(', ');

        const locationParams = uniqueLocations.flatMap(loc => [
          layoutId, loc.element_id, loc.location_id, loc.location_id
        ]);

        await query(
          `INSERT INTO locations (layout_id, element_id, location_id, label)
           VALUES ${locationValues}
           ON CONFLICT (layout_id, location_id) DO UPDATE SET element_id = EXCLUDED.element_id`,
          locationParams
        );
      }

      // Step 2: Get all location IDs we just created/updated
      const locationResult = await query(
        `SELECT id, location_id FROM locations WHERE layout_id = $1`,
        [layoutId]
      );
      const locationIdMap = new Map(locationResult.rows.map(r => [r.location_id, r.id]));

      // Step 3: Bulk upsert all unique items
      const uniqueItems = [...new Map(filteredRows.map(row => [
        row.item_id,
        { item_id: row.item_id, location_id: locationIdMap.get(row.location_id) }
      ])).values()];

      if (uniqueItems.length > 0) {
        const itemValues = uniqueItems.map((item, i) =>
          `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`
        ).join(', ');

        const itemParams = uniqueItems.flatMap(item => [
          layoutId, item.item_id, item.location_id
        ]);

        await query(
          `INSERT INTO items (layout_id, item_id, current_location_id)
           VALUES ${itemValues}
           ON CONFLICT (layout_id, item_id) DO UPDATE SET current_location_id = EXCLUDED.current_location_id`,
          itemParams
        );
      }

      // Step 4: Get all item IDs we just created/updated
      const itemResult = await query(
        `SELECT id, item_id FROM items WHERE layout_id = $1`,
        [layoutId]
      );
      const itemIdMap = new Map(itemResult.rows.map(r => [r.item_id, r.id]));

      // Step 5: Bulk insert all pick transactions
      // Process in batches of 1000 to avoid parameter limits
      const BATCH_SIZE = 1000;
      for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
        const batch = filteredRows.slice(i, i + BATCH_SIZE);

        const txnValues = batch.map((row, idx) =>
          `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`
        ).join(', ');

        const txnParams = batch.flatMap(row => [
          layoutId,
          itemIdMap.get(row.item_id),
          locationIdMap.get(row.location_id),
          row.element_id,
          row.pick_date,
          row.pick_count
        ]);

        await query(
          `INSERT INTO item_pick_transactions (layout_id, item_id, location_id, element_id, pick_date, pick_count)
           VALUES ${txnValues}
           ON CONFLICT (item_id, location_id, pick_date)
           DO UPDATE SET pick_count = EXCLUDED.pick_count, created_at = NOW()`,
          txnParams
        );
      }

      processedCount = filteredRows.length;
    } else {
      // Legacy element-level processing
      const insertPromises = filteredRows.map(row =>
        query(
          `INSERT INTO pick_transactions (layout_id, element_id, pick_date, pick_count)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (element_id, pick_date)
           DO UPDATE SET pick_count = EXCLUDED.pick_count, created_at = NOW()`,
          [layoutId, row.element_id, row.pick_date, row.pick_count]
        )
      );
      await Promise.all(insertPromises);
      processedCount = filteredRows.length;
    }

    // Increment successful uploads count
    await query(
      `INSERT INTO user_preferences (user_id, successful_uploads_count)
       VALUES ($1, 1)
       ON CONFLICT (user_id)
       DO UPDATE SET
         successful_uploads_count = user_preferences.successful_uploads_count + 1,
         updated_at = NOW()`,
      [userId]
    );

    const response = {
      message: 'Pick data uploaded successfully',
      rowsProcessed: processedCount,
      dataType: isItemLevel ? 'item-level' : 'element-level',
    };

    // Add stats for item-level uploads
    if (isItemLevel) {
      response.stats = {
        uniqueItems: newItems.size,
        uniqueLocations: newLocations.size,
      };
    }

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
    const { start_date, end_date, layout_id } = req.query;

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
    const queryParams = [layout_id];

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

// GET /api/picks/aggregated - Get aggregated pick counts per element (combines both data sources)
router.get('/aggregated', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, layout_id } = req.query;

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

    // Build date filter conditions
    let dateFilter = '';
    const queryParams = [layout_id];

    if (start_date) {
      queryParams.push(start_date);
      dateFilter += ` AND pick_date >= $${queryParams.length}`;
    }

    if (end_date) {
      queryParams.push(end_date);
      dateFilter += ` AND pick_date <= $${queryParams.length}`;
    }

    // Query that combines BOTH legacy pick_transactions AND item_pick_transactions
    // Uses a UNION to get all picks, then aggregates by element
    const queryText = `
      WITH all_picks AS (
        -- Legacy element-level pick data
        SELECT element_id, pick_date, pick_count
        FROM pick_transactions
        WHERE layout_id = $1 ${dateFilter}
        
        UNION ALL
        
        -- Item-level pick data (aggregated to element level)
        SELECT element_id, pick_date, pick_count
        FROM item_pick_transactions
        WHERE layout_id = $1 ${dateFilter}
      )
      SELECT
        ap.element_id,
        we.label as element_name,
        SUM(ap.pick_count)::integer as total_picks,
        COUNT(DISTINCT ap.pick_date) as days_count,
        to_char(MIN(ap.pick_date), 'YYYY-MM-DD') as first_date,
        to_char(MAX(ap.pick_date), 'YYYY-MM-DD') as last_date
      FROM all_picks ap
      JOIN warehouse_elements we ON ap.element_id = we.id
      GROUP BY ap.element_id, we.label
      ORDER BY total_picks DESC
    `;

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/picks/items/aggregated - Get item-level aggregated pick counts
router.get('/items/aggregated', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, layout_id } = req.query;

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

    // Build query for item-level aggregation
    let queryText = `
      SELECT
        ipt.item_id,
        i.item_id as external_item_id,
        i.description as item_description,
        ipt.location_id,
        l.location_id as external_location_id,
        ipt.element_id,
        we.label as element_name,
        we.x_coordinate,
        we.y_coordinate,
        SUM(ipt.pick_count) as total_picks,
        COUNT(DISTINCT ipt.pick_date) as days_count,
        to_char(MIN(ipt.pick_date), 'YYYY-MM-DD') as first_date,
        to_char(MAX(ipt.pick_date), 'YYYY-MM-DD') as last_date
      FROM item_pick_transactions ipt
      JOIN items i ON ipt.item_id = i.id
      JOIN locations l ON ipt.location_id = l.id
      JOIN warehouse_elements we ON ipt.element_id = we.id
      WHERE ipt.layout_id = $1
    `;
    const queryParams = [layout_id];

    if (start_date) {
      queryParams.push(start_date);
      queryText += ` AND ipt.pick_date >= $${queryParams.length}`;
    }

    if (end_date) {
      queryParams.push(end_date);
      queryText += ` AND ipt.pick_date <= $${queryParams.length}`;
    }

    queryText += ` GROUP BY ipt.item_id, i.item_id, i.description, ipt.location_id, l.location_id,
                   ipt.element_id, we.label, we.x_coordinate, we.y_coordinate
                   ORDER BY total_picks DESC`;

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/picks/items/dates - Get all dates that have item-level pick data
router.get('/items/dates', authMiddleware, async (req, res, next) => {
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

    const result = await query(
      `SELECT DISTINCT to_char(pick_date, 'YYYY-MM-DD') as pick_date
       FROM item_pick_transactions
       WHERE layout_id = $1
       ORDER BY pick_date DESC`,
      [layout_id]
    );

    res.json(result.rows.map(row => row.pick_date));
  } catch (error) {
    next(error);
  }
});

// GET /api/picks/dates - Get all dates that have pick data
router.get('/dates', authMiddleware, async (req, res, next) => {
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

    // Query dates from BOTH legacy and item-level tables
    const result = await query(
      `SELECT DISTINCT pick_date_str as pick_date FROM (
         SELECT to_char(pick_date, 'YYYY-MM-DD') as pick_date_str FROM pick_transactions WHERE layout_id = $1
         UNION
         SELECT to_char(pick_date, 'YYYY-MM-DD') as pick_date_str FROM item_pick_transactions WHERE layout_id = $1
       ) combined
       ORDER BY pick_date DESC`,
      [layout_id]
    );

    // Return array of date strings
    res.json(result.rows.map(row => row.pick_date));
  } catch (error) {
    next(error);
  }
});

// GET /api/picks/items/by-element/:elementId - Get daily pick breakdown for an element from item-level data
router.get('/items/by-element/:elementId', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { elementId } = req.params;
    const { start_date, end_date, layout_id } = req.query;

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

    // Build query to get daily picks aggregated from item_pick_transactions
    let queryText = `
      SELECT
        ipt.element_id,
        we.label as element_name,
        to_char(ipt.pick_date, 'YYYY-MM-DD') as pick_date,
        SUM(ipt.pick_count)::integer as pick_count
      FROM item_pick_transactions ipt
      JOIN warehouse_elements we ON ipt.element_id = we.id
      WHERE ipt.layout_id = $1 AND ipt.element_id = $2
    `;
    const queryParams = [layout_id, elementId];

    if (start_date) {
      queryParams.push(start_date);
      queryText += ` AND ipt.pick_date >= $${queryParams.length}`;
    }

    if (end_date) {
      queryParams.push(end_date);
      queryText += ` AND ipt.pick_date <= $${queryParams.length}`;
    }

    queryText += ` GROUP BY ipt.element_id, we.label, ipt.pick_date
                   ORDER BY ipt.pick_date DESC`;

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/picks - Clear all pick data for the user's layout
router.delete('/', authMiddleware, async (req, res, next) => {
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

    // Delete item-level data first (due to foreign key constraints if any, though usually items depend on these)
    // Actually items depend on locations, txns depend on items/locations.
    // So delete transactions first.
    const resultItemPicks = await query(
      'DELETE FROM item_pick_transactions WHERE layout_id = $1',
      [layout_id]
    );

    const resultLegacyPicks = await query(
      'DELETE FROM pick_transactions WHERE layout_id = $1',
      [layout_id]
    );

    // Also clear items and locations since they are part of the "uploaded data" for item-level picks
    // If we don't clear them, re-uploading might cause issues or stale data
    await query('DELETE FROM items WHERE layout_id = $1', [layout_id]);
    await query('DELETE FROM locations WHERE layout_id = $1', [layout_id]);

    res.json({
      message: 'All pick data cleared successfully',
      rowsDeleted: resultItemPicks.rowCount + resultLegacyPicks.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/picks/batch - Delete picks for multiple dates
router.delete('/batch', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { dates, layoutId } = req.body;

    if (!layoutId) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'No dates provided' });
    }

    // Validate date format for all dates
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = dates.filter(date => !dateRegex.test(date));
    if (invalidDates.length > 0) {
      return res.status(400).json({ error: `Invalid date format for: ${invalidDates.join(', ')}` });
    }

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layoutId, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const result = await query(
      'DELETE FROM pick_transactions WHERE layout_id = $1 AND pick_date = ANY($2::date[])',
      [layoutId, dates]
    );

    res.json({
      message: 'Pick data deleted successfully',
      rowsDeleted: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/picks/by-date/:date - Delete all picks for a specific date
router.delete('/by-date/:date', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;
    const { layout_id } = req.query;

    if (!layout_id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    // Verify layout belongs to user
    const layoutResult = await query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [layout_id, userId]
    );

    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Delete all pick transactions for this layout on the specified date
    const result = await query(
      'DELETE FROM pick_transactions WHERE layout_id = $1 AND pick_date = $2',
      [layout_id, date]
    );

    res.json({
      message: `Successfully deleted picks for ${date}`,
      rowsDeleted: result.rowCount,
      date: date
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
