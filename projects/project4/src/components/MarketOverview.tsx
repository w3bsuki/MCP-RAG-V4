'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketOverviewSkeleton } from '@/components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';

export function MarketOverview() {
  const { showToast } = useToast();
  const { data: marketData, isLoading, error, refetch } = useQuery({
    queryKey: ['market-overview'],
    queryFn: async () => {
      const response = await fetch('/api/market');
      if (!response.ok) {
        const errorMsg = response.status === 429 ? 'API rate limited - using cached data' : 'Failed to fetch market data';
        showToast(errorMsg, 'warning');
        throw new Error(errorMsg);
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    retryDelay: 3000,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    return value.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MARKET OVERVIEW</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketOverviewSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-terminal-black border-terminal-red text-terminal-white">
        <CardHeader>
          <CardTitle className="text-terminal-red">⚠ MARKET OVERVIEW - ERROR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-terminal-red font-mono text-sm">
            ► API ERROR: Using fallback data
          </div>
          <div className="text-xs text-terminal-darkgray">
            CoinGecko API rate limited. Mock data displayed.
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            className="font-mono"
          >
            RETRY
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPositive = marketData?.market_cap_change_percentage_24h && marketData.market_cap_change_percentage_24h > 0;
  const changeColor = isPositive ? 'text-terminal-green' : 'text-terminal-red';
  const changeSign = isPositive ? '+' : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>MARKET OVERVIEW</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 font-mono text-sm">
          <div>
            <div className="text-terminal-darkgray">TOTAL MARKET CAP</div>
            <div className="text-terminal-black font-bold">
              {marketData ? formatCurrency(marketData.total_market_cap) : '---'}
            </div>
          </div>
          <div>
            <div className="text-terminal-darkgray">24H CHANGE</div>
            <div className={`font-bold ${changeColor}`}>
              {marketData ? `${changeSign}${marketData.market_cap_change_percentage_24h.toFixed(2)}%` : '---'}
            </div>
          </div>
          <div>
            <div className="text-terminal-darkgray">TOTAL VOLUME</div>
            <div className="text-terminal-black font-bold">
              {marketData ? formatCurrency(marketData.total_volume) : '---'}
            </div>
          </div>
          <div>
            <div className="text-terminal-darkgray">ACTIVE COINS</div>
            <div className="text-terminal-black font-bold">
              {marketData ? formatNumber(marketData.active_cryptocurrencies) : '---'}
            </div>
          </div>
        </div>
        
        <div className="border-t-2 border-terminal-darkgray pt-2">
          <div className="text-xs text-terminal-darkgray font-mono">
            LAST UPDATED: {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}