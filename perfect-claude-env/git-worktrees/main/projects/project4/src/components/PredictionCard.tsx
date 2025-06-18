'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface PredictionData {
  symbol: string;
  current: number;
  predictions: {
    '24h': {
      target: number;
      confidence: number;
      direction: string;
      change: string;
      range: { min: number; max: number };
    };
    '7d': {
      target: number;
      confidence: number;
      direction: string;
      change: string;
      range: { min: number; max: number };
    };
    '30d': {
      target: number;
      confidence: number;
      direction: string;
      change: string;
      range: { min: number; max: number };
    };
  };
  analysis: string;
  factors: string[];
  risk: string;
}

interface PredictionCardProps {
  crypto: string;
  data: PredictionData;
  isPremium?: boolean;
}

export function PredictionCard({ crypto, data, isPremium = false }: PredictionCardProps) {
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-terminal-green';
    if (confidence >= 50) return 'text-terminal-white';
    return 'text-terminal-darkgray';
  };

  const getRiskColor = (risk: string) => {
    if (risk.includes('low')) return 'text-terminal-green';
    if (risk.includes('high')) return 'text-terminal-red';
    return 'text-terminal-white';
  };

  const timeframes = ['24h', '7d', '30d'] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">
            {crypto.toUpperCase()} ({data.symbol})
          </CardTitle>
          <div className="text-sm font-mono">
            CURRENT: {formatPrice(data.current)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Predictions Grid */}
        <div className="grid grid-cols-3 gap-4">
          {timeframes.map((timeframe) => {
            const prediction = data.predictions[timeframe];
            const isUp = prediction.direction === 'up';
            
            return (
              <div key={timeframe} className="border-2 border-terminal-darkgray p-3">
                <div className="text-xs text-terminal-darkgray mb-1">{timeframe.toUpperCase()}</div>
                
                {isPremium ? (
                  <>
                    <div className="flex items-center gap-1 mb-2">
                      {isUp ? (
                        <ArrowUpIcon className="w-4 h-4 text-terminal-green" />
                      ) : (
                        <ArrowDownIcon className="w-4 h-4 text-terminal-red" />
                      )}
                      <span className={isUp ? 'text-terminal-green' : 'text-terminal-red'}>
                        {prediction.change}
                      </span>
                    </div>
                    
                    <div className="text-sm font-mono mb-1">
                      {formatPrice(prediction.target)}
                    </div>
                    
                    <div className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                      CONF: {prediction.confidence}%
                    </div>
                    
                    <div className="text-xs text-terminal-darkgray mt-1">
                      {formatPrice(prediction.range.min)} - {formatPrice(prediction.range.max)}
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <div className="text-terminal-darkgray text-xs">
                      UPGRADE TO
                    </div>
                    <div className="text-terminal-green text-sm">
                      PREMIUM
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Analysis Section */}
        <div className="border-2 border-terminal-darkgray p-3">
          <div className="text-xs text-terminal-darkgray mb-2">AI ANALYSIS</div>
          {isPremium ? (
            <>
              <p className="text-sm mb-3 font-mono">{data.analysis}</p>
              
              <div className="text-xs text-terminal-darkgray mb-1">KEY FACTORS:</div>
              <ul className="space-y-1">
                {data.factors.map((factor, idx) => (
                  <li key={idx} className="text-xs font-mono">
                    • {factor}
                  </li>
                ))}
              </ul>
              
              <div className="mt-3 flex justify-between items-center">
                <div className="text-xs">
                  RISK: <span className={`font-bold ${getRiskColor(data.risk)}`}>
                    {data.risk.toUpperCase()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="text-terminal-green font-bold mb-2">
                PREMIUM FEATURE
              </div>
              <div className="text-xs text-terminal-darkgray">
                GET DETAILED AI ANALYSIS
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}