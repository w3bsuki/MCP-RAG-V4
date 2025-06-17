import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/predictions/route'
import { PredictionEngine } from '@/lib/services/predictionEngine'
import { PriceService } from '@/lib/services/priceService'

// Mock dependencies
jest.mock('@/lib/services/predictionEngine')
jest.mock('@/lib/services/priceService')

describe('/api/predictions', () => {
  let mockPredictionEngine: jest.Mocked<PredictionEngine>
  let mockPriceService: jest.Mocked<PriceService>

  beforeEach(() => {
    mockPredictionEngine = new PredictionEngine({}) as jest.Mocked<PredictionEngine>
    mockPriceService = new PriceService() as jest.Mocked<PriceService>
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/predictions', () => {
    it('should generate prediction for valid symbol', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          symbol: 'BTC',
          timeframe: '7d',
        },
      })

      const mockPrediction = {
        sevenDayTarget: 48000,
        thirtyDayTarget: 52000,
        confidence: 75,
        direction: 'buy' as const,
        keyFactors: ['Strong support', 'Positive momentum'],
        riskAssessment: 'Moderate risk',
        technicalSummary: 'Bullish indicators',
        fundamentalSummary: 'Strong adoption',
        contraryFactors: ['Regulatory uncertainty'],
      }

      mockPredictionEngine.generatePrediction.mockResolvedValue(mockPrediction)

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData).toHaveProperty('prediction')
      expect(jsonData.prediction).toEqual(mockPrediction)
    })

    it('should validate required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          // Missing symbol
          timeframe: '7d',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toContain('symbol is required')
    })

    it('should validate symbol format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          symbol: 'INVALID_SYMBOL_123',
          timeframe: '7d',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toContain('Invalid symbol format')
    })

    it('should handle rate limiting', async () => {
      // Simulate multiple rapid requests
      const requests = Array(10).fill(null).map(() => 
        createMocks({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            symbol: 'BTC',
            timeframe: '7d',
          },
        })
      )

      // Process all requests
      const responses = await Promise.all(
        requests.map(({ req, res }) => handler(req, res).then(() => res))
      )

      // Some should be rate limited
      const rateLimited = responses.filter(res => res._getStatusCode() === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    it('should cache predictions for identical requests', async () => {
      const requestBody = {
        symbol: 'BTC',
        timeframe: '7d',
      }

      // First request
      const { req: req1, res: res1 } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })

      await handler(req1, res1)
      expect(mockPredictionEngine.generatePrediction).toHaveBeenCalledTimes(1)

      // Second identical request
      const { req: req2, res: res2 } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })

      await handler(req2, res2)
      
      // Should not call prediction engine again (cached)
      expect(mockPredictionEngine.generatePrediction).toHaveBeenCalledTimes(1)
      expect(res2._getStatusCode()).toBe(200)
    })

    it('should handle prediction engine errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          symbol: 'BTC',
          timeframe: '7d',
        },
      })

      mockPredictionEngine.generatePrediction.mockRejectedValue(
        new Error('Claude API unavailable')
      )

      await handler(req, res)

      expect(res._getStatusCode()).toBe(503)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toContain('Prediction service temporarily unavailable')
    })

    it('should include request metadata in response', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          symbol: 'BTC',
          timeframe: '7d',
        },
      })

      mockPredictionEngine.generatePrediction.mockResolvedValue({
        sevenDayTarget: 48000,
        thirtyDayTarget: 52000,
        confidence: 75,
        direction: 'buy',
        keyFactors: [],
        riskAssessment: '',
        technicalSummary: '',
        fundamentalSummary: '',
        contraryFactors: [],
      })

      await handler(req, res)

      const jsonData = JSON.parse(res._getData())
      expect(jsonData).toHaveProperty('metadata')
      expect(jsonData.metadata).toHaveProperty('generatedAt')
      expect(jsonData.metadata).toHaveProperty('symbol', 'BTC')
      expect(jsonData.metadata).toHaveProperty('cacheExpiry')
    })
  })

  describe('GET /api/predictions', () => {
    it('should retrieve prediction by symbol', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          symbol: 'BTC',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData).toHaveProperty('prediction')
    })

    it('should return 404 for non-existent predictions', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          symbol: 'UNKNOWN',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toContain('No prediction found')
    })

    it('should support multiple symbols', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          symbols: 'BTC,ETH,BNB',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.predictions).toBeInstanceOf(Array)
      expect(jsonData.predictions).toHaveLength(3)
    })
  })

  describe('Method validation', () => {
    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toContain('Method not allowed')
    })
  })
})