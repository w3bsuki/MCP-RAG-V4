import { NextRequest, NextResponse } from 'next/server';
import { ClaudeService } from '@/services/claude/ClaudeService';
import { AuthService } from '@/lib/auth';
import { UsageTracker } from '@/lib/usage-tracker';

interface RouteParams {
  params: Promise<{ symbol: string }>;
}

// Auth using AuthService
function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { user, isPremium } = AuthService.validateToken(authHeader);
  return { 
    authenticated: !!user, 
    isPremium,
    user 
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { symbol } = await params;
    const body = await request.json();
    const { timeframe = '24h' } = body;

    // Check authentication
    const auth = checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check usage limits (server-side validation)
    if (!auth.isPremium) {
      // For demo purposes, we'll do basic validation here
      // In production, you'd track usage in a database
      const usageCheck = UsageTracker.canPerformAction('prediction');
      if (!usageCheck.allowed) {
        return NextResponse.json(
          { 
            error: 'Usage limit exceeded',
            reason: usageCheck.reason,
            upgrade: usageCheck.upgrade
          },
          { status: 429 }
        );
      }
    }

    // Get current market data (in production, fetch from CoinGecko)
    const mockMarketData = {
      bitcoin: { price: 45230, change24h: 2.5, volume: 28000000000, marketCap: 880000000000 },
      ethereum: { price: 2845, change24h: 1.8, volume: 15000000000, marketCap: 340000000000 },
      solana: { price: 102.45, change24h: 3.2, volume: 2000000000, marketCap: 44000000000 }
    };

    const marketData = mockMarketData[symbol as keyof typeof mockMarketData] || {
      price: 100,
      change24h: 0,
      volume: 1000000,
      marketCap: 10000000
    };

    // Free tier gets basic predictions
    if (!auth.isPremium) {
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        timeframe,
        prediction: {
          direction: marketData.change24h > 0 ? 'up' : 'down',
          confidence: 60,
          analysis: 'Basic trend analysis. Upgrade to premium for AI-powered predictions.',
          premium: false
        },
        currentPrice: marketData.price,
        generatedAt: new Date().toISOString()
      });
    }

    // Premium tier gets AI predictions using ClaudeService
    const claudeService = new ClaudeService();
    
    const predictionRequest = {
      symbol: symbol.toLowerCase(),
      currentPrice: marketData.price,
      timeframe: timeframe as '24h' | '7d' | '30d',
      marketData: {
        priceChange24h: marketData.change24h,
        volume24h: marketData.volume,
        marketCap: marketData.marketCap
      }
    };

    const aiResponse = await claudeService.getPricePrediction(predictionRequest);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      timeframe,
      prediction: {
        ...aiResponse.prediction,
        premium: true
      },
      currentPrice: marketData.price,
      marketData,
      cached: aiResponse.cached,
      generatedAt: aiResponse.generatedAt
    });

  } catch (error: any) {
    console.error('Prediction API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prediction', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { symbol } = await params;
  
  return NextResponse.json({
    endpoint: `/api/predictions/${symbol}`,
    method: 'POST',
    description: 'Get AI-powered price predictions for cryptocurrency',
    authentication: 'Required (Bearer token)',
    body: {
      timeframe: '24h | 7d | 30d (optional, default: 24h)'
    },
    tiers: {
      free: 'Basic trend analysis',
      premium: 'AI-powered predictions with Claude'
    }
  });
}