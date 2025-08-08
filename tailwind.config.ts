import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  safelist: [
    // Dynamic margin classes for tree indentation
    'ml-4', 'ml-8', 'ml-12', 'ml-16', 'ml-20', 'ml-24',
    // Dark mode variants
    'dark:bg-zinc-800', 'dark:bg-zinc-900', 'dark:text-zinc-100',
    'dark:border-zinc-700', 'dark:hover:bg-zinc-800',
    // Animation and interaction classes
    'rotate-0', 'rotate-90', 'scale-102',
    'animate-bounce', 'animate-pulse', 'animate-bounce-in',
  ],
  theme: {
    extend: {
      colors: {
        // Design System Colors
        primary: {
          50: '#fffbeb',
          100: '#fef3c7', 
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24', // Dark mode primary
          500: '#f59e0b', // Primary honey
          600: '#d97706', // Primary hover
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Secondary mint
          600: '#059669', // Secondary hover
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Accent sky
          600: '#0284c7', // Accent hover
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      animation: {
        'bounce-in': 'bounce-in 0.6s ease-out',
        'scale-hover': 'scale-hover 150ms ease-out',
      },
      keyframes: {
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-hover': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.02)' },
        },
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
export default config


