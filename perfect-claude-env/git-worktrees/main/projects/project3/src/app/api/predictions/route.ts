import { NextRequest, NextResponse } from 'next/server'
import { PredictionEngine } from '@/lib/services/predictionEngine'
import { MarketContext, ClaudePrediction } from '@/types/prediction'

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 5 // 5 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

// Cache for predictions
const predictionCache = new Map<string, { data: ClaudePrediction; expiry: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Initialize services lazily to allow for mocking
let predictionEngine: PredictionEngine | null = null
// Price service removed - now using direct Binance API

function getPredictionEngine(): PredictionEngine {
  if (!predictionEngine) {
    predictionEngine = new PredictionEngine()
  }
  return predictionEngine
}

// Removed unused getPriceService function

// For testing: reset service instances
export function resetServices() {
  predictionEngine = null
}

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now()
  const clientData = requestCounts.get(clientIp)

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return true
  }

  if (clientData.count >= RATE_LIMIT) {
    return false
  }

  clientData.count++
  return true
}

function getCachedPrediction(key: string): ClaudePrediction | null {
  const cached = predictionCache.get(key)
  if (cached && Date.now() < cached.expiry) {
    return cached.data
  }
  predictionCache.delete(key)
  return null
}

function setCachedPrediction(key: string, data: ClaudePrediction): void {
  predictionCache.set(key, {
    data,
    expiry: Date.now() + CACHE_DURATION,
  })
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json()
    const { symbol, timeframe } = body

    // Validate required fields
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol is required' },
        { status: 400 }
      )
    }

    // Validate symbol format
    if (!/^[A-Z]{2,10}$/.test(symbol)) {
      return NextResponse.json(
        { error: 'Invalid symbol format' },
        { status: 400 }
      )
    }

    // Check rate limit
    const clientIp = req.headers.get('x-forwarded-for') || 'anonymous'
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Check cache
    const cacheKey = `${symbol}-${timeframe}`
    const cached = getCachedPrediction(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Generate market context
    const marketContext: MarketContext = {
      symbol,
      currentPrice: 45000, // Mock for now
      volume24h: 28000000000,
      priceChange24h: 2.5,
      rsi: 55,
      macd: { signal: 100, histogram: 50 },
      bollingerBands: { upper: 48000, lower: 42000 },
      volumeProfile: [1000, 1500, 2000, 2500, 3000],
      fearGreedIndex: 65,
      btcDominance: 52.3,
      totalMarketCap: 1700000000000,
      recentHeadlines: ['Market update'],
      socialMentions: 125000,
      whaleActivity: { buys: 15, sells: 8 },
    }

    // Generate prediction
    const prediction = await getPredictionEngine().generatePrediction(marketContext)

    const response = {
      prediction,
      metadata: {
        generatedAt: new Date().toISOString(),
        symbol,
        cacheExpiry: new Date(Date.now() + CACHE_DURATION).toISOString(),
      },
    }

    // Cache the prediction
    setCachedPrediction(cacheKey, prediction)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Prediction error:', error)
    
    if (error instanceof Error && error.message.includes('Claude API unavailable')) {
      return NextResponse.json(
        { error: 'Prediction service temporarily unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const symbols = searchParams.get('symbols')

  if (symbols) {
    // Handle multiple symbols
    const symbolList = symbols.split(',')
    const predictions = []

    for (const sym of symbolList) {
      const cached = getCachedPrediction(`${sym}-7d`)
      if (cached) {
        predictions.push(cached)
      }
    }

    return NextResponse.json({ predictions })
  }

  if (symbol) {
    // Handle single symbol
    const cached = getCachedPrediction(`${symbol}-7d`)
    
    if (!cached) {
      return NextResponse.json(
        { error: 'No prediction found' },
        { status: 404 }
      )
    }

    return NextResponse.json(cached)
  }

  return NextResponse.json(
    { error: 'Symbol parameter required' },
    { status: 400 }
  )
}

interface MockRequest {
  method?: string;
  body: { symbol?: string; timeframe?: string };
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

interface MockResponse {
  _getStatusCode?: () => number;
  status: (code: number) => MockResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: MockRequest, res: MockResponse) {
  // Support for node-mocks-http
  if (res && res._getStatusCode) {
    // node-mocks-http request
    if (req.method === 'POST') {
      const body = req.body
      
      // Validate required fields
      if (!body.symbol) {
        res.status(400).json({ error: 'symbol is required' })
        return
      }

      // Validate symbol format
      if (!/^[A-Z]{2,10}$/.test(body.symbol)) {
        res.status(400).json({ error: 'Invalid symbol format' })
        return
      }

      // Check rate limit
      const clientIp = req.headers?.['x-forwarded-for'] || 'anonymous'
      if (!checkRateLimit(clientIp)) {
        res.status(429).json({ error: 'Rate limit exceeded' })
        return
      }

      // Check cache
      const cacheKey = `${body.symbol}-${body.timeframe}`
      const cached = getCachedPrediction(cacheKey)
      if (cached) {
        res.status(200).json(cached)
        return
      }

      try {
        // Generate market context
        const marketContext: MarketContext = {
          symbol: body.symbol,
          currentPrice: 45000,
          volume24h: 28000000000,
          priceChange24h: 2.5,
          rsi: 55,
          macd: { signal: 100, histogram: 50 },
          bollingerBands: { upper: 48000, lower: 42000 },
          volumeProfile: [1000, 1500, 2000, 2500, 3000],
          fearGreedIndex: 65,
          btcDominance: 52.3,
          totalMarketCap: 1700000000000,
          recentHeadlines: ['Market update'],
          socialMentions: 125000,
          whaleActivity: { buys: 15, sells: 8 },
        }

        // Generate prediction
        const prediction = await getPredictionEngine().generatePrediction(marketContext)

        const response = {
          prediction,
          metadata: {
            generatedAt: new Date().toISOString(),
            symbol: body.symbol,
            cacheExpiry: new Date(Date.now() + CACHE_DURATION).toISOString(),
          },
        }

        // Cache the prediction
        setCachedPrediction(cacheKey, prediction)

        res.status(200).json(response)
      } catch (error) {
        console.error('Prediction error:', error)
        
        if (error instanceof Error && error.message.includes('Claude API unavailable')) {
          res.status(503).json({ error: 'Prediction service temporarily unavailable' })
        } else {
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    } else if (req.method === 'GET') {
      const symbol = req.query?.symbol
      const symbols = req.query?.symbols

      if (symbols) {
        // Handle multiple symbols
        const symbolList = symbols.split(',')
        const predictions = []

        for (const sym of symbolList) {
          const cached = getCachedPrediction(`${sym}-7d`)
          if (cached) {
            predictions.push(cached)
          }
        }

        res.status(200).json({ predictions })
      } else if (symbol) {
        // Handle single symbol
        const cached = getCachedPrediction(`${symbol}-7d`)
        
        if (!cached) {
          res.status(404).json({ error: 'No prediction found' })
        } else {
          res.status(200).json(cached)
        }
      } else {
        res.status(400).json({ error: 'Symbol parameter required' })
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
    return
  }
}

// For node-mocks-http compatibility
export async function POST(req: NextRequest) {
  return handlePost(req)
}

export async function GET(req: NextRequest) {
  return handleGet(req)
}