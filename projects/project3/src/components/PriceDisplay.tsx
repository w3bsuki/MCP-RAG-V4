'use client'

import React from 'react'
import { useCryptoPrice } from '@/hooks/useCryptoPrice'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PriceDisplayProps {
  symbol: string
  className?: string
  compact?: boolean
  showChange?: boolean
  showIcon?: boolean
}

export function PriceDisplay({ 
  symbol, 
  className = '', 
  compact = false,
  showChange = true,
  showIcon = false
}: PriceDisplayProps) {
  const { price, loading, error, priceChange } = useCryptoPrice(symbol)

  if (loading) {
    return (
      <div data-testid="price-skeleton" className={cn("inline-flex items-center", className)}>
        <div className={cn(
          "animate-pulse bg-muted rounded",
          compact ? "h-4 w-16" : "h-8 w-32"
        )} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("text-danger", className)}>
        <span className="text-sm">--</span>
      </div>
    )
  }

  const formatPrice = (value: number) => {
    if (compact) {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`
      }
    }
    
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
    if (priceChange > 0) return 'text-success'
    if (priceChange < 0) return 'text-danger'
    return 'text-muted-foreground'
  }

  const getPriceChangeIcon = () => {
    if (priceChange > 0) return <TrendingUp className="w-3 h-3" />
    if (priceChange < 0) return <TrendingDown className="w-3 h-3" />
    return <Minus className="w-3 h-3" />
  }

  const formatPriceChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  if (compact) {
    return (
      <div data-testid="price-display" className={cn("inline-flex items-center gap-1", className)}>
        <span className="font-mono font-semibold">
          {price !== undefined ? formatPrice(price) : '--'}
        </span>
        {showChange && (
          <span className={cn("text-xs font-medium", getPriceChangeColor())}>
            {showIcon && getPriceChangeIcon()}
            {formatPriceChange(priceChange)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div data-testid="price-display" className={cn("space-y-1", className)}>
      <div className="font-mono font-bold">
        {price !== undefined ? formatPrice(price) : '--'}
      </div>
      {showChange && (
        <div className={cn("flex items-center gap-1 text-sm", getPriceChangeColor())}>
          {showIcon && getPriceChangeIcon()}
          <span className="font-medium">
            {formatPriceChange(priceChange)}
          </span>
        </div>
      )}
    </div>
  )
}