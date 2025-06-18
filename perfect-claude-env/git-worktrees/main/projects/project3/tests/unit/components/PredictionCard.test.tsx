import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { PredictionCard } from '@/components/PredictionCard'

const mockPrediction = {
  sevenDayTarget: 48000,
  thirtyDayTarget: 52000,
  confidence: 75,
  direction: 'buy',
  keyFactors: ['Strong support', 'Positive momentum'],
  riskAssessment: 'Moderate risk',
  technicalSummary: 'Bullish indicators',
  fundamentalSummary: 'Strong adoption',
  contraryFactors: ['Regulatory uncertainty'],
}

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PredictionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ prediction: mockPrediction })
    })
  })

  it('should show loading state initially', () => {
    const { container } = render(<PredictionCard symbol="BTC" />)
    
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should fetch and display prediction data', async () => {
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('$48,000')).toBeInTheDocument()
    })
    
    expect(screen.getByText('$52,000')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('buy')).toBeInTheDocument()
  })

  it('should display key factors', async () => {
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('Strong support')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Positive momentum')).toBeInTheDocument()
  })

  it('should display technical analysis', async () => {
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('Technical Analysis')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Bullish indicators')).toBeInTheDocument()
  })

  it('should display risk assessment', async () => {
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Moderate risk')).toBeInTheDocument()
  })

  it('should display contrary factors as risk factors', async () => {
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('Risk Factors')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Regulatory uncertainty')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'))
    
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load prediction')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('should handle different confidence levels with appropriate colors', async () => {
    const highConfidencePrediction = { ...mockPrediction, confidence: 85 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ prediction: highConfidencePrediction })
    })
    
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      const confidenceElement = screen.getByText('85%')
      expect(confidenceElement).toHaveClass('text-green-600')
    })
  })

  it('should display medium confidence correctly', async () => {
    const mediumConfidencePrediction = { ...mockPrediction, confidence: 65 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ prediction: mediumConfidencePrediction })
    })
    
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      const confidenceElement = screen.getByText('65%')
      expect(confidenceElement).toHaveClass('text-yellow-600')
    })
  })

  it('should display low confidence correctly', async () => {
    const lowConfidencePrediction = { ...mockPrediction, confidence: 45 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ prediction: lowConfidencePrediction })
    })
    
    render(<PredictionCard symbol="BTC" />)
    
    await waitFor(() => {
      const confidenceElement = screen.getByText('45%')
      expect(confidenceElement).toHaveClass('text-red-600')
    })
  })

  it('should call fetch with correct parameters', () => {
    render(<PredictionCard symbol="ETH" />)
    
    expect(mockFetch).toHaveBeenCalledWith('/api/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: 'ETH',
        timeframe: '7d',
      }),
    })
  })
})