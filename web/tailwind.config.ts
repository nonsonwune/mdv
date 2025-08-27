import type { Config } from "tailwindcss"

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out'
      },
      colors: {
        ink: {
          900: "#0a0a0a",
          700: "#202020",
          600: "#3a3a3a",
        },
        paper: {
          DEFAULT: "#ffffff",
        },
        maroon: {
          700: "#7a0f2a",
          800: "#5d0b20",
        },
        neutral: {
          200: "#eaeaea",
        },
        success: "#0f8a4b",
        warning: "#a35c00",
        danger: "#b00020",
      },
    },
  },
  plugins: [],
} satisfies Config

