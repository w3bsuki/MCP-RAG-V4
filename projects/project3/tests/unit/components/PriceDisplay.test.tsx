import { render, screen, waitFor } from '@testing-library/react'
import { PriceDisplay } from '@/components/PriceDisplay'
import { useCryptoPrice } from '@/hooks/useCryptoPrice'
import '@testing-library/jest-dom'

// Mock the custom hook
jest.mock('@/hooks/useCryptoPrice')

describe('PriceDisplay Component', () => {
  const mockUseCryptoPrice = useCryptoPrice as jest.MockedFunction<typeof useCryptoPrice>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display loading state initially', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: undefined,
      loading: true,
      error: null,
      priceChange: 0,
    })

    render(<PriceDisplay symbol="BTC" />)
    
    expect(screen.getByTestId('price-skeleton')).toBeInTheDocument()
  })

  it('should display price when loaded', async () => {
    mockUseCryptoPrice.mockReturnValue({
      price: 45000.50,
      loading: false,
      error: null,
      priceChange: 2.5,
    })

    render(<PriceDisplay symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('$45,000.50')).toBeInTheDocument()
      expect(screen.getByText('+2.5%')).toBeInTheDocument()
    })
  })

  it('should show green color for positive price change', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: 45000,
      loading: false,
      error: null,
      priceChange: 5.2,
    })

    render(<PriceDisplay symbol="BTC" />)
    
    const priceChange = screen.getByText('+5.2%')
    expect(priceChange).toHaveClass('text-green-600')
  })

  it('should show red color for negative price change', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: 45000,
      loading: false,
      error: null,
      priceChange: -3.8,
    })

    render(<PriceDisplay symbol="BTC" />)
    
    const priceChange = screen.getByText('-3.8%')
    expect(priceChange).toHaveClass('text-red-600')
  })

  it('should display error state', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: undefined,
      loading: false,
      error: new Error('Failed to fetch price'),
      priceChange: 0,
    })

    render(<PriceDisplay symbol="BTC" />)
    
    expect(screen.getByText('Failed to load price')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('should format large numbers correctly', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: 1234567.89,
      loading: false,
      error: null,
      priceChange: 0,
    })

    render(<PriceDisplay symbol="BTC" />)
    
    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument()
  })

  it('should handle zero price change', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: 45000,
      loading: false,
      error: null,
      priceChange: 0,
    })

    render(<PriceDisplay symbol="BTC" />)
    
    const priceChange = screen.getByText('0.0%')
    expect(priceChange).toHaveClass('text-gray-600')
  })

  it('should update price in real-time', async () => {
    const { rerender } = render(<PriceDisplay symbol="BTC" />)
    
    // Initial price
    mockUseCryptoPrice.mockReturnValue({
      price: 45000,
      loading: false,
      error: null,
      priceChange: 2.5,
    })
    
    rerender(<PriceDisplay symbol="BTC" />)
    expect(screen.getByText('$45,000.00')).toBeInTheDocument()
    
    // Updated price
    mockUseCryptoPrice.mockReturnValue({
      price: 45500,
      loading: false,
      error: null,
      priceChange: 3.6,
    })
    
    rerender(<PriceDisplay symbol="BTC" />)
    
    await waitFor(() => {
      expect(screen.getByText('$45,500.00')).toBeInTheDocument()
      expect(screen.getByText('+3.6%')).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: 45000,
      loading: false,
      error: null,
      priceChange: 0,
    })

    render(<PriceDisplay symbol="BTC" className="custom-class" />)
    
    const container = screen.getByTestId('price-display')
    expect(container).toHaveClass('custom-class')
  })

  it('should handle decimal places correctly', () => {
    mockUseCryptoPrice.mockReturnValue({
      price: 0.00012345,
      loading: false,
      error: null,
      priceChange: 1.2,
    })

    render(<PriceDisplay symbol="SHIB" />)
    
    expect(screen.getByText('$0.00012345')).toBeInTheDocument()
  })
})