'use client'

import { useState, useEffect } from 'react'
import { ClaudePrediction } from '@/types/prediction'

interface PredictionCardProps {
  symbol: string
}

export function PredictionCard({ symbol }: PredictionCardProps) {
  const [prediction, setPrediction] = useState<ClaudePrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPrediction() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol,
            timeframe: '7d',
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch prediction')
        }

        const data = await response.json()
        setPrediction(data.prediction)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPrediction()
  }, [symbol])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  if (error || !prediction) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Failed to load prediction</div>
        <button 
          onClick={() => window.location.reload()}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          Try again
        </button>
      </div>
    )
  }

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'strong_buy':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'buy':
        return 'text-green-500 bg-green-50 dark:bg-green-900/10'
      case 'neutral':
        return 'text-gray-500 bg-gray-100 dark:bg-gray-800'
      case 'sell':
        return 'text-red-500 bg-red-50 dark:bg-red-900/10'
      case 'strong_sell':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-800'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Prediction Summary */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">7-Day Target</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${prediction.sevenDayTarget.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">30-Day Target</div>
          <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            ${prediction.thirtyDayTarget.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Direction and Confidence */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getDirectionColor(prediction.direction)}`}>
            {prediction.direction.replace('_', ' ')}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
          <div className={`text-lg font-bold ${getConfidenceColor(prediction.confidence)}`}>
            {prediction.confidence}%
          </div>
        </div>
      </div>

      {/* Key Factors */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Key Factors
        </h4>
        <ul className="space-y-1">
          {prediction.keyFactors.slice(0, 3).map((factor, index) => (
            <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {factor}
            </li>
          ))}
        </ul>
      </div>

      {/* Technical Summary */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Technical Analysis
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {prediction.technicalSummary}
        </p>
      </div>

      {/* Risk Assessment */}
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
          Risk Assessment
        </h4>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {prediction.riskAssessment}
        </p>
      </div>

      {/* Contrary Factors */}
      {prediction.contraryFactors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Risk Factors
          </h4>
          <ul className="space-y-1">
            {prediction.contraryFactors.slice(0, 2).map((factor, index) => (
              <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start">
                <span className="text-red-500 mr-2">⚠</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        AI-generated prediction. Not financial advice. Always do your own research.
      </div>
    </div>
  )
}