/**
 * Professional Animation System for Crypto Trading Platform
 * Smooth, performant animations optimized for real-time data
 */

export const animations = {
  // Timing functions
  timing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
  },

  // Duration presets
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
    slowest: '700ms',
  },

  // Keyframe animations
  keyframes: {
    // Price update flash
    priceFlash: {
      '0%': { backgroundColor: 'transparent' },
      '50%': { backgroundColor: 'var(--flash-color, rgba(34, 197, 94, 0.2))' },
      '100%': { backgroundColor: 'transparent' },
    },

    // Pulse for live indicators
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },

    // Slide in animations
    slideInUp: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideInDown: {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideInLeft: {
      '0%': { transform: 'translateX(-10px)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    slideInRight: {
      '0%': { transform: 'translateX(10px)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },

    // Fade animations
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    fadeOut: {
      '0%': { opacity: '1' },
      '100%': { opacity: '0' },
    },

    // Scale animations
    scaleIn: {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    scaleOut: {
      '0%': { transform: 'scale(1)', opacity: '1' },
      '100%': { transform: 'scale(0.95)', opacity: '0' },
    },

    // Loading spinner
    spin: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },

    // Shimmer for loading states
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },

    // Chart drawing animation
    drawLine: {
      '0%': { strokeDashoffset: '1000' },
      '100%': { strokeDashoffset: '0' },
    },

    // Notification shake
    shake: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
    },

    // Connection status blink
    blink: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0' },
    },
  },

  // Transition presets
  transitions: {
    // Base transitions
    all: 'all var(--duration, 250ms) var(--timing, cubic-bezier(0.4, 0, 0.2, 1))',
    colors: 'background-color, border-color, color, fill, stroke var(--duration, 250ms) var(--timing, cubic-bezier(0.4, 0, 0.2, 1))',
    opacity: 'opacity var(--duration, 250ms) var(--timing, cubic-bezier(0.4, 0, 0.2, 1))',
    transform: 'transform var(--duration, 250ms) var(--timing, cubic-bezier(0.4, 0, 0.2, 1))',
    
    // Specific use cases
    priceUpdate: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    hover: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    focus: 'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    collapse: 'height 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // CSS classes for animations
  classes: {
    // Price changes
    priceIncrease: 'animate-[priceFlash_600ms_ease-out] [--flash-color:rgba(34,197,94,0.2)]',
    priceDecrease: 'animate-[priceFlash_600ms_ease-out] [--flash-color:rgba(239,68,68,0.2)]',
    
    // Loading states
    pulse: 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]',
    spin: 'animate-[spin_1s_linear_infinite]',
    shimmer: 'animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]',
    
    // Entry animations
    fadeIn: 'animate-[fadeIn_250ms_ease-out]',
    slideInUp: 'animate-[slideInUp_350ms_cubic-bezier(0.23,1,0.32,1)]',
    scaleIn: 'animate-[scaleIn_250ms_cubic-bezier(0.23,1,0.32,1)]',
    
    // Hover states
    hoverScale: 'transition-transform duration-150 hover:scale-[1.02]',
    hoverGlow: 'transition-shadow duration-250 hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]',
    
    // Active states
    activeScale: 'transition-transform duration-150 active:scale-[0.98]',
  },
}

// Utility functions
export const getAnimation = (name: keyof typeof animations.keyframes, duration = '250ms', timing = 'ease') => ({
  animationName: name,
  animationDuration: duration,
  animationTimingFunction: animations.timing[timing as keyof typeof animations.timing] || timing,
  animationFillMode: 'both',
})

export const getTransition = (properties: string[], duration = '250ms', timing = 'ease') => ({
  transitionProperty: properties.join(', '),
  transitionDuration: duration,
  transitionTimingFunction: animations.timing[timing as keyof typeof animations.timing] || timing,
})

// React Spring configs for complex animations
export const springConfigs = {
  default: { tension: 180, friction: 25 },
  gentle: { tension: 120, friction: 20 },
  wobbly: { tension: 180, friction: 12 },
  stiff: { tension: 210, friction: 30 },
  slow: { tension: 100, friction: 40 },
}

// Framer Motion variants
export const motionVariants = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  },
  price: {
    initial: { scale: 1 },
    increase: { 
      scale: [1, 1.05, 1],
      color: ['#ffffff', '#22c55e', '#ffffff'],
      transition: { duration: 0.6 },
    },
    decrease: { 
      scale: [1, 1.05, 1],
      color: ['#ffffff', '#ef4444', '#ffffff'],
      transition: { duration: 0.6 },
    },
  },
}