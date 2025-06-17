'use client';

import { useState } from 'react';
import { useAIPrediction } from '@/hooks/useAIPrediction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AIPredictionDemo() {
  const [requestParams, setRequestParams] = useState<any>(null);
  const { data, isLoading, error, refetch } = useAIPrediction(requestParams);

  const handlePredict = (symbol: string) => {
    setRequestParams({
      symbol,
      timeframe: '24h',
      currentPrice: symbol === 'BTC' ? 45000 : symbol === 'ETH' ? 2800 : 100,
      marketData: {
        priceChange24h: 2.5,
        volume24h: 28000000000,
        marketCap: 880000000000
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI PREDICTION DEMO</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => handlePredict('BTC')} className="font-mono">
              PREDICT BTC
            </Button>
            <Button onClick={() => handlePredict('ETH')} className="font-mono">
              PREDICT ETH
            </Button>
            <Button onClick={() => handlePredict('SOL')} className="font-mono">
              PREDICT SOL
            </Button>
          </div>

          {isLoading && (
            <div className="text-terminal-green font-mono">
              GENERATING AI PREDICTION...
            </div>
          )}

          {error && (
            <div className="text-terminal-red font-mono">
              ERROR: {error.message}
            </div>
          )}

          {data && (
            <div className="border-2 border-terminal-gray p-4 font-mono text-sm space-y-2">
              <div>SYMBOL: {data.symbol}</div>
              <div>CURRENT: ${data.currentPrice}</div>
              <div>DIRECTION: <span className={data.prediction.direction === 'up' ? 'text-terminal-green' : 'text-terminal-red'}>
                {data.prediction.direction.toUpperCase()}
              </span></div>
              <div>CONFIDENCE: {data.prediction.confidence}%</div>
              <div>ANALYSIS: {data.prediction.analysis}</div>
              {data.fallback && (
                <div className="text-terminal-darkgray text-xs mt-2">
                  * Using fallback prediction (configure ANTHROPIC_API_KEY for AI)
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}