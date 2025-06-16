import { describe, it, expect } from 'vitest'
import { 
  formatPrice, 
  formatDate, 
  generateInitials, 
  validateEmail, 
  validatePhone, 
  truncateText, 
  calculateAverageRating 
} from '../lib/utils'

describe('utils', () => {
  describe('formatPrice', () => {
    it('should format quote price', () => {
      expect(formatPrice('quote')).toBe('Contact for quote')
    })

    it('should format hourly price', () => {
      expect(formatPrice('hourly', 50)).toBe('$50/hr')
      expect(formatPrice('hourly', 50, 75)).toBe('$50-75/hr')
    })

    it('should format fixed price', () => {
      expect(formatPrice('fixed', 100)).toBe('$100')
      expect(formatPrice('fixed', 100, 200)).toBe('$100-200')
    })

    it('should handle missing price', () => {
      expect(formatPrice('fixed')).toBe('Price not set')
    })
  })

  describe('generateInitials', () => {
    it('should generate initials from name', () => {
      expect(generateInitials('John Doe')).toBe('JD')
      expect(generateInitials('Jane Smith Johnson')).toBe('JS')
      expect(generateInitials('Alice')).toBe('A')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
    })
  })

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(true)
      expect(validatePhone('+1234567890')).toBe(true)
      expect(validatePhone('123-456-7890')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('abc')).toBe(false)
      expect(validatePhone('123')).toBe(false)
    })
  })

  describe('truncateText', () => {
    it('should truncate long text', () => {
      expect(truncateText('This is a long text', 10)).toBe('This is a ...')
    })

    it('should not truncate short text', () => {
      expect(truncateText('Short', 10)).toBe('Short')
    })
  })

  describe('calculateAverageRating', () => {
    it('should calculate average rating', () => {
      const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 3 }]
      expect(calculateAverageRating(reviews)).toBe(4)
    })

    it('should handle empty reviews', () => {
      expect(calculateAverageRating([])).toBe(0)
    })
  })
})