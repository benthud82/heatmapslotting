const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const authMiddleware = require('../middleware/auth');
const { query } = require('../db');

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        const { priceId } = req.body; // Stripe Price ID for Pro plan

        if (!priceId) {
            return res.status(400).json({ error: 'priceId is required' });
        }

        // MOCK MODE: If using mock keys, bypass Stripe
        if (process.env.STRIPE_SECRET_KEY?.startsWith('mock_')) {
            console.log('⚠️ Using Mock Stripe Mode');
            const mockSessionUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/designer?upgrade=success`;

            // We need a way to update the DB since we won't get a webhook
            // So we'll return a URL to a backend route that does the update then redirects
            const callbackUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/stripe/mock-payment?userId=${userId}`;
            return res.json({ sessionUrl: callbackUrl });
        }

        // Get or create Stripe customer
        let stripeCustomerId;

        const prefResult = await query(
            'SELECT stripe_customer_id FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        if (prefResult.rows[0]?.stripe_customer_id) {
            stripeCustomerId = prefResult.rows[0].stripe_customer_id;
        } else {
            // Create new customer
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: { userId },
            });

            stripeCustomerId = customer.id;

            // Save to database
            await query(
                `INSERT INTO user_preferences (user_id, stripe_customer_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id`,
                [userId, stripeCustomerId]
            );
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
            metadata: { userId },
        });

        res.json({ sessionUrl: session.url });
    } catch (error) {
        next(error);
    }
});

// GET /api/stripe/mock-payment (For testing without Stripe)
router.get('/mock-payment', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).send('Missing userId');

    try {
        await query(
            `UPDATE user_preferences
             SET subscription_tier = 'pro',
                 stripe_subscription_id = 'mock_sub_' || CAST(EXTRACT(EPOCH FROM NOW()) AS TEXT),
                 subscription_status = 'active',
                 updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
        );
        console.log('✅ Mock upgrade successful for user:', userId);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/designer?upgrade=success`);
    } catch (err) {
        console.error('Mock payment error:', err);
        res.status(500).send('Mock payment failed');
    }
});

// POST /api/stripe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('⚠️  Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const userId = session.metadata.userId;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            // Update user to Pro tier
            await query(
                `UPDATE user_preferences
         SET subscription_tier = 'pro',
             stripe_subscription_id = $1,
             subscription_status = 'active',
             updated_at = NOW()
         WHERE user_id = $2`,
                [subscriptionId, userId]
            );

            console.log('✅ User upgraded to Pro:', userId);
            break;

        case 'customer.subscription.updated':
            const subscription = event.data.object;
            await query(
                `UPDATE user_preferences
         SET subscription_status = $1,
             updated_at = NOW()
         WHERE stripe_subscription_id = $2`,
                [subscription.status, subscription.id]
            );
            break;

        case 'customer.subscription.deleted':
            const deletedSub = event.data.object;
            await query(
                `UPDATE user_preferences
         SET subscription_tier = 'free',
             subscription_status = 'canceled',
             updated_at = NOW()
         WHERE stripe_subscription_id = $1`,
                [deletedSub.id]
            );
            console.log('🔽 User downgraded to Free');
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

// GET /api/stripe/subscription-status
router.get('/subscription-status', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT subscription_tier, subscription_status
       FROM user_preferences
       WHERE user_id = $1`,
            [userId]
        );

        res.json(result.rows[0] || { subscription_tier: 'free', subscription_status: 'active' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
