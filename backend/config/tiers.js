const SUBSCRIPTION_TIERS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        limits: {
            layouts: 1,
            elements: 50,
            pickHistoryDays: 7,
        },
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 14, // $14/month
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
        limits: {
            layouts: 5,
            elements: 500,
            pickHistoryDays: 90,
        },
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: null, // Contact sales
        limits: {
            layouts: Infinity,
            elements: Infinity,
            pickHistoryDays: Infinity,
        },
    },
};

// Helper function to get user tier limits
const getUserLimits = (tier = 'free') => {
    return SUBSCRIPTION_TIERS[tier]?.limits || SUBSCRIPTION_TIERS.free.limits;
};

module.exports = {
    SUBSCRIPTION_TIERS,
    getUserLimits,
};
