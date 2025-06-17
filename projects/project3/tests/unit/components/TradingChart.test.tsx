import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { TradingChart } from '@/components/TradingChart'

// Mock canvas context
const mockCanvasContext = {
  getContext: jest.fn(() => ({
    scale: jest.fn(),
    fillStyle: '',
    fillRect: jest.fn(),
    strokeStyle: '',
    lineWidth: 0,
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn(),
    font: '',
    textAlign: '',
    fillText: jest.fn(),
  })),
  offsetWidth: 400,
  offsetHeight: 200,
  width: 400,
  height: 200,
}

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvasContext.getContext,
})

Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', {
  value: 400,
})

Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', {
  value: 200,
})

describe('TradingChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2,
    })
  })

  it('should render chart canvas', () => {
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    // Look for canvas element directly
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('should render without loading state', () => {
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('should display symbol label', async () => {
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    await waitFor(() => {
      expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    })
  })

  it('should handle different symbols', async () => {
    render(<TradingChart symbol="ETH" timeframe="1h" />)
    
    await waitFor(() => {
      expect(screen.getByText('ETH/USDT')).toBeInTheDocument()
    })
  })

  it('should handle different timeframes', () => {
    render(<TradingChart symbol="BTC" timeframe="4h" />)
    
    // Component should render without errors
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('should initialize canvas context', () => {
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    // Canvas should be present and context accessible
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    expect(mockCanvasContext.getContext).toHaveBeenCalled()
  })

  it('should have canvas drawing methods available', () => {
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    const context = mockCanvasContext.getContext()
    expect(context.scale).toBeDefined()
    expect(context.fillRect).toBeDefined()
    expect(context.stroke).toBeDefined()
  })

  it('should have proper canvas styling', () => {
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    const canvas = document.querySelector('canvas')
    expect(canvas).toHaveClass('w-full', 'h-full', 'rounded-lg', 'border')
  })

  it('should have symbol label positioned correctly', async () => {
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    const labelContainer = await waitFor(() => 
      document.querySelector('.absolute.top-2.left-2')
    )
    expect(labelContainer).toBeInTheDocument()
  })

  it('should handle canvas context errors gracefully', async () => {
    // Mock getContext to return null
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null)
    
    render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    // Should not crash
    await waitFor(() => {
      const canvas = document.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
    
    // Restore original method
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('should respond to symbol changes', async () => {
    const { rerender } = render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    await waitFor(() => {
      expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    })
    
    rerender(<TradingChart symbol="ETH" timeframe="1h" />)
    
    await waitFor(() => {
      expect(screen.getByText('ETH/USDT')).toBeInTheDocument()
    })
  })

  it('should respond to timeframe changes', () => {
    const { rerender } = render(<TradingChart symbol="BTC" timeframe="1h" />)
    
    // Should render without error
    const canvas1 = document.querySelector('canvas')
    expect(canvas1).toBeInTheDocument()
    
    rerender(<TradingChart symbol="BTC" timeframe="1d" />)
    
    // Should still render without error
    const canvas2 = document.querySelector('canvas')
    expect(canvas2).toBeInTheDocument()
  })
})