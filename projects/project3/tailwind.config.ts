import type { Config } from 'tailwindcss'
import { cryptoColors, typography, animations, designSystem } from './src/lib/design-system'

const config: Config = {
  darkMode: "class",
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Map our crypto color system
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Primary colors
        primary: {
          DEFAULT: cryptoColors.primary[500],
          foreground: "hsl(var(--primary-foreground))",
          ...cryptoColors.primary,
        },
        
        // Success (Buy/Profit)
        success: {
          DEFAULT: cryptoColors.success[500],
          ...cryptoColors.success,
        },
        
        // Danger (Sell/Loss)
        danger: {
          DEFAULT: cryptoColors.danger[500],
          ...cryptoColors.danger,
        },
        
        // Warning
        warning: {
          DEFAULT: cryptoColors.warning[500],
          ...cryptoColors.warning,
        },
        
        // Dark mode colors
        dark: cryptoColors.dark,
        
        // Light mode colors
        light: cryptoColors.light,
        
        // Crypto-specific colors
        crypto: cryptoColors.crypto,
        
        // Chart colors
        chart: cryptoColors.chart,
        
        // Secondary/Muted colors
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        
        // Card and popover
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      
      // Typography
      fontFamily: {
        sans: typography.fonts.sans.split(','),
        mono: typography.fonts.mono.split(','),
        display: typography.fonts.display.split(','),
      },
      
      fontSize: {
        // Display sizes
        'display-xl': [typography.sizes.display.xl.size, { 
          lineHeight: typography.sizes.display.xl.lineHeight,
          letterSpacing: typography.sizes.display.xl.tracking,
          fontWeight: typography.sizes.display.xl.weight,
        }],
        'display-lg': [typography.sizes.display.lg.size, { 
          lineHeight: typography.sizes.display.lg.lineHeight,
          letterSpacing: typography.sizes.display.lg.tracking,
          fontWeight: typography.sizes.display.lg.weight,
        }],
        
        // Data sizes
        'price-main': [typography.sizes.data.price.size, { 
          lineHeight: typography.sizes.data.price.lineHeight,
          letterSpacing: typography.sizes.data.price.tracking,
          fontWeight: typography.sizes.data.price.weight,
        }],
        'price-change': [typography.sizes.data.change.size, { 
          lineHeight: typography.sizes.data.change.lineHeight,
          letterSpacing: typography.sizes.data.change.tracking,
          fontWeight: typography.sizes.data.change.weight,
        }],
      },
      
      // Spacing
      spacing: designSystem.spacing,
      
      // Border radius
      borderRadius: {
        ...designSystem.borderRadius,
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      // Box shadows
      boxShadow: {
        ...designSystem.shadows,
        'glow-sm': designSystem.shadows.glow.sm,
        'glow-md': designSystem.shadows.glow.md,
        'glow-lg': designSystem.shadows.glow.lg,
        'glow-success': designSystem.shadows.glow.success,
        'glow-danger': designSystem.shadows.glow.danger,
      },
      
      // Z-index
      zIndex: designSystem.zIndex,
      
      // Animations
      keyframes: {
        ...animations.keyframes,
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      
      animation: {
        ...animations.classes,
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      
      // Transition timing functions
      transitionTimingFunction: animations.timing,
      
      // Transition durations
      transitionDuration: animations.duration,
      
      // Background gradients
      backgroundImage: {
        'gradient-primary': cryptoColors.effects.gradient.primary,
        'gradient-success': cryptoColors.effects.gradient.success,
        'gradient-danger': cryptoColors.effects.gradient.danger,
        'gradient-premium': cryptoColors.effects.gradient.premium,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config