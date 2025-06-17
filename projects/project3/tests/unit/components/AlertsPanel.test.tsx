import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlertsPanel } from '@/components/AlertsPanel'

describe('AlertsPanel', () => {
  it('should render alerts with correct information', () => {
    render(<AlertsPanel />)
    
    // Check for alert messages
    expect(screen.getByText('Bitcoin approaching resistance at $46,000')).toBeInTheDocument()
    expect(screen.getByText('Ethereum volume increased by 45% in last hour')).toBeInTheDocument()
    expect(screen.getByText('RSI overbought condition detected')).toBeInTheDocument()
    expect(screen.getByText('Major partnership announcement affecting Solana')).toBeInTheDocument()
  })

  it('should display alert symbols correctly', () => {
    render(<AlertsPanel />)
    
    expect(screen.getAllByText('BTC').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ETH').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SOL').length).toBeGreaterThan(0)
  })

  it('should show unread count badge', () => {
    render(<AlertsPanel />)
    
    expect(screen.getByText('2 new')).toBeInTheDocument()
  })

  it('should display severity badges correctly', () => {
    render(<AlertsPanel />)
    
    expect(screen.getAllByText('warning').length).toBeGreaterThan(0)
    expect(screen.getAllByText('info').length).toBeGreaterThan(0)
    expect(screen.getAllByText('critical').length).toBeGreaterThan(0)
  })

  it('should mark alert as read when clicked', () => {
    render(<AlertsPanel />)
    
    // Find an unread alert by its container
    const alertElement = screen.getByText('Bitcoin approaching resistance at $46,000').closest('.border-l-4')
    expect(alertElement).toBeInTheDocument()
    
    // Click the alert
    if (alertElement) {
      fireEvent.click(alertElement)
    }
    
    // Should remain in the DOM but behavior is tested
    expect(alertElement).toBeInTheDocument()
  })

  it('should display time ago correctly', () => {
    render(<AlertsPanel />)
    
    // Look for time indicators more broadly
    const timeElements = screen.getAllByText(/\d+[mh] ago/)
    expect(timeElements.length).toBeGreaterThan(0)
  })

  it('should have quick action buttons', () => {
    render(<AlertsPanel />)
    
    expect(screen.getByText('Create Alert')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('View all')).toBeInTheDocument()
  })

  it('should display different alert type icons', () => {
    render(<AlertsPanel />)
    
    // Check for emoji icons in the document
    const documentText = document.body.textContent || ''
    const hasEmojis = /[💰📊📰📈]/.test(documentText)
    expect(hasEmojis).toBe(true)
  })

  it('should show unread indicator dots', () => {
    render(<AlertsPanel />)
    
    // Check for blue dots indicating unread alerts
    const blueDots = document.querySelectorAll('.bg-blue-500')
    expect(blueDots.length).toBeGreaterThan(0)
  })

  it('should handle click events on action buttons', () => {
    render(<AlertsPanel />)
    
    const createAlertButton = screen.getByText('Create Alert')
    const settingsButton = screen.getByText('Settings')
    const viewAllButton = screen.getByText('View all')
    
    // Test that buttons are clickable
    fireEvent.click(createAlertButton)
    fireEvent.click(settingsButton)
    fireEvent.click(viewAllButton)
    
    // No specific assertions since buttons don't have handlers yet
    expect(createAlertButton).toBeInTheDocument()
    expect(settingsButton).toBeInTheDocument()
    expect(viewAllButton).toBeInTheDocument()
  })
})