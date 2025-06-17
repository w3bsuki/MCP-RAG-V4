import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance (only if API key is provided)
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
      typescript: true,
    })
  : null;

// Client-side Stripe promise
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Product configurations for CryptoVision Terminal
export const STRIPE_PRODUCTS = {
  FREE: {
    name: 'Free Forever',
    price: 0,
    priceId: null, // No Stripe price needed for free tier
    features: [
      '100 price checks/day',
      'Basic charts',
      '5 portfolio items',
      'Community support'
    ],
    limits: {
      predictionsPerDay: 100,
      portfolioItems: 5,
      chartTimeframes: ['24h', '7d'],
      apiCalls: 100
    }
  },
  PRO: {
    name: 'Pro',
    price: 1999, // $19.99 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    features: [
      'Unlimited AI predictions',
      'All AI features',
      'Unlimited portfolio',
      'Priority support',
      'Advanced charts',
      'Real-time alerts'
    ],
    limits: {
      predictionsPerDay: -1, // Unlimited
      portfolioItems: -1, // Unlimited
      chartTimeframes: ['24h', '7d', '30d', '90d', '1y'],
      apiCalls: -1 // Unlimited
    }
  },
  TEAM: {
    name: 'Team',
    price: 4999, // $49.99 in cents
    priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_placeholder',
    features: [
      '5 user accounts',
      'Shared portfolios',
      'API access',
      'Custom alerts',
      'White-label options',
      'Dedicated support'
    ],
    limits: {
      predictionsPerDay: -1, // Unlimited
      portfolioItems: -1, // Unlimited
      chartTimeframes: ['24h', '7d', '30d', '90d', '1y'],
      apiCalls: -1, // Unlimited
      teamMembers: 5
    }
  }
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRODUCTS;

// Helper functions
export function getProductByPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, product] of Object.entries(STRIPE_PRODUCTS)) {
    if (product.priceId === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return null;
}

export function canAccessFeature(userTier: SubscriptionTier, feature: string): boolean {
  const tierIndex = Object.keys(STRIPE_PRODUCTS).indexOf(userTier);
  
  // Feature access hierarchy: FREE < PRO < TEAM
  switch (feature) {
    case 'ai_predictions':
      return tierIndex >= 1; // PRO and above
    case 'unlimited_portfolio':
      return tierIndex >= 1; // PRO and above
    case 'api_access':
      return tierIndex >= 2; // TEAM only
    case 'team_features':
      return tierIndex >= 2; // TEAM only
    default:
      return true; // Basic features available to all
  }
}

export function getRemainingUsage(userTier: SubscriptionTier, currentUsage: number, feature: 'predictions' | 'portfolio' | 'apiCalls'): number {
  const limits = STRIPE_PRODUCTS[userTier].limits;
  
  switch (feature) {
    case 'predictions':
      return limits.predictionsPerDay === -1 ? -1 : Math.max(0, limits.predictionsPerDay - currentUsage);
    case 'portfolio':
      return limits.portfolioItems === -1 ? -1 : Math.max(0, limits.portfolioItems - currentUsage);
    case 'apiCalls':
      return limits.apiCalls === -1 ? -1 : Math.max(0, limits.apiCalls - currentUsage);
    default:
      return 0;
  }
}

// Webhook event types we handle
export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
} as const;