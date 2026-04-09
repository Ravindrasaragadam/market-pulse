import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface YahooFinanceResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// Search Yahoo Finance for stocks
async function searchYahooFinance(query: string): Promise<YahooFinanceResult[]> {
  try {
    // Yahoo Finance search endpoint
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Yahoo Finance search failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    // Filter for NSE/BSE stocks only and equity type
    const indianStocks = (data.quotes || []).filter((quote: any) => {
      const exchange = quote.exchange?.toUpperCase() || '';
      const type = quote.quoteType?.toUpperCase() || '';
      const symbol = quote.symbol || '';
      
      // Accept NSE, BSE, and .NS/.BO suffixed symbols
      const isIndianExchange = exchange === 'NSI' || exchange === 'BSE' || 
                               exchange === 'NSE' || symbol.endsWith('.NS') || 
                               symbol.endsWith('.BO');
      const isEquity = type === 'EQUITY' || type === 'MUTUALFUND';
      
      return isIndianExchange && isEquity;
    });

    return indianStocks.map((quote: any) => ({
      symbol: quote.symbol.replace(/\.NS$|\.BO$/, ''), // Remove .NS/.BO suffix
      name: quote.shortname || quote.longname || quote.name || '',
      exchange: quote.exchange === 'BSE' ? 'BSE' : 'NSE',
      type: quote.quoteType || 'EQUITY'
    }));
  } catch (error) {
    console.error('Yahoo Finance search error:', error);
    return [];
  }
}

// Insert new stocks into database
async function insertStocksToDB(stocks: YahooFinanceResult[]): Promise<void> {
  if (stocks.length === 0) return;

  try {
    // Check which symbols already exist
    const symbols = stocks.map(s => s.symbol);
    const { data: existingData } = await supabase
      .from('stock_symbols')
      .select('symbol')
      .in('symbol', symbols);

    const existingSymbols = new Set(existingData?.map(d => d.symbol) || []);
    
    // Filter out existing symbols
    const newStocks = stocks.filter(s => !existingSymbols.has(s.symbol));
    
    if (newStocks.length === 0) return;

    // Insert new stocks with basic info
    const stocksToInsert = newStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      sector: 'Unknown', // Will be populated later by background job
      industry: 'Unknown',
      market_cap_category: 'Unknown',
      is_active: true,
      metadata: { 
        source: 'yahoo_finance_search',
        discovered_at: new Date().toISOString(),
        type: stock.type
      }
    }));

    const { error } = await supabase
      .from('stock_symbols')
      .insert(stocksToInsert);

    if (error) {
      console.error('Error inserting stocks:', error);
    } else {
      console.log(`Inserted ${stocksToInsert.length} new stocks from Yahoo Finance`);
    }
  } catch (error) {
    console.error('Insert stocks error:', error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search local database first
    const { data: localResults, error: dbError } = await supabase
      .rpc('search_stocks', { search_query: query });

    if (dbError) {
      console.error('Local search error:', dbError);
    }

    const localStocks = localResults || [];

    // If local results are sparse, search Yahoo Finance
    let yahooResults: YahooFinanceResult[] = [];
    if (localStocks.length < 5) {
      yahooResults = await searchYahooFinance(query);
      
      // Insert Yahoo results to DB for future searches
      await insertStocksToDB(yahooResults);
    }

    // Combine and deduplicate results (local takes precedence)
    const localSymbols = new Set(localStocks.map((s: any) => s.symbol));
    const combinedResults = [
      ...localStocks,
      ...yahooResults.filter(y => !localSymbols.has(y.symbol)).map(y => ({
        symbol: y.symbol,
        name: y.name,
        sector: 'Unknown',
        industry: 'Unknown',
        exchange: y.exchange,
        market_cap_category: 'Unknown',
        is_new: true // Flag to show it's newly discovered
      }))
    ];

    // Sort: exact symbol matches first, then starts with, then contains
    const lowerQuery = query.toLowerCase();
    const sortedResults = combinedResults.sort((a: any, b: any) => {
      const aSym = a.symbol.toLowerCase();
      const bSym = b.symbol.toLowerCase();
      
      // Exact match
      if (aSym === lowerQuery && bSym !== lowerQuery) return -1;
      if (bSym === lowerQuery && aSym !== lowerQuery) return 1;
      
      // Starts with
      if (aSym.startsWith(lowerQuery) && !bSym.startsWith(lowerQuery)) return -1;
      if (bSym.startsWith(lowerQuery) && !aSym.startsWith(lowerQuery)) return 1;
      
      return 0;
    });

    return NextResponse.json({ 
      stocks: sortedResults.slice(0, 20), // Limit to 20 results
      source: {
        local: localStocks.length,
        yahoo: yahooResults.length
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
