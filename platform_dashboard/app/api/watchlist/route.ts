import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to detect market type
function detectMarket(symbol: string): 'INDIA' | 'US' {
  // Indian stocks: .NS or .BO suffix, or 5+ chars (typical Indian patterns)
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'INDIA';
  // US stocks: 1-4 uppercase letters (common US pattern)
  if (symbol.length <= 4 && /^[A-Z]+$/.test(symbol)) return 'US';
  // Commodities and others default to US
  if (symbol.includes('=') || symbol.endsWith('.US')) return 'US';
  // Default to INDIA for longer symbols (common Indian pattern)
  return 'INDIA';
}

// Helper to get Yahoo Finance symbol
function getYahooSymbol(symbol: string, market: string): string {
  if (market === 'INDIA') {
    // Try NSE first, then BSE
    if (!symbol.includes('.')) {
      return `${symbol}.NS`;
    }
  }
  return symbol;
}

// Fetch stock prices from Yahoo Finance
async function fetchStockPrices(symbols: string[]): Promise<Map<string, { price: number; change: number; changePercent: number }>> {
  const priceMap = new Map();
  
  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    try {
      // Use Yahoo Finance API (free, no auth required)
      const symbolsParam = batch.join(',');
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbolsParam}?interval=1d&range=1d`,
        { next: { revalidate: 60 } } // Cache for 60 seconds
      );
      
      if (!response.ok) {
        console.warn(`Failed to fetch prices for batch: ${symbolsParam}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.chart?.result) {
        for (const result of data.chart.result) {
          const meta = result.meta;
          const symbol = meta.symbol?.replace('.NS', '').replace('.BO', '') || meta.shortName;
          const price = meta.regularMarketPrice;
          const prevClose = meta.previousClose || meta.chartPreviousClose;
          
          if (price && prevClose) {
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;
            priceMap.set(symbol, { price, change, changePercent });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
    
    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return priceMap;
}

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
          market_cap_category,
          exchange
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
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .in('stock_symbol', allSymbols)
        .order('created_at', { ascending: false })
        .limit(100);

      if (alertsError) {
        console.error('Alerts fetch error:', alertsError);
      }

      latestAlerts = alertsData || [];
    }

    // Fetch real-time prices
    const priceMap = await fetchStockPrices(allSymbols);

    // Create watchlist items with market separation
    const indiaStocks: any[] = [];
    const usStocks: any[] = [];

    allSymbols.forEach((symbol) => {
      const watchlistItem = watchlistData?.find((item: any) => item.stock_symbol === symbol);
      const stockInfo = stockDetailsMap.get(symbol);
      const stockAlerts = latestAlerts.filter(
        (alert: any) => alert.stock_symbol === symbol
      );
      const latestAlert = stockAlerts[0];
      const isFromAlert = alertSymbols.has(symbol) && !watchlistSymbols.has(symbol);
      
      // Detect market
      const market = detectMarket(symbol);
      
      // Get price data
      const priceData = priceMap.get(symbol);

      const stockItem = {
        symbol: symbol,
        name: stockInfo?.name || watchlistItem?.stock_symbols?.[0]?.name || symbol,
        sector: stockInfo?.sector || watchlistItem?.stock_symbols?.[0]?.sector || 'Unknown',
        marketCapCategory: stockInfo?.market_cap_category || watchlistItem?.stock_symbols?.[0]?.market_cap_category,
        market: market,
        priority: watchlistItem?.priority || (isFromAlert ? 5 : 0),
        notes: watchlistItem?.notes || (isFromAlert ? 'Alert triggered - added automatically' : ''),
        addedAt: watchlistItem?.added_at,
        latestSignal: latestAlert?.signal_type || 'NEUTRAL',
        latestReason: latestAlert?.reasoning || '',
        alertCount: stockAlerts.length,
        isAlertTriggered: isFromAlert,
        // Add real-time price data
        price: priceData?.price || 0,
        change: priceData?.change || 0,
        changePercent: priceData?.changePercent || 0,
      };

      // Separate by market
      if (market === 'INDIA') {
        indiaStocks.push(stockItem);
      } else {
        usStocks.push(stockItem);
      }
    });

    // Sort both lists: alert-triggered first, then by priority
    const sortFn = (a: any, b: any) => {
      if (a.isAlertTriggered && !b.isAlertTriggered) return -1;
      if (!a.isAlertTriggered && b.isAlertTriggered) return 1;
      return (b.priority || 0) - (a.priority || 0);
    };

    indiaStocks.sort(sortFn);
    usStocks.sort(sortFn);

    return NextResponse.json({ 
      watchlist: [...indiaStocks, ...usStocks],
      indiaStocks,
      usStocks,
      stats: {
        total: allSymbols.length,
        india: indiaStocks.length,
        us: usStocks.length
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
