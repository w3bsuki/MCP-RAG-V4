// Mock Stripe products for development/demo when no Stripe keys are configured
export const MOCK_STRIPE_PRODUCTS = {
  pro: {
    id: 'prod_mock_pro',
    name: 'CryptoVision Pro',
    description: 'Unlimited AI predictions and advanced features',
    default_price: {
      id: 'price_mock_pro',
      unit_amount: 1999,
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    }
  },
  team: {
    id: 'prod_mock_team', 
    name: 'CryptoVision Team',
    description: '5 user accounts with shared portfolios and API access',
    default_price: {
      id: 'price_mock_team',
      unit_amount: 4999,
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    }
  }
};

export const MOCK_CUSTOMERS = {
  free_user: {
    id: 'cus_mock_free',
    email: 'free@example.com',
    metadata: {
      tier: 'FREE'
    }
  },
  pro_user: {
    id: 'cus_mock_pro',
    email: 'pro@example.com',
    metadata: {
      tier: 'PRO'
    },
    subscriptions: {
      data: [{
        id: 'sub_mock_pro',
        status: 'active',
        items: {
          data: [{
            price: MOCK_STRIPE_PRODUCTS.pro.default_price
          }]
        }
      }]
    }
  }
};

// Mock Stripe service for demo without real Stripe keys
export class MockStripeService {
  static createCheckoutSession(params: any) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
    return Promise.resolve({
      id: 'cs_mock_' + Date.now(),
      url: `${baseUrl}/checkout/success?session_id=cs_mock_demo`,
      payment_status: 'unpaid',
      mode: 'subscription'
    });
  }

  static retrieveSession(sessionId: string) {
    return Promise.resolve({
      id: sessionId,
      payment_status: 'paid',
      customer: 'cus_mock_' + Date.now(),
      subscription: 'sub_mock_' + Date.now(),
      mode: 'subscription',
      metadata: {
        tier: sessionId.includes('pro') ? 'PRO' : 'TEAM'
      }
    });
  }

  static createPortalSession(customerId: string) {
    return Promise.resolve({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/account?demo=portal`
    });
  }

  static retrieveSubscription(subscriptionId: string) {
    return Promise.resolve({
      id: subscriptionId,
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      items: {
        data: [{
          price: {
            id: 'price_mock_pro',
            unit_amount: 1999,
            recurring: { interval: 'month' }
          }
        }]
      }
    });
  }
}

// Helper to check if we're in mock mode
export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getStripeMode(): 'live' | 'mock' {
  return isStripeConfigured() ? 'live' : 'mock';
}