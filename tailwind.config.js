/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#4A90E2',
          mint: '#50E3C2',
          success: '#7ED321',
          warning: '#F5A623',
          danger: '#D0021B',
          bg: '#F7F9FC',
          slate: '#2C3E50',
          gray: '#7F8C8D',
        },
        zone: {
          green: {
            bg: '#E8F5E9',
            text: '#2E7D32',
            border: '#4CAF50',
          },
          yellow: {
            bg: '#FFF8E1',
            text: '#F57F17',
            border: '#FFC107',
          },
          orange: {
            bg: '#FFF3E0',
            text: '#E65100',
            border: '#FF9800',
          },
          red: {
            bg: '#FFEBEE',
            text: '#C62828',
            border: '#F44336',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
