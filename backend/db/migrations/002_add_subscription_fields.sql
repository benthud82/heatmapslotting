-- Add subscription fields to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
ADD COLUMN stripe_customer_id VARCHAR(255),
ADD COLUMN stripe_subscription_id VARCHAR(255),
ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing'));

-- Add index for faster lookups
CREATE INDEX idx_user_preferences_stripe_customer ON user_preferences(stripe_customer_id);
