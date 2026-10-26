const typography = require('@tailwindcss/typography');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#FBF9F5',
        night: '#0F172A',
        emerald: {
          50: '#F3F6FA',
          100: '#E4EAF3',
          200: '#C5D2E4',
          300: '#9BB0CC',
          400: '#6E8AAD',
          500: '#3E5E82',
          600: '#1C3D66',
          700: '#0B1A33',
          800: '#081426',
          900: '#06101F',
          950: '#030812',
        },
        amber: {
          50: '#FBF7EF',
          100: '#F4E8CC',
          200: '#E6C98A',
          300: '#D4B56E',
          400: '#C6A36A',
          500: '#B08C4E',
          600: '#8F6E38',
          700: '#735728',
          800: '#5C4520',
          900: '#3E2E14',
          950: '#2A1F0D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'ui-serif', 'serif'],
        brand: ['Cinzel', 'Merriweather', 'Georgia', 'serif'],
        arabic: ['Amiri', 'Scheherazade New', 'serif'],
      },
      boxShadow: {
        lift: '0 16px 40px -24px rgba(15, 23, 42, 0.45)',
      },
    },
  },
  plugins: [typography],
};
