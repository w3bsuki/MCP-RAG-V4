/**
 * Professional Crypto Trading Color System
 * Inspired by TradingView, Binance, and modern financial platforms
 */

export const cryptoColors = {
  // Primary Brand Colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main brand blue
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },

  // Success/Buy Colors (Green)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Danger/Sell Colors (Red)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main danger red
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Warning/Caution Colors (Amber)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning amber
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Dark Mode Background Colors
  dark: {
    bg: {
      primary: '#0b0e11',    // Main dark background
      secondary: '#131721',  // Card/panel background
      tertiary: '#1c2030',   // Elevated surfaces
      hover: '#242940',      // Hover state
      active: '#2d3349',     // Active/selected state
    },
    border: {
      primary: '#2d3349',    // Main borders
      secondary: '#3a4157',  // Subtle borders
      focus: '#0ea5e9',      // Focus borders
    }
  },

  // Light Mode Background Colors
  light: {
    bg: {
      primary: '#ffffff',    // Main background
      secondary: '#f8fafc',  // Card/panel background
      tertiary: '#f1f5f9',   // Elevated surfaces
      hover: '#e2e8f0',      // Hover state
      active: '#cbd5e1',     // Active/selected state
    },
    border: {
      primary: '#e2e8f0',    // Main borders
      secondary: '#cbd5e1',  // Subtle borders
      focus: '#0ea5e9',      // Focus borders
    }
  },

  // Crypto-specific Colors
  crypto: {
    bitcoin: '#f7931a',    // Bitcoin orange
    ethereum: '#627eea',   // Ethereum blue
    binance: '#f3ba2f',    // Binance yellow
    solana: '#00ffa3',     // Solana green
    cardano: '#0033ad',    // Cardano blue
    polkadot: '#e6007a',   // Polkadot pink
    avalanche: '#e84142',  // Avalanche red
    chainlink: '#2a5ada',  // Chainlink blue
  },

  // Chart Colors
  chart: {
    candle: {
      bullish: '#22c55e',  // Green candles
      bearish: '#ef4444',  // Red candles
    },
    volume: {
      bullish: 'rgba(34, 197, 94, 0.5)',   // Semi-transparent green
      bearish: 'rgba(239, 68, 68, 0.5)',   // Semi-transparent red
    },
    indicators: {
      ma7: '#fbbf24',      // Moving Average 7 - Yellow
      ma25: '#60a5fa',     // Moving Average 25 - Blue
      ma99: '#c084fc',     // Moving Average 99 - Purple
      rsi: '#34d399',      // RSI - Emerald
      macd: '#f472b6',     // MACD - Pink
      bollinger: '#94a3b8', // Bollinger Bands - Slate
    }
  },

  // Text Colors
  text: {
    primary: {
      dark: '#f1f5f9',     // Primary text on dark
      light: '#0f172a',    // Primary text on light
    },
    secondary: {
      dark: '#94a3b8',     // Secondary text on dark
      light: '#64748b',    // Secondary text on light
    },
    muted: {
      dark: '#64748b',     // Muted text on dark
      light: '#94a3b8',    // Muted text on light
    }
  },

  // Special Effects
  effects: {
    glow: {
      success: '0 0 20px rgba(34, 197, 94, 0.5)',
      danger: '0 0 20px rgba(239, 68, 68, 0.5)',
      primary: '0 0 20px rgba(14, 165, 233, 0.5)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      premium: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    }
  }
} as const

// Type-safe color getter
export type CryptoColorKey = keyof typeof cryptoColors
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950

// Utility function to get colors with opacity
export const withOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}