import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PriceService } from '@/lib/services/priceService'
import { WebSocket } from 'ws'

// Mock WebSocket
jest.mock('ws')

describe('PriceService', () => {
  let priceService: PriceService
  let mockWebSocket: jest.Mocked<WebSocket>

  beforeEach(() => {
    // This test is written BEFORE the implementation exists
    // It will fail initially, driving our implementation
    priceService = new PriceService()
    mockWebSocket = new WebSocket('') as jest.Mocked<WebSocket>
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('connectToBinance', () => {
    it('should establish WebSocket connection to Binance stream', () => {
      const symbol = 'BTCUSDT'
      
      priceService.connectToBinance(symbol)
      
      expect(WebSocket).toHaveBeenCalledWith(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`
      )
    })

    it('should handle incoming price updates', (done) => {
      const symbol = 'BTCUSDT'
      const mockPrice = 45000.50
      const mockData = { s: symbol, p: mockPrice.toString() }

      priceService.on('priceUpdate', (data) => {
        expect(data.symbol).toBe(symbol)
        expect(data.price).toBe(mockPrice)
        expect(data.timestamp).toBeInstanceOf(Date)
        done()
      })

      priceService.connectToBinance(symbol)

      // Simulate WebSocket message
      const messageHandler = (mockWebSocket as any).on.mock.calls.find(
        (call: any) => call[0] === 'message'
      )[1]
      messageHandler(JSON.stringify(mockData))
    })

    it('should reconnect on connection loss', () => {
      const symbol = 'BTCUSDT'
      jest.useFakeTimers()

      priceService.connectToBinance(symbol)

      // Simulate connection close
      const closeHandler = (mockWebSocket as any).on.mock.calls.find(
        (call: any) => call[0] === 'close'
      )[1]
      closeHandler()

      // Fast-forward reconnection timer
      jest.advanceTimersByTime(5000)

      expect(WebSocket).toHaveBeenCalledTimes(2)
      jest.useRealTimers()
    })

    it('should handle multiple symbol subscriptions', () => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']

      symbols.forEach(symbol => {
        priceService.connectToBinance(symbol)
      })

      expect(WebSocket).toHaveBeenCalledTimes(symbols.length)
    })

    it('should emit error events on WebSocket errors', (done) => {
      const symbol = 'BTCUSDT'
      const mockError = new Error('Connection failed')

      priceService.on('error', (error) => {
        expect(error.message).toContain('Connection failed')
        done()
      })

      priceService.connectToBinance(symbol)

      // Simulate WebSocket error
      const errorHandler = (mockWebSocket as any).on.mock.calls.find(
        (call: any) => call[0] === 'error'
      )[1]
      errorHandler(mockError)
    })
  })

  describe('getHistoricalPrices', () => {
    it('should fetch historical price data from CoinGecko', async () => {
      const symbol = 'bitcoin'
      const days = 7

      const prices = await priceService.getHistoricalPrices(symbol, days)

      expect(prices).toBeInstanceOf(Array)
      expect(prices.length).toBeGreaterThan(0)
      expect(prices[0]).toHaveProperty('timestamp')
      expect(prices[0]).toHaveProperty('price')
      expect(prices[0]).toHaveProperty('volume')
    })

    it('should cache historical price data', async () => {
      const symbol = 'bitcoin'
      const days = 7

      // First call
      await priceService.getHistoricalPrices(symbol, days)
      
      // Second call should use cache
      const startTime = Date.now()
      await priceService.getHistoricalPrices(symbol, days)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(10) // Should be instant from cache
    })

    it('should handle API errors gracefully', async () => {
      const symbol = 'invalid-coin'
      const days = 7

      await expect(
        priceService.getHistoricalPrices(symbol, days)
      ).rejects.toThrow('Failed to fetch historical prices')
    })
  })

  describe('getTechnicalIndicators', () => {
    it('should calculate RSI correctly', async () => {
      const symbol = 'bitcoin'
      const indicators = await priceService.getTechnicalIndicators(symbol)

      expect(indicators.rsi).toBeGreaterThanOrEqual(0)
      expect(indicators.rsi).toBeLessThanOrEqual(100)
    })

    it('should calculate MACD indicators', async () => {
      const symbol = 'bitcoin'
      const indicators = await priceService.getTechnicalIndicators(symbol)

      expect(indicators.macd).toHaveProperty('value')
      expect(indicators.macd).toHaveProperty('signal')
      expect(indicators.macd).toHaveProperty('histogram')
    })

    it('should calculate Bollinger Bands', async () => {
      const symbol = 'bitcoin'
      const indicators = await priceService.getTechnicalIndicators(symbol)

      expect(indicators.bollingerBands).toHaveProperty('upper')
      expect(indicators.bollingerBands).toHaveProperty('middle')
      expect(indicators.bollingerBands).toHaveProperty('lower')
      expect(indicators.bollingerBands.upper).toBeGreaterThan(indicators.bollingerBands.middle)
      expect(indicators.bollingerBands.lower).toBeLessThan(indicators.bollingerBands.middle)
    })

    it('should handle insufficient data for indicators', async () => {
      const symbol = 'new-coin'
      
      await expect(
        priceService.getTechnicalIndicators(symbol)
      ).rejects.toThrow('Insufficient historical data')
    })
  })

  describe('disconnect', () => {
    it('should close all WebSocket connections', () => {
      const symbols = ['BTCUSDT', 'ETHUSDT']

      symbols.forEach(symbol => {
        priceService.connectToBinance(symbol)
      })

      priceService.disconnect()

      expect(mockWebSocket.close).toHaveBeenCalledTimes(symbols.length)
    })

    it('should clear all event listeners', () => {
      const listener = jest.fn()
      priceService.on('priceUpdate', listener)

      priceService.disconnect()
      priceService.emit('priceUpdate', { symbol: 'BTCUSDT', price: 45000 })

      expect(listener).not.toHaveBeenCalled()
    })
  })
})