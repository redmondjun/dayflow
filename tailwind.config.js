const colors = require('./src/theme/palette.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
