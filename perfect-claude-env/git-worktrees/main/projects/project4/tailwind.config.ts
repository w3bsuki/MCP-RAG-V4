import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
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
        // Terminal Color Palette
        terminal: {
          black: "#000000",
          white: "#FFFFFF", 
          gray: "#C0C0C0",
          darkgray: "#808080",
          green: "#00FF00",
          red: "#FF0000",
        }
      },
      fontFamily: {
        mono: ['Courier Prime', 'Courier New', 'monospace'],
      },
      // Remove all border radius
      borderRadius: {
        lg: "0px",
        md: "0px", 
        sm: "0px",
      },
      // Windows 95 raised/sunken effects
      boxShadow: {
        'raised': 'inset 2px 2px 0px #FFFFFF, inset -2px -2px 0px #808080',
        'sunken': 'inset -2px -2px 0px #FFFFFF, inset 2px 2px 0px #808080',
        'raised-thick': 'inset 3px 3px 0px #FFFFFF, inset -3px -3px 0px #808080',
        'sunken-thick': 'inset -3px -3px 0px #FFFFFF, inset 3px 3px 0px #808080',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config