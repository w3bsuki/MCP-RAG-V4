'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsageTracker } from '@/lib/usage-tracker';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export function UsageDisplay() {
  const { user, isPremium } = useAuth();
  const [usage, setUsage] = useState(UsageTracker.getTodayUsage());
  const [remaining, setRemaining] = useState(UsageTracker.getRemainingUsage());
  const [percentages, setPercentages] = useState(UsageTracker.getUsagePercentages());

  useEffect(() => {
    const updateUsage = () => {
      setUsage(UsageTracker.getTodayUsage());
      setRemaining(UsageTracker.getRemainingUsage());
      setPercentages(UsageTracker.getUsagePercentages());
    };

    updateUsage();
    
    // Update every 30 seconds
    const interval = setInterval(updateUsage, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>USAGE TRACKING</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-terminal-darkgray mb-2">LOGIN TO TRACK USAGE</div>
            <div className="text-xs">Sign in to see your API usage and limits</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getUsageBarColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-terminal-red';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-terminal-green';
  };

  const formatUsageValue = (value: number | string): string => {
    return typeof value === 'number' ? value.toString() : value;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>DAILY USAGE LIMITS</CardTitle>
        {!isPremium && (
          <Link href="/pricing">
            <Button variant="outline" size="sm" className="font-mono text-xs">
              UPGRADE
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier Status */}
        <div className="border-2 border-terminal-darkgray p-3 shadow-sunken bg-terminal-black">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-mono text-terminal-white">► PLAN:</span>
            <span className={`font-bold font-mono ${isPremium ? 'text-terminal-green' : 'text-terminal-red'}`}>
              [{user.tier}]
            </span>
          </div>
          {!isPremium && (
            <div className="text-xs text-terminal-darkgray">
              ► UPGRADE TO PRO FOR UNLIMITED USAGE
            </div>
          )}
        </div>

        {/* Usage Metrics */}
        <div className="space-y-3">
          {/* Predictions */}
          <div>
            <div className="flex justify-between text-sm font-mono mb-1">
              <span>AI PREDICTIONS</span>
              <span>{usage.predictions} / {formatUsageValue(remaining.predictions) === 'Unlimited' ? '∞' : `${usage.predictions + (remaining.predictions as number)}`}</span>
            </div>
            {typeof remaining.predictions === 'number' && (
              <div className="w-full bg-terminal-black border-2 border-terminal-darkgray h-4 shadow-sunken">
                <div 
                  className={`h-full ${getUsageBarColor(percentages.predictions)} shadow-raised`}
                  style={{ width: `${Math.min(100, percentages.predictions)}%` }}
                />
              </div>
            )}
            <div className="text-xs text-terminal-darkgray mt-1">
              Remaining: {formatUsageValue(remaining.predictions)}
            </div>
          </div>

          {/* API Calls */}
          <div>
            <div className="flex justify-between text-sm font-mono mb-1">
              <span>API CALLS</span>
              <span>{usage.apiCalls} / {formatUsageValue(remaining.apiCalls) === 'Unlimited' ? '∞' : `${usage.apiCalls + (remaining.apiCalls as number)}`}</span>
            </div>
            {typeof remaining.apiCalls === 'number' && (
              <div className="w-full bg-terminal-black border-2 border-terminal-darkgray h-4 shadow-sunken">
                <div 
                  className={`h-full ${getUsageBarColor(percentages.apiCalls)} shadow-raised`}
                  style={{ width: `${Math.min(100, percentages.apiCalls)}%` }}
                />
              </div>
            )}
            <div className="text-xs text-terminal-darkgray mt-1">
              Remaining: {formatUsageValue(remaining.apiCalls)}
            </div>
          </div>

          {/* Portfolio Items */}
          <div>
            <div className="flex justify-between text-sm font-mono mb-1">
              <span>PORTFOLIO ITEMS</span>
              <span>{usage.portfolioItems} / {formatUsageValue(remaining.portfolioItems) === 'Unlimited' ? '∞' : `${usage.portfolioItems + (remaining.portfolioItems as number)}`}</span>
            </div>
            {typeof remaining.portfolioItems === 'number' && (
              <div className="w-full bg-terminal-black border-2 border-terminal-darkgray h-4 shadow-sunken">
                <div 
                  className={`h-full ${getUsageBarColor(percentages.portfolioItems)} shadow-raised`}
                  style={{ width: `${Math.min(100, percentages.portfolioItems)}%` }}
                />
              </div>
            )}
            <div className="text-xs text-terminal-darkgray mt-1">
              Remaining: {formatUsageValue(remaining.portfolioItems)}
            </div>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="border-t-2 border-terminal-darkgray pt-3">
          <div className="flex justify-between items-center">
            <div className="text-xs text-terminal-darkgray">
              Usage resets daily at midnight UTC
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                UsageTracker.resetUsage();
                setUsage(UsageTracker.getTodayUsage());
                setRemaining(UsageTracker.getRemainingUsage());
                setPercentages(UsageTracker.getUsagePercentages());
              }}
              className="font-mono text-xs"
            >
              RESET (DEMO)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}