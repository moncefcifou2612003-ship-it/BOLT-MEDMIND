/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette
        lavender: {
          50: '#F4F6FF',
          100: '#EBEFFB',
          200: '#E0E5F8',
          300: '#C8D0F0',
          400: '#A5B0E5',
          500: '#8075FF',
          600: '#6C5CE7',
          700: '#5A4BCF',
          800: '#483AA8',
          900: '#3A2E84',
        },
        mint: {
          400: '#2DD4A7',
          500: '#00B894',
          600: '#009B7D',
        },
        coral: {
          400: '#FF9E9D',
          500: '#FF7675',
          600: '#E85C5B',
        },
        slateindigo: {
          50: '#F3F4FD',
          100: '#E8ECFB',
          400: '#6B7280',
          500: '#4B5563',
          700: '#3D4453',
          800: '#2D3436',
          900: '#1E242B',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        clay: '0 10px 30px rgba(103,110,144,0.08)',
        'clay-lg': '0 20px 50px rgba(103,110,144,0.12)',
        'clay-sm': '0 4px 14px rgba(103,110,144,0.06)',
        'inner-glow': 'inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(103,110,144,0.04)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
