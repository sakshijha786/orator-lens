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
        background: '#0a0d14',
        surface: '#111622',
        'surface-elevated': '#181f2f',
        'surface-card': '#1c2436',
        'border-subtle': '#273148',
        gold: {
          DEFAULT: '#10b981',
          light: '#34d399',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        candidate: {
          DEFAULT: '#f43f5e',
          light: '#fb7185',
          glow: 'rgba(244, 63, 94, 0.25)',
        },
        primary: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          glow: 'rgba(99, 102, 241, 0.25)',
        },
        accent: {
          cyan: '#06b6d4',
          amber: '#f59e0b',
          purple: '#a855f7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
