/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Paleta GoldLock ──────────────────────
        // Base: preto, branco, cinzas quentes
        ink: {
          50:  '#F7F7F5',
          100: '#EFEEEB',
          200: '#DEDED9',
          300: '#C8C7C1',
          400: '#A8A79F',
          500: '#6B6A62',
          600: '#4A4940',
          700: '#2E2D27',
          800: '#1A1916',
          900: '#0D0C0A',
        },
        // Dourado — o acento da marca
        gold: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#F5C842',
          400: '#E8B422',
          500: '#C9A227', // ← dourado principal
          600: '#A8831A',
          700: '#856512',
          800: '#5C440B',
          900: '#3A2B06',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
