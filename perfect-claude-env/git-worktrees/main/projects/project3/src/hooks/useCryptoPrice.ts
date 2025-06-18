import { useState, useEffect } from 'react'

interface UseCryptoPriceReturn {
  price: number | undefined
  loading: boolean
  error: Error | null
  priceChange: number
}

export function useCryptoPrice(symbol: string): UseCryptoPriceReturn {
  const [price, setPrice] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [priceChange, setPriceChange] = useState(0)

  useEffect(() => {
    let ws: WebSocket | null = null
    let mounted = true
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    let previousPrice: number | null = null

    // Normalize symbol for Binance API (e.g., BTC -> BTCUSDT)
    const binanceSymbol = symbol.toUpperCase() + 'USDT'

    // Initial price fetch from Binance REST API
    const fetchInitialPrice = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch price for ${symbol}`)
        }

        const data = await response.json()
        const currentPrice = parseFloat(data.lastPrice)
        const change24h = parseFloat(data.priceChangePercent)
        
        if (mounted) {
          setPrice(currentPrice)
          setPriceChange(change24h)
          setLoading(false)
          setError(null)
          previousPrice = currentPrice
        }
      } catch {
        if (mounted) {
          setError(new Error(`Failed to fetch initial price for ${symbol}`))
          setLoading(false)
        }
      }
    }

    const connectWebSocket = () => {
      if (!mounted) return

      try {
        // Binance WebSocket endpoint for individual symbol ticker
        const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@ticker`
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (mounted) {
            console.log(`WebSocket connected for ${symbol}`)
            setError(null)
            reconnectAttempts = 0
          }
        }

        ws.onmessage = (event) => {
          if (!mounted) return

          try {
            const data = JSON.parse(event.data)
            const currentPrice = parseFloat(data.c) // Current price
            const change24h = parseFloat(data.P) // 24h price change percentage

            setPrice(currentPrice)
            setPriceChange(change24h)

            // Calculate instantaneous price change if we have a previous price
            if (previousPrice && previousPrice !== currentPrice) {
              const instantChange = ((currentPrice - previousPrice) / previousPrice) * 100
              // Smooth the instantaneous change to avoid jumpy UI
              setPriceChange(prev => {
                const smoothing = 0.3
                return prev * (1 - smoothing) + instantChange * smoothing
              })
            }
            
            previousPrice = currentPrice
          } catch (err) {
            console.error('Error parsing WebSocket data:', err)
          }
        }

        ws.onerror = (error) => {
          if (mounted) {
            console.error(`WebSocket error for ${symbol}:`, error)
            setError(new Error(`Connection error for ${symbol}`))
          }
        }

        ws.onclose = (event) => {
          if (!mounted) return

          console.log(`WebSocket closed for ${symbol}`)
          
          // Attempt to reconnect if not a clean close and we haven't exceeded max attempts
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`)
            
            setTimeout(() => {
              if (mounted) {
                connectWebSocket()
              }
            }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)) // Exponential backoff, max 30s
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            setError(new Error(`Failed to connect to ${symbol} price feed after ${maxReconnectAttempts} attempts`))
          }
        }

      } catch {
        if (mounted) {
          setError(new Error(`Failed to initialize WebSocket for ${symbol}`))
          setLoading(false)
        }
      }
    }

    // Start with initial price fetch
    fetchInitialPrice()
    
    // Then start WebSocket connection
    connectWebSocket()

    return () => {
      mounted = false
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting')
      }
    }
  }, [symbol])

  return { price, loading, error, priceChange }
}