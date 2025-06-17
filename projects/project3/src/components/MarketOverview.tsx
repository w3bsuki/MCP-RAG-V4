'use client'

import { useState } from 'react'

interface MarketData {
  totalMarketCap: number
  volume24h: number
  btcDominance: number
  fearGreedIndex: number
  activeCoins: number
  marketCapChange: number
}

export function MarketOverview() {
  const [marketData] = useState<MarketData>({
    totalMarketCap: 1700000000000,
    volume24h: 45000000000,
    btcDominance: 52.3,
    fearGreedIndex: 65,
    activeCoins: 2847,
    marketCapChange: 2.4,
  })

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(1)}T`
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(1)}B`
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(1)}M`
    }
    return `$${num.toLocaleString()}`
  }

  const getFearGreedLabel = (index: number) => {
    if (index >= 75) return 'Extreme Greed'
    if (index >= 55) return 'Greed'
    if (index >= 45) return 'Neutral'
    if (index >= 25) return 'Fear'
    return 'Extreme Fear'
  }

  const getFearGreedColor = (index: number) => {
    if (index >= 75) return 'text-red-600'
    if (index >= 55) return 'text-orange-600'
    if (index >= 45) return 'text-gray-600'
    if (index >= 25) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total Market Cap */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Total Market Cap
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">
          {formatLargeNumber(marketData.totalMarketCap)}
        </div>
        <div className={`text-sm ${marketData.marketCapChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {marketData.marketCapChange >= 0 ? '+' : ''}{marketData.marketCapChange.toFixed(1)}%
        </div>
      </div>

      {/* 24h Volume */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          24h Volume
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">
          {formatLargeNumber(marketData.volume24h)}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Global
        </div>
      </div>

      {/* BTC Dominance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          BTC Dominance
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">
          {marketData.btcDominance.toFixed(1)}%
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${marketData.btcDominance}%` }}
          />
        </div>
      </div>

      {/* Fear & Greed Index */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Fear & Greed
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">
          {marketData.fearGreedIndex}
        </div>
        <div className={`text-sm font-medium ${getFearGreedColor(marketData.fearGreedIndex)}`}>
          {getFearGreedLabel(marketData.fearGreedIndex)}
        </div>
      </div>

      {/* Active Coins */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Active Coins
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">
          {marketData.activeCoins.toLocaleString()}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Listed
        </div>
      </div>

      {/* Market Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Market Status
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-sm font-medium text-green-600">Live</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Real-time data
        </div>
      </div>
    </div>
  )
}