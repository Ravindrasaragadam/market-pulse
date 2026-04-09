-- Antigravity Pulse Database Schema

-- 1. Alerts Table (Stores buying signals and analysis)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL, -- BUY, SELL, NEUTRAL
    strength FLOAT, -- 0.0 to 1.0
    reasoning TEXT,
    accuracy_score FLOAT, -- Populated during evaluation
    is_aggregated BOOLEAN DEFAULT FALSE,
    metadata JSONB
);

-- 2. Market News Table (Stores news hits and sentiment)
CREATE TABLE IF NOT EXISTS market_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    headline TEXT NOT NULL,
    source TEXT,
    sentiment_score FLOAT,
    is_international BOOLEAN DEFAULT FALSE,
    is_aggregated BOOLEAN DEFAULT FALSE
);

-- 3. Aggregated Trends (Stores time-decayed data)
CREATE TABLE IF NOT EXISTS market_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type TEXT NOT NULL, -- HOUR, DAY, WEEK, MONTH
    avg_sentiment FLOAT,
    top_stocks JSONB, -- Array of symbols and counts
    summary TEXT
);

-- 4. User Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE NOT NULL,
    topics TEXT[], -- Selective topics
    notify_threshold FLOAT DEFAULT 2.0 -- Percent change to trigger alert
);

-- 5. Stored Procedure for Rolling Aggregation (Called daily)
CREATE OR REPLACE FUNCTION aggregate_stale_data()
RETURNS VOID AS $$
BEGIN
    -- This function summarizes news hits older than 7 days into a single trend record
    -- And deletes the raw entries to save space.
    INSERT INTO market_trends (period_start, period_end, period_type, avg_sentiment, summary)
    SELECT 
        date_trunc('day', created_at),
        date_trunc('day', created_at) + interval '1 day',
        'DAY',
        AVG(sentiment_score),
        'Aggregated automated summary'
    FROM market_news
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND is_aggregated = FALSE
    GROUP BY date_trunc('day', created_at);

    UPDATE market_news SET is_aggregated = TRUE WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Cleanup news older than 30 days
    DELETE FROM market_news WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
