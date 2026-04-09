import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get watchlist with stock details and latest alerts
    const { data, error } = await supabase
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

    if (error) {
      console.error('Watchlist fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch watchlist' },
        { status: 500 }
      );
    }

    // Get latest alerts for these stocks
    const stockSymbols = data?.map((item: any) => item.stock_symbol) || [];
    
    let latestAlerts: any[] = [];
    if (stockSymbols.length > 0) {
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .in('stock_symbol', stockSymbols)
        .order('created_at', { ascending: false })
        .limit(50);
      
      latestAlerts = alertsData || [];
    }

    // Combine watchlist with alerts
    const watchlistWithAlerts = data?.map((item: any) => {
      const stockAlerts = latestAlerts.filter(
        (alert: any) => alert.stock_symbol === item.stock_symbol
      );
      const latestAlert = stockAlerts[0];

      return {
        symbol: item.stock_symbol,
        name: item.stock_symbols?.name,
        sector: item.stock_symbols?.sector,
        marketCapCategory: item.stock_symbols?.market_cap_category,
        priority: item.priority,
        notes: item.notes,
        addedAt: item.added_at,
        latestSignal: latestAlert?.signal_type || 'NEUTRAL',
        latestReason: latestAlert?.reasoning || '',
        alertCount: stockAlerts.length
      };
    }) || [];

    return NextResponse.json({ watchlist: watchlistWithAlerts });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
