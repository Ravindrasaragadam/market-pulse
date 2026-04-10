-- Create table for market-wide AI summary
CREATE TABLE IF NOT EXISTS market_ai_summary (
  id SERIAL PRIMARY KEY,
  market TEXT NOT NULL, -- 'INDIA' or 'US'
  analysis JSONB NOT NULL,
  summary_text TEXT,
  sentiment TEXT, -- bullish, bearish, neutral
  confidence INTEGER, -- 0-100
  highlights JSONB, -- Array of key market highlights
  top_sectors JSONB, -- Array of top performing sectors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '3 hours',
  UNIQUE(market)
);

-- Create index for expiration
CREATE INDEX IF NOT EXISTS idx_market_ai_summary_expires 
  ON market_ai_summary(expires_at);

-- Create index for market lookups
CREATE INDEX IF NOT EXISTS idx_market_ai_summary_market 
  ON market_ai_summary(market);

-- Add comment
COMMENT ON TABLE market_ai_summary IS 
'Stores AI-generated market-wide summary for INDIA and US markets.
Refreshes every 3 hours. Used for dashboard landing page overview.';

-- Function to clean expired market summaries
CREATE OR REPLACE FUNCTION clean_expired_market_summaries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM market_ai_summary 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
