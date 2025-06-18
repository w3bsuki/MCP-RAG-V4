'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CryptoChartProps {
  symbol: string;
  name: string;
}

export function CryptoChart({ symbol, name }: CryptoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [timeframe, setTimeframe] = useState('7');
  const [showVolume, setShowVolume] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'candles'>('line');

  const { data: chartData, isLoading, error, refetch } = useQuery({
    queryKey: ['chart', symbol, timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/chart/${symbol}?days=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return response.json();
    },
    refetchInterval: timeframe === '1' ? 30000 : 300000, // 30s for 1d, 5m for others
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with retro styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#FFFFFF',
        fontFamily: 'Courier New, monospace',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#808080', style: LineStyle.Solid },
        horzLines: { color: '#808080', style: LineStyle.Solid },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#C0C0C0',
          labelBackgroundColor: '#C0C0C0',
        },
        horzLine: {
          color: '#C0C0C0',
          labelBackgroundColor: '#C0C0C0',
        },
      },
      rightPriceScale: {
        borderColor: '#C0C0C0',
        textColor: '#FFFFFF',
      },
      timeScale: {
        borderColor: '#C0C0C0',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create line series with retro green color
    const lineSeries = chart.addLineSeries({
      color: '#00FF00',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#00FF00',
      crosshairMarkerBackgroundColor: '#00FF00',
      lastValueVisible: true,
      priceLineVisible: true,
    });

    seriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (chartData && seriesRef.current) {
      seriesRef.current.setData(chartData.prices);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [chartData]);

  const timeframes = [
    { value: '1', label: '1D' },
    { value: '7', label: '7D' },
    { value: '30', label: '30D' },
    { value: '90', label: '90D' },
    { value: '365', label: '1Y' },
  ];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{name} ({symbol.toUpperCase()}) CHART</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-terminal-red font-mono text-center py-8">
            ERROR: FAILED TO LOAD CHART DATA
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name} ({symbol.toUpperCase()}) CHART</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe(tf.value)}
                  className="font-mono"
                >
                  {tf.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="font-mono"
            >
              REFRESH
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-16">
            <pre className="text-terminal-green text-xs mb-4">
{`     ▄▄▄▄▄▄▄▄▄▄▄
    ███████████
    ███████████
    ███████████
    ███████████
    ███████████`}
            </pre>
            <div className="text-terminal-green font-mono">
              LOADING CHART DATA...
            </div>
          </div>
        ) : (
          <div className="relative">
            <div 
              ref={chartContainerRef} 
              className="w-full h-96 border-2 border-terminal-gray bg-terminal-black"
            />
            {chartData?.stats && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
                <div className="border-2 border-terminal-darkgray p-2">
                  <div className="text-terminal-darkgray">CURRENT</div>
                  <div className="text-terminal-white">${chartData.stats.currentPrice.toLocaleString()}</div>
                </div>
                <div className="border-2 border-terminal-darkgray p-2">
                  <div className="text-terminal-darkgray">24H CHANGE</div>
                  <div className={chartData.stats.priceChangePercentage24h >= 0 ? "text-terminal-green" : "text-terminal-red"}>
                    {chartData.stats.priceChangePercentage24h >= 0 ? '+' : ''}{chartData.stats.priceChangePercentage24h.toFixed(2)}%
                  </div>
                </div>
                <div className="border-2 border-terminal-darkgray p-2">
                  <div className="text-terminal-darkgray">24H HIGH</div>
                  <div className="text-terminal-green">${chartData.stats.high24h.toLocaleString()}</div>
                </div>
                <div className="border-2 border-terminal-darkgray p-2">
                  <div className="text-terminal-darkgray">24H LOW</div>
                  <div className="text-terminal-red">${chartData.stats.low24h.toLocaleString()}</div>
                </div>
                <div className="border-2 border-terminal-darkgray p-2">
                  <div className="text-terminal-darkgray">MARKET CAP</div>
                  <div className="text-terminal-white">
                    ${(chartData.stats.marketCap / 1000000000).toFixed(2)}B
                  </div>
                </div>
                <div className="border-2 border-terminal-darkgray p-2">
                  <div className="text-terminal-darkgray">24H VOLUME</div>
                  <div className="text-terminal-white">
                    ${(chartData.stats.volume24h / 1000000).toFixed(2)}M
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 p-3 bg-terminal-black border-2 border-terminal-darkgray">
              <div className="text-xs font-mono text-terminal-darkgray">
                TIP: USE MOUSE WHEEL TO ZOOM • DRAG TO PAN • REAL-TIME UPDATES EVERY {timeframe === '1' ? '30' : '300'} SECONDS
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}