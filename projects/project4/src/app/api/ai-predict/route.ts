import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { symbol, timeframe, currentPrice, marketData } = await request.json();

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { 
          error: 'AI predictions unavailable',
          fallback: true,
          prediction: {
            direction: marketData?.priceChange24h > 0 ? 'up' : 'down',
            confidence: 65,
            analysis: 'Using fallback prediction model. Configure ANTHROPIC_API_KEY for AI predictions.'
          }
        },
        { status: 200 }
      );
    }

    const prompt = `You are a cryptocurrency analyst. Analyze ${symbol} with current price $${currentPrice}.

Market data:
- 24h change: ${marketData?.priceChange24h || 0}%
- Volume: ${marketData?.volume24h || 'N/A'}
- Market cap: ${marketData?.marketCap || 'N/A'}

Provide a ${timeframe} price prediction in this exact JSON format:
{
  "direction": "up" or "down",
  "targetPrice": number,
  "confidence": number (0-100),
  "changePercent": number,
  "analysis": "brief analysis in 1-2 sentences",
  "factors": ["factor1", "factor2", "factor3"],
  "risk": "low", "medium", or "high"
}`;

    const { text } = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    // Parse the AI response
    const prediction = JSON.parse(text);

    return NextResponse.json({
      success: true,
      symbol,
      currentPrice,
      timeframe,
      prediction,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('AI Prediction Error:', error);
    
    // Return fallback prediction on error
    return NextResponse.json({
      error: 'Failed to generate prediction',
      fallback: true,
      prediction: {
        direction: 'neutral',
        confidence: 50,
        analysis: 'Unable to generate AI prediction at this time.'
      }
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'AI Prediction API',
    requiresApiKey: !process.env.ANTHROPIC_API_KEY,
    endpoints: {
      POST: '/api/ai-predict',
      body: {
        symbol: 'BTC',
        timeframe: '24h | 7d | 30d',
        currentPrice: 45000,
        marketData: {
          priceChange24h: 2.5,
          volume24h: 28000000000,
          marketCap: 880000000000
        }
      }
    }
  });
}