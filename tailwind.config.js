/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matcha: {
          50: '#f6f7f3', 100: '#e8ece1', 200: '#d0dac0', 300: '#b1c39a', 400: '#94a976', 
          500: '#788f58', 600: '#5e7243', 700: '#4b5b37', 800: '#3e4a30', 900: '#343e2a',
        },
        azuki: {
          50: '#fcf6f6', 100: '#f8ebeb', 200: '#f0d1d2', 300: '#e3acae', 400: '#d17e81', 
          500: '#b9555a', 600: '#9c3e42', 700: '#823135', 800: '#6c2b2f', 900: '#5a2729',
        },
        sakura: {
          50: '#fef6f8', 100: '#fdedf0', 200: '#faddde', 300: '#f6c0c6', 400: '#f098a5', 
          500: '#e7677d', 600: '#d1415a', 700: '#b02f45', 800: '#93293c', 900: '#7c2535',
        },
        washi: '#FAF8F5',   // 和紙のような背景色
        sumi: '#2B2B2B',    // 墨色
      },
      fontFamily: {
        serif: ['"Noto Serif JP"', '"Yu Mincho"', '"Hiragino Mincho ProN"', 'serif'],
        sans: ['"Noto Sans JP"', '"Hiragino Kaku Gothic ProN"', 'Meiryo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
