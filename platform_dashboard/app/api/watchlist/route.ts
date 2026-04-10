import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get recent alerts (last 48 hours) with stock symbols
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: alertStocks, error: alertError } = await supabase
      .from('alerts')
      .select('stock_symbol')
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: false });

    if (alertError) {
      console.error('Alert stocks fetch error:', alertError);
    }

    // Get watchlist with stock details
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('user_watchlist')
      .select(`
        stock_symbol,
        priority,
        notes,
        added_at,
        stock_symbols:stock_symbol (
          symbol,
          name,
          sector,
          industry,
          market_cap_category
        )
      `)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (watchlistError) {
      console.error('Watchlist fetch error:', watchlistError);
      return NextResponse.json(
        { error: 'Failed to fetch watchlist' },
        { status: 500 }
      );
    }

    // Combine watchlist symbols with alert-triggered symbols
    const watchlistSymbols = new Set(watchlistData?.map((item: any) => item.stock_symbol) || []);
    const alertSymbols = new Set(alertStocks?.map((item: any) => item.stock_symbol) || []);
    
    // Get all unique symbols
    const allSymbols = Array.from(new Set([...watchlistSymbols, ...alertSymbols]));

    // Get stock details for all symbols
    const { data: stockDetails, error: stockError } = await supabase
      .from('stock_symbols')
      .select('*')
      .in('symbol', allSymbols);

    if (stockError) {
      console.error('Stock details fetch error:', stockError);
    }

    const stockDetailsMap = new Map(stockDetails?.map((s: any) => [s.symbol, s]) || []);

    // Get latest alerts for all these stocks
    let latestAlerts: any[] = [];
    if (allSymbols.length > 0) {
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .in('stock_symbol', allSymbols)
        .order('created_at', { ascending: false })
        .limit(100);
      
      latestAlerts = alertsData || [];
    }

    // Create watchlist items
    const watchlistWithAlerts = allSymbols.map((symbol) => {
      const watchlistItem = watchlistData?.find((item: any) => item.stock_symbol === symbol);
      const stockInfo = stockDetailsMap.get(symbol);
      const stockAlerts = latestAlerts.filter(
        (alert: any) => alert.stock_symbol === symbol
      );
      const latestAlert = stockAlerts[0];
      const isFromAlert = alertSymbols.has(symbol) && !watchlistSymbols.has(symbol);

      return {
        symbol: symbol,
        name: stockInfo?.name || watchlistItem?.stock_symbols?.name,
        sector: stockInfo?.sector || watchlistItem?.stock_symbols?.sector,
        marketCapCategory: stockInfo?.market_cap_category || watchlistItem?.stock_symbols?.market_cap_category,
        priority: watchlistItem?.priority || (isFromAlert ? 5 : 0), // High priority for alert stocks
        notes: watchlistItem?.notes || (isFromAlert ? 'Alert triggered - added automatically' : ''),
        addedAt: watchlistItem?.added_at,
        latestSignal: latestAlert?.signal_type || 'NEUTRAL',
        latestReason: latestAlert?.reasoning || '',
        alertCount: stockAlerts.length,
        isAlertTriggered: isFromAlert
      };
    });

    // Sort: alert-triggered first, then by priority
    watchlistWithAlerts.sort((a: any, b: any) => {
      if (a.isAlertTriggered && !b.isAlertTriggered) return -1;
      if (!a.isAlertTriggered && b.isAlertTriggered) return 1;
      return (b.priority || 0) - (a.priority || 0);
    });

    return NextResponse.json({ watchlist: watchlistWithAlerts });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
