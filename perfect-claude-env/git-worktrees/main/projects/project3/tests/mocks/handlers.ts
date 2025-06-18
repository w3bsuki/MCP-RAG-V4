import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock Binance WebSocket endpoint
  http.get('https://api.binance.com/api/v3/ticker/price', () => {
    return HttpResponse.json([
      { symbol: 'BTCUSDT', price: '45000.00' },
      { symbol: 'ETHUSDT', price: '2500.00' },
    ])
  }),

  // Mock CoinGecko API
  http.get('https://api.coingecko.com/api/v3/simple/price', () => {
    return HttpResponse.json({
      bitcoin: { usd: 45000, usd_24h_change: 2.5 },
      ethereum: { usd: 2500, usd_24h_change: 3.2 },
    })
  }),

  // Mock prediction API endpoint
  http.post('/api/predictions', async ({ request }) => {
    const body = await request.json() as { symbol?: string }
    return HttpResponse.json({
      symbol: body?.symbol || 'BTC',
      sevenDayTarget: 48000,
      thirtyDayTarget: 52000,
      confidence: 75,
      direction: 'buy',
      keyFactors: ['Strong technical indicators', 'Positive market sentiment'],
    })
  }),
]