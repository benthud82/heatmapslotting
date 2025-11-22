const { query } = require('../db');
const { getUserLimits } = require('../config/tiers');

/**
 * Middleware to check if user can create more elements
 * Attach BEFORE element creation route
 */
async function checkElementLimit(req, res, next) {
    try {
        const userId = req.user.id;

        // Get user's tier from preferences
        const prefResult = await query(
            'SELECT subscription_tier FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        const tier = prefResult.rows[0]?.subscription_tier || 'free';
        const limits = getUserLimits(tier);

        // Get user's layout ID
        const layoutResult = await query(
            'SELECT id FROM layouts WHERE user_id = $1',
            [userId]
        );

        if (layoutResult.rows.length === 0) {
            // No layout yet, allow creation
            return next();
        }

        const layoutId = layoutResult.rows[0].id;

        // Count existing elements (exclude text, line, arrow from limit)
        const countResult = await query(
            `SELECT COUNT(*) as count FROM warehouse_elements 
       WHERE layout_id = $1 
       AND element_type NOT IN ('text', 'line', 'arrow')`,
            [layoutId]
        );

        const currentCount = parseInt(countResult.rows[0].count, 10);

        if (currentCount >= limits.elements) {
            return res.status(403).json({
                error: 'Element limit reached',
                message: `Your ${tier} plan allows up to ${limits.elements} elements. Upgrade to create more.`,
                currentCount,
                limit: limits.elements,
                tier,
                upgradeUrl: '/pricing',
            });
        }

        // Attach limits to request for later use
        req.userLimits = limits;
        req.userTier = tier;
        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Middleware to check pick data date range
 * Not blocking, but will add warnings
 */
async function checkPickHistoryLimit(req, res, next) {
    try {
        const userId = req.user.id;

        // Get user's tier
        const prefResult = await query(
            'SELECT subscription_tier FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        const tier = prefResult.rows[0]?.subscription_tier || 'free';
        const limits = getUserLimits(tier);

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - limits.pickHistoryDays);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Attach to request for use in pick upload handler
        req.pickHistoryCutoff = limits.pickHistoryDays === Infinity ? null : cutoffDateStr;
        req.userTier = tier;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = {
    checkElementLimit,
    checkPickHistoryLimit,
};
