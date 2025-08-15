import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Primary Brand - Sage Green (sophisticated, calming)
        primary: {
          50: '#f6f7f4',
          100: '#e9ebe4', 
          200: '#d4d8ca',
          300: '#b8c0a7',
          400: '#9ca687',
          500: '#7a8a68', // Main brand color
          600: '#6b7a59', // Darker for better contrast
          700: '#5a654d', // Text color
          800: '#4a5340',
          900: '#3f4637',
          950: '#20251c',
        },
        // Secondary - Warm Cream (elegant, neutral)
        secondary: {
          50: '#fefefe',
          100: '#fdfcfa',
          200: '#fbf8f2', 
          300: '#f8f2e7',
          400: '#f5ebd8',
          500: '#F5F3F0', // Main background
          600: '#e8d5c4',
          700: '#d4b896',
          800: '#c19a6b',
          900: '#a67c52',
          950: '#8b5a2a',
        },
        // Accent - Warm Gold (luxury, premium)
        accent: {
          50: '#fefbf3',
          100: '#fdf4e1',
          200: '#fae8c2',
          300: '#f6d898', 
          400: '#f0c36c',
          500: '#D4A574', // Main accent
          600: '#c8924a', // Darker for contrast
          700: '#a6763d',
          800: '#875f36',
          900: '#6f4f30',
          950: '#3f2818',
        },
        // Legacy color mappings for backward compatibility
        kai: {
          50: '#f6f7f4',
          100: '#e9ebe4', 
          200: '#d4d8ca',
          300: '#b8c0a7',
          400: '#9ca687',
          500: '#7a8a68',
          600: '#6b7a59',
          700: '#5a654d',
          800: '#4a5340',
          900: '#3f4637',
          950: '#20251c',
        },
        cream: {
          50: '#fefefe',
          100: '#fdfcfa',
          200: '#fbf8f2', 
          300: '#f8f2e7',
          400: '#f5ebd8',
          500: '#F5F3F0',
          600: '#e8d5c4',
          700: '#d4b896',
          800: '#c19a6b',
          900: '#a67c52',
          950: '#8b5a2a',
        },
        gold: {
          50: '#fefbf3',
          100: '#fdf4e1',
          200: '#fae8c2',
          300: '#f6d898', 
          400: '#f0c36c',
          500: '#D4A574',
          600: '#c8924a',
          700: '#a6763d',
          800: '#875f36',
          900: '#6f4f30',
          950: '#3f2818',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        primary: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fadeIn": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slideUp": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "particle": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0", top: "-50%", left: "calc(50% - 10px)" }
        },
        "bounce-small": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "scale-up": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "celebration": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(-100px) rotate(360deg)", opacity: "0" }
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100px) rotate(360deg)", opacity: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fadeIn": "fadeIn 0.5s ease-out",
        "slideUp": "slideUp 0.3s ease-out",
        "particle": "particle 1.5s ease-out forwards",
        "bounce-small": "bounce-small 1s ease-in-out infinite",
        "scale-up": "scale-up 0.3s ease-out forwards",
        "ping-slow": "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "ping-slower": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "celebration": "celebration 1s ease-out forwards",
        "confetti-fall": "confetti-fall 3s ease-out forwards"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config