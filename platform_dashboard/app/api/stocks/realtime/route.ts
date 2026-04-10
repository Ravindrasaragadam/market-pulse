import { NextResponse } from 'next/server';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

// In-memory cache for 60 seconds
const priceCache: Map<string, { data: PriceData; timestamp: number }> = new Map();
const CACHE_TTL = 60000; // 60 seconds

function getYahooSymbol(symbol: string): string {
  // Indian stocks need .NS suffix
  if (!symbol.includes('.') && symbol.length > 4) {
    return `${symbol}.NS`;
  }
  return symbol;
}

async function fetchYahooPrice(symbol: string): Promise<PriceData | null> {
  const yahooSymbol = getYahooSymbol(symbol);
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    
    // Get latest price from the array
    const prices = quote?.close || [];
    const volumes = quote?.volume || [];
    const latestPrice = prices[prices.length - 1] || meta.regularMarketPrice;
    const latestVolume = volumes[volumes.length - 1] || meta.regularMarketVolume;
    
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const change = latestPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      price: latestPrice,
      change,
      changePercent,
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      volume: latestVolume,
      avgVolume: meta.averageVolume || latestVolume,
      open: meta.regularMarketOpen || 0,
      previousClose,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol required' },
      { status: 400 }
    );
  }

  const now = Date.now();
  const cached = priceCache.get(symbol);

  // Return cached if fresh
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
    });
  }

  // Fetch fresh data
  const priceData = await fetchYahooPrice(symbol);

  if (!priceData) {
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }

  // Update cache
  priceCache.set(symbol, { data: priceData, timestamp: now });

  return NextResponse.json({
    ...priceData,
    cached: false,
  });
}
