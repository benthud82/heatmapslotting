const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Valid milestone keys
const VALID_MILESTONES = [
    'layout_created',
    'route_markers_added',
    'pick_data_uploaded',
    'distances_viewed',
    'heatmap_explored',
    'dashboard_analyzed',
    'optimization_started'
];

// Milestone order for progress calculation
const MILESTONE_ORDER = [
    'layout_created',
    'route_markers_added',
    'pick_data_uploaded',
    'distances_viewed',
    'heatmap_explored',
    'dashboard_analyzed',
    'optimization_started'
];

// Next action configuration
const NEXT_ACTIONS = {
    layout_created: {
        milestone: 'layout_created',
        label: 'Create Your Layout',
        description: 'Place warehouse elements using the Designer',
        href: '/designer'
    },
    route_markers_added: {
        milestone: 'route_markers_added',
        label: 'Add Route Markers',
        description: 'Place cart parking for distance calculations',
        href: '/designer'
    },
    pick_data_uploaded: {
        milestone: 'pick_data_uploaded',
        label: 'Upload Pick Data',
        description: 'Import your CSV pick transactions',
        href: '/upload'
    },
    distances_viewed: {
        milestone: 'distances_viewed',
        label: 'View Distances',
        description: 'See walk distances from cart parking',
        href: '/designer'
    },
    heatmap_explored: {
        milestone: 'heatmap_explored',
        label: 'Explore Heatmap',
        description: 'View pick intensity visualization',
        href: '/heatmap'
    },
    dashboard_analyzed: {
        milestone: 'dashboard_analyzed',
        label: 'Analyze Dashboard',
        description: 'Review KPIs and optimization opportunities',
        href: '/dashboard'
    },
    optimization_started: {
        milestone: 'optimization_started',
        label: 'Start Optimization',
        description: 'Review reslotting opportunities in ReslotHUD',
        href: '/heatmap'
    }
};

// Helper: Ensure user preferences exist
async function ensurePreferences(userId) {
    const existing = await query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
    );

    if (existing.rows.length === 0) {
        await query(
            `INSERT INTO user_preferences (user_id) VALUES ($1)`,
            [userId]
        );
    }
}

// GET /api/journey/milestones - Get all milestones and preferences
router.get('/milestones', async (req, res, next) => {
    try {
        const userId = req.user.id;

        await ensurePreferences(userId);

        const [milestonesResult, prefsResult] = await Promise.all([
            query(
                'SELECT milestone, completed_at, metadata FROM user_journey_milestones WHERE user_id = $1 ORDER BY completed_at',
                [userId]
            ),
            query(
                'SELECT onboarding_completed, onboarding_dismissed, dismissed_hints FROM user_preferences WHERE user_id = $1',
                [userId]
            )
        ]);

        res.json({
            milestones: milestonesResult.rows,
            preferences: prefsResult.rows[0] || {
                onboarding_completed: false,
                onboarding_dismissed: false,
                dismissed_hints: []
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/journey/progress - Get computed progress summary
router.get('/progress', async (req, res, next) => {
    try {
        const userId = req.user.id;

        const milestonesResult = await query(
            'SELECT milestone FROM user_journey_milestones WHERE user_id = $1',
            [userId]
        );

        const completedMilestones = milestonesResult.rows.map(r => r.milestone);
        const completedSet = new Set(completedMilestones);

        // Find the first incomplete milestone
        let nextMilestone = null;
        for (const milestone of MILESTONE_ORDER) {
            if (!completedSet.has(milestone)) {
                nextMilestone = milestone;
                break;
            }
        }

        const currentStage = completedMilestones.length;
        const totalStages = MILESTONE_ORDER.length;
        const progressPercent = Math.round((currentStage / totalStages) * 100);

        res.json({
            currentStage,
            totalStages,
            completedMilestones,
            nextAction: nextMilestone ? NEXT_ACTIONS[nextMilestone] : null,
            progressPercent
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/journey/milestone - Mark a milestone as complete
router.post('/milestone', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { milestone, metadata = {} } = req.body;

        if (!milestone || !VALID_MILESTONES.includes(milestone)) {
            return res.status(400).json({
                error: `Invalid milestone. Must be one of: ${VALID_MILESTONES.join(', ')}`
            });
        }

        // Upsert milestone (ignore if already exists)
        const result = await query(
            `INSERT INTO user_journey_milestones (user_id, milestone, metadata)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, milestone) DO NOTHING
             RETURNING *`,
            [userId, milestone, metadata]
        );

        if (result.rows.length > 0) {
            res.status(201).json(result.rows[0]);
        } else {
            // Already existed
            const existing = await query(
                'SELECT * FROM user_journey_milestones WHERE user_id = $1 AND milestone = $2',
                [userId, milestone]
            );
            res.json(existing.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// POST /api/journey/dismiss-hint - Dismiss a specific hint
router.post('/dismiss-hint', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { hintId } = req.body;

        if (!hintId || typeof hintId !== 'string') {
            return res.status(400).json({ error: 'hintId is required and must be a string' });
        }

        await ensurePreferences(userId);

        // Add hint to dismissed_hints array (if not already there)
        const result = await query(
            `UPDATE user_preferences
             SET dismissed_hints = CASE
                 WHEN NOT (dismissed_hints ? $2)
                 THEN dismissed_hints || $3::jsonb
                 ELSE dismissed_hints
             END,
             updated_at = NOW()
             WHERE user_id = $1
             RETURNING dismissed_hints`,
            [userId, hintId, JSON.stringify([hintId])]
        );

        res.json({ dismissed_hints: result.rows[0]?.dismissed_hints || [] });
    } catch (error) {
        next(error);
    }
});

// PUT /api/journey/preferences - Update onboarding preferences
router.put('/preferences', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { onboarding_completed, onboarding_dismissed } = req.body;

        await ensurePreferences(userId);

        const updates = [];
        const values = [userId];
        let paramIndex = 2;

        if (typeof onboarding_completed === 'boolean') {
            updates.push(`onboarding_completed = $${paramIndex++}`);
            values.push(onboarding_completed);
        }

        if (typeof onboarding_dismissed === 'boolean') {
            updates.push(`onboarding_dismissed = $${paramIndex++}`);
            values.push(onboarding_dismissed);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updates.push('updated_at = NOW()');

        const result = await query(
            `UPDATE user_preferences
             SET ${updates.join(', ')}
             WHERE user_id = $1
             RETURNING onboarding_completed, onboarding_dismissed, dismissed_hints`,
            values
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
