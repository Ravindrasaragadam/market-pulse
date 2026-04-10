import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const NVIDIA_API_KEY = process.env.NVIDIA_NIM_API_KEY || '';
const CACHE_TTL_HOURS = 3;

interface MarketAnalysis {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  highlights: string[];
  top_sectors: string[];
  key_insights: string[];
  timestamp: string;
}

async function fetchCachedAnalysis(market: string): Promise<MarketAnalysis | null> {
  const { data, error } = await supabase
    .from('market_ai_summary')
    .select('*')
    .eq('market', market)
    .single();

  if (error || !data) return null;

  // Check if cache is still valid
  const cacheTime = new Date(data.created_at).getTime();
  const now = Date.now();
  const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

  if (hoursDiff > CACHE_TTL_HOURS) {
    return null;
  }

  return data.analysis as MarketAnalysis;
}

async function saveMarketAnalysis(market: string, analysis: MarketAnalysis) {
  const { error } = await supabase
    .from('market_ai_summary')
    .upsert({
      market,
      analysis,
      summary_text: analysis.summary,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      highlights: analysis.highlights,
      top_sectors: analysis.top_sectors,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    });

  if (error) {
    console.error('Error saving market analysis:', error);
  }
}

async function callNVIDIAMarketAI(market: string): Promise<MarketAnalysis> {
  const marketName = market === 'INDIA' ? 'Indian stock market (Nifty 50, Sensex)' : 'US stock market (S&P 500, Nasdaq, Dow)';
  
  const prompt = `Provide a comprehensive ${marketName} market analysis for today.

Analyze the current market conditions and provide:
1. Overall market sentiment (bullish/bearish/neutral)
2. Key market highlights (3-5 bullet points about major movements)
3. Top performing sectors today
4. Key insights for traders
5. Confidence level (0-100)

Return ONLY JSON in this exact format:
{
  "summary": "2-3 sentence market overview",
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": 75,
  "highlights": [
    "Point 1 about market movement",
    "Point 2 about specific sector",
    "Point 3 about macro factors"
  ],
  "top_sectors": ["IT", "Banking", "Pharma"],
  "key_insights": [
    "Insight 1 for short-term traders",
    "Insight 2 for long-term investors"
  ]
}

Be specific, data-driven, and actionable. Include realistic sector names for ${marketName}.`;

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
          { role: 'system', content: 'You are a market analyst. Provide structured JSON output only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
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

    const analysis = JSON.parse(content) as MarketAnalysis;
    analysis.timestamp = new Date().toISOString();
    
    return analysis;
  } catch (error) {
    console.error('Market AI analysis error:', error);
    // Return fallback
    return {
      summary: `${market} market analysis temporarily unavailable. Please try again later.`,
      sentiment: 'neutral',
      confidence: 50,
      highlights: ['Market data being updated', 'Analysis in progress'],
      top_sectors: [],
      key_insights: ['Check individual stock pages for detailed analysis'],
      timestamp: new Date().toISOString(),
    };
  }
}

export async function POST(request: Request) {
  try {
    const { market = 'INDIA' } = await request.json();

    if (!['INDIA', 'US'].includes(market)) {
      return NextResponse.json(
        { error: 'Market must be INDIA or US' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await fetchCachedAnalysis(market);
    
    if (cached) {
      console.log(`[Market AI] Cache hit for ${market}`);
      return NextResponse.json({
        analysis: cached,
        cached: true,
        timestamp: cached.timestamp,
      });
    }

    // Call NVIDIA AI
    console.log(`[Market AI] Fetching from NVIDIA for ${market}`);
    const analysis = await callNVIDIAMarketAI(market);

    // Save to database
    await saveMarketAnalysis(market, analysis);

    return NextResponse.json({
      analysis,
      cached: false,
      timestamp: analysis.timestamp,
    });

  } catch (error) {
    console.error('Market analyze API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market') || 'INDIA';

  if (!['INDIA', 'US'].includes(market)) {
    return NextResponse.json(
      { error: 'Market must be INDIA or US' },
      { status: 400 }
    );
  }

  // Check database cache
  const cached = await fetchCachedAnalysis(market);

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
