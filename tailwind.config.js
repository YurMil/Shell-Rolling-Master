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
        md: {
          base: '#141218',
          surface: '#1d1b20',
          surface2: '#2b2930',
          primary: '#d0bcff',
          onPrimary: '#381e72',
          secondary: '#ccc2dc',
          outline: '#938f99',
          error: '#f2b8b5'
        }
      },
      fontFamily: {
        sans: ['Roboto', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
