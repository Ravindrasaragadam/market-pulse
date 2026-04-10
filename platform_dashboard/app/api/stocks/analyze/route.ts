import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const NVIDIA_API_KEY = process.env.NVIDIA_NIM_API_KEY || '';
const CACHE_TTL_HOURS = 3;

interface AIAnalysis {
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  highlights: string[];
  sentiment: string;
  investment_horizon: 'SHORT_TERM' | 'LONG_TERM';
  stop_loss: number;
  target: number;
  fundamentals_summary: {
    pe_ratio: number;
    eps: number;
    book_value: number;
    dividend_yield: number;
    roe: number;
    debt_equity: number;
  };
  technical_summary: {
    rsi: number;
    trend: string;
    support: number;
    resistance: number;
  };
  recent_news_summary: string;
  related_stocks: string[];
  timestamp: string;
}

async function fetchCachedAnalysis(symbol: string): Promise<AIAnalysis | null> {
  const { data, error } = await supabase
    .from('stock_analysis_cache')
    .select('*')
    .eq('symbol', symbol)
    .single();

  if (error || !data) return null;

  // Check if cache is still valid (within 3 hours)
  const cacheTime = new Date(data.created_at).getTime();
  const now = Date.now();
  const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

  if (hoursDiff > CACHE_TTL_HOURS) {
    // Cache expired
    return null;
  }

  return data.analysis as AIAnalysis;
}

