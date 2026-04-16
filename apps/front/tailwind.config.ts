import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#059669',
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#059669',
          600: '#047857',
        },
        surface: {
          DEFAULT: '#F0F5F1',
          sidebar: '#E4EBE5',
          border: '#C1CFC4',
          white: '#FFFFFF',
        },
        dark: {
          DEFAULT: '#0B1210',
          navy: '#070E0C',
          card: '#132420',
        },
        text: {
          primary: '#18181b',
          secondary: '#4B6B52',
          muted: '#7A9982',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10B981',
          700: '#047857',
        },
        success: {
          DEFAULT: '#22c55e',
          bg: '#e8f9ef',
          dark: '#166534',
        },
        warning: {
          DEFAULT: '#f59e0b',
          bg: '#fef3c7',
          light: '#fde68a',
          dark: '#fef9c3',
        },
        danger: {
          DEFAULT: '#ef4444',
          700: '#dc2626',
          bg: '#fef2f2',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        geist: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      borderRadius: {
        '2xl': '14px',
        '3xl': '16px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      keyframes: {
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'stagger-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'page-in': 'page-in 0.25s ease-out both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'modal-in': 'modal-in 0.2s ease-out both',
        'stagger-in': 'stagger-in 0.3s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
