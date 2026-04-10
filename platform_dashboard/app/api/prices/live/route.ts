import { NextResponse } from 'next/server';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  dayHigh?: number;
  dayLow?: number;
}

// Cache prices for 60 seconds to avoid rate limits
let priceCache: Map<string, { data: PriceData; timestamp: number }> = new Map();
const CACHE_TTL = 60000; // 60 seconds

function getYahooSymbol(symbol: string): string {
  // Indian stocks need .NS suffix
  if (!symbol.includes('.') && symbol.length > 4) {
    return `${symbol}.NS`;
  }
  return symbol;
}

async function fetchYahooPrices(symbols: string[]): Promise<Map<string, PriceData>> {
  const priceMap = new Map<string, PriceData>();
  
  // Check cache first
  const now = Date.now();
  const uncachedSymbols: string[] = [];
  
  for (const symbol of symbols) {
    const cached = priceCache.get(symbol);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      priceMap.set(symbol, cached.data);
    } else {
      uncachedSymbols.push(symbol);
    }
  }
  
  if (uncachedSymbols.length === 0) {
    return priceMap;
  }
  
  // Fetch uncached symbols in batches
  const batchSize = 10;
  for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
    const batch = uncachedSymbols.slice(i, i + batchSize);
    const yahooSymbols = batch.map(getYahooSymbol);
    
    try {
      // Use Yahoo Finance chart API (free, no auth)
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbols.join(',')}?interval=1d&range=1d`,
        { 
          headers: {
            'Accept': 'application/json',
          },
          next: { revalidate: 60 }
        }
      );
      
      if (!response.ok) {
        console.warn(`Price fetch failed: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.chart?.result) {
        for (const result of data.chart.result) {
          const meta = result.meta;
          const yahooSymbol = meta.symbol || meta.shortName;
          
          // Map back to original symbol
          const originalSymbol = batch.find(s => 
            yahooSymbol === getYahooSymbol(s) || 
            yahooSymbol === s ||
            yahooSymbol?.replace('.NS', '') === s
          ) || yahooSymbol?.replace('.NS', '');
          
          if (originalSymbol) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.previousClose || meta.chartPreviousClose;
            
            if (price && prevClose) {
              const change = price - prevClose;
              const changePercent = (change / prevClose) * 100;
              
              const priceData: PriceData = {
                price,
                change,
                changePercent,
                volume: meta.regularMarketVolume,
                dayHigh: meta.regularMarketDayHigh,
                dayLow: meta.regularMarketDayLow,
              };
              
              priceMap.set(originalSymbol, priceData);
              priceCache.set(originalSymbol, { data: priceData, timestamp: now });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
    
    // Small delay between batches
    if (i + batchSize < uncachedSymbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return priceMap;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    
    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'No symbols provided' },
        { status: 400 }
      );
    }
    
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'Empty symbols list' },
        { status: 400 }
      );
    }
    
    if (symbols.length > 50) {
      return NextResponse.json(
        { error: 'Too many symbols (max 50)' },
        { status: 400 }
      );
    }
    
    const prices = await fetchYahooPrices(symbols);
    
    // Convert map to object
    const priceObject: Record<string, PriceData> = {};
    prices.forEach((data, symbol) => {
      priceObject[symbol] = data;
    });
    
    return NextResponse.json({ 
      prices: priceObject,
      timestamp: new Date().toISOString(),
      count: prices.size
    });
    
  } catch (error) {
    console.error('Price API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
