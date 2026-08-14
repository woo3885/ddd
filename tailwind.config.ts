import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          700: '#0369a1',
          900: '#0c4a6e'
        },
        primary: '#0369a1',
        danger: '#b91c1c',
        secure: '#1e293b',
        surface: '#ffffff',
        border: '#cbd5e1',
        'text-primary': '#0f172a',
        'text-secondary': '#475569'
      }
    }
  },
  plugins: []
} satisfies Config;
