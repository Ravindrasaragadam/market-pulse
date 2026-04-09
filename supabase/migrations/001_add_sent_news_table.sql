-- Migration: Add sent_news table for news deduplication
-- This table tracks news items that have already been sent to avoid duplicates

-- Create sent_news table
CREATE TABLE IF NOT EXISTS sent_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headline TEXT NOT NULL,
    link TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(headline, link)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sent_news_headline ON sent_news(headline);
CREATE INDEX IF NOT EXISTS idx_sent_news_sent_at ON sent_news(sent_at);
