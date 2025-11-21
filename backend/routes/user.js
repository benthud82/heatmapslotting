const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../db');

// GET /api/user/preferences - Get user preferences
router.get('/preferences', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Try to get existing preferences
        const result = await query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }

        // If no preferences exist, create default ones
        const insertResult = await query(
            `INSERT INTO user_preferences (user_id) 
       VALUES ($1) 
       RETURNING *`,
            [userId]
        );

        res.json(insertResult.rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT /api/user/preferences - Update user preferences
router.put('/preferences', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { skip_upload_tutorial } = req.body;

        if (typeof skip_upload_tutorial !== 'boolean') {
            return res.status(400).json({ error: 'skip_upload_tutorial must be a boolean' });
        }

        // Upsert preferences
        const result = await query(
            `INSERT INTO user_preferences (user_id, skip_upload_tutorial, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET 
         skip_upload_tutorial = EXCLUDED.skip_upload_tutorial,
         updated_at = NOW()
       RETURNING *`,
            [userId, skip_upload_tutorial]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
