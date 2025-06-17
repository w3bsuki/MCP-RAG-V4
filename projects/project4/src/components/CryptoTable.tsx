'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CryptoTableSkeleton } from '@/components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';

export function CryptoTable() {
  const { showToast } = useToast();
  const { data: cryptoData, isLoading, error, refetch } = useQuery({
    queryKey: ['top-cryptos'],
    queryFn: async () => {
      const response = await fetch('/api/cryptos');
      if (!response.ok) {
        const errorMsg = response.status === 429 ? 'API rate limited - using cached data' : 'Failed to fetch crypto data';
        showToast(errorMsg, 'warning');
        throw new Error(errorMsg);
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
    retryDelay: 3000,
  });

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(6)}`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>TOP CRYPTOCURRENCIES</CardTitle>
        </CardHeader>
        <CardContent>
          <CryptoTableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-terminal-black border-terminal-red text-terminal-white">
        <CardHeader>
          <CardTitle className="text-terminal-red">⚠ CRYPTO DATA - ERROR</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>TOP CRYPTOCURRENCIES</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>NAME</TableHead>
              <TableHead>SYMBOL</TableHead>
              <TableHead>PRICE</TableHead>
              <TableHead>24H %</TableHead>
              <TableHead>MARKET CAP</TableHead>
              <TableHead>VOLUME</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cryptoData?.map((crypto: any, index: number) => {
              const isPositive = crypto.price_change_percentage_24h > 0;
              const changeColor = isPositive ? 'text-terminal-green' : 'text-terminal-red';
              const changeSign = isPositive ? '+' : '';
              
              return (
                <TableRow key={crypto.id}>
                  <TableCell className="font-bold">{index + 1}</TableCell>
                  <TableCell className="font-bold">{crypto.name}</TableCell>
                  <TableCell className="font-bold">{crypto.symbol.toUpperCase()}</TableCell>
                  <TableCell className="font-bold">{formatPrice(crypto.current_price)}</TableCell>
                  <TableCell className={`font-bold ${changeColor}`}>
                    {changeSign}{crypto.price_change_percentage_24h.toFixed(2)}%
                  </TableCell>
                  <TableCell>{formatMarketCap(crypto.market_cap)}</TableCell>
                  <TableCell>{formatVolume(crypto.total_volume)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        <div className="mt-4 text-xs text-terminal-darkgray font-mono">
          DATA PROVIDED BY COINGECKO API • UPDATED: {new Date().toLocaleTimeString('en-US', { hour12: false })}
        </div>
      </CardContent>
    </Card>
  );
}