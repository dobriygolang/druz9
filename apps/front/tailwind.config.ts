import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF8400',
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#FF8400',
          600: '#ea7700',
        },
        surface: {
          DEFAULT: '#F2F3F0',
          sidebar: '#E7E8E5',
          border: '#CBCCC9',
          white: '#FFFFFF',
        },
        dark: {
          DEFAULT: '#0f172a',
          navy: '#0f1629',
          card: '#1e293b',
        },
        text: {
          primary: '#18181b',
          secondary: '#64748b',
          muted: '#94a3b8',
        },
        indigo: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#6366f1',
          700: '#3730a3',
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
    },
  },
  plugins: [],
} satisfies Config
