import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MarketOverview } from '@/components/MarketOverview'

describe('MarketOverview', () => {
  it('should render market overview cards', () => {
    render(<MarketOverview />)
    
    // Check for card titles
    expect(screen.getByText('Total Market Cap')).toBeInTheDocument()
    expect(screen.getByText('24h Volume')).toBeInTheDocument()
    expect(screen.getByText('BTC Dominance')).toBeInTheDocument()
    expect(screen.getByText('Fear & Greed')).toBeInTheDocument()
    expect(screen.getByText('Active Coins')).toBeInTheDocument()
    expect(screen.getByText('Market Status')).toBeInTheDocument()
  })

  it('should display formatted market cap value', () => {
    render(<MarketOverview />)
    
    // Should format 1.7T market cap
    expect(screen.getByText('$1.7T')).toBeInTheDocument()
  })

  it('should display formatted volume value', () => {
    render(<MarketOverview />)
    
    // Should format 45B volume
    expect(screen.getByText('$45.0B')).toBeInTheDocument()
  })

  it('should display BTC dominance percentage', () => {
    render(<MarketOverview />)
    
    expect(screen.getByText('52.3%')).toBeInTheDocument()
  })

  it('should display fear and greed index', () => {
    render(<MarketOverview />)
    
    expect(screen.getByText('65')).toBeInTheDocument()
    expect(screen.getByText('Greed')).toBeInTheDocument()
  })

  it('should display active coins count', () => {
    render(<MarketOverview />)
    
    expect(screen.getByText('2,847')).toBeInTheDocument()
    expect(screen.getByText('Listed')).toBeInTheDocument()
  })

  it('should show market status as live', () => {
    render(<MarketOverview />)
    
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Real-time data')).toBeInTheDocument()
  })

  it('should display market cap change percentage', () => {
    render(<MarketOverview />)
    
    expect(screen.getByText('+2.4%')).toBeInTheDocument()
  })

  it('should display global volume label', () => {
    render(<MarketOverview />)
    
    expect(screen.getByText('Global')).toBeInTheDocument()
  })

  it('should have proper BTC dominance progress bar', () => {
    render(<MarketOverview />)
    
    // Check for progress bar container
    const progressBars = document.querySelectorAll('.bg-gray-200')
    expect(progressBars.length).toBeGreaterThan(0)
    
    // Check for progress fill
    const progressFills = document.querySelectorAll('.bg-orange-500')
    expect(progressFills.length).toBeGreaterThan(0)
  })

  it('should have animated elements', () => {
    render(<MarketOverview />)
    
    // Check for pulse animation on market status
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('should use proper color for positive market cap change', () => {
    render(<MarketOverview />)
    
    const changeElement = screen.getByText('+2.4%')
    expect(changeElement).toHaveClass('text-green-600')
  })

  it('should format fear and greed color correctly', () => {
    render(<MarketOverview />)
    
    const greedLabel = screen.getByText('Greed')
    expect(greedLabel).toHaveClass('text-orange-600')
  })
})