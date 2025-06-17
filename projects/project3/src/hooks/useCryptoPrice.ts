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

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}usdt@trade`)

        ws.onopen = () => {
          if (mounted) {
            setLoading(false)
            setError(null)
          }
        }

        ws.onmessage = (event) => {
          if (!mounted) return
          
          try {
            const data = JSON.parse(event.data)
            const newPrice = parseFloat(data.p)
            
            setPrice((prevPrice) => {
              if (prevPrice) {
                const change = ((newPrice - prevPrice) / prevPrice) * 100
                setPriceChange(change)
              }
              return newPrice
            })
          } catch (err) {
            console.error('Error parsing price data:', err)
          }
        }

        ws.onerror = () => {
          if (mounted) {
            setError(new Error('Failed to fetch price'))
            setLoading(false)
          }
        }

        ws.onclose = () => {
          if (mounted) {
            // Reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000)
          }
        }
      } catch (err) {
        if (mounted) {
          setError(new Error('Failed to fetch price'))
          setLoading(false)
        }
      }
    }

    connectWebSocket()

    return () => {
      mounted = false
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [symbol])

  return { price, loading, error, priceChange }
}