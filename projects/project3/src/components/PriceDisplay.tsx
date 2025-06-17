'use client'

import React from 'react'
import { useCryptoPrice } from '@/hooks/useCryptoPrice'

interface PriceDisplayProps {
  symbol: string
  className?: string
}

export function PriceDisplay({ symbol, className = '' }: PriceDisplayProps) {
  const { price, loading, error, priceChange } = useCryptoPrice(symbol)

  if (loading) {
    return (
      <div data-testid="price-skeleton" className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <p>Failed to load price</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const formatPrice = (value: number) => {
    if (value < 0.01) {
      return `$${value.toFixed(8)}`
    } else if (value < 1) {
      return `$${value.toFixed(4)}`
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    }
  }

  const getPriceChangeColor = () => {
    if (priceChange > 0) return 'text-green-600'
    if (priceChange < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatPriceChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  return (
    <div data-testid="price-display" className={`${className}`}>
      <div className="text-2xl font-bold">
        {price !== undefined ? formatPrice(price) : '--'}
      </div>
      <div className={`text-sm ${getPriceChangeColor()}`}>
        {formatPriceChange(priceChange)}
      </div>
    </div>
  )
}