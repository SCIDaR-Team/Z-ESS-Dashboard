/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // Every colour resolves to a CSS variable in src/styles/tokens.css,
        // which is what drives the light/dark themes.
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        'bg-elev': 'rgb(var(--c-bg-elev) / <alpha-value>)',
        'bg-elev-2': 'rgb(var(--c-bg-elev-2) / <alpha-value>)',
        'bg-elev-3': 'rgb(var(--c-bg-elev-3) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        'border-soft': 'rgb(var(--c-border-soft) / <alpha-value>)',
        text: 'rgb(var(--c-text) / <alpha-value>)',
        'text-soft': 'rgb(var(--c-text-soft) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        'muted-2': 'rgb(var(--c-muted-2) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          dark: 'rgb(var(--c-brand-dark) / <alpha-value>)',
        },
        zdc: 'rgb(var(--c-zdc) / <alpha-value>)',
        uic: 'rgb(var(--c-uic) / <alpha-value>)',
        danger: 'rgb(var(--c-red) / <alpha-value>)',
        warning: 'rgb(var(--c-amber) / <alpha-value>)',
        success: 'rgb(var(--c-green) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
        sm: ['0.9375rem', { lineHeight: '1.3125rem' }],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)',
      },
    },
  },
  plugins: [],
};
