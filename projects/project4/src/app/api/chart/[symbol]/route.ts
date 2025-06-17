import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface RouteParams {
  params: Promise<{ symbol: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';

    console.log('Fetching chart data for:', symbol, 'days:', days);

    // Get coin data for price history with volume
    const [chartResponse, coinResponse] = await Promise.all([
      axios.get(`${COINGECKO_API}/coins/${symbol}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days === '1' ? 'hourly' : 'daily'
        }
      }),
      axios.get(`${COINGECKO_API}/coins/${symbol}`, {
        params: {
          localization: false,
          tickers: false,
          community_data: false,
          developer_data: false
        }
      })
    ]);

    // Transform data for Lightweight Charts format
    const prices = chartResponse.data.prices.map(([timestamp, price]: [number, number]) => ({
      time: Math.floor(timestamp / 1000), // Convert to seconds
      value: price
    }));

    // Calculate price change
    const firstPrice = prices[0]?.value || 0;
    const lastPrice = prices[prices.length - 1]?.value || 0;
    const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    // Get current market data
    const marketData = coinResponse.data.market_data;
    
    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      name: coinResponse.data.name,
      prices,
      days: parseInt(days),
      stats: {
        currentPrice: marketData.current_price.usd,
        priceChange: priceChange.toFixed(2),
        high24h: marketData.high_24h.usd,
        low24h: marketData.low_24h.usd,
        marketCap: marketData.market_cap.usd,
        volume24h: marketData.total_volume.usd,
        priceChangePercentage24h: marketData.price_change_percentage_24h || 0
      }
    });
  } catch (error: any) {
    console.error('Chart API Error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch chart data', details: error.message },
      { status: 500 }
    );
  }
}