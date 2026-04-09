-- Migration: Add stock signal fields to alerts table
-- This adds fields to store individual stock signals, fundamentals, and growth data

-- Add new columns to alerts table
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS stock_symbol TEXT,
ADD COLUMN IF NOT EXISTS signal_strength FLOAT,
ADD COLUMN IF NOT EXISTS fundamentals JSONB,
ADD COLUMN IF NOT EXISTS growth_data JSONB;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_alerts_stock_symbol ON alerts(stock_symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_signal_strength ON alerts(signal_strength);
