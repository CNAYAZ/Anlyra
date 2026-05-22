import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        /* ─── shadcn base tokens ─── */
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        /* ─── sage brand palette (9 stop) ─── */
        sage: {
          50:  'hsl(var(--sage-50))',
          100: 'hsl(var(--sage-100))',
          200: 'hsl(var(--sage-200))',
          300: 'hsl(var(--sage-300))',
          400: 'hsl(var(--sage-400))',
          500: 'hsl(var(--sage-500))',
          600: 'hsl(var(--sage-600))',
          700: 'hsl(var(--sage-700))',
          800: 'hsl(var(--sage-800))',
        },

        /* ─── primary → sage-500 (ex navy), accent → sage-400 (ex teal) ─── */
        primary: {
          DEFAULT:    'hsl(var(--sage-500))',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT:    'hsl(var(--sage-400))',
          foreground: '#ffffff',
        },

        /* ─── semantici (CSS variable — tema-aware) ─── */
        success: {
          50:         'hsl(var(--success-50))',
          DEFAULT:    'hsl(var(--success-500))',
          500:        'hsl(var(--success-500))',
          700:        'hsl(var(--success-700))',
          foreground: '#ffffff',
        },
        warning: {
          50:         'hsl(var(--warning-50))',
          DEFAULT:    'hsl(var(--warning-500))',
          500:        'hsl(var(--warning-500))',
          700:        'hsl(var(--warning-700))',
          foreground: '#ffffff',
        },
        danger: {
          50:         'hsl(var(--danger-50))',
          DEFAULT:    'hsl(var(--danger-500))',
          500:        'hsl(var(--danger-500))',
          700:        'hsl(var(--danger-700))',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT:    'hsl(var(--danger-500))',
          foreground: '#ffffff',
        },
        info: {
          50:         'hsl(var(--info-50))',
          DEFAULT:    'hsl(var(--info-500))',
          500:        'hsl(var(--info-500))',
          700:        'hsl(var(--info-700))',
          foreground: '#ffffff',
        },

        /* ─── design system aliases ─── */
        bg:              'hsl(var(--bg))',
        'fg-2':          'hsl(var(--fg-2))',
        'fg-3':          'hsl(var(--fg-3))',
        'border-strong': 'hsl(var(--border-strong))',
        'input-bg':      'hsl(var(--input-bg))',

        /* ─── shadcn compositi (invariati) ─── */
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        /* ─── sidebar (aggiornato con nuovi token) ─── */
        sidebar: {
          DEFAULT:            'hsl(var(--sidebar))',
          foreground:         'hsl(var(--sidebar-foreground))',
          hover:              'hsl(var(--sidebar-hover))',
          active:             'hsl(var(--sidebar-active))',
          'active-foreground': 'hsl(var(--sidebar-active-foreground))',
          border:             'hsl(var(--sidebar-border))',
        },
      },

      fontFamily: {
        heading: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      boxShadow: {
        card:     '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
        'elev-3': 'var(--elev-3)',
        'elev-4': 'var(--elev-4)',
      },

      spacing: {
        'sidebar-expanded':  '260px',
        'sidebar-collapsed': '64px',
        topbar: '64px',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
