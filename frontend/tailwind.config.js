/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neo-futuristic palette
        surface: {
          DEFAULT: '#0f1117',
          1: '#161b27',
          2: '#1c2333',
          3: '#232b3e',
          4: '#2a3550',
        },
        primary: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
          glow: 'rgba(99,102,241,0.3)',
        },
        accent: {
          cyan: '#22d3ee',
          purple: '#a855f7',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          hover: 'rgba(255,255,255,0.16)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        glass: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(99,102,241,0.4)',
        'glow-green': '0 0 20px rgba(16,185,129,0.4)',
        'glow-red': '0 0 20px rgba(239,68,68,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 8px rgba(99,102,241,0.3)' }, '50%': { boxShadow: '0 0 20px rgba(99,102,241,0.6)' } },
      },
    },
  },
  plugins: [],
}
