import { NextResponse } from 'next/server';

// Yahoo Finance quote endpoint
const YAHOO_FINANCE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Try NSE first, then BSE
    const nseSymbol = `${symbol.toUpperCase()}.NS`;
    const bseSymbol = `${symbol.toUpperCase()}.BO`;

    // Fetch from Yahoo Finance
    const response = await fetch(
      `${YAHOO_FINANCE_URL}/${nseSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      // Try BSE if NSE fails
      const bseResponse = await fetch(
        `${YAHOO_FINANCE_URL}/${bseSymbol}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (!bseResponse.ok) {
        return NextResponse.json(
          { error: 'Price data not available' },
          { status: 404 }
        );
      }

      const bseData = await bseResponse.json();
      return NextResponse.json(extractPriceData(bseData));
    }

    const data = await response.json();
    return NextResponse.json(extractPriceData(data));

  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}

function extractPriceData(data: any) {
  const result = data.chart?.result?.[0];
  if (!result) {
    return { price: 0, change: 0, changePercent: 0 };
  }

  const meta = result.meta;
  const price = meta.regularMarketPrice || 0;
  const previousClose = meta.previousClose || meta.regularMarketPreviousClose || price;
  const change = price - previousClose;
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

  return {
    price,
    change,
    changePercent,
    currency: meta.currency || 'INR',
    exchange: meta.exchangeName || 'NSE'
  };
}
