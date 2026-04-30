/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens (backed by CSS vars in src/index.css)
        // Use as: bg-app, bg-app-card, text-app, border-app, etc.
        // Slash-alpha works: bg-app-card/70
        app: {
          DEFAULT: 'rgb(var(--app-bg) / <alpha-value>)',
          card: 'rgb(var(--app-card) / <alpha-value>)',
          tertiary: 'rgb(var(--app-tertiary) / <alpha-value>)',
          border: 'rgb(var(--app-border) / <alpha-value>)',
          text: 'rgb(var(--app-text) / <alpha-value>)',
          'text-2': 'rgb(var(--app-text-2) / <alpha-value>)',
          'text-muted': 'rgb(var(--app-text-muted) / <alpha-value>)',
          accent: 'rgb(var(--app-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--app-accent-hover) / <alpha-value>)',
          success: 'rgb(var(--app-success, 16 185 129) / <alpha-value>)',
          warning: 'rgb(var(--app-warning, 245 158 11) / <alpha-value>)',
          danger: 'rgb(var(--app-danger, 239 68 68) / <alpha-value>)',
        },
        // Legacy palette (mantida por compat com code não-migrado)
        sasi: {
          critical: '#dc2626',
          warning: '#f59e0b',
          ok: '#16a34a',
          bg: '#0f172a',
          panel: '#1e293b',
        },
      },
    },
  },
  plugins: [],
};
