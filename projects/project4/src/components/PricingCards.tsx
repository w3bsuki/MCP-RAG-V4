'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { STRIPE_PRODUCTS, type SubscriptionTier } from '@/lib/stripe';
import { getStripeMode } from '@/lib/stripe-mock';
import { useAuth } from '@/hooks/useAuth';

interface PricingCardsProps {
  currentTier?: SubscriptionTier;
  onSelectPlan?: (tier: SubscriptionTier) => void;
}

export function PricingCards({ currentTier: propCurrentTier, onSelectPlan }: PricingCardsProps) {
  const [isLoading, setIsLoading] = useState<SubscriptionTier | null>(null);
  const stripeMode = getStripeMode();
  const { user } = useAuth();
  
  // Use auth user tier or prop tier
  const currentTier = propCurrentTier || user?.tier || 'FREE';

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (tier === 'FREE' || tier === currentTier) return;
    
    setIsLoading(tier);
    try {
      // Create checkout session
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          userEmail: user?.email || 'demo@example.com',
          returnUrl: window.location.origin + '/pricing'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url, mode } = await response.json();
      
      if (url) {
        // Redirect to Stripe checkout or mock success page
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'FREE';
    return `$${(price / 100).toFixed(2)}`;
  };

  const getButtonText = (tier: SubscriptionTier) => {
    if (tier === currentTier) return 'CURRENT PLAN';
    if (tier === 'FREE') return 'DOWNGRADE';
    return isLoading === tier ? 'PROCESSING...' : 'UPGRADE NOW';
  };

  const getButtonVariant = (tier: SubscriptionTier) => {
    if (tier === currentTier) return 'outline' as const;
    if (tier === 'FREE') return 'destructive' as const;
    return 'default' as const;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center border-2 border-terminal-gray bg-terminal-gray text-terminal-black p-4">
        <div className="text-xs mb-2">████████████████████████████████████████████████</div>
        <h2 className="text-2xl font-bold mb-2">
          SUBSCRIPTION PLANS
        </h2>
        <p className="text-sm">
          CHOOSE YOUR CRYPTOVISION TERMINAL TIER
        </p>
        <div className="text-xs mt-2">████████████████████████████████████████████████</div>
      </div>

      {/* Mode Indicator */}
      <div className="text-center text-xs text-terminal-darkgray">
        MODE: {stripeMode.toUpperCase()} • 
        {stripeMode === 'mock' ? ' DEMO MODE (CONFIGURE STRIPE KEYS FOR LIVE PAYMENTS)' : ' LIVE PAYMENTS ENABLED'}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(STRIPE_PRODUCTS).map(([tier, product]) => {
          const isCurrentTier = tier === currentTier;
          const isPopular = tier === 'PRO';
          
          return (
            <Card 
              key={tier}
              className={`relative ${isPopular ? 'border-2 border-terminal-green' : 'border-2 border-terminal-darkgray'}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-terminal-green text-terminal-black px-3 py-1 text-xs font-bold">
                    MOST POPULAR
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-lg">
                  {product.name.toUpperCase()}
                  {isCurrentTier && (
                    <div className="text-xs text-terminal-green mt-1">• ACTIVE •</div>
                  )}
                </CardTitle>
                <div className="text-3xl font-bold font-mono">
                  {formatPrice(product.price)}
                  {product.price > 0 && <span className="text-sm">/month</span>}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Features */}
                <div className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div className="text-terminal-green mt-0.5">•</div>
                      <div className="font-mono">{feature}</div>
                    </div>
                  ))}
                </div>

                {/* Limits */}
                <div className="border-t-2 border-terminal-darkgray pt-3 text-xs font-mono text-terminal-darkgray">
                  <div>LIMITS:</div>
                  <div>• Predictions: {product.limits.predictionsPerDay === -1 ? 'Unlimited' : `${product.limits.predictionsPerDay}/day`}</div>
                  <div>• Portfolio: {product.limits.portfolioItems === -1 ? 'Unlimited' : `${product.limits.portfolioItems} items`}</div>
                  <div>• Charts: {product.limits.chartTimeframes.join(', ')}</div>
                  {(product.limits as any).teamMembers && (
                    <div>• Team: {(product.limits as any).teamMembers} members</div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  variant={getButtonVariant(tier as SubscriptionTier)}
                  className="w-full font-mono"
                  disabled={isLoading !== null || tier === currentTier}
                  onClick={() => handleSelectPlan(tier as SubscriptionTier)}
                >
                  {getButtonText(tier as SubscriptionTier)}
                </Button>

                {/* Demo Notice */}
                {stripeMode === 'mock' && tier !== 'FREE' && (
                  <div className="text-xs text-terminal-darkgray text-center">
                    Demo mode - no actual payment required
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-terminal-darkgray border-t-2 border-terminal-darkgray pt-4">
        <div className="font-mono">
          ALL PLANS INCLUDE: Terminal UI • Real-time data • Community access
          {stripeMode === 'live' && ' • 30-day money-back guarantee'}
        </div>
      </div>
    </div>
  );
}