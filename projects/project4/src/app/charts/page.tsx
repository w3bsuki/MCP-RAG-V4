'use client';

import { useState } from 'react';
import { Navigation } from "@/components/Navigation";
import { CryptoSelector } from "@/components/CryptoSelector";
import { CryptoChart } from "@/components/CryptoChart";

export default function ChartsPage() {
  const [selectedCrypto, setSelectedCrypto] = useState<{symbol: string, name: string} | null>({
    symbol: 'bitcoin',
    name: 'Bitcoin'
  });

  return (
    <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
      <main className="max-w-7xl mx-auto space-y-8">
        <Navigation />
        
        {/* Terminal Header */}
        <div className="text-center mb-8 border-2 border-terminal-gray bg-terminal-gray text-terminal-black p-4">
          <div className="text-xs mb-2">████████████████████████████████████████████████</div>
          <h1 className="text-4xl font-bold mb-2">
            PRICE CHARTS v1.0
          </h1>
          <p className="text-lg">
            REAL-TIME CRYPTOCURRENCY PRICE ANALYSIS
          </p>
          <div className="text-xs mt-2">████████████████████████████████████████████████</div>
        </div>

        {/* Crypto Selector */}
        <CryptoSelector 
          onSelect={(symbol, name) => setSelectedCrypto({ symbol, name })}
          selectedSymbol={selectedCrypto?.symbol}
        />

        {/* Chart Display */}
        {selectedCrypto && (
          <CryptoChart 
            symbol={selectedCrypto.symbol}
            name={selectedCrypto.name}
          />
        )}

        {/* Terminal Footer */}
        <div className="text-center text-xs text-terminal-darkgray border-t-2 border-terminal-darkgray pt-4">
          <div className="font-mono">
            CHART STATUS: LIVE • FREE TIER: BASIC CHARTS • 
            UPGRADE TO PRO FOR ADVANCED TECHNICAL INDICATORS
          </div>
        </div>
      </main>
    </div>
  );
}