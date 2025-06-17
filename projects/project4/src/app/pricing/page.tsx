'use client';

import { Navigation } from '@/components/Navigation';
import { PricingCards } from '@/components/PricingCards';
import { type SubscriptionTier } from '@/lib/stripe';

export default function PricingPage() {
  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (tier === 'FREE') return;
    
    // In PAY-002, we'll implement the actual checkout flow
    // For now, just show an alert
    alert(`Selected ${tier} plan. Checkout flow will be implemented in PAY-002.`);
  };

  return (
    <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
      <main className="max-w-6xl mx-auto space-y-8">
        <Navigation />
        
        <PricingCards 
          onSelectPlan={handleSelectPlan}
        />

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <div className="border-2 border-terminal-darkgray p-4">
            <h3 className="text-lg font-bold mb-3">PAYMENT METHODS</h3>
            <div className="space-y-2 text-sm font-mono">
              <div>• Credit/Debit Cards (Visa, MasterCard, Amex)</div>
              <div>• PayPal</div>
              <div>• Apple Pay / Google Pay</div>
              <div>• Bank transfers (Team plan)</div>
            </div>
          </div>

          <div className="border-2 border-terminal-darkgray p-4">
            <h3 className="text-lg font-bold mb-3">SECURITY & PRIVACY</h3>
            <div className="space-y-2 text-sm font-mono">
              <div>• SSL encrypted payments</div>
              <div>• PCI DSS compliant</div>
              <div>• No data sharing with third parties</div>
              <div>• Cancel anytime, no questions asked</div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="border-2 border-terminal-darkgray p-6">
          <h3 className="text-xl font-bold mb-4">FREQUENTLY ASKED QUESTIONS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-bold text-terminal-green mb-2">Q: Can I change plans anytime?</div>
              <div className="mb-4">A: Yes, upgrade or downgrade instantly. Changes take effect immediately.</div>
              
              <div className="font-bold text-terminal-green mb-2">Q: What happens to my data if I downgrade?</div>
              <div className="mb-4">A: Your data is preserved. You'll just hit the free tier limits for new activity.</div>
            </div>
            
            <div>
              <div className="font-bold text-terminal-green mb-2">Q: Are predictions guaranteed to be accurate?</div>
              <div className="mb-4">A: No. AI predictions are for educational purposes only and not financial advice.</div>
              
              <div className="font-bold text-terminal-green mb-2">Q: Do you offer refunds?</div>
              <div className="mb-4">A: Yes, full refund within 30 days if you're not satisfied.</div>
            </div>
          </div>
        </div>

        {/* Terminal Footer */}
        <div className="text-center text-xs text-terminal-darkgray border-t-2 border-terminal-darkgray pt-4">
          <div className="font-mono">
            PRICING STATUS: CONFIGURED • STRIPE SDK: INSTALLED • 
            CHECKOUT FLOW: PENDING (PAY-002)
          </div>
        </div>
      </main>
    </div>
  );
}