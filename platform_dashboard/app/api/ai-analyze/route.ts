import { NextResponse } from 'next/server';

interface AIAnalysisRequest {
  symbol: string;
}

interface AIAnalysisResponse {
  analysis: {
    signal: string;
    confidence: number;
    reasoning: string;
    key_factors: string[];
    risk_level: string;
    time_horizon: string;
  };
}

// NVIDIA NIM API endpoint
const NVIDIA_NIM_API_URL = process.env.NVIDIA_NIM_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY;

export async function POST(request: Request) {
  try {
    const body: AIAnalysisRequest = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    if (!NVIDIA_NIM_API_KEY) {
      // Return mock analysis if no API key configured
      console.warn('NVIDIA_NIM_API_KEY not configured, returning mock analysis');
      return NextResponse.json(getMockAnalysis(symbol));
    }

    // Call NVIDIA NIM API
    const prompt = buildAnalysisPrompt(symbol);
    
    const response = await fetch(NVIDIA_NIM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-405b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a professional stock market analyst. Provide concise, actionable analysis in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`NVIDIA NIM API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('Empty response from AI');
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      // If not valid JSON, extract from text
      analysis = extractAnalysisFromText(analysisText);
    }

    return NextResponse.json({ analysis });

  } catch (error) {
    console.error('AI Analysis error:', error);
    // Return mock analysis on error
    return NextResponse.json(getMockAnalysis('UNKNOWN'));
  }
}

function buildAnalysisPrompt(symbol: string): string {
  return `Analyze the Indian stock ${symbol} for a short-term trading decision.

Provide a JSON response with this exact structure:
{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": number between 0 and 1,
  "reasoning": "2-3 sentence analysis explaining the signal",
  "key_factors": ["factor1", "factor2", "factor3"],
  "risk_level": "Low" or "Medium" or "High",
  "time_horizon": "Short-term (1-4 weeks)" or "Medium-term (1-3 months)"
}

Consider:
- Recent price momentum and technical indicators
- Sector trends in the Indian market
- Overall market sentiment (Nifty 50 direction)
- Volume and liquidity
- Risk-reward ratio

Be objective and data-driven. Provide only the JSON, no additional text.`;
}

function extractAnalysisFromText(text: string): AIAnalysisResponse['analysis'] {
  // Try to extract JSON from the text if it's wrapped in code blocks
  const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Fall through to default
    }
  }
  
  // Return default analysis if parsing fails
  return getMockAnalysis('UNKNOWN').analysis;
}

function getMockAnalysis(symbol: string): AIAnalysisResponse {
  return {
    analysis: {
      signal: 'BUY',
      confidence: 0.75,
      reasoning: `${symbol} shows positive momentum with strong sector tailwinds. Technical indicators suggest upward breakout potential in the near term. Volume profile supports continued price appreciation.`,
      key_factors: ['Strong momentum', 'Sector tailwinds', 'Technical breakout', 'Volume support'],
      risk_level: 'Medium',
      time_horizon: 'Short-term (1-4 weeks)'
    }
  };
}
