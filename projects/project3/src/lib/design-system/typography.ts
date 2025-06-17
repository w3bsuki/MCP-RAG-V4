/**
 * Professional Typography System for Crypto Trading Platform
 * Optimized for financial data display and readability
 */

export const typography = {
  // Font families
  fonts: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", Monaco, Consolas, monospace',
    display: '"Inter Display", Inter, -apple-system, sans-serif',
  },

  // Font sizes with line heights
  sizes: {
    // Display sizes for hero sections
    display: {
      xl: { size: '4.5rem', lineHeight: '1', tracking: '-0.02em', weight: '800' },
      lg: { size: '3.75rem', lineHeight: '1', tracking: '-0.02em', weight: '700' },
      md: { size: '3rem', lineHeight: '1.1', tracking: '-0.02em', weight: '700' },
      sm: { size: '2.25rem', lineHeight: '1.2', tracking: '-0.01em', weight: '600' },
    },

    // Headings for sections
    heading: {
      h1: { size: '2rem', lineHeight: '1.25', tracking: '-0.01em', weight: '700' },
      h2: { size: '1.5rem', lineHeight: '1.3', tracking: '-0.01em', weight: '600' },
      h3: { size: '1.25rem', lineHeight: '1.4', tracking: '0', weight: '600' },
      h4: { size: '1.125rem', lineHeight: '1.4', tracking: '0', weight: '500' },
      h5: { size: '1rem', lineHeight: '1.5', tracking: '0', weight: '500' },
      h6: { size: '0.875rem', lineHeight: '1.5', tracking: '0.01em', weight: '500' },
    },

    // Body text
    body: {
      lg: { size: '1.125rem', lineHeight: '1.75', tracking: '0' },
      base: { size: '1rem', lineHeight: '1.75', tracking: '0' },
      sm: { size: '0.875rem', lineHeight: '1.5', tracking: '0' },
      xs: { size: '0.75rem', lineHeight: '1.5', tracking: '0.01em' },
    },

    // Special sizes for financial data
    data: {
      price: { size: '2.5rem', lineHeight: '1', tracking: '-0.02em', weight: '700' },
      change: { size: '1.25rem', lineHeight: '1', tracking: '0', weight: '600' },
      label: { size: '0.75rem', lineHeight: '1', tracking: '0.05em', weight: '500' },
      value: { size: '1rem', lineHeight: '1', tracking: '0', weight: '400' },
    },
  },

  // Font weights
  weights: {
    thin: '100',
    extralight: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Special text styles for crypto UI
  styles: {
    // Profit/Loss indicators
    profit: {
      color: '#22c55e',
      weight: '600',
    },
    loss: {
      color: '#ef4444',
      weight: '600',
    },

    // Price displays
    priceMain: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '2.5rem',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    priceSecondary: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '1.125rem',
      fontWeight: '500',
      letterSpacing: '0',
    },

    // Percentage changes
    percentagePositive: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#22c55e',
    },
    percentageNegative: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#ef4444',
    },

    // Labels and metadata
    label: {
      fontSize: '0.75rem',
      fontWeight: '500',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      opacity: '0.7',
    },

    // Timestamps
    timestamp: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.75rem',
      fontWeight: '400',
      opacity: '0.6',
    },
  },

  // Responsive typography scale
  responsive: {
    // Mobile (base)
    mobile: {
      displayXl: '3rem',
      displayLg: '2.5rem',
      displayMd: '2rem',
      displaySm: '1.75rem',
      h1: '1.75rem',
      h2: '1.375rem',
      h3: '1.125rem',
      priceMain: '2rem',
    },
    // Tablet (md)
    tablet: {
      displayXl: '3.75rem',
      displayLg: '3rem',
      displayMd: '2.5rem',
      displaySm: '2rem',
      h1: '1.875rem',
      h2: '1.5rem',
      h3: '1.25rem',
      priceMain: '2.25rem',
    },
    // Desktop (lg+)
    desktop: {
      displayXl: '4.5rem',
      displayLg: '3.75rem',
      displayMd: '3rem',
      displaySm: '2.25rem',
      h1: '2rem',
      h2: '1.5rem',
      h3: '1.25rem',
      priceMain: '2.5rem',
    },
  },
} as const

// Type definitions
export type FontFamily = keyof typeof typography.fonts
export type FontSize = keyof typeof typography.sizes
export type FontWeight = keyof typeof typography.weights
export type TextStyle = keyof typeof typography.styles

// Utility function to generate CSS classes
export const getTypographyClass = (
  size: FontSize
): string => {
  // For now, return predefined classes based on size
  switch (size) {
    case 'display':
      return 'text-6xl font-extrabold tracking-tight'
    case 'heading':
      return 'text-3xl font-semibold'
    case 'body':
      return 'text-base'
    case 'data':
      return 'font-mono tabular-nums'
    default:
      return ''
  }
}