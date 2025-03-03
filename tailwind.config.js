// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{vue,ts,tsx}',
    './components/**/*.{vue,ts,tsx}',
    './layouts/**/*.{vue,ts,tsx}',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};