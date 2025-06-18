'use client';

import { useQuery } from '@tanstack/react-query';

interface AIpredictionParams {
  symbol: string;
  timeframe: '24h' | '7d' | '30d';
  currentPrice: number;
  marketData?: {
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
  };
}

interface AIPrediction {
  direction: 'up' | 'down';
  targetPrice?: number;
  confidence: number;
  changePercent?: number;
  analysis: string;
  factors?: string[];
  risk?: 'low' | 'medium' | 'high';
}

export function useAIPrediction(params: AIpredictionParams | null) {
  return useQuery({
    queryKey: ['ai-prediction', params],
    queryFn: async () => {
      if (!params) return null;
      
      const response = await fetch('/api/ai-predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI prediction');
      }

      const data = await response.json();
      return data;
    },
    enabled: !!params,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Don't auto-refetch to save API calls
  });
}