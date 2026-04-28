/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        serif:  ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:   ['DM Sans', 'system-ui', 'sans-serif'],
        mono:   ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink:     '#0D0F14',
        pine:    '#1B3A2D',
        moss:    '#2D5A45',
        sage:    '#4A8060',
        mist:    '#8FBF9F',
        cream:   '#F5F0E8',
        stone:   '#E8E0D0',
        gold:    '#C9973A',
        goldLt:  '#E8B84B',
        silver:  '#94A3B8',
        slate:   '#5A6A7A',
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
