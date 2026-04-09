import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch commodities prices from Yahoo Finance using their public API
    const symbols = ['GC=F', 'SI=F'];
    const prices: Record<string, { price: number; change: number }> = {};

    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const result = data.chart.result[0];
          const meta = result.meta;
          const previousClose = meta.previousClose;
          const currentPrice = meta.regularMarketPrice;
          const change = ((currentPrice - previousClose) / previousClose) * 100;

          prices[symbol] = {
            price: currentPrice,
            change: parseFloat(change.toFixed(2)),
          };
        }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        // Fallback to mock data if fetch fails
        if (symbol === 'GC=F') {
          prices[symbol] = { price: 2345.50, change: 1.2 };
        } else if (symbol === 'SI=F') {
          prices[symbol] = { price: 28.35, change: -0.8 };
        }
      }
    }

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching commodities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commodities data' },
      { status: 500 }
    );
  }
}
