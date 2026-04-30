/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
