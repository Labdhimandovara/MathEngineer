/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F8F5F9',
          surface: '#FFFFFF',
          nearWhite: '#FCFAFD',
          neutral: '#F1EBF5',
          cream: '#F5F0E6',
          creamLight: '#FAF7F2',
          deep: '#17131C',
          // Dark mode specific surfaces
          dark: '#17131D',
          darkDeep: '#0F0C13',
          darkSurface: '#211A29',
          darkCard: '#2D2337',
          darkAccent: '#40334D',
        },
        lavender: {
          lightest: '#F8F5F9',
          subtle: '#F1EBF5',
          light: '#E6DDF0',
          soft: '#C6B5D8',
          medium: '#C6B5D8',
          accent: '#A693C2',
          dusty: '#A693C2',
          primary: '#806B99',
          deep: '#806B99',
          dark: '#5D4A70',
          darkest: '#40334D',
        },
        charcoal: {
          DEFAULT: '#27242A',
          dark: '#17131C',
          muted: '#6F6874',
          subtle: '#9A92A0',
          light: '#F7F3FA',
        },
        border: {
          soft: '#E5DFE8',
          subtle: '#ECE7EF',
          accent: '#C6B5D8',
          dark: '#2D2337',
          darkSubtle: '#40334D',
        },
        status: {
          success: '#4E7B58',
          'success-bg': '#EEF5F0',
          warning: '#C28236',
          'warning-bg': '#FAF3EA',
          error: '#C35652',
          'error-bg': '#FDF1F0',
          danger: '#C35652',
          'danger-bg': '#FDF1F0',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(39, 36, 42, 0.04), 0 1px 2px -1px rgba(39, 36, 42, 0.03)',
        card: '0 4px 14px -2px rgba(39, 36, 42, 0.05), 0 2px 6px -1px rgba(39, 36, 42, 0.02)',
        elevated: '0 12px 28px -4px rgba(39, 36, 42, 0.08), 0 4px 10px -2px rgba(39, 36, 42, 0.03)',
        modal: '0 24px 48px -12px rgba(23, 19, 28, 0.25)',
        'dark-subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
        'dark-card': '0 4px 14px -2px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        'me': '12px',
        'me-lg': '16px',
        'me-xl': '20px',
      },
      animation: {
        fadeIn: 'fadeIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideUp: 'slideUp 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleIn: 'scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        pulseSubtle: 'pulseSubtle 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        }
      }
    },
  },
  plugins: [],
}

