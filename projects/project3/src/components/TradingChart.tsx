'use client'

import { useState, useEffect, useRef } from 'react'

interface ChartProps {
  symbol: string
  timeframe: string
}

interface CandlestickData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function TradingChart({ symbol, timeframe }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [chartData, setChartData] = useState<CandlestickData[]>([])
  const [loading, setLoading] = useState(true)

  // Generate mock candlestick data
  useEffect(() => {
    const generateMockData = () => {
      const data: CandlestickData[] = []
      const now = Date.now()
      const intervals = 50
      let price = 45000 + Math.random() * 5000 // Base price

      for (let i = intervals; i >= 0; i--) {
        const timestamp = now - (i * 60 * 60 * 1000) // 1 hour intervals
        const open = price
        const volatility = 0.02 // 2% volatility
        const change = (Math.random() - 0.5) * 2 * volatility * price
        const close = Math.max(0, open + change)
        
        const high = Math.max(open, close) + Math.random() * 0.01 * price
        const low = Math.min(open, close) - Math.random() * 0.01 * price
        const volume = 1000 + Math.random() * 9000

        data.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume,
        })

        price = close // Next candle starts where this one ended
      }

      setChartData(data)
      setLoading(false)
    }

    generateMockData()
  }, [symbol, timeframe])

  // Draw the chart
  useEffect(() => {
    if (!canvasRef.current || chartData.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const padding = 40

    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (chartData.length === 0) return

    // Calculate price range
    const prices = chartData.flatMap(d => [d.high, d.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const paddedMin = minPrice - priceRange * 0.1
    const paddedMax = maxPrice + priceRange * 0.1
    const paddedRange = paddedMax - paddedMin

    // Chart dimensions
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2
    const candleWidth = chartWidth / chartData.length * 0.8

    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      
      // Price labels
      const price = paddedMax - (i / 5) * paddedRange
      ctx.fillStyle = '#666'
      ctx.font = '12px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(`$${price.toFixed(0)}`, padding - 5, y + 4)
    }

    // Draw candlesticks
    chartData.forEach((candle, index) => {
      const x = padding + (index + 0.5) * (chartWidth / chartData.length)
      
      // Calculate positions
      const openY = padding + ((paddedMax - candle.open) / paddedRange) * chartHeight
      const closeY = padding + ((paddedMax - candle.close) / paddedRange) * chartHeight
      const highY = padding + ((paddedMax - candle.high) / paddedRange) * chartHeight
      const lowY = padding + ((paddedMax - candle.low) / paddedRange) * chartHeight

      const isGreen = candle.close > candle.open
      
      // Draw wick
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444'
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.abs(closeY - openY)
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(bodyHeight, 1))
    })

    // Draw price line for current price
    if (chartData.length > 0) {
      const currentPrice = chartData[chartData.length - 1]?.close || 0
      const currentY = padding + ((paddedMax - currentPrice) / paddedRange) * chartHeight
      
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding, currentY)
      ctx.lineTo(width - padding, currentY)
      ctx.stroke()
      ctx.setLineDash([])

      // Current price label
      ctx.fillStyle = '#3b82f6'
      ctx.fillRect(width - padding - 60, currentY - 10, 55, 20)
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`$${currentPrice.toFixed(0)}`, width - padding - 32.5, currentY + 4)
    }

  }, [chartData])

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="w-full h-64 relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {symbol}/USDT
        </span>
      </div>
    </div>
  )
}