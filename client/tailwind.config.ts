import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        flow: 'var(--accent-flow)',
        alert: 'var(--accent-alert)',
        crypto: 'var(--accent-crypto)',
        fiat: 'var(--accent-fiat)'
      }
    }
  },
  plugins: []
} satisfies Config;
