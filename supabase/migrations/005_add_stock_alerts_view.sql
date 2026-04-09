-- Migration: Add enhanced stock alerts view and improve alert metadata

-- 1. Create view joining alerts with stock symbols for enhanced display
CREATE OR REPLACE VIEW stock_alerts_enhanced AS
SELECT 
    a.id,
    a.created_at,
    a.symbol as alert_type,
    a.signal_type,
    a.reasoning,
    a.strength,
    a.signal_strength,
    a.stock_symbol,
    a.metadata,
    a.fundamentals,
    a.growth_data,
    s.name as stock_name,
    s.sector,
    s.industry,
    s.market_cap_category,
    COALESCE(a.metadata->>'focus_areas', s.sector) as focus_areas
FROM alerts a
LEFT JOIN stock_symbols s ON a.stock_symbol = s.symbol
WHERE a.stock_symbol IS NOT NULL;

-- 2. Function to get latest stock alerts with full details
CREATE OR REPLACE FUNCTION get_latest_stock_alerts(
    p_market TEXT DEFAULT 'INDIA',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    stock_symbol TEXT,
    stock_name TEXT,
    signal_type TEXT,
    reasoning TEXT,
    focus_areas TEXT,
    sector TEXT,
    signal_strength FLOAT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id,
        sa.stock_symbol,
        COALESCE(sa.stock_name, sa.stock_symbol) as stock_name,
        sa.signal_type,
        sa.reasoning,
        sa.focus_areas,
        sa.sector,
        COALESCE(sa.signal_strength, 0.5) as signal_strength,
        sa.created_at
    FROM stock_alerts_enhanced sa
    WHERE sa.alert_type = p_market || '_STOCK'
    ORDER BY sa.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get user's watchlist with latest alerts
CREATE OR REPLACE FUNCTION get_watchlist_with_alerts(
    p_user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID
)
RETURNS TABLE (
    symbol TEXT,
    name TEXT,
    sector TEXT,
    market_cap_category TEXT,
    priority INTEGER,
    added_at TIMESTAMPTZ,
    latest_signal TEXT,
    latest_reason TEXT,
    alert_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.symbol,
        s.name,
        s.sector,
        s.market_cap_category,
        uw.priority,
        uw.added_at,
        latest.signal_type as latest_signal,
        latest.reasoning as latest_reason,
        COUNT(a.id) as alert_count
    FROM user_watchlist uw
    JOIN stock_symbols s ON uw.stock_symbol = s.symbol
    LEFT JOIN alerts a ON a.stock_symbol = s.symbol
    LEFT JOIN LATERAL (
        SELECT signal_type, reasoning
        FROM alerts
        WHERE stock_symbol = s.symbol
        ORDER BY created_at DESC
        LIMIT 1
    ) latest ON true
    WHERE uw.user_id = p_user_id
        AND uw.is_active = true
    GROUP BY s.symbol, s.name, s.sector, s.market_cap_category, uw.priority, uw.added_at, latest.signal_type, latest.reasoning
    ORDER BY uw.priority DESC, uw.added_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Add trigger to auto-populate stock_symbol in alerts from metadata if missing
CREATE OR REPLACE FUNCTION populate_stock_symbol_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- If stock_symbol is null but metadata contains symbol, extract it
    IF NEW.stock_symbol IS NULL AND NEW.metadata IS NOT NULL THEN
        NEW.stock_symbol := NEW.metadata->>'symbol';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_stock_symbol ON alerts;
CREATE TRIGGER trigger_populate_stock_symbol
    BEFORE INSERT OR UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION populate_stock_symbol_from_metadata();
