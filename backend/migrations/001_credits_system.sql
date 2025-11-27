-- =====================================================
-- DocuMind Credits System - Supabase Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. User Credits Table
-- Stores the current credit balance for each user
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    credits_balance INTEGER NOT NULL DEFAULT 100,  -- Free signup credits
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- 2. Credit Transactions Table
-- Logs all credit activities (purchases, usage, bonuses)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,  -- Positive = credit added, Negative = credit used
    balance_after INTEGER NOT NULL,  -- Balance after this transaction
    transaction_type VARCHAR(30) NOT NULL,  -- 'signup_bonus', 'purchase', 'chat_usage', 'refund'
    description TEXT,
    reference_id VARCHAR(255),  -- Payment ID, chat message ID, etc.
    metadata JSONB DEFAULT '{}',  -- Additional data (package info, token counts, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- 3. Credit Packages Table
-- Available packages for purchase
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    price_inr DECIMAL(10, 2) NOT NULL,
    price_usd DECIMAL(10, 2),
    description TEXT,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payment Orders Table
-- Track Razorpay orders
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    razorpay_order_id VARCHAR(255) NOT NULL UNIQUE,
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    package_id UUID REFERENCES credit_packages(id),
    amount_inr DECIMAL(10, 2) NOT NULL,
    credits INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'created',  -- 'created', 'paid', 'failed', 'refunded'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_order_id ON payment_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);

-- 5. Insert Default Credit Packages
INSERT INTO credit_packages (name, credits, price_inr, price_usd, description, is_popular, sort_order) VALUES
    ('Starter', 100, 10.00, 0.12, '100 credits for quick tasks', FALSE, 1),
    ('Basic', 500, 45.00, 0.55, '500 credits - Best for regular use', FALSE, 2),
    ('Pro', 1500, 120.00, 1.45, '1500 credits - Most popular!', TRUE, 3),
    ('Ultimate', 5000, 350.00, 4.25, '5000 credits - Best value!', FALSE, 4)
ON CONFLICT DO NOTHING;

-- 6. Function to initialize credits for new users
CREATE OR REPLACE FUNCTION initialize_user_credits(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert user credits if not exists
    INSERT INTO user_credits (user_id, credits_balance, total_purchased, total_used)
    VALUES (p_user_id, 100, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log signup bonus transaction (only if new row was inserted)
    IF FOUND THEN
        INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, description)
        VALUES (p_user_id, 100, 100, 'signup_bonus', 'Welcome bonus - 100 free credits');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to deduct credits (atomic operation)
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Chat usage',
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock the row for update
    SELECT credits_balance INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if user exists
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User credits not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient credits'::TEXT;
        RETURN;
    END IF;
    
    -- Deduct credits
    v_new_balance := v_current_balance - p_amount;
    
    UPDATE user_credits
    SET credits_balance = v_new_balance,
        total_used = total_used + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, description, reference_id, metadata)
    VALUES (p_user_id, -p_amount, v_new_balance, 'chat_usage', p_description, p_reference_id, p_metadata);
    
    RETURN QUERY SELECT TRUE, v_new_balance, 'Credits deducted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to add credits (for purchases)
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT DEFAULT 'purchase',
    p_description TEXT DEFAULT 'Credit purchase',
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock the row for update
    SELECT credits_balance INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Initialize if user doesn't exist
    IF v_current_balance IS NULL THEN
        INSERT INTO user_credits (user_id, credits_balance, total_purchased, total_used)
        VALUES (p_user_id, 0, 0, 0);
        v_current_balance := 0;
    END IF;
    
    -- Add credits
    v_new_balance := v_current_balance + p_amount;
    
    UPDATE user_credits
    SET credits_balance = v_new_balance,
        total_purchased = CASE WHEN p_transaction_type = 'purchase' THEN total_purchased + p_amount ELSE total_purchased END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, description, reference_id, metadata)
    VALUES (p_user_id, p_amount, v_new_balance, p_transaction_type, p_description, p_reference_id, p_metadata);
    
    RETURN QUERY SELECT TRUE, v_new_balance, 'Credits added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
-- Allow users to read their own credits
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (true);

-- Allow insert for new users (service role)
CREATE POLICY "Allow insert credits" ON user_credits
    FOR INSERT WITH CHECK (true);

-- Allow update for credit changes
CREATE POLICY "Allow update credits" ON user_credits
    FOR UPDATE USING (true);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (true);

CREATE POLICY "Allow insert transactions" ON credit_transactions
    FOR INSERT WITH CHECK (true);

-- RLS Policies for payment_orders
CREATE POLICY "Users can view own orders" ON payment_orders
    FOR SELECT USING (true);

CREATE POLICY "Allow insert orders" ON payment_orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update orders" ON payment_orders
    FOR UPDATE USING (true);

-- RLS Policy for credit_packages (public read)
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view packages" ON credit_packages
    FOR SELECT USING (true);

-- 10. Grant permissions to service role
-- (Supabase service role already has full access)

-- =====================================================
-- DONE! Your credits system tables are ready.
-- =====================================================
