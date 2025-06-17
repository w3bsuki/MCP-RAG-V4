import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { user } = AuthService.validateToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In a real app, this would come from a database
    // For demo, return mock usage based on user tier
    const mockUsage = {
      userId: user.id,
      date: new Date().toISOString().split('T')[0],
      predictions: user.tier === 'FREE' ? Math.floor(Math.random() * 50) : 0,
      apiCalls: user.tier === 'FREE' ? Math.floor(Math.random() * 30) : 0,
      portfolioItems: user.tier === 'FREE' ? Math.floor(Math.random() * 3) : 0
    };

    const limits = AuthService.getUsageLimits();

    const remaining = {
      predictions: limits.predictionsPerDay === -1 ? 'Unlimited' : Math.max(0, limits.predictionsPerDay - mockUsage.predictions),
      apiCalls: limits.apiCalls === -1 ? 'Unlimited' : Math.max(0, limits.apiCalls - mockUsage.apiCalls),
      portfolioItems: limits.portfolioItems === -1 ? 'Unlimited' : Math.max(0, limits.portfolioItems - mockUsage.portfolioItems)
    };

    return NextResponse.json({
      usage: mockUsage,
      limits,
      remaining,
      tier: user.tier
    });

  } catch (error: any) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { user } = AuthService.validateToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, amount = 1 } = await request.json();
    
    if (!['prediction', 'apiCall', 'portfolioItem'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // In a real app, increment usage in database
    // For demo, just return success
    
    return NextResponse.json({
      success: true,
      action,
      amount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Usage tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    );
  }
}