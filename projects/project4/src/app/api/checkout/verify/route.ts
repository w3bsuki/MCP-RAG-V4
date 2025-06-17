import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { isStripeConfigured, MockStripeService } from '@/lib/stripe-mock';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Handle mock sessions
    if (!isStripeConfigured() || sessionId.includes('mock')) {
      const mockSession = await MockStripeService.retrieveSession(sessionId);
      return NextResponse.json({
        ...mockSession,
        mode: 'mock'
      });
    }

    // Retrieve real Stripe session
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    // Only return successful sessions
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: session.id,
      payment_status: session.payment_status,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata,
      mode: 'live'
    });

  } catch (error: any) {
    console.error('Session verification error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to verify session',
        details: error.message 
      },
      { status: 500 }
    );
  }
}