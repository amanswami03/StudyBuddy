module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#3730a3',
          600: '#2e2878',
          700: '#1e1b5e',
          800: '#13114a',
          900: '#0d0b36',
          950: '#080620',
        },
        parchment: {
          50:  '#fffef9',
          100: '#fef9ee',
          200: '#fdf0d5',
          300: '#fae4b0',
        },
        chalk: {
          100: '#f8f5f0',
          200: '#ede8df',
          300: '#d9d0c2',
        },
        board: {
          700: '#1a3a2e',
          800: '#112b22',
          900: '#0b1e17',
        }
      },
      boxShadow: {
        'paper': '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
        'paper-md': '0 2px 8px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.07)',
        'paper-lg': '0 4px 16px rgba(0,0,0,0.12), 0 12px 40px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}