async function saveAnalysisToCache(symbol: string, analysis: AIAnalysis) {
  const { error } = await supabase
    .from('stock_analysis_cache')
    .upsert({
      symbol,
      analysis,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving analysis cache:', error);
  }
}

async function saveFundamentals(symbol: string, analysis: AIAnalysis) {
  const { error } = await supabase
    .from('stock_fundamentals')
    .upsert({
      symbol: symbol.toUpperCase(),
      // Fundamentals
      pe_ratio: analysis.fundamentals_summary?.pe_ratio,
      eps: analysis.fundamentals_summary?.eps,
      book_value: analysis.fundamentals_summary?.book_value,
      dividend_yield: analysis.fundamentals_summary?.dividend_yield,
      roe: analysis.fundamentals_summary?.roe,
      debt_equity: analysis.fundamentals_summary?.debt_equity,
      // Technical indicators
      rsi: analysis.technical_summary?.rsi,
      trend: analysis.technical_summary?.trend,
      support: analysis.technical_summary?.support,
      resistance: analysis.technical_summary?.resistance,
      // Analysis results
      signal: analysis.signal,
      confidence: analysis.confidence,
      investment_horizon: analysis.investment_horizon,
      stop_loss: analysis.stop_loss,
      target: analysis.target,
      highlights: analysis.highlights,
      sentiment: analysis.sentiment,
      recent_news_summary: analysis.recent_news_summary,
      related_stocks: analysis.related_stocks,
      // Timestamps
      analyzed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
    });

  if (error) {
    console.error('Error saving fundamentals:', error);
  } else {
    console.log(`[Fundamentals] Saved for ${symbol}`);
  }
}

async function saveSignalAlert(symbol: string, analysis: AIAnalysis) {
  // Only save if signal is BUY or SELL (not NEUTRAL)
  if (analysis.signal === 'NEUTRAL') {
    return;
  }

  const { error } = await supabase
    .from('alerts')
    .insert({
      symbol: symbol.toUpperCase(),
      stock_symbol: symbol.toUpperCase(),
      signal_type: analysis.signal,
      reasoning: `${analysis.sentiment}\n\nHighlights:\n${analysis.highlights?.join('\n') || 'N/A'}`,
      strength: analysis.confidence / 100,
      signal_strength: analysis.confidence / 100,
      stop_loss: analysis.stop_loss,
      target: analysis.target,
      metadata: {
        investment_horizon: analysis.investment_horizon,
        technical_summary: analysis.technical_summary,
        analyzed_at: analysis.timestamp,
      },
      fundamentals: analysis.fundamentals_summary,
    });

  if (error) {
    console.error('Error saving signal alert:', error);
  } else {
    console.log(`[Signal Alert] Saved ${analysis.signal} for ${symbol}`);
  }
}

async function saveNewsItems(symbol: string, analysis: AIAnalysis) {
  // Create a news item from the news summary
  if (!analysis.recent_news_summary || analysis.recent_news_summary === 'News analysis unavailable') {
    return;
  }

  const { error } = await supabase
    .from('market_news')
    .insert({
      headline: `[${symbol}] ${analysis.recent_news_summary.substring(0, 200)}`,
      source: 'AI Analysis',
      sentiment_score: analysis.signal === 'BUY' ? 0.7 : analysis.signal === 'SELL' ? -0.7 : 0,
      is_international: false,
    });

  if (error) {
    console.error('Error saving news:', error);
  } else {
    console.log(`[News] Saved for ${symbol}`);
  }
}

async function callNVIDIAAI(symbol: string, market: string): Promise<AIAnalysis> {
  const prompt = `Analyze ${symbol} (${market} stock) for trading decision. 

Provide comprehensive analysis in JSON format:
{
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "confidence": 0-100,
  "highlights": ["3-5 key points about the stock"],
  "sentiment": "bullish/bearish/neutral with explanation",
  "investment_horizon": "SHORT_TERM" | "LONG_TERM",
  "stop_loss": price number,
  "target": price number,
  "fundamentals_summary": {
    "pe_ratio": number,
    "eps": number,
    "book_value": number,
    "dividend_yield": number,
    "roe": number,
    "debt_equity": number
  },
  "technical_summary": {
    "rsi": 0-100,
    "trend": "upward/downward/sideways",
    "support": number,
    "resistance": number
  },
  "recent_news_summary": "summary of recent news sentiment",
  "related_stocks": ["4-5 related stocks"]
}

Be specific and data-driven. Include realistic numbers.`;

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-405b-instruct',
        messages: [
          { role: 'system', content: 'You are a financial analyst. Provide structured JSON output only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from AI');
    }

    const analysis = JSON.parse(content) as AIAnalysis;
    analysis.timestamp = new Date().toISOString();
    
    return analysis;
  } catch (error) {
    console.error('AI analysis error:', error);
    // Return fallback analysis
    return {
      signal: 'NEUTRAL',
      confidence: 50,
      highlights: ['Analysis temporarily unavailable'],
      sentiment: 'neutral',
      investment_horizon: 'LONG_TERM',
      stop_loss: 0,
      target: 0,
      fundamentals_summary: {
        pe_ratio: 0,
        eps: 0,
        book_value: 0,
        dividend_yield: 0,
        roe: 0,
        debt_equity: 0,
      },
      technical_summary: {
        rsi: 50,
        trend: 'sideways',
        support: 0,
        resistance: 0,
      },
      recent_news_summary: 'News analysis unavailable',
      related_stocks: [],
      timestamp: new Date().toISOString(),
    };
  }
}

export async function POST(request: Request) {
  try {
    const { symbol, market = 'INDIA' } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await fetchCachedAnalysis(symbol);
    
    if (cached) {
      console.log(`[AI Analysis] Cache hit for ${symbol}`);
      return NextResponse.json({
        analysis: cached,
        cached: true,
        timestamp: cached.timestamp,
      });
    }

    // Call NVIDIA AI
    console.log(`[AI Analysis] Fetching from NVIDIA for ${symbol}`);
    const analysis = await callNVIDIAAI(symbol, market);

    // Save to multiple tables for persistence
    await Promise.all([
      saveAnalysisToCache(symbol, analysis),
      saveFundamentals(symbol, analysis),
      saveSignalAlert(symbol, analysis),
      saveNewsItems(symbol, analysis),
    ]);

    return NextResponse.json({
      analysis,
      cached: false,
      timestamp: analysis.timestamp,
    });

  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
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

  // Just check cache, don't generate new
  const cached = await fetchCachedAnalysis(symbol);

  if (cached) {
    return NextResponse.json({
      analysis: cached,
      cached: true,
      timestamp: cached.timestamp,
    });
  }

  return NextResponse.json(
    { error: 'No cached analysis found' },
    { status: 404 }
  );
}
