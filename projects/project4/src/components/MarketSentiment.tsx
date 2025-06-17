'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MarketContextData {
  btcDominance: number;
  totalMarketCap: number;
  fearGreedIndex: number;
  sentiment: string;
  trend: string;
}

interface MarketSentimentProps {
  data: MarketContextData;
  isPremium?: boolean;
}

export function MarketSentiment({ data, isPremium = false }: MarketSentimentProps) {
  const getFearGreedColor = (index: number) => {
    if (index >= 70) return 'text-terminal-red'; // Extreme Greed
    if (index >= 50) return 'text-terminal-white'; // Neutral
    return 'text-terminal-green'; // Fear
  };

  const getFearGreedLabel = (index: number) => {
    if (index >= 80) return 'EXTREME GREED';
    if (index >= 60) return 'GREED';
    if (index >= 40) return 'NEUTRAL';
    if (index >= 20) return 'FEAR';
    return 'EXTREME FEAR';
  };

  const getSentimentASCII = (sentiment: string) => {
    if (sentiment === 'greed') {
      return `
    $$$$$$$
   $$ $$$ $$
  $$$$$$$$$$$
  $ $$$$$$$ $
  $$$$$$$$$$$
   $$$$$$$$$
    $$$$$$$`;
    } else if (sentiment === 'fear') {
      return `
    !!!!!!!!
   !! !!! !!
  !!!!!!!!!!!
  ! !!!!!!! !
  !!!!!!!!!!!
   !!!!!!!!!
    !!!!!!!`;
    }
    return `
    --------
   -- --- --
  -----------
  - ------- -
  -----------
   ---------
    -------`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MARKET SENTIMENT ANALYSIS</CardTitle>
      </CardHeader>
      <CardContent>
        {isPremium ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Metrics */}
            <div className="space-y-4">
              <div>
                <div className="text-xs text-terminal-darkgray">FEAR & GREED INDEX</div>
                <div className={`text-3xl font-bold ${getFearGreedColor(data.fearGreedIndex)}`}>
                  {data.fearGreedIndex}
                </div>
                <div className={`text-sm font-mono ${getFearGreedColor(data.fearGreedIndex)}`}>
                  {getFearGreedLabel(data.fearGreedIndex)}
                </div>
              </div>

              <div className="border-t-2 border-terminal-darkgray pt-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-terminal-darkgray">BTC DOMINANCE: </span>
                    <span className="font-mono">{data.btcDominance}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-terminal-darkgray">MARKET CAP: </span>
                    <span className="font-mono">${data.totalMarketCap}T</span>
                  </div>
                  <div>
                    <span className="text-xs text-terminal-darkgray">TREND: </span>
                    <span className={`font-mono font-bold ${
                      data.trend === 'bullish' ? 'text-terminal-green' : 'text-terminal-red'
                    }`}>
                      {data.trend.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-terminal-darkgray pt-4">
                <div className="text-xs text-terminal-darkgray mb-2">MARKET INDICATORS</div>
                <div className="space-y-1 text-xs font-mono">
                  <div>• VOLUME: {data.trend === 'bullish' ? 'INCREASING' : 'DECREASING'}</div>
                  <div>• MOMENTUM: {data.sentiment === 'greed' ? 'STRONG' : 'WEAK'}</div>
                  <div>• VOLATILITY: MODERATE</div>
                </div>
              </div>
            </div>

            {/* Right Column - ASCII Visualization */}
            <div className="flex items-center justify-center">
              <pre className={`text-xs ${
                data.sentiment === 'greed' ? 'text-terminal-green' : 'text-terminal-red'
              }`}>
                {getSentimentASCII(data.sentiment)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <pre className="text-xs text-terminal-darkgray mb-4">
{`    ???????
   ?? ??? ??
  ???????????
  ? ??????? ?
  ???????????
   ?????????
    ???????`}
            </pre>
            <div className="text-terminal-green font-bold mb-2">
              PREMIUM FEATURE
            </div>
            <div className="text-xs text-terminal-darkgray">
              UNLOCK MARKET SENTIMENT ANALYSIS
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}