'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CryptoSelectorProps {
  onSelect: (symbol: string, name: string) => void;
  selectedSymbol?: string;
}

export function CryptoSelector({ onSelect, selectedSymbol }: CryptoSelectorProps) {
  const { data: cryptoData, isLoading } = useQuery({
    queryKey: ['top-cryptos'],
    queryFn: async () => {
      const response = await fetch('/api/cryptos');
      if (!response.ok) throw new Error('Failed to fetch crypto data');
      return response.json();
    },
    refetchInterval: 60000,
  });

  const popularCryptos = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SELECT CRYPTOCURRENCY</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-terminal-green font-mono">
            LOADING CRYPTOCURRENCIES...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SELECT CRYPTOCURRENCY</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Popular Cryptos */}
          <div>
            <div className="text-xs text-terminal-darkgray mb-2 font-mono">
              POPULAR CRYPTOCURRENCIES:
            </div>
            <div className="grid grid-cols-3 gap-2">
              {popularCryptos.map((crypto) => (
                <Button
                  key={crypto.id}
                  variant={selectedSymbol === crypto.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelect(crypto.id, crypto.name)}
                  className="font-mono"
                >
                  {crypto.symbol}
                </Button>
              ))}
            </div>
          </div>

          {/* Top Market Cap */}
          {cryptoData && (
            <div>
              <div className="text-xs text-terminal-darkgray mb-2 font-mono">
                TOP BY MARKET CAP:
              </div>
              <div className="grid grid-cols-4 gap-2">
                {cryptoData.slice(0, 16).map((crypto: any) => (
                  <Button
                    key={crypto.id}
                    variant={selectedSymbol === crypto.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelect(crypto.id, crypto.name)}
                    className="font-mono text-xs"
                  >
                    {crypto.symbol.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t-2 border-terminal-darkgray pt-2">
            <div className="text-xs text-terminal-darkgray font-mono">
              SELECTED: {selectedSymbol ? selectedSymbol.toUpperCase() : 'NONE'} • 
              CHARTS UPDATE: REAL-TIME
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}