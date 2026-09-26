/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C2B2E',
        paper: '#F7F8F6',
        surface: '#FFFFFF',
        line: '#DDE3DE',
        teal: {
          50: '#EEF5F3',
          100: '#D7E7E2',
          300: '#7FAFA3',
          500: '#2F6F62',
          600: '#255A50',
          700: '#1B4841',
        },
        clay: {
          100: '#F5E3D2',
          400: '#C9722C',
          500: '#B4601F',
        },
        rose: {
          100: '#F6DEDE',
          500: '#B24545',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
