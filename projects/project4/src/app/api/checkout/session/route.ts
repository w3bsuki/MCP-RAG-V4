import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRODUCTS, type SubscriptionTier } from '@/lib/stripe';
import { isStripeConfigured, MockStripeService } from '@/lib/stripe-mock';

export async function POST(request: NextRequest) {
  try {
    const { tier, userEmail, returnUrl } = await request.json();

    // Validate tier
    if (!tier || !STRIPE_PRODUCTS[tier as SubscriptionTier]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const product = STRIPE_PRODUCTS[tier as SubscriptionTier];
    
    // Free tier doesn't need checkout
    if (tier === 'FREE') {
      return NextResponse.json(
        { error: 'Free tier does not require checkout' },
        { status: 400 }
      );
    }

    const baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
    
    // Mock mode when Stripe keys not configured
    if (!isStripeConfigured()) {
      const mockSession = await MockStripeService.createCheckoutSession({
        tier,
        userEmail: userEmail || 'demo@example.com',
        returnUrl: returnUrl || `${baseUrl}/pricing`
      });

      return NextResponse.json({
        sessionId: mockSession.id,
        url: mockSession.url,
        mode: 'mock'
      });
    }

    // Real Stripe checkout session
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    
    // Ensure we have a valid price ID for paid tiers
    if (!product.priceId) {
      throw new Error('Invalid price configuration for tier');
    }
    
    const session = await stripe!.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      customer_email: userEmail || undefined,
      metadata: {
        tier,
        userEmail: userEmail || 'unknown'
      },
      subscription_data: {
        metadata: {
          tier,
          userEmail: userEmail || 'unknown'
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false } // Enable if you have tax calculation setup
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      mode: 'live'
    });

  } catch (error: any) {
    console.error('Checkout session error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/checkout/session',
    method: 'POST',
    description: 'Create Stripe checkout session for subscription',
    body: {
      tier: 'PRO | TEAM',
      userEmail: 'user@example.com (optional)',
      returnUrl: 'https://yourdomain.com/pricing (optional)'
    },
    modes: {
      live: 'Real Stripe integration (requires API keys)',
      mock: 'Demo mode for testing (no payment required)'
    },
    currentMode: isStripeConfigured() ? 'live' : 'mock'
  });
}