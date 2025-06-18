'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortfolioStore } from '@/store/portfolioStore';
import { Trash2 } from 'lucide-react';

export function PortfolioTable() {
  const { items, removeItem, updateCurrentPrices, getStats, clearPortfolio } = usePortfolioStore();

  // Fetch current prices for portfolio items
  const { data: cryptoData } = useQuery({
    queryKey: ['top-cryptos'],
    queryFn: async () => {
      const response = await fetch('/api/cryptos');
      if (!response.ok) throw new Error('Failed to fetch crypto data');
      return response.json();
    },
    refetchInterval: 30000,
    enabled: items.length > 0, // Only fetch if portfolio has items
  });

  // Update portfolio prices when crypto data changes
  useEffect(() => {
    if (cryptoData && items.length > 0) {
      const priceMap: Record<string, number> = {};
      cryptoData.forEach((crypto: any) => {
        priceMap[crypto.symbol] = crypto.current_price;
      });
      updateCurrentPrices(priceMap);
    }
  }, [cryptoData, items.length, updateCurrentPrices]);

  const stats = getStats();

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MY PORTFOLIO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-terminal-darkgray font-mono mb-4">
              NO PORTFOLIO ITEMS FOUND
            </div>
            <div className="text-xs text-terminal-darkgray font-mono">
              ADD CRYPTOCURRENCIES TO START TRACKING
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>MY PORTFOLIO</CardTitle>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={clearPortfolio}
          >
            CLEAR ALL
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Portfolio Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 border-2 border-terminal-darkgray bg-terminal-white">
          <div>
            <div className="text-xs text-terminal-darkgray">TOTAL VALUE</div>
            <div className="font-bold text-terminal-black font-mono">
              {formatCurrency(stats.totalValue)}
            </div>
          </div>
          <div>
            <div className="text-xs text-terminal-darkgray">TOTAL INVESTED</div>
            <div className="font-bold text-terminal-black font-mono">
              {formatCurrency(stats.totalInvested)}
            </div>
          </div>
          <div>
            <div className="text-xs text-terminal-darkgray">TOTAL P&L</div>
            <div className={`font-bold font-mono ${
              stats.totalProfit >= 0 ? 'text-terminal-green' : 'text-terminal-red'
            }`}>
              {formatCurrency(stats.totalProfit)}
            </div>
          </div>
          <div>
            <div className="text-xs text-terminal-darkgray">TOTAL %</div>
            <div className={`font-bold font-mono ${
              stats.totalProfitPercent >= 0 ? 'text-terminal-green' : 'text-terminal-red'
            }`}>
              {formatPercent(stats.totalProfitPercent)}
            </div>
          </div>
        </div>

        {/* Portfolio Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SYMBOL</TableHead>
              <TableHead>AMOUNT</TableHead>
              <TableHead>BUY PRICE</TableHead>
              <TableHead>CURRENT PRICE</TableHead>
              <TableHead>VALUE</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>%</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">
                  <div>{item.symbol}</div>
                  <div className="text-xs text-terminal-darkgray">{item.name}</div>
                </TableCell>
                <TableCell className="font-mono">{item.amount}</TableCell>
                <TableCell className="font-mono">{formatCurrency(item.buyPrice)}</TableCell>
                <TableCell className="font-mono">{formatCurrency(item.currentPrice)}</TableCell>
                <TableCell className="font-mono font-bold">{formatCurrency(item.value)}</TableCell>
                <TableCell className={`font-mono font-bold ${
                  item.profit >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                }`}>
                  {formatCurrency(item.profit)}
                </TableCell>
                <TableCell className={`font-mono font-bold ${
                  item.profitPercent >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                }`}>
                  {formatPercent(item.profitPercent)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 text-xs text-terminal-darkgray font-mono">
          PORTFOLIO UPDATES: REAL-TIME • LAST SYNC: {new Date().toLocaleTimeString('en-US', { hour12: false })}
        </div>
      </CardContent>
    </Card>
  );
}