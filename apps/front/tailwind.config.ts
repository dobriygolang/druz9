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
        // Pixel RPG redesign palette
        parch: {
          0: '#f6ead0', 1: '#ecdcb2', 2: '#dcc690', 3: '#c7ab6e', 4: '#a88850',
        },
        ink: {
          0: '#3b2a1a', 1: '#5a3f27', 2: '#7a593a', 3: '#9a7a54',
        },
        moss: {
          0: '#2d4a35', 1: '#3d6149', 2: '#6b8a6a', 3: '#9fb89a',
        },
        ember: {
          0: '#7a3d12', 1: '#b8692a', 2: '#d48a3c', 3: '#e9b866',
        },
        rarity: {
          common: '#8a735a', uncommon: '#5a7f4c', rare: '#3b6a8f',
          epic: '#7a4a8f', legendary: '#b8782a',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        geist: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        silkscreen: ['"Silkscreen"', '"JetBrains Mono"', 'monospace'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'rpg-display': ['32px', { lineHeight: '1.1', fontWeight: '700' }],
        'rpg-title':   ['22px', { lineHeight: '1.15', fontWeight: '600' }],
        'rpg-heading': ['17px', { lineHeight: '1.25', fontWeight: '600' }],
        'rpg-label':   ['14px', { lineHeight: '1.45' }],
        'rpg-small':   ['12px', { lineHeight: '1.4' }],
        'rpg-mono':    ['11px', { letterSpacing: '0.02em' }],
      },
      borderRadius: {
        '2xl': '14px',
        '3xl': '16px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
        panel: '4px 4px 0 0 #3b2a1a',
      },
      transitionTimingFunction: {
        step: 'steps(4, end)',
        'pixel-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
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
