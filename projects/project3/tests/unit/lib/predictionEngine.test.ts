import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PredictionEngine } from '@/lib/services/predictionEngine'
import { MarketContext, ClaudePrediction } from '@/types/prediction'

describe('PredictionEngine', () => {
  let predictionEngine: PredictionEngine
  let mockMarketContext: MarketContext

  beforeEach(() => {
    // Test written BEFORE implementation - TDD approach
    predictionEngine = new PredictionEngine({
      apiKey: 'test-api-key',
      model: 'claude-3-haiku',
    })

    mockMarketContext = {
      symbol: 'BTC',
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
      recentHeadlines: [
        'Bitcoin ETF sees record inflows',
        'Major bank adopts cryptocurrency',
      ],
      socialMentions: 125000,
      whaleActivity: { buys: 15, sells: 8 },
    }
  })

  describe('generatePrediction', () => {
    it('should generate prediction with all required fields', async () => {
      const prediction = await predictionEngine.generatePrediction(mockMarketContext)

      expect(prediction).toHaveProperty('sevenDayTarget')
      expect(prediction).toHaveProperty('thirtyDayTarget')
      expect(prediction).toHaveProperty('confidence')
      expect(prediction).toHaveProperty('direction')
      expect(prediction).toHaveProperty('keyFactors')
      expect(prediction).toHaveProperty('riskAssessment')
      expect(prediction).toHaveProperty('technicalSummary')
      expect(prediction).toHaveProperty('fundamentalSummary')
      expect(prediction).toHaveProperty('contraryFactors')
    })

    it('should return confidence between 0 and 100', async () => {
      const prediction = await predictionEngine.generatePrediction(mockMarketContext)

      expect(prediction.confidence).toBeGreaterThanOrEqual(0)
      expect(prediction.confidence).toBeLessThanOrEqual(100)
    })

    it('should provide valid direction recommendation', async () => {
      const validDirections = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell']
      const prediction = await predictionEngine.generatePrediction(mockMarketContext)

      expect(validDirections).toContain(prediction.direction)
    })

    it('should provide at least 3 key factors', async () => {
      const prediction = await predictionEngine.generatePrediction(mockMarketContext)

      expect(prediction.keyFactors).toBeInstanceOf(Array)
      expect(prediction.keyFactors.length).toBeGreaterThanOrEqual(3)
      prediction.keyFactors.forEach(factor => {
        expect(typeof factor).toBe('string')
        expect(factor.length).toBeGreaterThan(10)
      })
    })

    it('should handle bullish market conditions', async () => {
      const bullishContext: MarketContext = {
        ...mockMarketContext,
        priceChange24h: 8.5,
        rsi: 70,
        fearGreedIndex: 80,
        whaleActivity: { buys: 25, sells: 5 },
      }

      const prediction = await predictionEngine.generatePrediction(bullishContext)

      expect(prediction.sevenDayTarget).toBeGreaterThan(bullishContext.currentPrice)
      expect(['buy', 'strong_buy']).toContain(prediction.direction)
      expect(prediction.confidence).toBeGreaterThan(60)
    })

    it('should handle bearish market conditions', async () => {
      const bearishContext: MarketContext = {
        ...mockMarketContext,
        priceChange24h: -7.2,
        rsi: 25,
        fearGreedIndex: 20,
        whaleActivity: { buys: 3, sells: 20 },
      }

      const prediction = await predictionEngine.generatePrediction(bearishContext)

      expect(prediction.sevenDayTarget).toBeLessThan(bearishContext.currentPrice)
      expect(['sell', 'strong_sell']).toContain(prediction.direction)
    })

    it('should handle API rate limiting gracefully', async () => {
      // Simulate rate limit error
      jest.spyOn(predictionEngine as any, 'callClaude').mockRejectedValueOnce(
        new Error('Rate limit exceeded')
      )

      await expect(
        predictionEngine.generatePrediction(mockMarketContext)
      ).rejects.toThrow('Prediction temporarily unavailable')
    })

    it('should cache predictions for identical contexts', async () => {
      const firstCall = await predictionEngine.generatePrediction(mockMarketContext)
      const startTime = Date.now()
      const secondCall = await predictionEngine.generatePrediction(mockMarketContext)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(50) // Should be nearly instant
      expect(secondCall).toEqual(firstCall)
    })

    it('should validate market context before processing', async () => {
      const invalidContext = {
        ...mockMarketContext,
        currentPrice: -100, // Invalid negative price
      }

      await expect(
        predictionEngine.generatePrediction(invalidContext)
      ).rejects.toThrow('Invalid market context')
    })
  })

  describe('buildPrompt', () => {
    it('should create comprehensive prompt with all context data', () => {
      const prompt = predictionEngine.buildPrompt(mockMarketContext)

      expect(prompt).toContain('BTC')
      expect(prompt).toContain('45000')
      expect(prompt).toContain('RSI: 55')
      expect(prompt).toContain('Fear & Greed: 65')
      expect(prompt).toContain('Bitcoin ETF sees record inflows')
    })

    it('should format numbers correctly in prompt', () => {
      const prompt = predictionEngine.buildPrompt(mockMarketContext)

      expect(prompt).toMatch(/\$45,000/) // Price formatting
      expect(prompt).toMatch(/2\.5%/) // Percentage formatting
      expect(prompt).toMatch(/52\.3%/) // BTC dominance
    })

    it('should include technical analysis context', () => {
      const prompt = predictionEngine.buildPrompt(mockMarketContext)

      expect(prompt).toContain('MACD')
      expect(prompt).toContain('Bollinger Bands')
      expect(prompt).toContain('Volume Profile')
    })
  })

  describe('parsePredictionResponse', () => {
    it('should parse valid JSON response correctly', () => {
      const validResponse = JSON.stringify({
        sevenDayTarget: 48000,
        thirtyDayTarget: 52000,
        confidence: 75,
        direction: 'buy',
        keyFactors: ['Strong support', 'Positive momentum', 'Institutional interest'],
        riskAssessment: 'Moderate risk due to market volatility',
        technicalSummary: 'Bullish indicators across timeframes',
        fundamentalSummary: 'Strong adoption metrics',
        contraryFactors: ['Regulatory uncertainty', 'Macro headwinds'],
      })

      const parsed = predictionEngine.parsePredictionResponse(validResponse)
      
      expect(parsed.sevenDayTarget).toBe(48000)
      expect(parsed.confidence).toBe(75)
      expect(parsed.keyFactors).toHaveLength(3)
    })

    it('should handle malformed JSON gracefully', () => {
      const malformedResponse = 'This is not valid JSON'

      expect(() => 
        predictionEngine.parsePredictionResponse(malformedResponse)
      ).toThrow('Invalid prediction response format')
    })

    it('should validate required fields in response', () => {
      const incompleteResponse = JSON.stringify({
        sevenDayTarget: 48000,
        // Missing other required fields
      })

      expect(() =>
        predictionEngine.parsePredictionResponse(incompleteResponse)
      ).toThrow('Missing required prediction fields')
    })
  })

  describe('calculateConfidence', () => {
    it('should calculate higher confidence for aligned indicators', () => {
      const alignedContext: MarketContext = {
        ...mockMarketContext,
        rsi: 65, // Bullish
        macd: { signal: 100, histogram: 50 }, // Bullish
        fearGreedIndex: 70, // Greed
        whaleActivity: { buys: 20, sells: 5 }, // More buys
      }

      const confidence = predictionEngine.calculateConfidence(alignedContext)
      expect(confidence).toBeGreaterThan(70)
    })

    it('should calculate lower confidence for mixed signals', () => {
      const mixedContext: MarketContext = {
        ...mockMarketContext,
        rsi: 70, // Overbought
        macd: { signal: -50, histogram: -25 }, // Bearish
        fearGreedIndex: 80, // Extreme greed
        whaleActivity: { buys: 10, sells: 12 }, // Mixed
      }

      const confidence = predictionEngine.calculateConfidence(mixedContext)
      expect(confidence).toBeLessThan(50)
    })

    it('should factor in market volatility', () => {
      const volatileContext: MarketContext = {
        ...mockMarketContext,
        priceChange24h: 15.5, // High volatility
      }

      const confidence = predictionEngine.calculateConfidence(volatileContext)
      expect(confidence).toBeLessThan(60)
    })
  })
})