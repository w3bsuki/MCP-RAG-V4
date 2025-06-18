'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolioStore } from '@/store/portfolioStore';

export function AddCryptoForm() {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const addItem = usePortfolioStore((state) => state.addItem);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol || !name || !amount || !buyPrice) {
      alert('ERROR: ALL FIELDS REQUIRED');
      return;
    }

    const amountNum = parseFloat(amount);
    const priceNum = parseFloat(buyPrice);

    if (isNaN(amountNum) || amountNum <= 0) {
      alert('ERROR: INVALID AMOUNT');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      alert('ERROR: INVALID PRICE');
      return;
    }

    addItem(symbol, name, amountNum, priceNum);
    
    // Reset form
    setSymbol('');
    setName('');
    setAmount('');
    setBuyPrice('');
  };

  const handleQuickAdd = (cryptoSymbol: string, cryptoName: string) => {
    setSymbol(cryptoSymbol);
    setName(cryptoName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ADD CRYPTO TO PORTFOLIO</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-terminal-darkgray mb-1">
                SYMBOL
              </label>
              <Input
                type="text"
                placeholder="BTC"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-terminal-darkgray mb-1">
                NAME
              </label>
              <Input
                type="text"
                placeholder="BITCOIN"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-terminal-darkgray mb-1">
                AMOUNT
              </label>
              <Input
                type="number"
                step="any"
                placeholder="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-terminal-darkgray mb-1">
                BUY PRICE ($)
              </label>
              <Input
                type="number"
                step="any"
                placeholder="50000.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button type="submit" className="w-full">
              ADD TO PORTFOLIO
            </Button>
            
            <div className="border-t-2 border-terminal-darkgray pt-2">
              <div className="text-xs text-terminal-darkgray mb-2">QUICK ADD:</div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickAdd('BTC', 'BITCOIN')}
                >
                  BTC
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickAdd('ETH', 'ETHEREUM')}
                >
                  ETH
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickAdd('ADA', 'CARDANO')}
                >
                  ADA
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickAdd('SOL', 'SOLANA')}
                >
                  SOL
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}