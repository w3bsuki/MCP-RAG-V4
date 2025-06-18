'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CheckoutSession {
  id: string;
  payment_status: string;
  customer: string;
  subscription?: string;
  metadata: {
    tier: string;
  };
  mode: string;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to verify session');
        }
        const data = await response.json();
        setSession(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
        <main className="max-w-4xl mx-auto space-y-8">
          <Navigation />
          <div className="text-center py-16">
            <pre className="text-terminal-green text-xs mb-4">
{`     ▄▄▄▄▄▄▄▄▄▄▄
    ███████████
    ███████████
    ███████████
    ███████████
    ███████████`}
            </pre>
            <div className="text-terminal-green font-mono">
              VERIFYING PAYMENT...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
        <main className="max-w-4xl mx-auto space-y-8">
          <Navigation />
          <Card>
            <CardHeader>
              <CardTitle className="text-terminal-red">PAYMENT ERROR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm font-mono">
                  {error || 'Unable to verify payment session'}
                </div>
                <Link href="/pricing">
                  <Button variant="outline" className="font-mono">
                    RETURN TO PRICING
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isDemo = session.mode === 'mock' || sessionId?.includes('mock');

  return (
    <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
      <main className="max-w-4xl mx-auto space-y-8">
        <Navigation />
        
        {/* Success Header */}
        <div className="text-center border-2 border-terminal-green bg-terminal-green text-terminal-black p-6">
          <div className="text-xs mb-2">████████████████████████████████████████████████</div>
          <h1 className="text-3xl font-bold mb-2">
            {isDemo ? 'DEMO UPGRADE SUCCESS' : 'PAYMENT SUCCESSFUL'}
          </h1>
          <p className="text-lg">
            WELCOME TO CRYPTOVISION {session.metadata.tier}
          </p>
          <div className="text-xs mt-2">████████████████████████████████████████████████</div>
        </div>

        {/* Success Details */}
        <Card>
          <CardHeader>
            <CardTitle>SUBSCRIPTION DETAILS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div>
                <div className="text-terminal-darkgray">PLAN</div>
                <div className="text-terminal-green font-bold">{session.metadata.tier}</div>
              </div>
              <div>
                <div className="text-terminal-darkgray">STATUS</div>
                <div className="text-terminal-green">ACTIVE</div>
              </div>
              <div>
                <div className="text-terminal-darkgray">SESSION ID</div>
                <div className="text-xs">{session.id}</div>
              </div>
              <div>
                <div className="text-terminal-darkgray">MODE</div>
                <div className={isDemo ? "text-terminal-red" : "text-terminal-green"}>
                  {isDemo ? 'DEMO' : 'LIVE'}
                </div>
              </div>
            </div>

            {isDemo && (
              <div className="border-2 border-terminal-red p-3 text-xs">
                <div className="text-terminal-red font-bold mb-2">DEMO MODE NOTICE:</div>
                <div>This is a demonstration. No actual payment was processed. Configure Stripe API keys for live payments.</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>WHAT'S NEXT?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/ai">
                  <Button className="w-full font-mono">
                    START USING AI PREDICTIONS
                  </Button>
                </Link>
                <Link href="/portfolio">
                  <Button variant="outline" className="w-full font-mono">
                    MANAGE YOUR PORTFOLIO
                  </Button>
                </Link>
              </div>
              
              <div className="text-xs text-terminal-darkgray text-center mt-6">
                Questions? Contact support at support@cryptovision.com
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terminal Footer */}
        <div className="text-center text-xs text-terminal-darkgray border-t-2 border-terminal-darkgray pt-4">
          <div className="font-mono">
            SUBSCRIPTION STATUS: ACTIVE • FEATURES: UNLOCKED • 
            {isDemo ? 'MODE: DEMO' : 'BILLING: AUTOMATED'}
          </div>
        </div>
      </main>
    </div>
  );
}